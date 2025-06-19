// utils/path-utils.js
const path = require("path");
const base = __dirname;

function resolveTenantPath(type, tenant, filename) {
  const folders = {
    logs: path.join(base, "logs", tenant),
    failures: path.join(base, "failures", tenant),
    snapshots: path.join(base, "logs", tenant, "snapshots")
  };

  return path.join(folders[type] || base, filename || "");
}

module.exports = { resolveTenantPath };
