const path = require("path");

const ROOT = __dirname;

const config = {
  failuresDir: (tenant) => path.join(ROOT, "failures", tenant || ""),
  logsDir: (tenant) => path.join(ROOT, "logs", tenant || ""),
  ledgerPath: (tenant) => path.join(ROOT, "logs", tenant, "ledger.ndjson"),
  retryQueue: (tenant) => path.join(ROOT, "failures", tenant, ".retry.ndjson"),
  streamLog: (tenant) => path.join(ROOT, "logs", tenant, ".webhook.log"),
  snapshotDir: (tenant) => path.join(ROOT, "logs", tenant, "snapshots"),
  webhookURL: (tenant) => `http://localhost:5005/webhook/${tenant}`
};

module.exports = config;
