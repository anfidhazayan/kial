const xlsx = require("xlsx");
const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const { Pool } = require("pg");
const { hashPassword } = require("./authService");
const { generatePassword } = require("../utils/passwordGenerator");

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

/**
 * Helper: Parse Excel Dates
 * Excel stores dates as serial numbers (e.g., 44562 = Jan 1, 2022).
 * Sometimes it stores them as strings ("12/01/2023").
 */
const parseExcelDate = (value) => {
  if (!value) return null;

  // Case 1: JS Date object (rare but possible)
  if (value instanceof Date) return value;

  // Case 2: Excel Serial Number (e.g., 44562)
  if (typeof value === "number") {
    // Excel base date is Dec 30, 1899
    return new Date(Math.round((value - 25569) * 86400 * 1000));
  }

  // Case 3: String Date (DD-MM-YYYY, DD/MM/YYYY, or DD.MM.YYYY)
  if (typeof value === "string") {
    const cleanStr = value.trim();
    // Try each separator: dash, slash, dot
    for (const sep of ["-", "/", "."]) {
      if (cleanStr.includes(sep)) {
        // Strip any inner spaces before splitting
        const parts = cleanStr.split(sep).map(p => p.trim());
        if (parts.length === 3) {
          // If the year is 2 digits, assume 20xx
          let year = parts[2];
          if (year.length === 2) year = "20" + year;
          
          const parsed = new Date(`${year}-${parts[1]}-${parts[0]}`);
          if (!isNaN(parsed.getTime())) return parsed;
        }
      }
    }
  }
  
  console.log(`Warning: Failed to parse date string: "${value}"`);
  return null; // Invalid date
};

