const transporter = require("../config/mailer");
const { format, differenceInDays } = require("date-fns");

/**
 * Get urgency color and emoji for email
 */
function getUrgencyStyle(urgency) {
  switch (urgency) {
    case "URGENT":
      return { color: "#dc2626", emoji: "🔴", label: "URGENT" };
    case "WARNING":
      return { color: "#f59e0b", emoji: "🟡", label: "WARNING" };
    case "NOTICE":
      return { color: "#3b82f6", emoji: "🔵", label: "NOTICE" };
    default:
      return { color: "#6b7280", emoji: "⚪", label: "INFO" };
  }
}

/**
 * Send expiry alert email to ASCO with improved formatting
 */
async function sendExpiryAlert(entity, expiringItems) {
  if (!entity.ascoEmail) {
    console.log(`No email found for entity: ${entity.name}`);
    return;
  }

  // Group items by urgency
  const urgentItems = expiringItems.filter((i) => i.urgency === "URGENT");
  const warningItems = expiringItems.filter((i) => i.urgency === "WARNING");
  const noticeItems = expiringItems.filter((i) => i.urgency === "NOTICE");

  // Determine overall urgency for subject line
  const hasUrgent = urgentItems.length > 0;
  const hasWarning = warningItems.length > 0;
  const subjectPrefix = hasUrgent
    ? "🔴 URGENT"
    : hasWarning
    ? "🟡 WARNING"
    : "🔵 NOTICE";

  // Build plain text list
  const buildTextList = (items) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return items
      .map((item) => {
        const style = getUrgencyStyle(item.urgency);
        const validTo = new Date(item.validTo);
        validTo.setHours(0, 0, 0, 0);
        
        const daysLeft = differenceInDays(validTo, today);
        const daysText = daysLeft < 0 ? `(Expired ${Math.abs(daysLeft)} days ago)` : daysLeft === 0 ? `(Expires Today)` : `(Expires in ${daysLeft} days)`;
        
        return `  ${style.emoji} [${item.category}] ${item.type}: ${item.staffName} - Expires on ${format(
          new Date(item.validTo),
          "dd-MM-yyyy"
        )} ${daysText}`;
      })
      .join("\n");
  };

  // Build HTML list section
  const buildHtmlSection = (title, items, color) => {
    if (items.length === 0) return "";
    return `
      <h3 style="color: ${color}; margin-top: 20px; margin-bottom: 10px; border-bottom: 2px solid ${color}; padding-bottom: 5px;">${title} (${items.length})</h3>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 15px;">
        <thead>
          <tr style="background-color: #f3f4f6;">
            <th style="padding: 8px; text-align: left; border: 1px solid #e5e7eb;">Category</th>
            <th style="padding: 8px; text-align: left; border: 1px solid #e5e7eb;">Type</th>
            <th style="padding: 8px; text-align: left; border: 1px solid #e5e7eb;">Staff/Entity</th>
            <th style="padding: 8px; text-align: left; border: 1px solid #e5e7eb;">Expiry Date</th>
          </tr>
        </thead>
        <tbody>
          ${items
            .map(
              (item) => {
                const validTo = new Date(item.validTo);
                validTo.setHours(0, 0, 0, 0);
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const daysLeft = differenceInDays(validTo, today);
                
                let daysBadge = "";
                if (daysLeft < 0) {
                  daysBadge = `<br><span style="font-size: 11px; padding: 2px 6px; background-color: #fee2e2; color: #991b1b; border-radius: 4px; display: inline-block; margin-top: 4px;">Expired ${Math.abs(daysLeft)} days ago</span>`;
                } else if (daysLeft === 0) {
                  daysBadge = `<br><span style="font-size: 11px; padding: 2px 6px; background-color: #fee2e2; color: #991b1b; border-radius: 4px; display: inline-block; margin-top: 4px;">Expires Today</span>`;
                } else {
                  daysBadge = `<br><span style="font-size: 11px; padding: 2px 6px; background-color: #f3f4f6; color: #4b5563; border-radius: 4px; display: inline-block; margin-top: 4px;">In ${daysLeft} ${daysLeft === 1 ? 'day' : 'days'}</span>`;
                }
                
                return `
            <tr>
              <td style="padding: 8px; border: 1px solid #e5e7eb;">${item.category}</td>
              <td style="padding: 8px; border: 1px solid #e5e7eb;"><strong>${item.type}</strong></td>
              <td style="padding: 8px; border: 1px solid #e5e7eb;">${item.staffName}</td>
              <td style="padding: 8px; border: 1px solid #e5e7eb; color: ${color}; font-weight: bold;">
                ${format(new Date(item.validTo), "dd-MM-yyyy")}
                ${daysBadge}
              </td>
            </tr>
          `;
              }
            )
            .join("")}
        </tbody>
      </table>
    `;
  };

  // Build summary text
  const summaryParts = [];
  if (urgentItems.length > 0) summaryParts.push(`${urgentItems.length} URGENT`);
  if (warningItems.length > 0) summaryParts.push(`${warningItems.length} WARNING`);
  if (noticeItems.length > 0) summaryParts.push(`${noticeItems.length} NOTICE`);
  const summaryText = summaryParts.join(", ");

  const mailOptions = {
    from: process.env.SMTP_FROM || "noreply@kial.avsec.com",
    to: entity.ascoEmail,
    subject: `${subjectPrefix}: ${expiringItems.length} Certificates/Documents Expiring Soon - ${entity.name}`,
    text: `Dear ${entity.ascoUser?.fullName || "ASCO"},

EXPIRY ALERT for "${entity.name}"

Summary: ${summaryText}

The following certificates/documents are expiring soon:

${urgentItems.length > 0 ? `=== URGENT (within 7 days) ===\n${buildTextList(urgentItems)}\n\n` : ""}${warningItems.length > 0 ? `=== WARNING (within 14 days) ===\n${buildTextList(warningItems)}\n\n` : ""}${noticeItems.length > 0 ? `=== NOTICE (within 30 days) ===\n${buildTextList(noticeItems)}\n\n` : ""}
Please take immediate action to renew these certificates/documents.

Regards,
KIAL AVSEC Team

---
This is an automated message from KIAL AVSEC Data Management System.`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0; font-size: 24px;">⚠️ Expiry Alert</h1>
          <p style="margin: 5px 0 0 0; opacity: 0.9;">KIAL Aviation Security Data Management</p>
        </div>
        
        <div style="background-color: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: none;">
          <p>Dear <strong>${entity.ascoUser?.fullName || "ASCO"}</strong>,</p>
          
          <div style="background-color: ${hasUrgent ? "#fef2f2" : hasWarning ? "#fffbeb" : "#eff6ff"}; 
                      border-left: 4px solid ${hasUrgent ? "#dc2626" : hasWarning ? "#f59e0b" : "#3b82f6"}; 
                      padding: 15px; margin: 15px 0; border-radius: 0 8px 8px 0;">
            <strong style="color: ${hasUrgent ? "#dc2626" : hasWarning ? "#f59e0b" : "#3b82f6"};">
              ${subjectPrefix}: ${expiringItems.length} items require attention
            </strong>
            <p style="margin: 5px 0 0 0;">Entity: <strong>${entity.name}</strong></p>
            <p style="margin: 5px 0 0 0;">Summary: ${summaryText}</p>
          </div>
          
          ${buildHtmlSection("🔴 URGENT - Expiring within 7 days", urgentItems, "#dc2626")}
          ${buildHtmlSection("🟡 WARNING - Expiring within 14 days", warningItems, "#f59e0b")}
          ${buildHtmlSection("🔵 NOTICE - Expiring within 30 days", noticeItems, "#3b82f6")}
          
          <div style="background-color: #fef3c7; border: 1px solid #fcd34d; padding: 15px; border-radius: 8px; margin-top: 20px;">
            <strong>Action Required</strong>
            <p style="margin: 5px 0 0 0;">Please take immediate action to renew the above certificates/documents before they expire.</p>
          </div>
          
          <p style="margin-top: 30px;">Regards,<br><strong>KIAL AVSEC Team</strong></p>
        </div>
        
        <div style="background-color: #1f2937; color: #9ca3af; padding: 15px; border-radius: 0 0 8px 8px; font-size: 12px; text-align: center;">
          <p style="margin: 0;">This is an automated message from KIAL AVSEC System.</p>
          <p style="margin: 5px 0 0 0;">Generated on ${format(new Date(), "dd MMM yyyy 'at' HH:mm")}</p>
        </div>
      </body>
      </html>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Expiry alert sent to ${entity.ascoEmail} (${expiringItems.length} items)`);
  } catch (error) {
    console.error(`Failed to send email to ${entity.ascoEmail}:`, error);
    throw error; // Re-throw to allow caller to handle
  }
}

/**
 * Send expiry alert email to an individual staff member
 */
async function sendStaffExpiryAlert(staffName, email, expiringItems) {
  if (!email) {
    console.log(`No email found for staff: ${staffName}`);
    return;
  }

  // Group items by urgency
  const urgentItems = expiringItems.filter((i) => i.urgency === "URGENT");
  const warningItems = expiringItems.filter((i) => i.urgency === "WARNING");
  const noticeItems = expiringItems.filter((i) => i.urgency === "NOTICE");

  const hasUrgent = urgentItems.length > 0;
  const hasWarning = warningItems.length > 0;
  const subjectPrefix = hasUrgent
    ? "🔴 URGENT"
    : hasWarning
    ? "🟡 WARNING"
    : "🔵 NOTICE";

  const buildTextList = (items) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return items
      .map((item) => {
        const style = getUrgencyStyle(item.urgency);
        const validTo = new Date(item.validTo);
        validTo.setHours(0, 0, 0, 0);
        
        const daysLeft = differenceInDays(validTo, today);
        const daysText = daysLeft < 0 ? `(Expired ${Math.abs(daysLeft)} days ago)` : daysLeft === 0 ? `(Expires Today)` : `(Expires in ${daysLeft} days)`;
        
        return `  ${style.emoji} [${item.category}] ${item.type} - Expires on ${format(
          new Date(item.validTo),
          "dd-MM-yyyy"
        )} ${daysText}`;
      })
      .join("\n");
  };

  const buildHtmlSection = (title, items, color) => {
    if (items.length === 0) return "";
    return `
      <h3 style="color: ${color}; margin-top: 20px; margin-bottom: 10px; border-bottom: 2px solid ${color}; padding-bottom: 5px;">${title} (${items.length})</h3>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 15px;">
        <thead>
          <tr style="background-color: #f3f4f6;">
            <th style="padding: 8px; text-align: left; border: 1px solid #e5e7eb;">Category</th>
            <th style="padding: 8px; text-align: left; border: 1px solid #e5e7eb;">Type</th>
            <th style="padding: 8px; text-align: left; border: 1px solid #e5e7eb;">Expiry Date</th>
          </tr>
        </thead>
        <tbody>
          ${items
            .map(
              (item) => {
                const validTo = new Date(item.validTo);
                validTo.setHours(0, 0, 0, 0);
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const daysLeft = differenceInDays(validTo, today);
                
                let daysBadge = "";
                if (daysLeft < 0) {
                  daysBadge = `<br><span style="font-size: 11px; padding: 2px 6px; background-color: #fee2e2; color: #991b1b; border-radius: 4px; display: inline-block; margin-top: 4px;">Expired ${Math.abs(daysLeft)} days ago</span>`;
                } else if (daysLeft === 0) {
                  daysBadge = `<br><span style="font-size: 11px; padding: 2px 6px; background-color: #fee2e2; color: #991b1b; border-radius: 4px; display: inline-block; margin-top: 4px;">Expires Today</span>`;
                } else {
                  daysBadge = `<br><span style="font-size: 11px; padding: 2px 6px; background-color: #f3f4f6; color: #4b5563; border-radius: 4px; display: inline-block; margin-top: 4px;">In ${daysLeft} ${daysLeft === 1 ? 'day' : 'days'}</span>`;
                }
                
                return `
            <tr>
              <td style="padding: 8px; border: 1px solid #e5e7eb;">${item.category}</td>
              <td style="padding: 8px; border: 1px solid #e5e7eb;"><strong>${item.type}</strong></td>
              <td style="padding: 8px; border: 1px solid #e5e7eb; color: ${color}; font-weight: bold;">
                ${format(new Date(item.validTo), "dd-MM-yyyy")}
                ${daysBadge}
              </td>
            </tr>
          `;
              }
            )
            .join("")}
        </tbody>
      </table>
    `;
  };

  const summaryParts = [];
  if (urgentItems.length > 0) summaryParts.push(`${urgentItems.length} URGENT`);
  if (warningItems.length > 0) summaryParts.push(`${warningItems.length} WARNING`);
  if (noticeItems.length > 0) summaryParts.push(`${noticeItems.length} NOTICE`);
  const summaryText = summaryParts.join(", ");

  const mailOptions = {
    from: process.env.SMTP_FROM || "noreply@kial.avsec.com",
    to: email,
    subject: `${subjectPrefix}: ${expiringItems.length} of Your Certificates Expiring Soon`,
    text: `Dear ${staffName},

CERTIFICATE EXPIRY ALERT

Summary: ${summaryText}

The following certificates are expiring soon:

${urgentItems.length > 0 ? `=== URGENT (within 7 days) ===\n${buildTextList(urgentItems)}\n\n` : ""}${warningItems.length > 0 ? `=== WARNING (within 14 days) ===\n${buildTextList(warningItems)}\n\n` : ""}${noticeItems.length > 0 ? `=== NOTICE (within 30 days) ===\n${buildTextList(noticeItems)}\n\n` : ""}
Please take immediate action to renew these certificates.

Regards,
KIAL AVSEC Team

---
This is an automated message from KIAL AVSEC Data Management System.`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0; font-size: 24px;">⚠️ Certificate Expiry Alert</h1>
          <p style="margin: 5px 0 0 0; opacity: 0.9;">KIAL Aviation Security Data Management</p>
        </div>
        
        <div style="background-color: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: none;">
          <p>Dear <strong>${staffName}</strong>,</p>
          
          <div style="background-color: ${hasUrgent ? "#fef2f2" : hasWarning ? "#fffbeb" : "#eff6ff"}; 
                      border-left: 4px solid ${hasUrgent ? "#dc2626" : hasWarning ? "#f59e0b" : "#3b82f6"}; 
                      padding: 15px; margin: 15px 0; border-radius: 0 8px 8px 0;">
            <strong style="color: ${hasUrgent ? "#dc2626" : hasWarning ? "#f59e0b" : "#3b82f6"};">
              ${subjectPrefix}: ${expiringItems.length} of your certificates require attention
            </strong>
            <p style="margin: 5px 0 0 0;">Summary: ${summaryText}</p>
          </div>
          
          ${buildHtmlSection("🔴 URGENT - Expiring within 7 days", urgentItems, "#dc2626")}
          ${buildHtmlSection("🟡 WARNING - Expiring within 14 days", warningItems, "#f59e0b")}
          ${buildHtmlSection("🔵 NOTICE - Expiring within 30 days", noticeItems, "#3b82f6")}
          
          <div style="background-color: #fef3c7; border: 1px solid #fcd34d; padding: 15px; border-radius: 8px; margin-top: 20px;">
            <strong>Action Required</strong>
            <p style="margin: 5px 0 0 0;">Please take immediate action to renew the above certificates before they expire.</p>
          </div>
          
          <p style="margin-top: 30px;">Regards,<br><strong>KIAL AVSEC Team</strong></p>
        </div>
        
        <div style="background-color: #1f2937; color: #9ca3af; padding: 15px; border-radius: 0 0 8px 8px; font-size: 12px; text-align: center;">
          <p style="margin: 0;">This is an automated message from KIAL AVSEC System.</p>
          <p style="margin: 5px 0 0 0;">Generated on ${format(new Date(), "dd MMM yyyy 'at' HH:mm")}</p>
        </div>
      </body>
      </html>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Staff expiry alert sent to ${email} for ${staffName} (${expiringItems.length} items)`);
  } catch (error) {
    console.error(`Failed to send staff email to ${email}:`, error);
    throw error;
  }
}

