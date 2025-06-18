const express = require("express");
const app = express();
const port = process.env.PORT || 4040;

app.use(express.json()); // Parse JSON automatically

app.post("/log", (req, res) => {
  const incoming = req.body;
  console.log("📨 Inbound log received:", incoming);

  // You can validate here (e.g., ensure `order_id`, `prev_hash`, etc. exist)

  // Pipe into your core emit system:
  emitChainedLog(incoming); // from your main file

  res.status(202).send({ status: "accepted", received: true });
});

app.listen(port, () => {
  console.log(`🛰️ SafeShipping Receiver listening at http://localhost:${port}/log`);
});
