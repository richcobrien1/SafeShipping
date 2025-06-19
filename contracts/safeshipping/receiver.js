const express = require("express");
const app = express();
const port = process.env.PORT || 4040;
const AUTH_TOKEN = process.env.SAFESHIP_API_KEY || "secret-dev-key";
const tenants = require("./tenants.json");
const { emitChainedLog } = require("./test-event-id");

app.use(express.json()); // Parse JSON automatically

function resolveTenant(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1];
  const tenant = Object.entries(tenants).find(([_, t]) => t.api_key === token);

  if (!tenant) return res.status(403).send({ error: "Unauthorized" });

  req.tenant_id = tenant[0];
  req.tenant_config = tenant[1];
  next();
}

app.post("/log", resolveTenant, (req, res) => {
  const log = { ...req.body, tenant_id: req.tenant_id };
  emitChainedLog(log, req.tenant_config);
  res.status(202).send({ status: "accepted", tenant: req.tenant_id });
});

// 🔁 New: Replay-compatible route for `/webhook/:tenant`
app.post("/webhook/:tenant", (req, res) => {
  const { tenant } = req.params;
  const tenant_config = tenants[tenant];

  if (!tenant_config) {
    return res.status(404).send({ error: `Tenant '${tenant}' not found` });
  }

  const log = { ...req.body, tenant_id: tenant };
  emitChainedLog(log, tenant_config);
  res.status(202).send({ status: "accepted", tenant });
});

function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1];
  if (token !== AUTH_TOKEN) {
    return res.status(403).send({ error: "Unauthorized" });
  }
  next();
}

app.listen(port, () => {
  console.log(`🛰️ SafeShipping Receiver listening at http://localhost:${port}/log`);
});
