#!/bin/bash
# Emit a sample SafeShipping order to receiver

# TENANT_API_KEY="secret-dev-key"
TENANT_API_KEY="abc123-def456"
RECEIVER_PORT=${PORT:-4040}
TRACKING_ID=${1:-TRACK-001-DEMO}

curl -X POST http://localhost:${RECEIVER_PORT}/log \
  -H "Authorization: Bearer ${TENANT_API_KEY}" \
  -H "Content-Type: application/json" \
  -d "{
    \"event\": \"orderCreated\",
    \"event_id\": \"$(uuidgen)\",
    \"sender\": \"Demo Sender\",
    \"recipient\": \"Demo Receiver\",
    \"tracking_id\": \"${TRACKING_ID}\",
    \"insured\": true,
    \"dimensions_cm\": [30, 20, 15],
    \"weight_kg\": 2.2,
    \"timestamp_utc\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"
  }"
