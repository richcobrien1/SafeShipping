#!/bin/bash
# Replay all events from retry.ndjson for a given tenant

TENANT_ID="v2u-core"
RETRY_FILE="logs/${TENANT_ID}/retry.ndjson"
TARGET_PORT=${PORT_RECEIVER:-4040}

if [ ! -f "$RETRY_FILE" ]; then
  echo "✅ No retry file found at $RETRY_FILE. Nothing to replay."
  exit 0
fi

echo "🔁 Replaying events from ${RETRY_FILE}..."

TMP_FILE="${RETRY_FILE}.tmp"
> "$TMP_FILE" # Empty the temp file

while IFS= read -r line || [ -n "$line" ]; do
  ATTEMPT=$(echo "$line" | jq -r '.retry_attempt // 0')
  TRACKING=$(echo "$line" | jq -r '.tracking_id // "unknown"')

  EVENT=$(echo "$line" | jq 'del(."@timestamp") + { "replayed": true }')
  RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "http://localhost:${TARGET_PORT}/webhook/${TENANT_ID}" \
    -H "Content-Type: application/json" -d "$EVENT")

  if [ "$RESPONSE" = "202" ]; then
    echo "✅ Replayed: $TRACKING"
  else
    echo "❌ Retry failed (HTTP $RESPONSE) for $TRACKING. Re-queueing..."
    echo "$line" | jq '.retry_attempt = '"$((ATTEMPT + 1))"'' >> "$TMP_FILE"

    if [ "$ATTEMPT" -ge 2 ]; then
      echo "⚠️ WARN: $TRACKING has failed ${ATTEMPT} times"
    fi
  fi
done < "$RETRY_FILE"

mv "$TMP_FILE" "$RETRY_FILE"