exports.parseEntityFile = async (filePath) => {
  // 1. Read the Excel File
  const workbook = xlsx.readFile(filePath);
  // Assume data is in the first sheet
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];

  // Convert sheet to JSON (Header is Row 1)
  // defval: "" ensures missing cells are empty strings, not undefined
  let data = xlsx.utils.sheet_to_json(sheet, { defval: "" });

  // Detect merged header pattern: if columns are __EMPTY, the first data row contains real headers
  if (data.length > 0) {
    const keys = Object.keys(data[0]);
    const hasEmptyKeys = keys.some(k => k.startsWith("__EMPTY"));

    if (hasEmptyKeys) {
      console.log("Detected merged header row, remapping columns...");
      // Build a mapping: __EMPTY key -> actual header name from first row values
      const headerRow = data[0];
      const columnMap = {};
      for (const [key, value] of Object.entries(headerRow)) {
        const headerName = String(value).replace(/\r\n/g, " ").replace(/\n/g, " ").trim();
        if (headerName) {
          columnMap[key] = headerName;
        }
      }
      console.log("Column mapping:", columnMap);

      // Skip the header row and remap all subsequent rows
      data = data.slice(1).map(row => {
        const remapped = {};
        for (const [key, value] of Object.entries(row)) {
          const newKey = columnMap[key] || key;
          remapped[newKey] = value;
        }
        return remapped;
      });
    }
  }

  console.log(`Starting Import: Processing ${data.length} rows...`);
  if (data.length > 0) {
    console.log("Entity Excel columns detected:", Object.keys(data[0]));
    console.log("First row sample:", data[0]);
  }

  const results = { success: 0, errors: [] };

  // 2. Iterate through every row
  for (let i = 0; i < data.length; i++) {
    const row = data[i];

    // Skip empty rows (check if 'Name of Entity' or 'Entity Name' is missing)
    const entityName = row["Name of Entity"] || row["Entity Name"];
    if (!entityName) continue;

    try {
      // --- A. Extract Raw Data ---
      const category = row["Category"];
      const ascoName = row["CSO/ ASCO Name"] || row["ASCO Name"];
      const ascoEmail = row["ASCO E-mail ID"] || row["ASCO Email"];
      const ascoContact = row["ASCO Contact No."] || row["ASCO Contact No"];
      const entityCode = row["Entity Code"] || row["Entity ID"] || row["Code"] || null;

      // --- B. Handle ASCO User Creation ---
      // If this entity has an ASCO Email, we ensure a User account exists for them.
      let ascoUser = null;
      let ascoPlainPassword = null;
      if (ascoEmail && ascoEmail.includes("@")) {
        // Auto-generate unique password
        ascoPlainPassword = generatePassword();
        const hashedPassword = await hashPassword(ascoPlainPassword);

        // Upsert = Create if new, Update (do nothing) if exists
        ascoUser = await prisma.user.upsert({
          where: { email: ascoEmail },
          update: {}, // Don't change existing user details
          create: {
            email: ascoEmail,
            fullName: ascoName || "ASCO User",
            role: "ENTITY_HEAD",
            passwordHash: hashedPassword,
          },
        });
      }

      // --- C. Upsert Entity Record (by entityCode or name) ---
      const entityData = {
        name: entityName,
        externalEntityCode: entityCode || null,
        category: category,

        // Compliance Statuses + Expiry Dates
        securityClearanceStatus: row["Security Clearance Status"] || null,
        securityClearanceValidTo: parseExcelDate(
          row["Security Clearance Expiry"] || row["Security Clearance Validity"] || row["Security Clearance Valid To"]
        ),
        securityProgramStatus: row["Security Programme Status"] || null,
        securityProgramValidTo: parseExcelDate(
          row["Security Programme Expiry"] || row["Security Programme Validity"] || row["Security Programme Valid To"]
        ),
        qcpStatus: row["QCP Status "] || row["QCP Status"] || null,
        qcpSubmissionDate: parseExcelDate(row["QCP submission date"] || row["QCP Submission Date"]),
        qcpValidTo: parseExcelDate(
          row["QCP Expiry"] || row["QCP Valid To"] || row["QCP Validity"]
        ),

        // Dates
        contractValidFrom: parseExcelDate(
          row["Contract validity with KIAL... From"] || row["Contract Valid From"]
        ),
        contractValidTo: parseExcelDate(row["To"] || row["Contract Valid To"]),

        // ASCO Linkage
        // Only link ascoUserId if we successfully created/found one. Note: schema has @unique on ascoUserId, so 1 User = 1 Entity. 
        // If an ASCO manages multiple entities, this constraint will fail. Let's gracefully skip linking the ID if it's already used.
        ascoUserId: undefined, // We'll handle this safely below
        ascoName: ascoName,
        ascoContactNo: String(ascoContact || ""),
        ascoEmail: ascoEmail,
        ascoTrainingValidFrom: parseExcelDate(
          row["CSO/ ASCO AvSec Basic/ Induction Training Validity... From"] || row["ASCO Training Valid From"]
        ),
        ascoTrainingValidTo: parseExcelDate(
          row["CSO/ ASCO AvSec Basic/ Induction Training Validity... To"] || row["ASCO Training Valid To"]
        ),

        // KIAL PoC Details
        kialPocName: row["Name of PoC at KIAL"] || row["KIAL PoC Name"],
        kialPocNumber: String(row["Mob No. of PoC at KIAL"] || row["KIAL PoC Contact"] || ""),
        kialPocEmail: row["Email ID of POC at KIAL"] || row["KIAL PoC Email"],

        // Store the ASCO plaintext password so CSO can view it
        password: ascoPlainPassword || undefined,
      };

      // Safely check and link ascoUser to avoid Unique Constraint violation
      if (ascoUser) {
        const existingLink = await prisma.entity.findFirst({
          where: { ascoUserId: ascoUser.id },
        });
        // Link the user if it's not linked to anyone else, OR if it's currently linked to THIS entity
        if (!existingLink || existingLink.externalEntityCode === entityCode) {
           entityData.ascoUserId = ascoUser.id;
        }
      }

      if (entityCode) {
        // Upsert by entity code — update existing or create new
        await prisma.entity.upsert({
          where: { externalEntityCode: entityCode },
          update: entityData,
          create: entityData,
        });
      } else {
        // No entity code — fall back to create
        await prisma.entity.create({ data: entityData });
      }

      results.success++;
    } catch (error) {
      console.error(`Row ${i + 2} Error:`, error.message);
      results.errors.push(
        `Row ${i + 2} (${row["Name of Entity"]}): ${error.message}`
      );
    }
  }

  console.log("Import Complete:", results);
  return results;
};

