#!/bin/bash
echo "🚀 Starting SafeShipping local stack..."

cd "$(dirname "$0")/.." || exit 1

# Load environment variables safely
if [ -f .env ]; then
  set -o allexport
  source .env
  set +o allexport
fi

PORT_RECEIVER=${PORT_RECEIVER:-4040}
PORT_DASHBOARD=${PORT_DASHBOARD:-5056}

npx concurrently \
  "echo '🔌 Receiver on :${PORT_RECEIVER}' && node receiver/receiver.js" \
  "echo '📊 Dashboard on :${PORT_DASHBOARD}' && node dashboard/tenant-dashboard.js"
