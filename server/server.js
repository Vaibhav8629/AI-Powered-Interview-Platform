const express = require("express");
const cors = require("cors");
require("dotenv").config();
const connectDB = require("./config/db");

const app = express();

// ── CORS ───────────────────────────────────────────────────────────────────
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

// ── Stripe webhook — must receive raw body BEFORE express.json() ───────────
app.use("/api/payment/webhook", express.raw({ type: "application/json" }));

// ── JSON body parser for all other routes ─────────────────────────────────
app.use(express.json());

// ── Database ───────────────────────────────────────────────────────────────
connectDB();

// ── Routes ─────────────────────────────────────────────────────────────────
const authRoutes = require("./routes/authRoutes");
const interviewRoutes = require("./routes/interviewRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const userRoutes = require("./routes/userRoutes");

app.get("/", (req, res) => res.send("Server is running"));

app.use("/api/auth", authRoutes);
app.use("/api", interviewRoutes);
app.use("/api/payment", paymentRoutes);
app.use("/api/user", userRoutes);

// ── Start ──────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
