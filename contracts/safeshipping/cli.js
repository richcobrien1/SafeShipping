#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const tenantsPath = path.join(__dirname, "tenants.json");

function loadTenants() {
  if (!fs.existsSync(tenantsPath)) return {};
  return JSON.parse(fs.readFileSync(tenantsPath));
}

function saveTenants(data) {
  fs.writeFileSync(tenantsPath, JSON.stringify(data, null, 2));
}

function generateKey() {
  return crypto.randomBytes(16).toString("hex");
}

function addTenant(args) {
  const tenantId = args[2];
  const options = Object.fromEntries(args.slice(3).map(arg => {
    const [key, val] = arg.replace(/^--/, "").split("=");
    return [key, val];
  }));

  if (!tenantId) {
    console.error("❌ Missing tenant ID. Usage: add-tenant <tenantId> [--key=] [--webhook=] [--dir=]");
    return;
  }

  const tenants = loadTenants();

  if (tenants[tenantId]) {
    console.error(`❌ Tenant '${tenantId}' already exists.`);
    return;
  }

  const apiKey = options.key || generateKey();
  const logDir = options.dir || `logs/${tenantId}`;
  const webhook = options.webhook || null;

  tenants[tenantId] = { api_key: apiKey, webhook_url: webhook, log_dir: logDir };
  saveTenants(tenants);

  // Create log dir
  fs.mkdirSync(logDir, { recursive: true });

  console.log(`✅ Added tenant '${tenantId}'`);
  console.log(`🔑 API Key: ${apiKey}`);
  if (webhook) console.log(`🌐 Webhook: ${webhook}`);
  console.log(`📁 Log directory: ${logDir}`);
}

function removeTenant(args) {
  const tenantId = args[2];

  if (!tenantId) {
    console.error("❌ Missing tenant ID. Usage: remove-tenant <tenantId>");
    return;
  }

  const tenants = loadTenants();

  if (!tenants[tenantId]) {
    console.error(`❌ Tenant '${tenantId}' not found.`);
    return;
  }

  const dir = tenants[tenantId].log_dir || `logs/${tenantId}`;
  delete tenants[tenantId];
  saveTenants(tenants);

  console.log(`🧨 Removed tenant '${tenantId}'`);
  console.log(`🧹 You may manually delete '${dir}' if needed`);
}

function listTenants() {
  const tenants = loadTenants();
  const keys = Object.keys(tenants);

  if (keys.length === 0) {
    console.log("📭 No tenants registered.");
    return;
  }

  console.log(`📋 Registered Tenants (${keys.length}):\n`);

  for (const [id, t] of Object.entries(tenants)) {
    console.log(`🆔 ${id}`);
    console.log(`   🔑 Key: ${t.api_key}`);
    console.log(`   📁 Dir: ${t.log_dir}`);
    if (t.webhook_url) console.log(`   🌐 Webhook: ${t.webhook_url}`);
    console.log("");
  }
}

const command = process.argv[2];
if (command === "add-tenant") {
  addTenant(process.argv.slice(2));
} else if (command === "remove-tenant") {
  removeTenant(process.argv.slice(2));
} else if (command === "list-tenants") {
  listTenants();
} else {
  console.log("Available commands:");
  console.log("  add-tenant <id> --key=KEY --webhook=URL --dir=logs/ID");
  console.log("  remove-tenant <id>");
  console.log("  list-tenants");
}

