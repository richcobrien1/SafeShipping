const express = require("express");
const app = express();
const port = process.env.ECHO_PORT || 5050;

app.use(express.json());

app.post("/logs", (req, res) => {
  console.log("\n🔁 Echo received webhook:");
  console.dir(req.body, { depth: null });
  res.status(200).send({ status: "echoed", received: true });
});

app.listen(port, () => {
  console.log(`📡 Echo Server listening at http://localhost:${port}/logs`);
});
