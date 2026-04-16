const multer = require("multer");
const path = require("path");
const fs = require("fs");

// 1. Ensure 'uploads' directory exists
// This prevents crashes if the folder is missing
const uploadDir = "uploads/";
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// 2. Configure Storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/"); // Save to this folder
  },
  filename: (req, file, cb) => {
    // Rename file to prevent duplicates (timestamp-originalName)
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

// 3. File Filter (Reject non-Excel files)
const fileFilter = (req, file, cb) => {
  const allowedMimes = [
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/msexcel",
  ];

  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        "Invalid file type. Only Excel (.xlsx, .xls) files are allowed."
      ),
      false
    );
  }
};

// 4. Export the configured middleware
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // Limit file size to 5MB
});

module.exports = upload;
