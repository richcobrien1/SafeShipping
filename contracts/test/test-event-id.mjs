import initWasm, * as wasm from './pkg/safeshipping_contract.js';

const run = async () => {
  await initWasm(); // This loads and initializes the .wasm behind the scenes

  const sampleOrder = {
    sender: { name: "Echo Co.", address: "123 Console Way", contact: "+15559998888" },
    recipient: { name: "Receiver Inc.", address: "789 Terminal Ave", contact: "+14447776666" },
    package: { weight_kg: 2.0, dimensions_cm: [25, 15, 10], category: "test unit", insured: false },
    metadata: { external_tracking_id: "TEST-ECHO-01", order_notes: "Testing full return path" }
  };

  const result = wasm.create_order_log(JSON.stringify(sampleOrder));
  console.log("📦 EVENT RETURN:\n", result);
};

run();
