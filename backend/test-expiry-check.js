require("dotenv").config();
const { checkExpiringCertificates } = require("./src/services/cronService");
const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const { Pool } = require("pg");

// Helper to check DB connection first
async function checkConnection() {
  console.log("Checking database connection...");
  try {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const adapter = new PrismaPg(pool);
    const prisma = new PrismaClient({ adapter });
    await prisma.$connect();
    console.log("✅ Database connected successfully");
    await prisma.$disconnect();
    return true;
  } catch (error) {
    console.error("❌ Database connection failed:", error.message);
    console.log("Please check your .env file and ensure DATABASE_URL is correct.");
    return false;
  }
}

async function runTest() {
  console.log("==================================================");
  console.log("🧪 TESTING EXPIRY CHECK REMINDER SYSTEM");
  console.log("==================================================");

  if (!process.env.DATABASE_URL) {
    console.error("❌ DATABASE_URL is not set in environment variables");
    return;
  }

  const isConnected = await checkConnection();
  if (!isConnected) return;

  console.log("\n🚀 Starting expiry check (Dry Run Mode - Emails will be mocked if SMTP is missing)...");
  
  try {
    const startTime = Date.now();
    await checkExpiringCertificates();
    const duration = Date.now() - startTime;
    
    console.log("\n==================================================");
    console.log(`✅ Test completed in ${duration}ms`);
    console.log("==================================================");
    console.log("If you saw 'Expiry check completed' above, the logic is working.");
    console.log("Check the console output for any 'Mock email sent' messages.");
  } catch (error) {
    console.error("\n❌ Test failed with error:", error);
  } finally {
    process.exit(0);
  }
}

runTest();
