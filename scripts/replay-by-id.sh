#!/bin/bash
# Replay the most recent ledger event matching a tracking ID

TRACKING_ID="$1"
TENANT_ID="v2u-core"
LEDGER_FILE="logs/${TENANT_ID}/ledger.ndjson"
TARGET_PORT=${PORT_RECEIVER:-4040}

if [ -z "$TRACKING_ID" ]; then
  echo "❌ Usage: scripts/replay-by-id.sh <tracking_id>"
  exit 1
fi

# Find the last line number with the tracking ID
LINE=$(grep -n "\"tracking_id\":\"${TRACKING_ID}\"" "$LEDGER_FILE" | tail -n 1 | cut -d: -f1)

if [ -z "$LINE" ]; then
  echo "❌ No event found for tracking_id '${TRACKING_ID}'"
  exit 1
fi

# Extract and replay the event with tagging
EVENT=$(sed -n "${LINE}p" "$LEDGER_FILE" | jq 'del(."@timestamp") + { "replayed": true, "replayed_from": '"$LINE"' }')

if [ -z "$EVENT" ]; then
  echo "❌ Could not extract valid event from line ${LINE}"
  exit 1
fi

echo "🔁 Replaying event for tracking_id '${TRACKING_ID}' from line ${LINE}..."

curl -s -X POST "http://localhost:${TARGET_PORT}/webhook/${TENANT_ID}" \
  -H "Content-Type: application/json" \
  -d "${EVENT}" | jq
