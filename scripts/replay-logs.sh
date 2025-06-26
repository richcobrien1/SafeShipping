#!/bin/bash

TENANT=$1
RETRY_FILE="logs/${TENANT}/retry.ndjson"
API_KEY=${SAFESHIP_API_KEY:-secret-dev-key}
ENDPOINT="http://localhost:4040/log"

if [ -z "$TENANT" ]; then
  echo "❌ Usage: $0 <tenant-id>"
  exit 1
fi

if [ ! -f "$RETRY_FILE" ]; then
  echo "❌ Retry file not found: $RETRY_FILE"
  exit 1
fi

echo "🔁 Replaying events for tenant '${TENANT}' from ${RETRY_FILE}..."

while IFS= read -r line; do
  curl -s -X POST "$ENDPOINT" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer ${API_KEY}" \
    -d "$line"
done < "$RETRY_FILE"

echo "✅ Replay complete."
