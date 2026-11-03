const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const pool = require("../config/postgres");
const fileService = require("../services/fileService");
const fileRepository = require("../repositories/fileRepository");
const sendError = require("../utils/errorResponse");
// ============================================================
// FILE AUDIT LOGGING
// ============================================================

async function logFileAudit({
  file,
  actorUserId,
  eventType,
  targetUserId = null,
  details = {},
}) {
  if (!file?.id || !file?.organization_id || !actorUserId) {
    throw new Error("Insufficient information to create file audit log");
  }

  const actorResult = await pool.query(
    `SELECT id, name, email, organization_id
     FROM users
     WHERE id = $1
       AND is_active = TRUE
     LIMIT 1`,
    [actorUserId]
  );

  const actor = actorResult.rows[0];

  if (
    !actor ||
    String(actor.organization_id) !== String(file.organization_id)
  ) {
    throw new Error("Invalid file audit actor");
  }

  await pool.query(
    `INSERT INTO file_audit_logs (
      organization_id,
      file_id,
      file_name,
      actor_user_id,
      actor_name,
      actor_email,
      event_type,
      target_user_id,
      details
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb)`,
    [
      file.organization_id,
      file.id,
      file.original_name,
      actor.id,
      actor.name,
      actor.email,
      eventType,
      targetUserId,
      JSON.stringify(details),
    ]
  );
}

const storageRoot = path.resolve(
  process.env.STORAGE_ROOT ||
  path.resolve(__dirname, "../../SecureCloud_Storage")
);

const legacyUploadDirectory = path.join(
  storageRoot,
  "uploads"
);

function getUserId(req) {
  return req.user?.id;
}

