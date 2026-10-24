const express = require("express");
const router = express.Router();

const validateRequest = require("../middleware/validateRequest");
const { createFileSchema } = require("../schemas/fileSchemas");
const authMiddleware = require("../middleware/authMiddleware");

const {
  upload,
  validateActualFileType,
} = require("../middleware/uploadMiddleware");

const fileController = require("../controllers/fileController");

// All file routes require authentication.
router.use(authMiddleware);

// File responses contain private user data.
// Require revalidation before cached responses can be reused.
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
  validateRequest(createFileSchema),
  fileController.createFile
);

// List files belonging to the authenticated user.
// GET /api/v1/files
router.get("/", fileController.getUserFiles);

// Download a file's content.
// GET /api/v1/files/:id/content
router.get("/:id/content", fileController.downloadFile);

// Verify a file's integrity.
// GET /api/v1/files/:id/integrity
router.get("/:id/integrity", fileController.verifyFileIntegrity);

// Delete a file.
// DELETE /api/v1/files/:id
router.delete("/:id", fileController.deleteFile);

// Get metadata for a specific file.
// GET /api/v1/files/:id
router.get("/:id", fileController.getFile);

module.exports = router;