const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = 5055;

function readLedger(tenant) {
  const ledgerPath = path.resolve(__dirname, "logs", tenant, "ledger.ndjson");
  if (!fs.existsSync(ledgerPath)) return [];

  return fs.readFileSync(ledgerPath, "utf-8")
    .split("\n")
    .filter(Boolean)
    .map(line => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

app.get("/logs/:tenant", (req, res) => {
  const tenant = req.params.tenant;
  const filter = req.query;

  const logs = readLedger(tenant).filter(entry => {
    return Object.entries(filter).every(([key, val]) =>
      typeof entry[key] === "string"
        ? entry[key].includes(val)
        : JSON.stringify(entry[key]).includes(val)
    );
  });

  if (req.headers.accept && req.headers.accept.includes("application/json")) {
    res.json(logs);
  } else {
    res.send(`
      <h2>🧾 Logs for Tenant: ${tenant}</h2>
      <p>Filter: ${Object.entries(filter).map(([k, v]) => `${k}=${v}`).join(", ") || "none"}</p>
      <pre style="white-space: pre-wrap;">${logs.map(log => JSON.stringify(log, null, 2)).join("\n\n---\n\n")}</pre>
    `);
  }
});

app.listen(PORT, () => {
  console.log(`📊 Log Viewer listening at http://localhost:${PORT}/logs/:tenant`);
});
