const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Ensure 'uploads/documents' directory exists
const docDir = "uploads/documents/";
if (!fs.existsSync(docDir)) {
  fs.mkdirSync(docDir, { recursive: true });
}

// Storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, docDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`);
  },
});

// Allow PDFs, images, and common document types
const fileFilter = (req, file, cb) => {
  const allowedMimes = [
    "application/pdf",
    "image/jpeg",
    "image/png",
    "image/webp",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ];

  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error("Invalid file type. Allowed: PDF, JPEG, PNG, WebP, DOC, DOCX"),
      false
    );
  }
};

const docUpload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
});

module.exports = docUpload;
