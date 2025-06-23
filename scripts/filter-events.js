#!/usr/bin/env node
// Usage:
//   node scripts/filter-events.js --tenant v2u-core [--replayed] [--min-retries 2] [--verbose]

const fs = require("fs");
const path = require("path");

const args = require("minimist")(process.argv.slice(2), {
  boolean: ["replayed", "verbose"],
  default: { "min-retries": 0 }
});

const tenantId = args.tenant;
if (!tenantId) {
  console.error("❌ Please provide a --tenant parameter.");
  process.exit(1);
}

const showReplayed = args.replayed;
const minRetries = parseInt(args["min-retries"], 10);
const verbose = args.verbose;

const filePath = path.join("logs", tenantId, "ledger.ndjson");
if (!fs.existsSync(filePath)) {
  console.error(`❌ Log file not found at ${filePath}`);
  process.exit(1);
}

let original = 0, replayed = 0, highRetry = 0;

console.log(`🔍 Filtering log entries for tenant: ${tenantId}`);
console.log(`🔘 Replayed only: ${showReplayed}`);
console.log(`🔘 Min retry attempts: ${minRetries}\n`);

const lines = fs.readFileSync(filePath, "utf-8").split("\n").filter(Boolean);
for (const line of lines) {
  try {
    const entry = JSON.parse(line);
    const isReplay = entry.replayed === true;
    const attempts = entry.retry_attempt || 0;

    if (showReplayed && !isReplay) continue;
    if (attempts < minRetries) continue;

    if (isReplay) replayed++;
    else original++;

    if (attempts >= 3) highRetry++;

    if (verbose) console.log(JSON.stringify(entry, null, 2));
  } catch {
    console.warn("⚠️ Skipped invalid line");
  }
}

console.log("\n📊 Summary:");
console.log(`• Originals: ${original}`);
console.log(`• Replayed : ${replayed}`);
console.log(`• Retry ≥ 3: ${highRetry}`);
