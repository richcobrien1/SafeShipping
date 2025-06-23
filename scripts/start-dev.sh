#!/bin/bash
echo "🚀 Starting SafeShipping local stack..."

# Load environment variables safely
if [ -f .env ]; then
  set -o allexport
  source .env
  set +o allexport
fi

PORT_RECEIVER=${PORT_RECEIVER:-4040}
PORT_DASHBOARD=${PORT_DASHBOARD:-5056}

npx concurrently \
  "echo '🔌 Receiver on :${PORT_RECEIVER}' && node contracts/safeshipping/receiver.js" \
  "echo '📊 Dashboard on :${PORT_DASHBOARD}' && node contracts/safeshipping/tenant-dashboard.js"
