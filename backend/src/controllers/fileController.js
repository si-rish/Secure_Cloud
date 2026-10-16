const fileService = require("../services/fileService");
const sendError = require("../utils/errorResponse");

// Create file metadata
async function createFile(req, res, next) {
  try {
    const {
      originalName,
      storageKey,
      mimeType,
      sizeBytes,
      checksum,
    } = req.body;

    const file = await fileService.createFileMetadata({
      ownerId: req.user.id,
      originalName,
      storageKey,
      mimeType,
      sizeBytes,
      checksum,
    });

    return res.status(201).json({
      success: true,
      message: "File metadata created successfully",
      data: file,
    });
  } catch (error) {
    if (
      error.message.includes("required") ||
      error.message.includes("must be") ||
      error.message.includes("cannot be")
    ) {
      return sendError(
        res,
        400,
        "VALIDATION_ERROR",
        error.message
      );
    }

    return next(error);
  }
}

// Upload a file, calculate its checksum, and save metadata
async function uploadFile(req, res, next) {
  if (!req.file) {
    return sendError(
      res,
      400,
      "VALIDATION_ERROR",
      "Please select a file to upload"
    );
  }

  const fs = require("fs/promises");
  const crypto = require("crypto");
  const uploadedFilePath = req.file.path;

  try {
    const fileBuffer = await fs.readFile(uploadedFilePath);

    // Generate SHA-256 checksum from the actual file contents
    const checksum = crypto
      .createHash("sha256")
      .update(fileBuffer)
      .digest("hex");

    // Save metadata and checksum in PostgreSQL
    const file = await fileService.createFileMetadata({
      ownerId: req.user.id,
      originalName: req.file.originalname,
      storageKey: req.file.filename,
      mimeType: req.file.mimetype,
      sizeBytes: req.file.size,
      checksum,
    });

    return res.status(201).json({
      success: true,
      message: "File uploaded successfully",
      data: file,
    });
  } catch (error) {
    // Remove the uploaded file if processing or database insertion fails
    try {
      await fs.unlink(uploadedFilePath);
    } catch (cleanupError) {
      if (cleanupError.code !== "ENOENT") {
        console.error(
          "Failed to remove uploaded file:",
          cleanupError.message
        );
      }
    }

    return next(error);
  }
}

// Download a file owned by the authenticated user
async function downloadFile(req, res, next) {
  try {
    const file = await fileService.getFileMetadataByOwner(
      req.params.id,
      req.user.id
    );

    if (!file) {
      return sendError(
        res,
        404,
        "NOT_FOUND",
        "File not found"
      );
    }

    const path = require("path");
    const fs = require("fs");

    const uploadDirectory = path.resolve(
      __dirname,
      "../../storage/uploads"
    );

    const filePath = path.resolve(
      uploadDirectory,
      file.storage_key
    );

    // Ensure the resolved path stays inside the upload directory
    if (!filePath.startsWith(uploadDirectory + path.sep)) {
      return sendError(
        res,
        400,
        "VALIDATION_ERROR",
        "Invalid file path"
      );
    }

    if (!fs.existsSync(filePath)) {
      return sendError(
        res,
        404,
        "NOT_FOUND",
        "Stored file not found"
      );
    }

    return res.download(filePath, file.original_name);
  } catch (error) {
    return next(error);
  }
}

// Delete a file owned by the authenticated user
async function deleteFile(req, res, next) {
  try {
    const file = await fileService.getFileMetadataByOwner(
      req.params.id,
      req.user.id
    );

    if (!file) {
      return sendError(
        res,
        404,
        "NOT_FOUND",
        "File not found"
      );
    }

    const path = require("path");
    const fs = require("fs/promises");

    const uploadDirectory = path.resolve(
      __dirname,
      "../../storage/uploads"
    );

    const filePath = path.resolve(
      uploadDirectory,
      file.storage_key
    );

    // Prevent paths from escaping the upload directory
    if (!filePath.startsWith(uploadDirectory + path.sep)) {
      return sendError(
        res,
        400,
        "VALIDATION_ERROR",
        "Invalid file path"
      );
    }

    // Remove the physical file first
    await fs.unlink(filePath);

    // Remove its database metadata
    const deleted = await fileService.removeFileMetadata(
      req.params.id,
      req.user.id
    );

    if (!deleted) {
      return sendError(
        res,
        500,
        "INTERNAL_SERVER_ERROR",
        "File could not be deleted from the database"
      );
    }

    return res.status(200).json({
      success: true,
      message: "File deleted successfully",
    });
  } catch (error) {
    if (error.code === "ENOENT") {
      return sendError(
        res,
        404,
        "NOT_FOUND",
        "Stored file not found"
      );
    }

    return next(error);
  }
}

// Get metadata for one file owned by the authenticated user
async function getFile(req, res, next) {
  try {
    const file = await fileService.getFileMetadataByOwner(
      req.params.id,
      req.user.id
    );

    if (!file) {
      return sendError(
        res,
        404,
        "NOT_FOUND",
        "File not found"
      );
    }

    return res.status(200).json({
      success: true,
      data: file,
    });
  } catch (error) {
    return next(error);
  }
}

// Get files belonging to the authenticated user
async function getUserFiles(req, res, next) {
  try {
    const files = await fileService.getUserFiles(req.user.id);

    return res.status(200).json({
      success: true,
      count: files.length,
      data: files,
    });
  } catch (error) {
    return next(error);
  }
}

// Verify the integrity of a file using its SHA-256 checksum
async function verifyFileIntegrity(req, res, next) {
  try {
    const fs = require("fs/promises");
    const path = require("path");
    const crypto = require("crypto");

    // Find the file and confirm ownership
    const file = await fileService.getFileMetadataByOwner(
      req.params.id,
      req.user.id
    );

    if (!file) {
      return sendError(
        res,
        404,
        "NOT_FOUND",
        "File not found"
      );
    }

    if (!file.checksum) {
      return sendError(
        res,
        400,
        "VALIDATION_ERROR",
        "No checksum available for this file"
      );
    }

    const uploadDirectory = path.resolve(
      __dirname,
      "../../storage/uploads"
    );

    const filePath = path.resolve(
      uploadDirectory,
      file.storage_key
    );

    // Prevent access outside the upload directory
    if (!filePath.startsWith(uploadDirectory + path.sep)) {
      return sendError(
        res,
        400,
        "VALIDATION_ERROR",
        "Invalid file path"
      );
    }

    const fileBuffer = await fs.readFile(filePath);

    const currentChecksum = crypto
      .createHash("sha256")
      .update(fileBuffer)
      .digest("hex");

    const isIntact = currentChecksum === file.checksum;

    return res.status(200).json({
      success: true,
      message: isIntact
        ? "File integrity verified successfully"
        : "File integrity verification failed",
      data: {
        fileId: file.id,
        originalName: file.original_name,
        integrity: isIntact ? "verified" : "failed",
      },
    });
  } catch (error) {
    if (error.code === "ENOENT") {
      return sendError(
        res,
        404,
        "NOT_FOUND",
        "Stored file not found"
      );
    }

    return next(error);
  }
}

module.exports = {
  createFile,
  uploadFile,
  downloadFile,
  deleteFile,
  getFile,
  getUserFiles,
  verifyFileIntegrity,
};