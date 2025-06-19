const fs = require("fs");
const path = require("path");

const [,, tenant, key, value] = process.argv;

if (!tenant || !key || !value) {
  console.log("Usage: node search-ledger.js <tenant> <field> <value>");
  process.exit(1);
}

const primary = path.resolve(__dirname, "logs", tenant, "ledger.ndjson");
const fallback = path.resolve(__dirname, "contracts", "safeshipping", "logs", tenant, "ledger.ndjson");

const ledgerPath = fs.existsSync(primary) ? primary : fallback;

console.log("🔍 Looking at:", ledgerPath);
if (!fs.existsSync(ledgerPath)) {
  console.error(`❌ Ledger not found: ${ledgerPath}`);
  process.exit(1);
}

const lines = fs.readFileSync(ledgerPath, "utf-8").split("\n").filter(Boolean);
const results = lines
  .map(line => JSON.parse(line))
  .filter(entry => {
    const target = entry[key];
    if (!target) return false;
    return typeof target === "string"
      ? target.includes(value)
      : JSON.stringify(target).includes(value);
  });

if (!results.length) {
  console.log(`🟡 No results for ${key} = '${value}' in tenant '${tenant}'`);
} else {
  console.log(`🔍 Found ${results.length} result(s):`);
  results.forEach(r => {
    console.log("-".repeat(40));
    console.log(JSON.stringify(r, null, 2));
  });
}
