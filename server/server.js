const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const connectDB = require('./config/db');

const app = express();
const authenticationRoutes = require("./routes/authRoutes");
const interviewRoute = require("./routes/interviewRoutes");

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

app.use("/api/auth", authenticationRoutes);
app.use("/api/", interviewRoute);

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});