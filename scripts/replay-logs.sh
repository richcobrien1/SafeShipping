#!/bin/bash

API_KEY=${SAFESHIP_API_KEY:-secret-dev-key}
ENDPOINT="http://localhost:4040/log"
LOGS_BASE="logs"

# If tenant IDs passed in, use them; else replay all tenants in /logs
if [ "$#" -gt 0 ]; then
  TENANTS=("$@")
else
  TENANTS=($(find "$LOGS_BASE" -maxdepth 1 -mindepth 1 -type d -exec basename {} \;))
fi

for TENANT in "${TENANTS[@]}"; do
  RETRY_FILE="${LOGS_BASE}/${TENANT}/retry.ndjson"

  if [ ! -f "$RETRY_FILE" ]; then
    echo "⚠️  No retry file for tenant '${TENANT}', skipping."
    continue
  fi

  echo "🔁 Replaying events for tenant '${TENANT}'..."

  TOTAL_LINES=$(wc -l < "$RETRY_FILE")
  COUNT=0

  while IFS= read -r line; do
    curl -s -X POST "$ENDPOINT" \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer ${API_KEY}" \
      -d "$line" > /dev/null

    ((COUNT++))
    PROGRESS=$((COUNT * 40 / TOTAL_LINES)) # 40 chars wide

    BAR=$(printf "%-${PROGRESS}s" "#" | tr ' ' '#')
    SPACE=$(printf "%-$((40 - PROGRESS))s")
    printf "\r[%s%s] %d/%d" "$BAR" "$SPACE" "$COUNT" "$TOTAL_LINES"
  done < "$RETRY_FILE"

  echo -e "\n✅ Replay complete for tenant '${TENANT}'."
done
