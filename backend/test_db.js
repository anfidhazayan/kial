require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
  try {
    console.log("Using DATABASE_URL:", process.env.DATABASE_URL);
    await prisma.$connect();
    console.log("✅ Connection successful!");
  } catch(e) {
    console.error("❌ Connection error:");
    console.error(e.message);
  } finally {
    await prisma.$disconnect();
  }
}

test();
