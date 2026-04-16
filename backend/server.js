require("dotenv").config();
const app = require("./src/app");
const { startCronJobs } = require("./src/services/cronService");

// Enforce JWT_SECRET in production
if (process.env.NODE_ENV === "production" && !process.env.JWT_SECRET) {
  console.error("❌ FATAL: JWT_SECRET must be set in production environment");
  process.exit(1);
}

if (!process.env.JWT_SECRET) {
  console.warn("⚠️  WARNING: Using default JWT_SECRET. Set a strong secret in production!");
}

const PORT = process.env.PORT || 5000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🔗 API Base: http://0.0.0.0:${PORT}/api`);
  console.log(
    `📧 Email alerts: ${process.env.SMTP_USER ? "Enabled" : "Disabled"}`
  );

  // Start cron jobs for expiry checks
  if (process.env.ENABLE_CRON !== "false") {
    startCronJobs();
  }
});
