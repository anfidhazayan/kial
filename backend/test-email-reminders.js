require("dotenv").config();
const { checkExpiringCertificates } = require("./src/services/cronService");

async function runTest() {
  console.log("=== Starting Manual Email Reminder Test ===");
  try {
    await checkExpiringCertificates();
    console.log("=== Manual Test Completed Successfully ===");
  } catch (error) {
    console.error("=== Test Failed ===", error);
  }
  process.exit();
}

runTest();
