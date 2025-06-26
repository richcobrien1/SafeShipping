const express = require("express");
const fs = require("fs");
const path = require("path");
const app = express();

const PORT = process.env.PORT_RECEIVER || 4040;
const AUTH_TOKEN = process.env.SAFESHIP_API_KEY || "secret-dev-key";
const BASE_DIR = process.cwd();

const tenants = require(path.join(BASE_DIR, "receiver/tenants.json"));
const LOGS_DIR = path.join(BASE_DIR, "logs");
const FRONTEND_DIR = path.join(BASE_DIR, "frontend");

app.use(express.json());

console.log("🧾 Base Directory:", BASE_DIR);

// Resolve tenant from token
function resolveTenant(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1];
  const tenant = Object.entries(tenants).find(([_, t]) => t.api_key === token);
  if (!tenant) return res.status(403).send({ error: "Unauthorized" });
  req.tenant_id = tenant[0];
  req.tenant_config = tenant[1];
  next();
}

// Log to ledger
function logEvent(log, tenant_id) {
  const folder = path.join(LOGS_DIR, tenant_id);
  fs.mkdirSync(folder, { recursive: true });
  const file = path.join(folder, "ledger.ndjson");
  const entry = JSON.stringify({ ...log, "@timestamp": new Date().toISOString() });
  fs.appendFileSync(file, entry + "\n");
}

// Log to retry.ndjson
function logRetryEvent(log, tenant_id) {
  const folder = path.join(LOGS_DIR, tenant_id);
  fs.mkdirSync(folder, { recursive: true });
  const file = path.join(folder, "retry.ndjson");
  const attempts = log.retry_attempt || 0;
  const entry = JSON.stringify({ ...log, retry_attempt: attempts + 1, "@timestamp": new Date().toISOString() });
  fs.appendFileSync(file, entry + "\n");
}

// POST /log — secure event logging
app.post("/log", resolveTenant, (req, res) => {
  const log = { ...req.body, tenant_id: req.tenant_id };
  logEvent(log, req.tenant_id);
  res.status(202).send({ status: "accepted", tenant: req.tenant_id });
});

// POST /webhook/:tenant — simulate delivery, optional fail
app.post("/webhook/:tenant", (req, res) => {
  const { tenant } = req.params;
  const config = tenants[tenant];
  if (!config) return res.status(404).send({ error: `Tenant '${tenant}' not found` });

  const log = { ...req.body, tenant_id: tenant };
  logEvent(log, tenant);

  const simulateFailure = req.query.fail === "true";
  console.log("🧪 Webhook Query:", req.query, "→ Failure:", simulateFailure);

  if (simulateFailure) {
    console.warn("⚠️ Simulated failure — writing to retry.ndjson");
    logRetryEvent(log, tenant);
    return res.status(502).send({ status: "failed", queued: true, tenant });
  }

  res.status(202).send({ status: "accepted", tenant });
});

// Serve logs and frontend
app.use("/logs", express.static(LOGS_DIR));
app.use("/", express.static(FRONTEND_DIR));

app.listen(PORT, () => {
  console.log(`🛰️ Receiver live at http://localhost:${PORT}`);
});