function getStoragePath(storageKey) {
  if (!storageKey || typeof storageKey !== "string") {
    return null;
  }

  // Legacy files were stored directly in storage/uploads.
  if (!storageKey.includes("/") && !storageKey.includes("\\")) {
    const legacyPath = path.resolve(
      legacyUploadDirectory,
      storageKey
    );

    if (
      path.relative(legacyUploadDirectory, legacyPath).startsWith("..") ||
      path.isAbsolute(path.relative(legacyUploadDirectory, legacyPath))
    ) {
      return null;
    }

    return legacyPath;
  }

  // New files use organization-based relative storage paths.
  const resolvedPath = path.resolve(storageRoot, storageKey);
  const relativePath = path.relative(storageRoot, resolvedPath);

  if (
    relativePath.startsWith("..") ||
    path.isAbsolute(relativePath)
  ) {
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

    const file = await fileService.createFileMetadataWithQuota({
      ownerId,
      originalName: path.basename(req.file.originalname),
      storageKey: path
        .relative(storageRoot, req.file.path)
        .split(path.sep)
        .join("/"),
      mimeType: req.file.mimetype,
      sizeBytes: req.file.size,
      checksum,
    });

    await logFileAudit({
      file,
      actorUserId: ownerId,
      eventType: "upload",
      details: {
        fileSize: req.file.size,
        mimeType: req.file.mimetype,
      },
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
    const user = req.user;


    if (!user?.id) {
      return sendError(
        res,
        401,
        "UNAUTHORIZED",
        "Authentication is required"
      );
    }

    const limit =
      req.query.limit === undefined
        ? 10
        : Number(req.query.limit);

    if (!Number.isInteger(limit) || limit < 1 || limit > 200) {
      return sendError(
        res,
        400,
        "INVALID_LIMIT",
        "Limit must be between 1 and 200"
      );
    }

    let files;

    // Administrators can see all files in their organization.
    if (user.role === "admin") {
      files = await listFilesForManagement(user.id, { limit });
    } else {
      // Managers and users see their own files
      // plus files explicitly shared with them.
      const result = await pool.query(
        `SELECT
       f.*,
       owner.name AS owner_name,
       owner.email AS owner_email,
       s.permission AS shared_permission
     FROM files f
     JOIN users owner
       ON owner.id = f.owner_id
      AND owner.organization_id = f.organization_id
     JOIN users requester
       ON requester.id = $1
      AND requester.organization_id = f.organization_id
     JOIN organizations org
       ON org.id = requester.organization_id
     LEFT JOIN file_shares s
       ON s.file_id = f.id
      AND s.organization_id = f.organization_id
      AND s.shared_with_user_id = requester.id
      AND s.revoked_at IS NULL
     WHERE requester.is_active = TRUE
       AND owner.is_active = TRUE
       AND org.is_active = TRUE
       AND (
         f.owner_id = requester.id
         OR s.id IS NOT NULL
       )
     ORDER BY f.created_at DESC, f.id DESC
     LIMIT $2`,
        [user.id, limit]
      );

      files = result.rows;
    }

    return res.status(200).json({
      success: true,
      data: {
        files,
        total: files.length,
      },
    });


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

    await logFileAudit({
      file,
      actorUserId: req.user.id,
      eventType: "download",
    });

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
// PREVIEW FILE
// ============================================================

async function previewFile(req, res, next) {
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

    await logFileAudit({
      file,
      actorUserId: req.user.id,
      eventType: "preview",
    });

    res.set("Content-Type", file.mime_type || "application/octet-stream");
    res.set("Content-Disposition", "inline");

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

    // Record deletion before removing the metadata.
    await logFileAudit({
      file,
      actorUserId: req.user.id,
      eventType: "delete",
      details: {
        originalName: file.original_name,
      },
    });

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

// ============================================================
// ADMIN FILE AUDIT HISTORY
// ============================================================

async function getFileAuditLogs(req, res, next) {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return sendError(
        res,
        401,
        "UNAUTHORIZED",
        "Authentication is required"
      );
    }

    const limit =
      req.query.limit === undefined
        ? 50
        : Number(req.query.limit);

    if (!Number.isInteger(limit) || limit < 1 || limit > 200) {
      return sendError(
        res,
        400,
        "INVALID_LIMIT",
        "Limit must be between 1 and 200"
      );
    }

    const values = [userId, limit];

    let filters = "";

    if (req.query.eventType) {
      const allowedEvents = [
        "upload",
        "modify",
        "download",
        "delete",
        "share",
        "unshare",
        "permission_change",
      ];

      if (!allowedEvents.includes(req.query.eventType)) {
        return sendError(
          res,
          400,
          "INVALID_EVENT_TYPE",
          "Invalid audit event type"
        );
      }

      values.push(req.query.eventType);
      filters += ` AND logs.event_type = $${values.length}`;
    }

    if (req.query.fileId) {
      values.push(req.query.fileId);
      filters += ` AND logs.file_id = $${values.length}`;
    }

    const result = await pool.query(
      `SELECT
         logs.id,
         logs.file_id,
         logs.file_name,
         logs.actor_user_id,
         logs.actor_name,
         logs.actor_email,
         logs.event_type,
         logs.target_user_id,
         logs.details,
         logs.created_at
       FROM file_audit_logs logs
       JOIN users requester
         ON requester.id = $1
        AND requester.organization_id = logs.organization_id
       JOIN organizations org
         ON org.id = requester.organization_id
       WHERE requester.is_active = TRUE
         AND requester.role = 'admin'
         AND org.is_active = TRUE
         ${filters}
       ORDER BY logs.created_at DESC, logs.id DESC
       LIMIT $2`,
      values
    );

    return res.status(200).json({
      success: true,
      data: {
        logs: result.rows,
        total: result.rows.length,
      },
    });
  } catch (error) {
    return next(error);
  }
}


// ============================================================
// STORAGE ANALYTICS
// ============================================================

async function getStorageSummary(req, res, next) {
  try {
    const organizationId = req.user?.organizationId;

    if (!organizationId) {
      return sendError(
        res,
        403,
        "ORGANIZATION_REQUIRED",
        "Organization information is required"
      );
    }

    const [summary, users, fileTypes, largestFiles] =
      await Promise.all([
        pool.query(
          `SELECT
             o.storage_quota_bytes,
             COALESCE(SUM(f.size_bytes), 0)::text AS used_bytes,
             COUNT(f.id)::int AS total_files
           FROM organizations o
           LEFT JOIN files f ON f.organization_id = o.id
           WHERE o.id = $1
           GROUP BY o.id`,
          [organizationId]
        ),

        pool.query(
          `SELECT
             u.id,
             u.name,
             u.email,
             COALESCE(SUM(f.size_bytes), 0)::text AS used_bytes,
             COUNT(f.id)::int AS total_files
           FROM users u
           LEFT JOIN files f
             ON f.owner_id = u.id
            AND f.organization_id = u.organization_id
           WHERE u.organization_id = $1
           GROUP BY u.id, u.name, u.email
           ORDER BY SUM(f.size_bytes) DESC NULLS LAST`,
          [organizationId]
        ),

        pool.query(
          `SELECT
             COALESCE(mime_type, 'Unknown') AS file_type,
             COUNT(*)::int AS total_files,
             COALESCE(SUM(size_bytes), 0)::text AS used_bytes
           FROM files
           WHERE organization_id = $1
           GROUP BY mime_type
           ORDER BY SUM(size_bytes) DESC`,
          [organizationId]
        ),

        pool.query(
          `SELECT
             f.id,
             f.original_name,
             f.size_bytes,
             f.mime_type,
             u.name AS owner_name
           FROM files f
           JOIN users u ON u.id = f.owner_id
           WHERE f.organization_id = $1
           ORDER BY f.size_bytes DESC
           LIMIT 5`,
          [organizationId]
        )
      ]);

    const data = summary.rows[0];

    if (!data) {
      return sendError(
        res,
        404,
        "ORGANIZATION_NOT_FOUND",
        "Organization not found"
      );
    }

    const quota = BigInt(data.storage_quota_bytes || 0);
    const used = BigInt(data.used_bytes || 0);
    const available = quota > used ? quota - used : 0n;

    const usagePercentage = quota > 0n
      ? Number((used * 10000n) / quota) / 100
      : 0;

    return res.status(200).json({
      success: true,
      data: {
        allocatedBytes: quota.toString(),
        usedBytes: used.toString(),
        availableBytes: available.toString(),
        usagePercentage,
        totalFiles: data.total_files,
        users: users.rows,
        fileTypes: fileTypes.rows,
        largestFiles: largestFiles.rows
      }
    });

  } catch (error) {
    next(error);
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
  getFileAuditLogs,
  previewFile,
  getStorageSummary,
};
