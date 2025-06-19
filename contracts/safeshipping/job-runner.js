const fs = require("fs");
const path = require("path");
const http = require("http");
const https = require("https");

const tenantDir = path.join(__dirname, "failures");

if (!fs.existsSync(tenantDir)) {
  fs.mkdirSync(tenantDir, { recursive: true });
}
const tenants = fs.readdirSync(tenantDir);

tenants.forEach(tenant => {
  const retryPath = path.join(tenantDir, tenant, ".retry.ndjson");
  if (!fs.existsSync(retryPath)) return;

  const lines = fs.readFileSync(retryPath, "utf-8").split("\n").filter(Boolean);
  const remaining = [];

  console.log(`🔁 Processing [${tenant}] — ${lines.length} queued items`);

  for (const line of lines) {
    try {
      const { url, log, retries = 0 } = JSON.parse(line);
      const parsed = new URL(url);
      const protocol = parsed.protocol === "https:" ? https : http;

      const options = {
        hostname: parsed.hostname,
        port: parsed.port || (parsed.protocol === "https:" ? 443 : 80),
        path: parsed.pathname,
        method: "POST",
        headers: { "Content-Type": "application/json" }
      };

      const req = protocol.request(options, res => {
        const stamp = new Date().toISOString();
        console.log(`✅ [${res.statusCode}] Retried → ${url} (${stamp})`);
      });

      req.on("error", err => {
        const updated = { url, log, retries: retries + 1 };
        remaining.push(updated);
        console.warn(`❌ Retry failed: ${err.message}`);
      });

      req.write(JSON.stringify(log));
      req.end();

    } catch (err) {
      console.error("Malformed entry:", err.message);
    }
  }

  fs.writeFileSync(retryPath, remaining.map(e => JSON.stringify(e)).join("\n") + "\n");
});
