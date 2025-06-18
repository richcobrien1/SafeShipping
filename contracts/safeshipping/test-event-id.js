const wasm = require('./pkg');

const order = {
  sender: { name: "Echo Co.", address: "123 Console Way", contact: "+15559998888" },
  recipient: { name: "Receiver Inc.", address: "789 Terminal Ave", contact: "+14447776666" },
  package: { weight_kg: 2.5, dimensions_cm: [30, 20, 15], category: "demo", insured: true },
  metadata: { external_tracking_id: "TEST-WSL-UUID-01", order_notes: "Final system test" }
};

const result = wasm.create_order_log(JSON.stringify(order));
console.log("📦 LOG FROM WASM:\n", result);
