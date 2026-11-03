const express = require("express");

const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const loadCurrentUser = require("../middleware/loadCurrentUser");
const validateRequest = require("../middleware/validateRequest");
const idempotencyMiddleware = require("../middleware/idempotencyMiddleware");
const requireRoles = require("../middleware/requireRoles");

const { createFileSchema } = require("../schemas/fileSchemas");
const {
upload,
validateActualFileType,
} = require("../middleware/uploadMiddleware");

const fileController = require("../controllers/fileController");

// All file routes require authentication and an active database account.
router.use(authMiddleware);
router.use(loadCurrentUser);

// Storage analytics — administrators only
router.get(
  "/storage/summary",
  requireRoles("admin"),
  fileController.getStorageSummary
);

// Private file responses must not be cached publicly.
router.use((req, res, next) => {
if (req.method === "GET") {
res.set("Cache-Control", "private, no-cache");
}

next();
});

// Upload file content.
router.post(
"/content",
upload.single("file"),
validateActualFileType,
fileController.uploadFile
);

// Create file metadata.
router.post(
"/",
idempotencyMiddleware,
validateRequest(createFileSchema),
fileController.createFile
);

// List files accessible to the current user.
// Admins receive organization-wide file listings.
router.get("/", fileController.getUserFiles);

// Organization audit logs — administrators only
router.get(
  "/audit/logs",
  requireRoles("admin"),
  fileController.getFileAuditLogs
);

// Download file content.
router.get("/:id/content", fileController.downloadFile);

router.get("/:id/preview", fileController.previewFile);


// Verify file integrity.
router.get("/:id/integrity", fileController.verifyFileIntegrity);

// Delete a file.
router.delete("/:id", fileController.deleteFile);

// Get file metadata.
router.get("/:id", fileController.getFile);

module.exports = router;
