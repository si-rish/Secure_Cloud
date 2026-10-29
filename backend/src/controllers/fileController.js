const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const pool = require("../config/postgres");
const fileService = require("../services/fileService");
const fileRepository = require("../repositories/fileRepository");
const sendError = require("../utils/errorResponse");

const uploadDirectory = path.resolve(
  __dirname,
  "../../storage/uploads"
);

function getUserId(req) {
  return req.user?.id;
}

function getStoragePath(storageKey) {
  const resolvedPath = path.resolve(uploadDirectory, storageKey);

  if (path.dirname(resolvedPath) !== uploadDirectory) {
    return null;
  }

  return resolvedPath;
}

function getFileStorageKey(file) {
  return file?.storage_key;
}

function sendNotFound(res) {
  return sendError(
    res,
    404,
    "NOT_FOUND",
    "File not found or you do not have permission to access it"
  );
}

// ============================================================
// EXISTING RBAC HELPERS
// ============================================================

async function getAccessibleFile(
  fileId,
  user,
  requiredPermission = "read"
) {
  if (!user?.id || !fileId) {
    return null;
  }

  if (!["read", "write"].includes(requiredPermission)) {
    throw new Error("Invalid file permission requested");
  }

  const result = await pool.query(
    `SELECT
       f.*,
       owner.name AS owner_name,
       owner.email AS owner_email,
       owner.department_id AS owner_department_id,
       requester.role AS requester_role,
       COALESCE(s.permission, 'read') AS granted_permission,
       s.id AS active_share_id
     FROM files f
     JOIN users owner
       ON owner.id = f.owner_id
      AND owner.organization_id = f.organization_id
     JOIN users requester
       ON requester.id = $2
      AND requester.organization_id = f.organization_id
     JOIN organizations org
       ON org.id = requester.organization_id
     LEFT JOIN file_shares s
       ON s.file_id = f.id
      AND s.organization_id = f.organization_id
      AND s.shared_with_user_id = requester.id
      AND s.revoked_at IS NULL
     WHERE f.id = $1
       AND owner.is_active = TRUE
       AND requester.is_active = TRUE
       AND org.is_active = TRUE
       AND (
         f.owner_id = requester.id
         OR requester.role = 'admin'
         OR (
           requester.role = 'manager'
           AND requester.department_id IS NOT NULL
           AND owner.department_id = requester.department_id
         )
         OR s.id IS NOT NULL
       )
     LIMIT 1`,
    [fileId, user.id]
  );

  const file = result.rows[0];

  if (!file) {
    return null;
  }

  if (
    requiredPermission === "write" &&
    String(file.owner_id) !== String(user.id) &&
    file.requester_role !== "admin" &&
    file.granted_permission !== "write"
  ) {
    return null;
  }

  return file;
}

async function listFilesForManagement(
  userId,
  { limit = 100 } = {}
) {
  const safeLimit = Math.min(
    Math.max(Number(limit) || 100, 1),
    200
  );

  const result = await pool.query(
    `SELECT
       f.*,
       owner.name AS owner_name,
       owner.email AS owner_email
     FROM files f
     JOIN users owner
       ON owner.id = f.owner_id
      AND owner.organization_id = f.organization_id
     JOIN users requester
       ON requester.id = $1
      AND requester.organization_id = f.organization_id
     JOIN organizations org
       ON org.id = requester.organization_id
     WHERE requester.is_active = TRUE
       AND owner.is_active = TRUE
       AND org.is_active = TRUE
       AND (
         requester.role = 'admin'
         OR (
           requester.role = 'manager'
           AND requester.department_id IS NOT NULL
           AND owner.department_id = requester.department_id
         )
       )
     ORDER BY f.created_at DESC, f.id DESC
     LIMIT $2`,
    [userId, safeLimit]
  );

  return result.rows;
}

