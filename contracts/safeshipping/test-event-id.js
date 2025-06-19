const wasm = require("./pkg");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const http = require("http");
const https = require("https");

function hashLog(log) {
  return crypto.createHash("sha256").update(JSON.stringify(log)).digest("hex");
}

function tenantNameFromPath(logPath) {
  const match = logPath.match(/logs[\\/](.*?)[\\/]/);
  return match ? match[1] : "unknown";
}

function saveSnapshot(log, dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filename = `log-${timestamp}.json`;
  fs.writeFileSync(path.join(dir, filename), JSON.stringify(log, null, 2));
  console.log(`💾 Snapshot saved to ${dir}/${filename}`);
}

function appendToStream(log, dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const streamPath = path.join(dir, "ledger.ndjson");
  fs.appendFileSync(streamPath, JSON.stringify(log) + "\n");
  console.log(`🧾 Appended to ${streamPath}`);
}

function emitToWebhook(log, url, logDir = null) {
  if (!url) return;

  const parsedUrl = new URL(url);
  const isHttps = parsedUrl.protocol === "https:";
  const protocol = isHttps ? https : http;

  const data = JSON.stringify(log);
  const options = {
    hostname: parsedUrl.hostname,
    port: parsedUrl.port || (isHttps ? 443 : 80),
    path: parsedUrl.pathname,
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(data)
    }
  };

  const logPath = path.join(logDir || "logs/unknown", ".webhook.log");

  console.log(`📡 Attempting webhook emit to: ${url}`);

  const req = protocol.request(options, res => {
    const stamp = new Date().toISOString();
    const entry = `[${stamp}] ✅ ${res.statusCode} ${res.statusMessage} → ${url}\n`;
    fs.appendFileSync(logPath, entry);
    console.log(`📡 Webhook [${url}] responded: ${res.statusCode}`);
    res.resume();
  });

  req.on("error", err => {
    const stamp = new Date().toISOString();
    const entry = `[${stamp}] ❌ ERROR: ${err.message} → ${url}\n`;
    fs.appendFileSync(logPath, entry);
    console.error(`❌ Webhook to [${url}] failed: ${err.message}`);

    // New: queue for retry
    const tenantId = tenantNameFromPath(logPath); // function we'll add
    const { retryQueue } = require("./config");
    const retryPath = retryQueue(tenantId);
    if (!fs.existsSync(path.dirname(retryPath))) fs.mkdirSync(path.dirname(retryPath), { recursive: true });
    const retryRecord = { url, log, error: err.message, retries: 0, timestamp: stamp };
    fs.appendFileSync(retryPath, JSON.stringify(retryRecord) + "\n");
  });


  req.write(data);
  req.end();
}

let previousLog = null;

function emitChainedLog(order, tenantConfig) {
  const payload = {
    ...order,
    prev_hash: previousLog ? hashLog(previousLog) : null
  };

  console.log("📦 Payload sent to WASM:\n", JSON.stringify(payload, null, 2));

  const result = wasm.create_order_log(JSON.stringify(payload));

  try {
    const parsed = JSON.parse(result);

    console.log(`📦 [${order.tenant_id}] LOG:\n`, parsed);

    saveSnapshot(parsed, tenantConfig.log_dir);
    appendToStream(parsed, tenantConfig.log_dir);
    emitToWebhook(parsed, tenantConfig.webhook_url, tenantConfig.log_dir);

    previousLog = parsed;
  } catch (err) {
    console.error(`❌ WASM returned invalid JSON:\n${result}`);
  }
}

module.exports = { emitChainedLog };
