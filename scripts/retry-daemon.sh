#!/bin/bash
# Runs retry replay every 60 seconds

echo "📟 SafeShipping Retry Daemon active..."
while true; do
  scripts/retry-replay.sh
  sleep 60
done
