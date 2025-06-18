const wasm = require('./pkg');
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

function hashLog(log) {
  return crypto.createHash("sha256").update(JSON.stringify(log)).digest("hex");
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

function emitToWebhook(log, url) {
  if (!url) return;
  const https = require("https");
  const data = JSON.stringify(log);
  const parsedUrl = new URL(url);
  const options = {
    hostname: parsedUrl.hostname,
    port: parsedUrl.port || 443,
    path: parsedUrl.pathname,
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(data)
    }
  };

  const req = https.request(options, res =>
    console.log(`📡 Webhook [${url}] responded: ${res.statusCode}`)
  );

  req.on("error", err =>
    console.error(`❌ Webhook to [${url}] failed: ${err.message}`)
  );

  req.write(data);
  req.end();
}

const order = {
  sender: { name: "Echo Co.", address: "123 Console Way", contact: "+15559998888" },
  recipient: { name: "Receiver Inc.", address: "789 Terminal Ave", contact: "+14447776666" },
  package: { weight_kg: 2.5, dimensions_cm: [30, 20, 15], category: "demo", insured: true },
  metadata: { external_tracking_id: "TEST-WSL-UUID-01", order_notes: "Final system test" }
};

let previousLog = null;

function emitChainedLog(order, tenantConfig) {
  const payload = {
    ...order,
    prev_hash: previousLog ? hashLog(previousLog) : null
  };

  console.log("📦 Payload sent to WASM:\n", JSON.stringify(payload, null, 2));

  const result = wasm.create_order_log(JSON.stringify(payload));

  try {
    const parsed = JSON.parse(result); // ✅ Only parse if it's valid JSON

    console.log(`📦 [${order.tenant_id}] LOG:\n`, parsed);

    saveSnapshot(parsed, tenantConfig.log_dir);
    appendToStream(parsed, tenantConfig.log_dir);
    emitToWebhook(parsed, tenantConfig.webhook_url);

    previousLog = parsed;
  } catch (err) {
    console.error(`❌ WASM returned invalid JSON:\n${result}`);
  }
}

module.exports = { emitChainedLog };
