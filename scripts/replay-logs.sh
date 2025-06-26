#!/bin/bash

API_KEY=${SAFESHIP_API_KEY:-secret-dev-key}
ENDPOINT="http://localhost:4040/log"
LOGS_BASE="logs"

GREEN="\033[0;32m"
YELLOW="\033[1;33m"
CYAN="\033[0;36m"
RED="\033[0;31m"
RESET="\033[0m"

# Get tenants from args or auto-discover from /logs
if [ "$#" -gt 0 ]; then
  TENANTS=("$@")
else
  TENANTS=($(find "$LOGS_BASE" -mindepth 1 -maxdepth 1 -type d -exec basename {} \;))
fi

for TENANT in "${TENANTS[@]}"; do
  RETRY_FILE="$LOGS_BASE/${TENANT}/retry.ndjson"

  if [ ! -f "$RETRY_FILE" ]; then
    echo -e "${YELLOW}⚠️  No retry file for tenant '${TENANT}', skipping.${RESET}"
    continue
  fi

  echo -e "${CYAN}🔁 Replaying events for tenant '${TENANT}'...${RESET}"

  TOTAL_LINES=$(wc -l < "$RETRY_FILE")
  COUNT=0

  while IFS= read -r line; do
    curl -s -X POST "$ENDPOINT" \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer ${API_KEY}" \
      -d "$line" > /dev/null

    ((COUNT++))
    PROGRESS=$((COUNT * 40 / TOTAL_LINES))
    BAR=$(printf "%-${PROGRESS}s" "#" | tr ' ' '#')
    SPACE=$(printf "%-$((40 - PROGRESS))s")
    printf "\r${GREEN}[%s%s] %d/%d${RESET}" "$BAR" "$SPACE" "$COUNT" "$TOTAL_LINES"
  done < "$RETRY_FILE"

  echo -e "\n${GREEN}✅ Replay complete for tenant '${TENANT}'.${RESET}\n"
done
