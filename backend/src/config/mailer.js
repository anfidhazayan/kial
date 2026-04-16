// Mock transporter for development if email is not configured
let transporter;

try {
  const nodemailerModule = require("nodemailer");
  const nodemailer = nodemailerModule.default || nodemailerModule;

  if (process.env.SMTP_USER && process.env.SMTP_PASS) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    // Verify connection configuration
    transporter.verify((error, success) => {
      if (error) {
        console.log("⚠️  Email configuration error:", error.message);
      } else {
        console.log("✅ Email server is ready to send messages");
      }
    });
  } else {
    // Create mock transporter for development
    console.log("⚠️  Email not configured. Using mock transporter.");
    transporter = {
      sendMail: async (mailOptions) => {
        console.log("📧 Mock email sent:");
        console.log("   To:", mailOptions.to);
        console.log("   Subject:", mailOptions.subject);
        return { messageId: "mock-" + Date.now() };
      },
      verify: (callback) => callback && callback(null, true),
    };
  }
} catch (error) {
  console.error("❌ Failed to initialize email service:", error.message);
  // Fallback mock transporter
  transporter = {
    sendMail: async (mailOptions) => {
      console.log("📧 Mock email (error fallback):", mailOptions.subject);
      return { messageId: "mock-error-" + Date.now() };
    },
    verify: (callback) => callback && callback(null, true),
  };
}

module.exports = transporter;
