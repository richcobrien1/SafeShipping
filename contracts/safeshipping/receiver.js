const express = require("express");
const fs = require("fs");
const path = require("path");
const app = express();

const PORT = process.env.PORT_RECEIVER || 4040;
const AUTH_TOKEN = process.env.SAFESHIP_API_KEY || "secret-dev-key";
const tenants = require("./tenants.json");

app.use(express.json());

console.log("🧾 Serving from:", __dirname);

function resolveTenant(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1];
  const tenant = Object.entries(tenants).find(([_, t]) => t.api_key === token);
  if (!tenant) return res.status(403).send({ error: "Unauthorized" });

  req.tenant_id = tenant[0];
  req.tenant_config = tenant[1];
  next();
}

function logEvent(log, tenant_id) {
  const folder = path.resolve(__dirname, "../../logs", tenant_id);
  const file = path.join(folder, "ledger.ndjson");
  fs.mkdirSync(folder, { recursive: true });

  const entry = JSON.stringify({ ...log, "@timestamp": new Date().toISOString() });
  fs.appendFileSync(file, entry + "\n");
}

function logRetryEvent(log, tenant_id) {
  const folder = path.resolve(__dirname, "../../logs", tenant_id);
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

// Authenticated logging
app.post("/log", resolveTenant, (req, res) => {
  const log = { ...req.body, tenant_id: req.tenant_id };
  logEvent(log, req.tenant_id);
  res.status(202).send({ status: "accepted", tenant: req.tenant_id });
});

// Simulated webhook (optional failure)
app.post("/webhook/:tenant", (req, res) => {
  const { tenant } = req.params;
  const tenant_config = tenants[tenant];
  if (!tenant_config) return res.status(404).send({ error: `Tenant '${tenant}' not found` });

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

// Serve static logs + frontend UI
app.use("/logs", express.static(path.resolve(__dirname, "../../logs")));
app.use("/", express.static(path.resolve(__dirname, "../../public")));

app.get("/__debug", (req, res) => {
  const testPath = path.resolve(__dirname, "../../logs/v2u-core/ledger.ndjson");
  fs.readFile(testPath, "utf-8", (err, data) => {
    if (err) return res.status(500).send("Failed to read log: " + err.message);
    res.type("text").send(data);
  });
});

app.listen(PORT, () => {
  console.log(`🛰️ SafeShipping Receiver listening at http://localhost:${PORT}`);
});
