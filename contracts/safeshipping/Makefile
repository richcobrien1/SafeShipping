# Makefile for SafeShipping

ENV ?= dev
PORT ?= 4040

install:
    npm install

receiver:
    node contracts/safeshipping/receiver.js

dashboard:
    node contracts/safeshipping/tenant-dashboard.js

replay:
    node contracts/safeshipping/replay.js v2u-core $(ID)

tail:
    tail -n 10 contracts/safeshipping/logs/v2u-core/ledger.ndjson

retry:
    node contracts/safeshipping/job-runner.js

log-test:
    curl -X POST http://localhost:$(PORT)/log \
    -H "Authorization: Bearer secret-dev-key" \
    -H "Content-Type: application/json" \
    -d '{"event_type": "test.echo", "payload": "hello"}'

.PHONY: install receiver dashboard replay tail retry log-test
