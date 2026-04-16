const excelService = require("../services/excelService");
const fs = require("fs");
const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const { Pool } = require("pg");

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

exports.uploadEntityReport = async (req, res) => {
  try {
    // 1. Validation: Check if a file was actually uploaded
    if (!req.file) {
      return res.status(400).json({ 
        success: false,
        message: "Please upload an Excel file." 
      });
    }

    console.log(`Received file for import: ${req.file.originalname}`);

    // 2. Call the Service to parse the file and update the DB
    const result = await excelService.parseEntityFile(req.file.path);

    // 3. Cleanup: Delete the temporary file
    try {
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
    } catch (cleanupError) {
      console.error(
        "Warning: Failed to delete temporary file:",
        cleanupError.message
      );
    }

    // 4. Send the Summary Response
    res.json({
      success: true,
      message: "Import processing complete",
      data: {
        successCount: result.success,
        errorCount: result.errors.length,
        errors: result.errors,
      },
    });
  } catch (error) {
    console.error("Import Controller Error:", error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
};

/**
 * Upload KIAL Staff Excel
 */
exports.uploadKialStaff = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        success: false,
        message: "Please upload an Excel file." 
      });
    }

    console.log(`Received KIAL staff file: ${req.file.originalname}`);

    const result = await excelService.parseKialStaffFile(req.file.path);

    // Cleanup
    try {
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
    } catch (cleanupError) {
      console.error("Warning: Failed to delete temporary file:", cleanupError.message);
    }

    res.json({
      success: true,
      message: "KIAL staff import complete",
      data: {
        successCount: result.success,
        errorCount: result.errors.length,
        errors: result.errors,
        importedRows: result.importedRows,
      },
    });
  } catch (error) {
    console.error("KIAL Staff Import Error:", error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
};

/**
 * Upload Entity Staff Excel
 */
exports.uploadEntityStaff = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        success: false,
        message: "Please upload an Excel file." 
      });
    }

    const { entityCode } = req.params;

    if (!entityCode || !entityCode.trim()) {
      return res.status(400).json({ 
        success: false,
        message: "A valid Entity ID (code) is required." 
      });
    }

    // Look up entity by externalEntityCode
    const entity = await prisma.entity.findUnique({
      where: { externalEntityCode: entityCode.trim() },
    });

    if (!entity) {
      return res.status(404).json({
        success: false,
        message: `No entity found with Entity ID "${entityCode.trim()}". Please check the code on the Entities page.`,
      });
    }

    console.log(`Received entity staff file for entity ${entity.name} (${entityCode}): ${req.file.originalname}`);

    const result = await excelService.parseEntityStaffFile(req.file.path, entity.id);

    // Cleanup
    try {
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
    } catch (cleanupError) {
      console.error("Warning: Failed to delete temporary file:", cleanupError.message);
    }

    res.json({
      success: true,
      message: "Entity staff import complete",
      data: {
        successCount: result.success,
        errorCount: result.errors.length,
        errors: result.errors,
        importedRows: result.importedRows,
      },
    });
  } catch (error) {
    console.error("Entity Staff Import Error:", error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
};
