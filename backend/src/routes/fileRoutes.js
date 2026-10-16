const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");

const {
  upload,
  validateActualFileType,
} = require("../middleware/uploadMiddleware");

const fileController = require("../controllers/fileController");

// All file routes require authentication
router.use(authMiddleware);

// Upload a file after validating its actual contents
router.post(
  "/upload",
  upload.single("file"),
  validateActualFileType,
  fileController.uploadFile
);

// Create file metadata
router.post("/", fileController.createFile);

// Get all files belonging to the authenticated user
router.get("/", fileController.getUserFiles);

// Download a file
router.get("/:id/download", fileController.downloadFile);

// Verify file integrity using SHA-256
router.get("/:id/verify", fileController.verifyFileIntegrity);

// Delete a file
router.delete("/:id", fileController.deleteFile);

// Get metadata for a specific file
router.get("/:id", fileController.getFile);

module.exports = router;