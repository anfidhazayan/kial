const cron = require("node-cron");
const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const { Pool } = require("pg");
const { addDays } = require("date-fns");
const { sendExpiryAlert, sendStaffExpiryAlert } = require("./emailService");

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// Configurable expiry thresholds (in days)
const EXPIRY_THRESHOLDS = {
  URGENT: 7,
  WARNING: 14,
  NOTICE: 30,
};

/**
 * Helper to check if a date is expiring within given days
 */
function isExpiringWithinDays(date, days) {
  if (!date) return false;
  const targetDate = new Date(date);
  const now = new Date();
  const threshold = addDays(now, days);
  return targetDate <= threshold && targetDate >= now;
}

/**
 * Get urgency level based on expiry date
 */
function getUrgencyLevel(validTo) {
  if (!validTo) return null;
  if (isExpiringWithinDays(validTo, EXPIRY_THRESHOLDS.URGENT)) return "URGENT";
  if (isExpiringWithinDays(validTo, EXPIRY_THRESHOLDS.WARNING)) return "WARNING";
  if (isExpiringWithinDays(validTo, EXPIRY_THRESHOLDS.NOTICE)) return "NOTICE";
  return null;
}

/**
 * Check for expiring staff certificates
 */
async function getExpiringStaffCertificates(thirtyDaysFromNow) {
  return await prisma.certificate.findMany({
    where: {
      validTo: {
        lte: thirtyDaysFromNow,
        gte: new Date(),
      },
      status: "APPROVED",
    },
    include: {
      staff: {
        include: {
          user: true,
          entity: {
            include: {
              ascoUser: true,
            },
          },
        },
      },
    },
  });
}

/**
 * Check for expiring entity certificates
 */
async function getExpiringEntityCertificates(thirtyDaysFromNow) {
  return await prisma.entityCertificate.findMany({
    where: {
      validTo: {
        lte: thirtyDaysFromNow,
        gte: new Date(),
      },
      status: "APPROVED",
    },
    include: {
      entity: {
        include: {
          ascoUser: true,
        },
      },
    },
  });
}


/**
 * Check for expiring certificates and send alerts
 */
async function checkExpiringCertificates() {
  console.log("Running comprehensive expiry check job...");

  try {
    const thirtyDaysFromNow = addDays(new Date(), EXPIRY_THRESHOLDS.NOTICE);

    // Maps for grouping: staffEmailMap for individual staff, entityMap for entity heads
    const staffEmailMap = new Map(); // key = staff user email
    const entityEmailMap = new Map(); // key = entity ascoEmail

    // Helper to add item to a recipient map
    const addToMap = (map, key, recipientInfo, item) => {
      if (!key) return;
      if (!map.has(key)) {
        map.set(key, { ...recipientInfo, items: [] });
      }
      map.get(key).items.push(item);
    };

    // 1. Check staff certificates
    console.log("  Checking staff certificates...");
    const expiringCertificates = await getExpiringStaffCertificates(thirtyDaysFromNow);

    for (const cert of expiringCertificates) {
      const staff = cert.staff;
      const certItem = {
        category: "Staff Certificate",
        type: cert.type,
        staffName: staff.fullName,
        validTo: cert.validTo,
        urgency: getUrgencyLevel(cert.validTo),
      };

      if (staff.isKialStaff) {
        // KIAL staff: send to their own user email if they have one
        const staffEmail = staff.user?.email;
        if (staffEmail) {
          addToMap(staffEmailMap, staffEmail, {
            staffName: staff.fullName,
            email: staffEmail,
          }, certItem);
        } else {
          // Fallback: send to admin email
          const adminEmail = process.env.ADMIN_EMAIL || process.env.SMTP_FROM;
          if (adminEmail) {
            addToMap(entityEmailMap, adminEmail, {
              entity: {
                id: "kial-internal",
                name: "KIAL (Internal Staff)",
                ascoEmail: adminEmail,
                ascoUser: { fullName: "KIAL Administrator" },
              },
            }, certItem);
          }
        }
      } else {
        // Entity staff: send to entity head (ascoEmail)
        const entity = staff.entity;
        if (entity?.ascoEmail) {
          addToMap(entityEmailMap, entity.ascoEmail, { entity }, certItem);
        }
      }
    }
    console.log(`    Found ${expiringCertificates.length} expiring staff certificates`);

    // 2. Check entity certificates
    console.log("  Checking entity certificates...");
    const expiringEntityCerts = await getExpiringEntityCertificates(thirtyDaysFromNow);

    for (const cert of expiringEntityCerts) {
      if (!cert.entity?.ascoEmail) continue;

      addToMap(entityEmailMap, cert.entity.ascoEmail, { entity: cert.entity }, {
        category: "Entity Certificate",
        type: cert.type,
        staffName: "Entity-Level",
        validTo: cert.validTo,
        urgency: getUrgencyLevel(cert.validTo),
      });
    }
    console.log(`    Found ${expiringEntityCerts.length} expiring entity certificates`);

    // 3. Send emails
    console.log("  Sending notification emails...");
    let emailsSent = 0;
    let emailsFailed = 0;

    const sortByUrgency = (items) => {
      items.sort((a, b) => {
        const urgencyOrder = { URGENT: 0, WARNING: 1, NOTICE: 2 };
        return (urgencyOrder[a.urgency] || 3) - (urgencyOrder[b.urgency] || 3);
      });
    };

    // Send individual staff emails (KIAL staff with user accounts)
    for (const [email, data] of staffEmailMap) {
      sortByUrgency(data.items);
      try {
        await sendStaffExpiryAlert(data.staffName, email, data.items);
        emailsSent++;
      } catch (error) {
        console.error(`Failed to send staff alert to ${email}:`, error.message);
        emailsFailed++;
      }
    }

    // Send entity head emails (entity staff certs + entity certs)
    for (const [email, data] of entityEmailMap) {
      sortByUrgency(data.items);
      try {
        await sendExpiryAlert(data.entity, data.items);
        emailsSent++;
      } catch (error) {
        console.error(`Failed to send entity alert to ${email}:`, error.message);
        emailsFailed++;
      }
    }

    const totalItems = [...staffEmailMap.values(), ...entityEmailMap.values()]
      .reduce((sum, d) => sum + d.items.length, 0);

    console.log(`Expiry check completed:`);
    console.log(`  - Staff emails sent: ${staffEmailMap.size}`);
    console.log(`  - Entity head emails sent: ${entityEmailMap.size}`);
    console.log(`  - Total emails sent: ${emailsSent}`);
    console.log(`  - Emails failed: ${emailsFailed}`);
    console.log(`  - Total items flagged: ${totalItems}`);

  } catch (error) {
    console.error("Error in expiry check job:", error);
  }
}

/**
 * Start cron jobs
 */
function startCronJobs() {
  // Run every day at 9 AM
  cron.schedule("0 9 * * *", checkExpiringCertificates);

  // For testing: Run every minute (comment out in production)
  // cron.schedule("* * * * *", checkExpiringCertificates);

  console.log("Cron jobs started (daily at 9 AM)");
  console.log(`  - Expiry thresholds: URGENT=${EXPIRY_THRESHOLDS.URGENT}d, WARNING=${EXPIRY_THRESHOLDS.WARNING}d, NOTICE=${EXPIRY_THRESHOLDS.NOTICE}d`);
}

module.exports = {
  startCronJobs,
  checkExpiringCertificates,
  EXPIRY_THRESHOLDS,
};
