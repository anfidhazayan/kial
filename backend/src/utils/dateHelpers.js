const { parse, isValid, addDays } = require("date-fns");

/**
 * Convert Excel serial date to JavaScript Date
 * Excel stores dates as numbers (days since 1900-01-01)
 */
function excelDateToJSDate(serial) {
  if (!serial || isNaN(serial)) return null;

  const utc_days = Math.floor(serial - 25569);
  const utc_value = utc_days * 86400;
  const date_info = new Date(utc_value * 1000);

  return new Date(
    date_info.getFullYear(),
    date_info.getMonth(),
    date_info.getDate()
  );
}

/**
 * Parse various date formats from Excel
 */
function parseExcelDate(value) {
  if (!value) return null;

  // If it's already a Date object
  if (value instanceof Date) {
    return isValid(value) ? value : null;
  }

  // If it's a number (Excel serial date)
  if (typeof value === "number") {
    return excelDateToJSDate(value);
  }

  // If it's a string, try to parse common formats
  if (typeof value === "string") {
    // Try DD-MM-YYYY
    let date = parse(value, "dd-MM-yyyy", new Date());
    if (isValid(date)) return date;

    // Try DD/MM/YYYY
    date = parse(value, "dd/MM/yyyy", new Date());
    if (isValid(date)) return date;

    // Try MM-DD-YYYY
    date = parse(value, "MM-dd-yyyy", new Date());
    if (isValid(date)) return date;

    // Try ISO format
    date = new Date(value);
    if (isValid(date)) return date;
  }

  return null;
}

/**
 * Check if date is within X days
 */
function isExpiringSoon(date, daysThreshold = 30) {
  if (!date) return false;
  const targetDate = new Date(date);
  const threshold = addDays(new Date(), daysThreshold);
  return targetDate <= threshold && targetDate >= new Date();
}

/**
 * Check if date is expired
 */
function isExpired(date) {
  if (!date) return false;
  return new Date(date) < new Date();
}

module.exports = {
  excelDateToJSDate,
  parseExcelDate,
  isExpiringSoon,
  isExpired,
};
