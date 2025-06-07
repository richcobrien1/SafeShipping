# Feature Breakdown
## ✅ Phase 1: Feature Breakdown by User Group
________________________________________
### 🟢 Active Users & Core Features
User Type	MVP Features
Shippers	- Create shipment contract (origin, destination, payload type) 
- Upload documentation (PDF, NFT record optional) 
- Track milestone fulfillment status 
- Initiate disputes or reclaims
National Carriers	- Accept shipment contracts 
- Report milestone completion (via webhook or REST API) 
- Provide GPS + signature proof 
- Get paid via smart contract trigger
3PLs / Regionals	- Join contract as subcontractor 
- Submit proof-of-handoff 
- Real-time updates to backend
Freight Brokers	- Create contracts on behalf of clients 
- Monitor KPIs (ETA, SLA breach, delivery success rate) 
- Tokenize documents (if needed)
Warehouse/Fulfillment	- Check-in/check-out handling 
- Validate sensor metadata at packaging (temp, shock, seal)
Customs / Govt (Pilot)	- View immutable delivery data 
- Optional smart contract approval before release
Insurers	- Receive sensor data logs via API 
- Automate claims or premium adjustments 
- Generate claims based on on-chain event signatures
________________________________________
### 🟡 Passive Users & Support Functions
User Type	MVP Touchpoints
Recipients
- View delivery confirmation link 
- Optional NFT receipt
IoT Vendors
- Send webhook or publish MQTT → oracle event
Legal/Compliance
- View logs or contract execution receipts
Agencies (USDOT/USPS)
- Access sandbox environment or dashboard for program oversight
Grant Reviewers
- View milestone completion, on-chain events, dashboards
________________________________________
## ✅ Phase 2: Prioritized MVP Feature Set
### 🔹 V1 – Launch Core
- Shipment creation (API/UI)
- Milestone contract on Arbitrum
- Carrier Webhook API
- Chainlink oracle simulation for GPS or temp data
- Wallet login (RainbowKit + wagmi)
- Delivery view + contract state
- PostgreSQL + Redis stack
### 🟡 V2 – Enhanced Ops
- NFT bill of lading (ERC-721)
- IoT gateway + MQTT ingestion
- Dispute arbitration via DAO or admin portal
- Event playback for insurance/legal
- IPFS document hashing
### 🔵 V3 – Ecosystem + Compliance
- Customs approval module
- Multi-party tokenized revenue splits (shippers, brokers)
- Regulatory compliance tags (CBP, FDA, USDOT)
- Analytics dashboard (SLAs, drops, location heatmaps)
________________________________________
## ✅ Phase 3: Persona-Based Flowchart (Active Users)
- Actors → contract actions
- Data events → blockchain/oracle/middleware interaction
- End outcomes (e.g. delivery verified → payment → NFT)
