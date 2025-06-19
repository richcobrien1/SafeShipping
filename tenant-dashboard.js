const fs = require("fs");
const path = require("path");
const express = require("express");

const app = express();
const PORT = 5056;

function loadLedger(tenant) {
  const ledgerPath = path.join(__dirname, "contracts", "safeshipping", "logs", tenant, "ledger.ndjson");
  if (!fs.existsSync(ledgerPath)) return [];

  return fs.readFileSync(ledgerPath, "utf-8")
    .split("\n").filter(Boolean)
    .map(line => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    }).filter(Boolean);
}

function summarize(tenant) {
  const logs = loadLedger(tenant);
  const today = new Date().toISOString().split("T")[0];

  const summary = {
    tenant,
    total_orders: logs.length,
    orders_today: logs.filter(l => l.timestamp_utc.startsWith(today)).length,
    total_weight_kg: logs.reduce((sum, l) => sum + (l.weight_kg || 0), 0),
    insured_count: logs.filter(l => l.insured === true).length,
    unique_recipients: [...new Set(logs.map(l => l.recipient))].length,
    last_event_ts: logs.at(-1)?.timestamp_utc || "N/A"
  };

  return summary;
}

app.get("/dashboard/:tenant", (req, res) => {
  const tenant = req.params.tenant;
  const data = summarize(tenant);
  res.send(`
    <h2>📊 SafeShipping Dashboard: ${tenant}</h2>
    <ul>
      <li>Total orders: ${data.total_orders}</li>
      <li>Orders today: ${data.orders_today}</li>
      <li>Total weight shipped: ${data.total_weight_kg} kg</li>
      <li>Insured packages: ${data.insured_count}</li>
      <li>Unique recipients: ${data.unique_recipients}</li>
      <li>Last event timestamp: ${data.last_event_ts}</li>
    </ul>
  `);
});

app.listen(PORT, () => {
  console.log(`🧭 Dashboard up at http://localhost:${PORT}/dashboard/:tenant`);
});