/**
 * Parse KIAL Staff Excel File
 */
exports.parseKialStaffFile = async (filePath) => {
  const workbook = xlsx.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  let data = xlsx.utils.sheet_to_json(sheet, { defval: "" });

  // Detect merged header pattern: if columns are __EMPTY, the first data row contains real headers
  if (data.length > 0) {
    const keys = Object.keys(data[0]);
    const hasEmptyKeys = keys.some(k => k.startsWith("__EMPTY"));

    if (hasEmptyKeys) {
      console.log("Detected merged header row, remapping columns...");
      // Build a mapping: __EMPTY key -> actual header name from first row values
      const headerRow = data[0];
      const columnMap = {};
      for (const [key, value] of Object.entries(headerRow)) {
        const headerName = String(value).replace(/\r\n/g, " ").replace(/\n/g, " ").trim();
        if (headerName) {
          columnMap[key] = headerName;
        }
      }
      console.log("Column mapping:", columnMap);

      // Skip the header row and remap all subsequent rows
      data = data.slice(1).map(row => {
        const remapped = {};
        for (const [key, value] of Object.entries(row)) {
          const newKey = columnMap[key] || key;
          remapped[newKey] = value;
        }
        return remapped;
      });
    }
  }

  console.log(`Starting KIAL Staff Import: Processing ${data.length} rows...`);

  // The first row contains the actual zone names (A, D, Si, etc.) under the zone columns
  const zoneHeaderRow = data.length > 0 ? data[0] : {};
  const zoneColumns = ["Zones", "Zones Given", "Zone"];
  for (let z = 14; z <= 50; z++) {
    zoneColumns.push(`__EMPTY_${z}`);
  }
  
  // Build a map of Excel column name -> Actual Zone Letter (e.g. "__EMPTY_16" -> "D")
  const zoneColMap = {};
  for (const col of zoneColumns) {
    if (zoneHeaderRow[col]) {
      const zoneName = String(zoneHeaderRow[col]).trim();
      if (zoneName) {
        zoneColMap[col] = zoneName;
      }
    }
  }
  console.log("Dynamically extracted Zone Headers:", zoneColMap);

  // Log sample of first row to help debug column names
  if (data.length > 0) {
    console.log("Excel columns detected:", Object.keys(data[0]));
    console.log("First row sample (Zone Headers):", data[0]);
  }

  const results = { success: 0, errors: [], importedRows: [] };

  // Skip the first row as it contains zone headers, not staff data
  for (let i = 1; i < data.length; i++) {
    const row = data[i];

    // Skip empty rows — try multiple possible column names for the name field
    const fullName = row["Name"] || row["Full Name"] || row["Staff Name"];
    if (!fullName || typeof fullName !== "string") {
      console.log(`Row ${i + 2}: Skipped - No Full Name (Found: ${fullName})`, row);
      results.errors.push(`Row ${i + 2}: Skipped - No valid Name found`);
      continue;
    }

    // Skip non-staff label rows from Excel (dropdown options, section headers, etc.)
    const SKIP_NAMES = [
      "add+ option", "scroll option",
      "other avsec functionaltrainings",
      "other avsec functional trainings",
    ];
    if (SKIP_NAMES.includes(fullName.trim().toLowerCase())) continue;

    // Skip rows missing both empCode and designation (likely section headers)
    const empCodeCheck = row["Employee Code"] || row["Emp Code"] || row["Emp. Code"] || row["EmpCode"];
    const designationCheck = row["Designation"];
    if (!empCodeCheck && !designationCheck) {
      console.log(`Row ${i + 2}: Skipped - Missing both EmpCode & Designation (${fullName})`);
      continue;
    }
    
    console.log(`Processing row ${i + 2}:`, { fullName, empCode: empCodeCheck, designation: designationCheck });

    try {
      const empCode = row["Employee Code"] || row["Emp Code"] || row["Emp. Code"] || row["EmpCode"];
      const email = row["Email"] || row["E-mail ID"] || row["Email ID"] || row["E-mail"] || row["email"] || row["Mail ID"] || row["Official Email ID"];
      const aadhaarNumber = row["Aadhaar Number"] || row["Aadhaar"] || row["AADHAAR"];
      const aepNumberRaw = row["AEP Number"] || row["AEP No"] || row["AEP No."] || row["AEP/TAEP Number"];
      const aepNumber = aepNumberRaw ? String(aepNumberRaw).trim() : null;
      const phoneNumber = row["Phone Number"] || row["Phone"] || row["Mobile Number"] || row["Contact Number"];
      const department = row["Department"] || null;

      // Parse certificate dates from Excel
      // Paired columns: header col has first date, __EMPTY_N has second date
      const avsecFrom = parseExcelDate(row["AvSec Basic / Awareness Training Validity"] || row["AvSec Basic/ Awareness Training Validity"] || row["AvSec Training Validity"] || row["Training Validity"]);
      const avsecTo = parseExcelDate(row["__EMPTY_5"]) || avsecFrom; // __EMPTY_5 = AvSec validity TO

      const pccIssuedDate = parseExcelDate(row["PCC Issued Date"] || row["PCC Issue Date"] || row["PCC Issued Date and Validity"]);
      const pccValidity = parseExcelDate(row["__EMPTY_10"] || row["Police Verification Certificate (PCC) Validity (if present)"] || row["PCC Validity"] || row["Police Verification"]);

      const aepValidFrom = parseExcelDate(row["AEP Valid From"] || row["AEP Valid from"] || row["Validity of AEP/TAEP"] || row["Validity of AEP/TAEP"]);
      const aepValidTo = parseExcelDate(row["__EMPTY_12"] || row["__EMPTY_11"] || row["AEP Valid To"] || row["AEP Valid to"]);
      const aepIssuedDate = parseExcelDate(row["AEP Issued Date"] || row["AEP Issue Date"]);

      const medicalIssuedDate = parseExcelDate(row["Medical Fitness Issued Date"] || row["Medical Issue Date"]);
      const medicalFitnessValidity = parseExcelDate(row["Medical Fitness Validity (if present)"] || row["Medical Fitness Validity"] || row["Medical Fitness"]);

      // Collect zones using the dynamically mapped zone columns
      const zones = [];
      for (const [col, zoneName] of Object.entries(zoneColMap)) {
        const cellValue = row[col];
        if (cellValue !== undefined && cellValue !== null) {
          if (String(cellValue).trim().toLowerCase() === "yes") {
            zones.push(zoneName);
          }
        }
      }

      console.log(`Extracted data for ${fullName}:`, {
        email, aadhaarNumber, aepNumber, zones
      });

      // Generate a unique password for this staff member
      const plainPassword = generatePassword();

      // Check if staff already exists (to preserve existing password)
      let existingPassword = null;
      let existingStaff = null;
      if (empCode) {
        existingStaff = await prisma.staff.findUnique({ where: { empCode: String(empCode) } });
        if (existingStaff) existingPassword = existingStaff.password;
      }
      
      const finalPassword = existingPassword || plainPassword;

      // Create or update user account if email provided
      let user = null;
      if (email && email.includes("@")) {
        // If we are preserving an existing password, we don't strictly need to update the hash unless missing, 
        // but for safety, let's always ensure the user has the correct hash for whatever finalPassword is
        const hashedPassword = await hashPassword(finalPassword);
        user = await prisma.user.upsert({
          where: { email },
          update: {
            passwordHash: hashedPassword,
          },
          create: {
            email,
            fullName,
            role: "STAFF",
            passwordHash: hashedPassword,
          },
        });
      }

      // Upsert staff record by empCode (deduplicates on re-import)
      const staffData = {
        fullName,
        designation: row["Designation"] || null,
        aadhaarNumber: String(aadhaarNumber || ""),
        isKialStaff: true,
        empCode: empCode ? String(empCode) : null,
        department: department,
        dateOfSuperannuation: parseExcelDate(row["Date of Superannuation"]),
        aepNumber: aepNumber || null,
        terminals: row["Terminals"] || null,
        airportsGiven: row["Airports Given"] || row["Airports"] || null,
        zones: zones,
        phoneNumber: phoneNumber || null,
        password: finalPassword,
      };

      let staff;
      if (empCode) {
        // Upsert by empCode — update existing or create new
        staff = await prisma.staff.upsert({
          where: { empCode: String(empCode) },
          update: { ...staffData, userId: user ? user.id : null },
          create: {
            ...staffData,
            ...(user ? { user: { connect: { id: user.id } } } : {}),
          },
        });

        // On re-import, refresh certificates — delete old ones from import
        await prisma.certificate.deleteMany({
          where: { staffId: staff.id, status: "APPROVED" },
        });
      } else {
        // No empCode — fall back to create (can't deduplicate)
        staff = await prisma.staff.create({
          data: {
            ...staffData,
            ...(user ? { user: { connect: { id: user.id } } } : {}),
          },
        });
      }

      // Create Certificate records for each type
      const certEntries = [
        {
          type: "AVSEC_BASIC",
          issuedDate: null,
          validFrom: avsecFrom,
          validTo: avsecTo,
        },
        {
          type: "PCC",
          issuedDate: pccIssuedDate,
          validFrom: null,
          validTo: pccValidity,
        },
        {
          type: "AEP",
          issuedDate: aepIssuedDate,
          validFrom: aepValidFrom,
          validTo: aepValidTo,
        },
        {
          type: "MEDICAL",
          issuedDate: medicalIssuedDate,
          validFrom: null,
          validTo: medicalFitnessValidity,
        },
      ];

      for (const cert of certEntries) {
        // Only create if at least one date field exists
        if (cert.issuedDate || cert.validFrom || cert.validTo) {
          await prisma.certificate.create({
            data: {
              type: cert.type,
              issuedDate: cert.issuedDate,
              validFrom: cert.validFrom,
              validTo: cert.validTo,
              status: "APPROVED",
              staffId: staff.id,
            },
          });
        }
      }

      // Add to debug log
      results.importedRows.push({
        fullName,
        empCode,
        aadhaarNumber,
        aepNumber,
        email,
        zones,
      });

      results.success++;
    } catch (error) {
      console.error(`Row ${i + 2} Error:`, error.message);
      console.error(`Row ${i + 2} Stack:`, error.stack);
      results.errors.push(
        `Row ${i + 2} (${row["Name"] || row["Full Name"] || "Unknown"}): ${error.message}`
      );
    }
  }

  console.log("KIAL Staff Import Complete:", results);
  return results;
};

