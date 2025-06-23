#!/bin/bash
# Replay a logged event by its line number (from ledger)

LEDGER_FILE="logs/v2u-core/ledger.ndjson"
TENANT_ID="v2u-core"
TARGET_PORT=${PORT_RECEIVER:-4040}

LINE=${1:-1}
EVENT=$(sed -n "${LINE}p" "${LEDGER_FILE}" | jq 'del(."@timestamp") + { "replayed": true }')

if [ -z "$EVENT" ]; then
  echo "❌ Could not extract event from line ${LINE} in ${LEDGER_FILE}"
  exit 1
fi

echo "🔁 Replaying event #${LINE} to /webhook/${TENANT_ID}..."
curl -s -X POST "http://localhost:${TARGET_PORT}/webhook/${TENANT_ID}" \
  -H "Content-Type: application/json" \
  -d "${EVENT}" | jq
