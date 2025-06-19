const fs = require("fs");
const path = require("path");
const http = require("http");
const https = require("https");

function retryFailedWebhooks(tenant) {
  const retryPath = path.join(__dirname, "failures", tenant, ".retry.ndjson");
  if (!fs.existsSync(retryPath)) {
    console.log(`🟡 No retry file found for tenant [${tenant}]`);
    return;
  }

  const lines = fs.readFileSync(retryPath, "utf-8").split("\n").filter(Boolean);
  if (!lines.length) return;

  const remaining = [];
  for (const line of lines) {
    try {
      const { url, log, retries } = JSON.parse(line);
      const parsed = new URL(url);
      const protocol = parsed.protocol === "https:" ? https : http;

      const options = {
        hostname: parsed.hostname,
        port: parsed.port || (parsed.protocol === "https:" ? 443 : 80),
        path: parsed.pathname,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(JSON.stringify(log))
        }
      };

      const req = protocol.request(options, res => {
        console.log(`🔁 Retried → [${res.statusCode}] ${url}`);
      });

      req.on("error", err => {
        console.warn(`⚠️ Retry failed: ${err.message}`);
        remaining.push({ url, log, retries: retries + 1 });
      });

      req.write(JSON.stringify(log));
      req.end();
    } catch (err) {
      console.error(`❌ Malformed retry line: ${line}`);
    }
  }

  fs.writeFileSync(retryPath, remaining.map(r => JSON.stringify(r)).join("\n") + "\n");
}

module.exports = { retryFailedWebhooks };
