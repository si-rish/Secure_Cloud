
const fileService = require("../services/fileService");
const sendError = require("../utils/errorResponse");
const sendNegotiatedResponse = require("../utils/contentNegotiation");
const fs = require("fs/promises");
const path = require("path");
const crypto = require("crypto");

const UPLOAD_DIRECTORY = path.resolve(__dirname, "../../storage/uploads");

function isPathInsideDirectory(directory, targetPath) {
  const relativePath = path.relative(directory, targetPath);

  return (
    relativePath !== "" &&
    relativePath !== ".." &&
    !relativePath.startsWith(`..${path.sep}`) &&
    !path.isAbsolute(relativePath)
  );
}

function getStoredFilePath(storageKey) {
  if (typeof storageKey !== "string" || storageKey.length === 0) {
    return null;
  }

  const resolvedPath = path.resolve(UPLOAD_DIRECTORY, storageKey);

  return isPathInsideDirectory(UPLOAD_DIRECTORY, resolvedPath)
    ? resolvedPath
    : null;
}

function getErrorMessage(
  error,
  fallback = "Request could not be completed"
) {
  return error &&
    typeof error.message === "string" &&
    error.message.length > 0
    ? error.message
    : fallback;
}

// Normalize an entity tag for comparison.
// GET and HEAD use weak comparison for If-None-Match.
function normalizeEntityTag(value) {
  let tag = String(value ?? "").trim();

  if (tag.startsWith("W/")) {
    tag = tag.slice(2).trim();
  }

  if (tag.length >= 2 && tag.startsWith('"') && tag.endsWith('"')) {
    tag = tag.slice(1, -1);
  }

  return tag;
}

function ifNoneMatchMatches(headerValue, currentEtag) {
  if (
    typeof headerValue !== "string" ||
    headerValue.trim() === ""
  ) {
    return false;
  }

  const currentTag = normalizeEntityTag(currentEtag);

  return headerValue.split(",").some((candidate) => {
    const value = candidate.trim();

    return (
      value === "*" ||
      normalizeEntityTag(value) === currentTag
    );
  });
}

// Create file metadata with idempotency support.
async function createFile(req, res, next) {
  try {
    const idempotencyKey = req.get("Idempotency-Key");

    const metadata = {
      ownerId: req.user.id,
      originalName: req.body?.originalName,
      storageKey: req.body?.storageKey,
      mimeType: req.body?.mimeType,
      sizeBytes: req.body?.sizeBytes,
      checksum: req.body?.checksum,
    };

    const result =
      await fileService.createFileMetadataIdempotently(
        metadata,
        idempotencyKey
      );

    if (result?.replayed) {
      res.set("Idempotency-Replayed", "true");
    }

    return res.status(result.statusCode).json(result.body);
  } catch (error) {
    const statusCode = error?.statusCode;

    if ([400, 409, 503].includes(statusCode)) {
      const defaults = {
        400: [
          "VALIDATION_ERROR",
          "Invalid file metadata",
        ],
        409: [
          "CONFLICT",
          "The request conflicts with an existing resource",
        ],
        503: [
          "SERVICE_UNAVAILABLE",
          "Service temporarily unavailable",
        ],
      };

      const [defaultCode, defaultMessage] = defaults[statusCode];

      return sendError(
        res,
        statusCode,
        error.code || defaultCode,
        getErrorMessage(error, defaultMessage)
      );
    }

    const message = getErrorMessage(
      error,
      "Invalid file metadata"
    );

    if (/required|must be|cannot be/i.test(message)) {
      return sendError(
        res,
        400,
        "VALIDATION_ERROR",
        message
      );
    }

    return next(error);
  }
}

// Upload a file, calculate its checksum, and save metadata.
async function uploadFile(req, res, next) {
  if (!req.file) {
    return sendError(
      res,
      400,
      "VALIDATION_ERROR",
      "Please select a file to upload"
    );
  }

  const uploadedFilePath = req.file.path;

  if (!uploadedFilePath) {
    return sendError(
      res,
      400,
      "VALIDATION_ERROR",
      "Uploaded file path is missing"
    );
  }

  try {
    const fileBuffer = await fs.readFile(uploadedFilePath);

    const checksum = crypto
      .createHash("sha256")
      .update(fileBuffer)
      .digest("hex");

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

// Download a file owned by the authenticated user.
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

    const filePath = getStoredFilePath(file.storage_key);

    if (!filePath) {
      return sendError(
        res,
        400,
        "VALIDATION_ERROR",
        "Invalid file path"
      );
    }

    try {
      await fs.access(filePath);
    } catch (error) {
      if (error.code === "ENOENT" || error.code === "ENOTDIR") {
        return sendError(
          res,
          404,
          "NOT_FOUND",
          "Stored file not found"
        );
      }

      throw error;
    }

    return res.download(
      filePath,
      file.original_name || path.basename(filePath),
      (error) => {
        if (error && !res.headersSent) {
          next(error);
        }
      }
    );
  } catch (error) {
    return next(error);
  }
}

