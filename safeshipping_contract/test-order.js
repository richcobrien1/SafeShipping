// test-order.js
const wasm = require('./pkg/safeshipping_contract');

const sampleOrder = {
  sender: {
    name: "Aegis Logistics",
    address: "945 Armory Blvd",
    contact: "+18885550001"
  },
  recipient: {
    name: "Vega Systems",
    address: "472 Polaris Way",
    contact: "+17774441122"
  },
  package: {
    weight_kg: 5.8,
    dimensions_cm: [40, 30, 15],
    category: "precision hardware",
    insured: true
  },
  metadata: {
    external_tracking_id: "SHIP-VG-20240612-001",
    order_notes: "Deliver before 10am if possible"
  }
};

const result = wasm.create_order_log(JSON.stringify(sampleOrder));
console.log("\n📨 Log Result:\n", result);