async function listSharedWithUser(
  userId,
  { limit = 50 } = {}
) {
  const safeLimit = Math.min(
    Math.max(Number(limit) || 50, 1),
    100
  );

  const result = await pool.query(
    `SELECT
       f.*,
       s.permission,
       s.created_at AS shared_at,
       shared_by.name AS shared_by_name,
       shared_by.email AS shared_by_email
     FROM file_shares s
     JOIN files f
       ON f.id = s.file_id
      AND f.organization_id = s.organization_id
     JOIN users recipient
       ON recipient.id = s.shared_with_user_id
      AND recipient.organization_id = s.organization_id
     JOIN users shared_by
       ON shared_by.id = s.shared_by
      AND shared_by.organization_id = s.organization_id
     JOIN organizations org
       ON org.id = recipient.organization_id
     WHERE s.shared_with_user_id = $1
       AND s.revoked_at IS NULL
       AND recipient.is_active = TRUE
       AND shared_by.is_active = TRUE
       AND org.is_active = TRUE
     ORDER BY s.created_at DESC, f.id DESC
     LIMIT $2`,
    [userId, safeLimit]
  );

  return result.rows;
}

// ============================================================
// CREATE FILE METADATA
// ============================================================

async function createFile(req, res, next) {
  try {
    const ownerId = getUserId(req);

    if (!ownerId) {
      return sendError(
        res,
        401,
        "UNAUTHORIZED",
        "Authentication is required"
      );
    }

    const idempotencyKey = req.get("Idempotency-Key");

    const result = await fileService.createFileMetadataIdempotently(
      {
        ownerId,
        originalName: req.body.originalName,
        storageKey: req.body.storageKey,
        mimeType: req.body.mimeType ?? null,
        sizeBytes: req.body.sizeBytes,
        checksum: req.body.checksum ?? null,
      },
      idempotencyKey
    );

    if (result.replayed) {
      res.set("Idempotency-Replayed", "true");
    }

    return res.status(result.statusCode).json(result.body);
  } catch (error) {
    return next(error);
  }
}

// ============================================================
// UPLOAD FILE CONTENT AND SAVE METADATA
// ============================================================