// Delete a file owned by the authenticated user.
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

    const filePath = getStoredFilePath(file.storage_key);

    if (!filePath) {
      return sendError(
        res,
        400,
        "VALIDATION_ERROR",
        "Invalid file path"
      );
    }

    try {
      await fs.unlink(filePath);
    } catch (error) {
      if (error.code === "ENOENT" || error.code === "ENOTDIR") {
        return sendError(
          res,
          404,
          "NOT_FOUND",
          "Stored file not found"
        );
      }

      throw error;
    }

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
    return next(error);
  }
}

// Get metadata for one file owned by the authenticated user.
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

    const responseBody = {
      success: true,
      data: file,
    };

    const etag = `"${crypto
      .createHash("sha256")
      .update(JSON.stringify(responseBody))
      .digest("hex")}"`;

    res.set("Cache-Control", "private, no-cache");
    res.set("ETag", etag);
    res.vary("Accept");

    const ifNoneMatch = req.get("If-None-Match");

    if (ifNoneMatchMatches(ifNoneMatch, etag)) {
      return res.status(304).end();
    }

    return sendNegotiatedResponse(
      req,
      res,
      200,
      responseBody
    );
  } catch (error) {
    return next(error);
  }
}

// Get files belonging to the authenticated user with cursor pagination.
async function getUserFiles(req, res, next) {
  try {
    const rawLimit = req.query.limit ?? "10";

    if (
      typeof rawLimit !== "string" ||
      !/^\d+$/.test(rawLimit)
    ) {
      return sendError(
        res,
        400,
        "VALIDATION_ERROR",
        "Limit must be a positive integer between 1 and 100"
      );
    }

    const limit = Number(rawLimit);

    if (
      !Number.isSafeInteger(limit) ||
      limit < 1 ||
      limit > 100
    ) {
      return sendError(
        res,
        400,
        "VALIDATION_ERROR",
        "Limit must be a positive integer between 1 and 100"
      );
    }

    const cursor = req.query.cursor ?? null;

    const result = await fileService.getUserFiles(
      req.user.id,
      { limit, cursor }
    );

    const data = Array.isArray(result?.data)
      ? result.data
      : [];

    const pagination = result?.pagination || {};

    let nextLink = null;

    if (pagination.hasMore && pagination.nextCursor) {
      const params = new URLSearchParams({
        limit: String(pagination.limit ?? limit),
        cursor: String(pagination.nextCursor),
      });

      nextLink = `/api/v1/files?${params.toString()}`;
    }

    res.set("Cache-Control", "private, no-cache");
    res.vary("Accept");

    return sendNegotiatedResponse(req, res, 200, {
      success: true,
      count: data.length,
      data,
      pagination: {
        limit: pagination.limit ?? limit,
        hasMore: Boolean(pagination.hasMore),
        nextCursor: pagination.nextCursor ?? null,
      },
      links: {
        next: nextLink,
      },
    });
  } catch (error) {
    if (error?.statusCode === 400) {
      return sendError(
        res,
        400,
        error.code || "VALIDATION_ERROR",
        getErrorMessage(
          error,
          "Invalid pagination parameters"
        )
      );
    }

    return next(error);
  }
}

// Verify file integrity using its SHA-256 checksum.
async function verifyFileIntegrity(req, res, next) {
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

    if (!file.checksum) {
      return sendError(
        res,
        400,
        "VALIDATION_ERROR",
        "No checksum available for this file"
      );
    }

    const filePath = getStoredFilePath(file.storage_key);

    if (!filePath) {
      return sendError(
        res,
        400,
        "VALIDATION_ERROR",
        "Invalid file path"
      );
    }

    let fileBuffer;

    try {
      fileBuffer = await fs.readFile(filePath);
    } catch (error) {
      if (
        error.code === "ENOENT" ||
        error.code === "ENOTDIR"
      ) {
        return sendError(
          res,
          404,
          "NOT_FOUND",
          "Stored file not found"
        );
      }

      throw error;
    }

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