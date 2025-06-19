const fs = require("fs");
const path = require("path");
const axios = require("axios");

const [tenant, eventId] = process.argv.slice(2);

if (!tenant || !eventId) {
  console.error("Usage: node replay.js <tenant> <event_id>");
  process.exit(1);
}

const ledgerPath = path.resolve(__dirname, "logs", tenant, "ledger.ndjson");
const targetUrl = `http://localhost:5005/webhook/${tenant}`; // or your real endpoint

if (!fs.existsSync(ledgerPath)) {
  console.error("❌ Ledger not found:", ledgerPath);
  process.exit(1);
}

const events = fs.readFileSync(ledgerPath, "utf-8").split("\n").filter(Boolean);
const match = events.map(l => JSON.parse(l)).find(e => e.event_id === eventId);

if (!match) {
  console.error(`❌ Event not found: ${eventId}`);
  process.exit(1);
}

const replayLog = {
  ...match,
  replayed: true,
  original_event_id: match.event_id,
  event_id: `REPLAY-${Date.now()}`,
  timestamp_utc: new Date().toISOString()
};

axios.post(targetUrl, replayLog)
  .then(() => {
    console.log("✅ Replayed event:", replayLog.event_id);

    const ledgerOut = fs.createWriteStream(ledgerPath, { flags: "a" });
    ledgerOut.write(JSON.stringify(replayLog) + "\n");
    ledgerOut.close();
  })
  .catch(err => {
    console.error("❌ Failed to emit replay:", err.message);
  });
