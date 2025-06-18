const wasm = require('./pkg');
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const WEBHOOK_URL = process.env.SAFESHIP_WEBHOOK || "https://webhook.site/YOUR-ID-HERE";

function generateMockOrder(i) {
  return {
    order_id: `SHIP-${String(i).padStart(3, "0")}`,
    sender: { name: "Test Sender Inc.", address: `Zone ${i} Alpha`, contact: `+1555${i}900` },
    recipient: { name: `Receiver ${i}`, address: `Dock ${i}`, contact: `+1444${i}900` },
    package: { weight_kg: 1 + i * 0.25, dimensions_cm: [30, 20 + i, 15], category: "test", insured: i % 2 === 0 },
    metadata: { external_tracking_id: `TEST-BATCH-${i}`, order_notes: `Auto-log batch index ${i}` }
  };
}

function hashLog(log) {
  return crypto.createHash("sha256").update(JSON.stringify(log)).digest("hex");
}

let previousLog = null;

function saveSnapshot(log) {
  const dir = path.join(__dirname, "logs");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir);

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filename = `log-${timestamp}.json`;

  fs.writeFileSync(path.join(dir, filename), JSON.stringify(log, null, 2));
  console.log(`🗂️  Log snapshot saved: ${filename}`);
}

function appendToStream(log) {
  const streamPath = path.join(__dirname, "logs", "ledger.ndjson");
  const line = JSON.stringify(log) + "\n";
  fs.appendFileSync(streamPath, line);
  console.log("🧾 Appended to ledger.ndjson");
}

const https = require("https");

function emitToWebhook(log, url) {
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

  const req = https.request(options, (res) => {
    console.log(`🌐 Webhook response: ${res.statusCode}`);
  });

  req.on("error", (error) => {
    console.error(`❌ Webhook failed: ${error.message}`);
    // Optional: save to retry queue here
  });

  req.write(data);
  req.end();
}

function emitChainedLog(order) {
  const payload = {
    ...order,
    prev_hash: previousLog ? hashLog(previousLog) : null
  };

  const result = wasm.create_order_log(JSON.stringify(payload));
  const parsed = JSON.parse(result);

  console.log("📦 CHAINED LOG:\n", parsed);

  previousLog = parsed;
  saveSnapshot(parsed);     // 🔐 Audit-friendly JSON file
  appendToStream(parsed);   // 🔁 Streaming-compatible log line
}

function runBatch(count = 10) {
  console.log(`🚚 Running test batch of ${count} logs...\n`);
  for (let i = 1; i <= count; i++) {
    const order = generateMockOrder(i);
    emitChainedLog(order);
  }
}

runBatch(5); // or however many logs you want to batch test

saveSnapshot(parsed);
appendToStream(parsed);
emitToWebhook(parsed, WEBHOOK_URL);
