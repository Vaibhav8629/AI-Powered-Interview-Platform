const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();
const connectDB = require("./config/db");

const app = express();
const authenticationRoutes = require("./routes/authRoutes");
const interviewRoute = require("./routes/interviewRoutes");

// Middleware
const allowedOrigins = [process.env.CLIENT_URL, "http://localhost:5173"].filter(Boolean);

const corsOptions = {
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error("Not allowed by CORS"));
  },
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Authorization", "Content-Type"],
};

app.use(cors(corsOptions));
app.options("/*splat", cors(corsOptions));
app.use(express.json());
connectDB();

// Port
const PORT = 5000;

// Test route
app.get("/", (req, res) => {
  res.send("Server is running");
});

app.use("/api/auth", authenticationRoutes);
app.use("/api", interviewRoute);

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
