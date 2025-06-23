const express = require("express");
const fs = require("fs");
const path = require("path");
const app = express();

const PORT = process.env.PORT_RECEIVER || 4040;
const AUTH_TOKEN = process.env.SAFESHIP_API_KEY || "secret-dev-key";
const tenants = require("./tenants.json");

app.use(express.json());

function resolveTenant(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1];
  const tenant = Object.entries(tenants).find(([_, t]) => t.api_key === token);

  if (!tenant) return res.status(403).send({ error: "Unauthorized" });

  req.tenant_id = tenant[0];
  req.tenant_config = tenant[1];
  next();
}

function logEvent(log, tenant_id) {
  const folder = path.join("logs", tenant_id);
  const file = path.join(folder, "ledger.ndjson");

  fs.mkdirSync(folder, { recursive: true });

  const entry = JSON.stringify({ ...log, "@timestamp": new Date().toISOString() });
  fs.appendFileSync(file, entry + "\n");
}

function logRetryEvent(log, tenant_id) {
  const folder = path.join("logs", tenant_id);
  const retryFile = path.join(folder, "retry.ndjson");

  fs.mkdirSync(folder, { recursive: true });

  const previousAttempts = log.retry_attempt || 0;
  const entry = JSON.stringify({
    ...log,
    retry_attempt: previousAttempts + 1,
    "@timestamp": new Date().toISOString()
  });

  fs.appendFileSync(retryFile, entry + "\n");
}

// POST /log → Authenticated logging route
app.post("/log", resolveTenant, (req, res) => {
  const log = { ...req.body, tenant_id: req.tenant_id };
  logEvent(log, req.tenant_id);
  res.status(202).send({ status: "accepted", tenant: req.tenant_id });
});

// POST /webhook/:tenant → Simulates delivery with optional fallback
app.post("/webhook/:tenant", (req, res) => {
  const { tenant } = req.params;
  const tenant_config = tenants[tenant];

  if (!tenant_config) {
    return res.status(404).send({ error: `Tenant '${tenant}' not found` });
  }

  const log = { ...req.body, tenant_id: tenant };
  logEvent(log, tenant);

  const simulateFailure = req.query.fail === "true";

  console.log("🧪 Query received:", req.query);
  console.log("🧪 Failure flag evaluated as:", simulateFailure);

  if (simulateFailure) {
    console.warn("⚠️ Simulated failure triggered — writing to retry.ndjson");
    logRetryEvent(log, tenant);
    return res.status(502).send({ status: "failed", queued: true, tenant });
  }

  res.status(202).send({ status: "accepted", tenant });
});

app.listen(PORT, () => {
  console.log(`🛰️ SafeShipping Receiver listening at http://localhost:${PORT}`);
});
