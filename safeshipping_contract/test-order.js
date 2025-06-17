// test-order.js
const wasm = require('./pkg');

const order = {
  sender: {
    name: "Alice",
    address: "123 Elm St",
    contact: "+15551234567"
  },
  recipient: {
    name: "Bob",
    address: "456 Oak Ave",
    contact: "+14449876543"
  },
  package: {
    weight_kg: 3.5,
    dimensions_cm: [30, 20, 10],
    category: "electronics",
    insured: true
  },
  metadata: {
    external_tracking_id: "SAFE123456789",
    order_notes: "Leave at front door"
  }
};

const result = wasm.create_order_log(JSON.stringify(order));
console.log("Result:\n", result);
