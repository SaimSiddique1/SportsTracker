// This file: starts Express app,
// enable CORS, parse JSON requests,
// mount auth routes to /api/auth
// create test route at /

const express = require("express");
const cors = require("cors");
require("dotenv").config();

const authRoutes = require("./routes/auth");
const adminRoutes = require("./routes/admin");
const systemConfigRoutes = require("./routes/systemConfig");
const favoriteRoutes = require("./routes/favorites");
const { store } = require("./store");

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/system-config", systemConfigRoutes);
app.use("/api/favorites", favoriteRoutes);

app.get("/", (req, res) => {
  res.send("Auth API running");
});

const PORT = process.env.PORT || 5001;

store.init().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}).catch((error) => {
  console.error("Failed to initialize data store:", error);
  process.exit(1);
});