/**
 * Send approval notification
 */
async function sendApprovalNotification(
  email,
  staffName,
  certificateType,
  status
) {
  if (!email) return;

  const statusText = status === "APPROVED" ? "approved" : "rejected";
  const statusColor = status === "APPROVED" ? "#10b981" : "#ef4444";
  const statusEmoji = status === "APPROVED" ? "✅" : "❌";

  const mailOptions = {
    from: process.env.SMTP_FROM || "noreply@kial.avsec.com",
    to: email,
    subject: `${statusEmoji} Certificate ${statusText.toUpperCase()}: ${certificateType}`,
    text: `The certificate renewal request for ${staffName} (${certificateType}) has been ${statusText}.

Regards,
KIAL AVSEC Team`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0; font-size: 24px;">${statusEmoji} Certificate ${statusText.charAt(0).toUpperCase() + statusText.slice(1)}</h1>
        </div>
        
        <div style="background-color: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
          <div style="background-color: ${status === "APPROVED" ? "#ecfdf5" : "#fef2f2"}; 
                      border-left: 4px solid ${statusColor}; 
                      padding: 15px; margin: 15px 0; border-radius: 0 8px 8px 0;">
            <p style="margin: 0;">The certificate renewal request has been <strong style="color: ${statusColor};">${statusText.toUpperCase()}</strong></p>
            <p style="margin: 10px 0 0 0;"><strong>Staff:</strong> ${staffName}</p>
            <p style="margin: 5px 0 0 0;"><strong>Certificate:</strong> ${certificateType}</p>
          </div>
          
          <p style="margin-top: 20px;">Regards,<br><strong>KIAL AVSEC Team</strong></p>
        </div>
      </body>
      </html>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Approval notification sent to ${email}`);
  } catch (error) {
    console.error(`Failed to send email to ${email}:`, error);
  }
}

module.exports = {
  sendExpiryAlert,
  sendStaffExpiryAlert,
  sendApprovalNotification,
};