async function uploadFile(req, res, next) {
  let uploadedPath;

  try {
    const ownerId = getUserId(req);

    if (!ownerId) {
      return sendError(
        res,
        401,
        "UNAUTHORIZED",
        "Authentication is required"
      );
    }

    if (!req.file) {
      return sendError(
        res,
        400,
        "FILE_REQUIRED",
        "Please select a file to upload"
      );
    }

    uploadedPath = req.file.path;

    const checksum = await new Promise((resolve, reject) => {
      const hash = crypto.createHash("sha256");
      const stream = fs.createReadStream(uploadedPath);

      stream.on("error", reject);
      stream.on("data", (chunk) => hash.update(chunk));
      stream.on("end", () => resolve(hash.digest("hex")));
    });

    const file = await fileService.createFileMetadata({
      ownerId,
      originalName: path.basename(req.file.originalname),
      storageKey: path.basename(req.file.filename),
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
    if (uploadedPath) {
      try {
        await fs.promises.unlink(uploadedPath);
      } catch (cleanupError) {
        if (cleanupError.code !== "ENOENT") {
          console.error(
            "Failed to clean up uploaded file:",
            cleanupError.message
          );
        }
      }
    }

    return next(error);
  }
}

// ============================================================
// LIST CURRENT USER'S FILES
// ============================================================

async function getUserFiles(req, res, next) {
  try {
    const ownerId = getUserId(req);

    if (!ownerId) {
      return sendError(
        res,
        401,
        "UNAUTHORIZED",
        "Authentication is required"
      );
    }

    const limit = req.query.limit === undefined
      ? 10
      : Number(req.query.limit);

    const cursor = req.query.cursor ?? null;

    const result = await fileService.getUserFiles(ownerId, {
      limit,
      cursor,
    });

    const data = Array.isArray(result) ? result : result.data;
    const pagination = Array.isArray(result)
      ? { limit: data.length, hasMore: false, nextCursor: null }
      : result.pagination;

    const responseBody = {
      success: true,
      data,
      pagination,
    };

    if (pagination.nextCursor) {
      const query = new URLSearchParams({
        limit: String(pagination.limit),
        cursor: pagination.nextCursor,
      });

      responseBody.links = {
        next: `${req.baseUrl}${req.path}?${query.toString()}`,
      };
    }

    return res.status(200).json(responseBody);
  } catch (error) {
    return next(error);
  }
}

// ============================================================
// GET FILE METADATA
// ============================================================

async function getFile(req, res, next) {
  try {
    const file = await getAccessibleFile(
      req.params.id,
      req.user,
      "read"
    );

    if (!file) {
      return sendNotFound(res);
    }

    const etag = `"${file.checksum || file.id}"`;

    res.set("ETag", etag);

    if (req.get("If-None-Match") === etag) {
      return res.status(304).end();
    }

    return res.status(200).json({
      success: true,
      data: file,
    });
  } catch (error) {
    return next(error);
  }
}

// ============================================================
// DOWNLOAD FILE CONTENT
// ============================================================

async function downloadFile(req, res, next) {
  try {
    const file = await getAccessibleFile(
      req.params.id,
      req.user,
      "read"
    );

    if (!file) {
      return sendNotFound(res);
    }

    const storageKey = getFileStorageKey(file);
    const filePath = storageKey && getStoragePath(storageKey);

    if (!filePath) {
      return sendError(
        res,
        500,
        "INVALID_STORAGE_KEY",
        "The file storage key is invalid"
      );
    }

    try {
      await fs.promises.access(filePath, fs.constants.R_OK);
    } catch {
      return sendError(
        res,
        404,
        "FILE_CONTENT_NOT_FOUND",
        "File content is not available"
      );
    }

    res.set("Content-Type", file.mime_type || "application/octet-stream");
    res.set(
      "Content-Disposition",
      `attachment; filename*=UTF-8''${encodeURIComponent(
        path.basename(file.original_name || "download")
      )}`
    );

    return res.sendFile(filePath, (error) => {
      if (error && !res.headersSent) {
        next(error);
      }
    });
  } catch (error) {
    return next(error);
  }
}

// ============================================================
// VERIFY FILE INTEGRITY
// ============================================================

async function verifyFileIntegrity(req, res, next) {
  try {
    const file = await getAccessibleFile(
      req.params.id,
      req.user,
      "read"
    );

    if (!file) {
      return sendNotFound(res);
    }

    const storageKey = getFileStorageKey(file);
    const filePath = storageKey && getStoragePath(storageKey);

    if (!filePath) {
      return sendError(
        res,
        500,
        "INVALID_STORAGE_KEY",
        "The file storage key is invalid"
      );
    }

    const hash = crypto.createHash("sha256");
    const stream = fs.createReadStream(filePath);

    await new Promise((resolve, reject) => {
      stream.on("data", (chunk) => hash.update(chunk));
      stream.on("end", resolve);
      stream.on("error", reject);
    });

    const actualChecksum = hash.digest("hex");
    const matches = actualChecksum === file.checksum;

    return res.status(200).json({
      success: true,
      data: {
        fileId: file.id,
        valid: matches,
        expectedChecksum: file.checksum,
        actualChecksum,
      },
    });
  } catch (error) {
    return next(error);
  }
}

// ============================================================
// DELETE FILE
// ============================================================

async function deleteFile(req, res, next) {
  try {
    const file = await getAccessibleFile(
      req.params.id,
      req.user,
      "write"
    );

    if (!file) {
      return sendNotFound(res);
    }

    const storageKey = getFileStorageKey(file);
    const filePath = storageKey && getStoragePath(storageKey);

    // Remove metadata first so a missing content file does not
    // prevent the metadata from being deleted.
    const deleted = await pool.query(
      "DELETE FROM files WHERE id = $1 RETURNING id",
      [file.id]
    );

    if (deleted.rowCount === 0) {
      return sendNotFound(res);
    }

    if (filePath) {
      try {
        await fs.promises.unlink(filePath);
      } catch (error) {
        if (error.code !== "ENOENT") {
          console.error(
            "Failed to remove file content:",
            error.message
          );
        }
      }
    }

    return res.status(200).json({
      success: true,
      message: "File deleted successfully",
      data: { id: file.id },
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  createFile,
  uploadFile,
  getUserFiles,
  getFile,
  downloadFile,
  verifyFileIntegrity,
  deleteFile,
  getAccessibleFile,
  listFilesForManagement,
  listSharedWithUser,
};
