const express = require("express");

const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const loadCurrentUser = require("../middleware/loadCurrentUser");
const validateRequest = require("../middleware/validateRequest");
const idempotencyMiddleware = require("../middleware/idempotencyMiddleware");

const { createFileSchema } = require("../schemas/fileSchemas");

const {
  upload,
  validateActualFileType,
} = require("../middleware/uploadMiddleware");

const fileController = require("../controllers/fileController");

// All file routes require a valid JWT and an active database account.
router.use(authMiddleware);
router.use(loadCurrentUser);

// File responses contain private user data.
router.use((req, res, next) => {
  if (req.method === "GET") {
    res.set("Cache-Control", "private, no-cache");
  }

  next();
});

// Upload file content.
// POST /api/v1/files/content
router.post(
  "/content",
  upload.single("file"),
  validateActualFileType,
  fileController.uploadFile
);

// Create file metadata.
// POST /api/v1/files
router.post(
  "/",
  idempotencyMiddleware,
  validateRequest(createFileSchema),
  fileController.createFile
);

// List accessible files.
// The controller must restrict results to the current user's permissions.
router.get("/", fileController.getUserFiles);

// Download file content.
router.get("/:id/content", fileController.downloadFile);

// Verify file integrity.
router.get("/:id/integrity", fileController.verifyFileIntegrity);

// Delete a file.
// The controller must enforce owner/admin deletion rules.
router.delete("/:id", fileController.deleteFile);

// Get file metadata.
router.get("/:id", fileController.getFile);

module.exports = router;
