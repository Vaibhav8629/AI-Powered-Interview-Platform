const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const connectDB = require('./config/db');

const app = express();
const router = require("./routes/authRoutes");
// Middleware
app.use(cors());
app.use(express.json());
connectDB();

// Port
const PORT = 5000;

// Test route
app.get("/", (req, res) => {
  res.send("Server is running");
});

app.use("/api/auth", router);

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});