/**
 * Parse Entity Staff Excel File
 */
exports.parseEntityStaffFile = async (filePath, entityId) => {
  const workbook = xlsx.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const data = xlsx.utils.sheet_to_json(sheet, { defval: "" });

  console.log(`Starting Entity Staff Import for Entity ${entityId}: Processing ${data.length} rows...`);

  // The first row contains the actual zone names (A, D, Si, etc.) under the zone columns
  const zoneHeaderRow = data.length > 0 ? data[0] : {};
  const zoneColumns = ["Zones", "Zones Given", "Zone"];
  for (let z = 14; z <= 50; z++) {
    zoneColumns.push(`__EMPTY_${z}`);
  }
  
  // Build a map of Excel column name -> Actual Zone Letter (e.g. "__EMPTY_16" -> "D")
  const zoneColMap = {};
  for (const col of zoneColumns) {
    if (zoneHeaderRow[col]) {
      const zoneName = String(zoneHeaderRow[col]).trim();
      if (zoneName) {
        zoneColMap[col] = zoneName;
      }
    }
  }
  console.log(`Dynamically extracted Zone Headers for Entity ${entityId}:`, zoneColMap);

  const results = { success: 0, errors: [], importedRows: [] };

  // Verify entity exists
  const entity = await prisma.entity.findUnique({ where: { id: parseInt(entityId) } });
  if (!entity) {
    throw new Error(`Entity with ID ${entityId} not found`);
  }

  // Skip the first row as it contains zone headers, not staff data
  for (let i = 1; i < data.length; i++) {
    const row = data[i];

    // Skip empty rows
    if (!row["Name"] && !row["Full Name"] && !row["Staff Name"]) continue;

    try {
      const fullName = row["Name"] || row["Full Name"] || row["Staff Name"];
      const email = row["Email"] || row["E-mail ID"] || row["Email ID"];

      // Generate a unique password for this staff member
      const plainPassword = generatePassword();

      // Check if staff already exists (to preserve existing password)
      let existingStaffRecord = await prisma.staff.findFirst({
        where: { fullName, entityId: parseInt(entityId) },
      });
      const finalPassword = existingStaffRecord?.password || plainPassword;

      // Create or update user account if email provided
      let user = null;
      if (email && email.includes("@")) {
        const hashedPassword = await hashPassword(finalPassword);
        user = await prisma.user.upsert({
          where: { email },
          update: {
            passwordHash: hashedPassword,
          },
          create: {
            email,
            fullName,
            role: "STAFF",
            passwordHash: hashedPassword,
          },
        });
      }

      // Collect zones using the dynamically mapped zone columns
      const zones = [];
      for (const [col, zoneName] of Object.entries(zoneColMap)) {
        const cellValue = row[col];
        if (cellValue !== undefined && cellValue !== null) {
          if (String(cellValue).trim().toLowerCase() === "yes") {
            zones.push(zoneName);
          }
        }
      }

      // Upsert staff record — match by name + entity to handle re-imports
      const staffData = {
        fullName,
        designation: row["Designation"] || null,
        aadhaarNumber: String(row["Aadhaar Number"] || row["Aadhaar"] || ""),
        isKialStaff: false,
        entityId: parseInt(entityId),
        aepNumber: row["AEP Number"] || row["AEP No"] || null,
        terminals: row["Terminals"] || null,
        airportsGiven: row["Airports Given"] || row["Airports"] || null,
        zones: zones,
        password: finalPassword,
      };

      // Check for existing staff by name + entity
      let staff = await prisma.staff.findFirst({
        where: { fullName, entityId: parseInt(entityId) },
      });

      if (staff) {
        // Update existing staff
        staff = await prisma.staff.update({
          where: { id: staff.id },
          data: { ...staffData, userId: user ? user.id : null },
        });
        // Refresh certificates on re-import
        await prisma.certificate.deleteMany({
          where: { staffId: staff.id, status: "APPROVED" },
        });
      } else {
        // Create new staff
        staff = await prisma.staff.create({
          data: {
            ...staffData,
            ...(user ? { user: { connect: { id: user.id } } } : {}),
          },
        });
      }

      // Create certificates if provided
      const certColumns = [
        { type: "AVSEC_BASIC", issuedCol: "Training Issued Date", fromCol: "Training Valid From", toCol: "Training Valid To" },
        { type: "PCC", issuedCol: "PCC Issued Date", fromCol: "PCC Valid From", toCol: "PCC Valid To" },
        { type: "MEDICAL", issuedCol: "Medical Issued Date", fromCol: "Medical Valid From", toCol: "Medical Valid To" },
        { type: "AEP", issuedCol: "AEP Issued Date", fromCol: "AEP Valid From", toCol: "AEP Valid To" },
      ];

      for (const cert of certColumns) {
        const issuedDate = parseExcelDate(row[cert.issuedCol]);
        const validFrom = parseExcelDate(row[cert.fromCol]);
        const validTo = parseExcelDate(row[cert.toCol]);

        if (issuedDate || validFrom || validTo) {
          await prisma.certificate.create({
            data: {
              type: cert.type,
              issuedDate,
              validFrom,
              validTo,
              status: "APPROVED",
              staffId: staff.id,
            },
          });
        }
      }

      results.importedRows.push({
        fullName,
        email,
        aadhaarNumber: staffData.aadhaarNumber,
        aepNumber: staffData.aepNumber,
        zones: staffData.zones,
      });

      results.success++;
    } catch (error) {
      console.error(`Row ${i + 2} Error:`, error.message);
      results.errors.push(
        `Row ${i + 2} (${row["Name"] || row["Full Name"] || "Unknown"}): ${error.message}`
      );
    }
  }

  console.log("Entity Staff Import Complete:", results);
  return results;
};
