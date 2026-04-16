const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const authMiddleware = require("./middleware/authMiddleware");
const errorMiddleware = require("./middleware/errorMiddleware");

// Import All Routes
const authRoutes = require("./routes/authRoutes");
const adminRoutes = require("./routes/adminRoutes");
const entityRoutes = require("./routes/entityRoutes");
const staffRoutes = require("./routes/staffRoutes");
const approvalRoutes = require("./routes/approvalRoutes");

const app = express();

// Rate Limiting Configuration
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 200, // Increased for dev
  message: "Too many requests, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
});

// Middleware
app.use(cors());
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        ...helmet.contentSecurityPolicy.getDefaultDirectives(),
        "frame-ancestors": ["'self'", "http://localhost:3000", "http://localhost:5173"],
      },
    },
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);
app.use(morgan("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Simple Request Logger for debugging mobile connectivity
app.use((req, res, next) => {
  console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.originalUrl}`);
  next();
});

// Serve uploaded files
app.use("/uploads", (req, res, next) => {
  res.removeHeader("X-Frame-Options");
  res.setHeader("Content-Security-Policy", "frame-ancestors 'self' http://localhost:3000 http://localhost:5173");
  res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
  next();
}, express.static("uploads"));

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "ok", message: "Server is running" });
});

// ── API Router ───────────────────────────────────────────────────────────────
const apiRouter = express.Router();
app.use("/api", generalLimiter, apiRouter);

// Public API Routes
apiRouter.use("/auth", authRoutes);

// Protected API Routes
apiRouter.use("/admin", authMiddleware.protect, adminRoutes);
apiRouter.use("/entities", authMiddleware.protect, entityRoutes);
apiRouter.use("/entity", authMiddleware.protect, entityRoutes);
apiRouter.use("/staff", authMiddleware.protect, staffRoutes);
apiRouter.use("/approvals", authMiddleware.protect, approvalRoutes);

// 404 Handler for API
apiRouter.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `API Endpoint not found: ${req.method} ${req.originalUrl}`,
  });
});

// Global Fallback 404
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Endpoint not found",
  });
});

// Global Error Handler
app.use(errorMiddleware);

module.exports = app;
