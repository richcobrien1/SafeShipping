#!/bin/bash

API_KEY=${SAFESHIP_API_KEY:-secret-dev-key}
ENDPOINT="http://localhost:4040/log"
LOGS_BASE="logs"

# If tenant IDs are passed in, use those; otherwise replay all directories in logs/
if [ "$#" -gt 0 ]; then
  TENANTS=("$@")
else
  TENANTS=($(find "$LOGS_BASE" -maxdepth 1 -mindepth 1 -type d -exec basename {} \;))
fi

for TENANT in "${TENANTS[@]}"; do
  RETRY_FILE="$LOGS_BASE/${TENANT}/retry.ndjson"
  
  if [ -f "$RETRY_FILE" ]; then
    echo "🔁 Replaying events for tenant '${TENANT}' from ${RETRY_FILE}..."
    while IFS= read -r line; do
      curl -s -X POST "$ENDPOINT" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer ${API_KEY}" \
        -d "$line" > /dev/null
    done < "$RETRY_FILE"
    echo "✅ Replay complete for tenant '${TENANT}'."
  else
    echo "⚠️ No retry file found for tenant '${TENANT}', skipping."
  fi
done
