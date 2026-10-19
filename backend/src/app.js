
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

const authRoutes = require("./routes/authRoutes");
const categoryRoutes = require("./routes/categoryRoutes");
const productRoutes = require("./routes/productRoutes");
const stockRoutes = require("./routes/stockRoutes");
const stockHistoryRoutes = require("./routes/stockHistoryRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");

const app = express();

app.disable("x-powered-by");

app.use(helmet());

app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
  }),
);

app.use(express.json({ limit: "20kb" }));

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 200,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    message: "Too many requests. Please try again later.",
  },
});


const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: process.env.NODE_ENV === "test" ? 1000 : 30,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    message: "Too many authentication attempts. Please try again later.",
  },
});

app.use("/api", apiLimiter);

app.use("/api/auth", authLimiter, authRoutes);

app.get("/api/health", (req, res) => {
  return res.status(200).json({
    status: "ok",
    message: "SmartStock API is running",
  });
});

app.use("/api/categories", categoryRoutes);
app.use("/api/products", productRoutes);
app.use("/api/stock", stockRoutes);
app.use("/api/stock-history", stockHistoryRoutes);
app.use("/api/dashboard", dashboardRoutes);

app.use((req, res) => {
  return res.status(404).json({
    message: "Route not found",
  });
});

app.use((err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }

  const statusCode =
    Number.isInteger(err.statusCode) &&
    err.statusCode >= 400 &&
    err.statusCode <= 599
      ? err.statusCode
      : 500;

  return res.status(statusCode).json({
    message:
      statusCode >= 500
        ? "Internal server error"
        : err.message || "Request failed",
  });
});

module.exports = app;
