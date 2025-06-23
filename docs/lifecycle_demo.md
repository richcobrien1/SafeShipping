# 🚀 SafeShipping Lifecycle Demo Handoff

## 🎯 Goal

Deliver a fully operational, container-ready demo of the SafeShipping lifecycle—from order emission to dashboard visualization—by **Thursday**.

---

## 🧭 System Architecture

### 📦 Shipping Lifecycle Flow

```mermaid
flowchart TD
    subgraph Emit Chain
        A1[User or CLI Emit]
        A2[POST /log (Bearer token)]
        A3[receiver.js]
        A4[Append to ledger.ndjson]
    end

    subgraph Replay Path
        B1[replay.js (event_id)]
        B2[POST /webhook/:tenant]
        B3[receiver.js ➜ ledger.ndjson]
        B4["replayed": true]
    end

    subgraph Observability
        C1[tenant-dashboard.js]
        C2[/dashboard/:tenant]
    end

    subgraph Resilience
        D1[.retry.ndjson]
        D2[job-runner.js]
        D3[Replay fallback]
    end

    A1 --> A2 --> A3 --> A4 --> C1
    B1 --> B2 --> B3 --> B4 --> C1
    D1 --> D2 --> D3 --> A2
```

## 📁 Modular Folder Structure
```
SafeShipping/
├── contracts/safeshipping/
│   ├── receiver.js
│   ├── tenant-dashboard.js
│   ├── replay.js
│   ├── job-runner.js
├── docker/
│   ├── receiver/
│   │   ├── Dockerfile
│   │   └── k8s-deployment.yaml
│   ├── dashboard/
│   │   ├── Dockerfile
│   │   └── k8s-deployment.yaml
│   └── compose/
│       └── docker-compose.dev.yml
├── logs/
│   └── v2u-core/
│       └── ledger.ndjson
├── scripts/
│   ├── start-dev.sh
│   ├── replay.sh
│   └── tail-ledger.sh
├── config/
│   ├── .env.template
│   └── tenants.json
└── Makefile
```

## 🐳 Kubernetes Node Plane Overview
mermaid
```
graph TD
  subgraph Node Plane
    RCV[receiver-pod]
    DASH[dashboard-pod]
  end

  subgraph PVC
    LEDGER[ledger.ndjson Volume]
    RETRY[.retry.ndjson Volume]
  end

  RCV --> LEDGER
  RCV --> RETRY
  DASH --> LEDGER
```

## 📅 Timeline to Demo
Day	Focus	Deliverables
Monday	Architecture visuals + planning	✅ Flowchart, folder schema, handoff doc
Tuesday	Emit + replay integration testing	CLI emitter script, sample payloads
Wednesday	Retry mechanism + dashboard audit	.retry.ndjson, job-runner.js test
Thursday	Final walkthrough & dry run	Full demo: emit ➜ log ➜ replay ➜ metrics

## ✅ Demo Execution Checklist
[ ] Emit new order via CLI or POST payload

[ ] Confirm ledger entry written

[ ] Replay specific event_id successfully

[ ] Verify "replayed": true appears in logs

[ ] Validate metrics update in /dashboard/:tenant

[ ] Trigger .retry.ndjson fallback and recover

[ ] End-to-end functional on local or container deploy


## 🧪 Lifecycle Verifier Script
Save the following to scripts/demo-checklist.sh and make it executable with chmod +x:

bash
```
#!/bin/bash
# SafeShipping Lifecycle Checklist

echo "✅ SafeShipping Lifecycle Checklist"

check() {
  echo -n "🔍 $1... "
  eval "$2" && echo "✅" || echo "❌"
}

check "Receiver running" \
  "curl -s http://localhost:4040/health | grep -iq ok"

check "Dashboard running" \
  "curl -s http://localhost:5056/dashboard/v2u-core | grep -iq '<!DOCTYPE html>'"

check "Ledger shows replay" \
  "tail -n 5 logs/v2u-core/ledger.ndjson | grep -q '\"replayed\": true'"

check "Dashboard reflects replay" \
  "curl -s http://localhost:5056/dashboard/v2u-core?view=raw | grep -q 'REPLAY-'"

check "Retry runner available" \
  "node contracts/safeshipping/job-runner.js --dry-run 2>&1 | grep -iq 'no retry files'"

echo "🧭 Checklist complete. Review ❌ items before demo."
```

