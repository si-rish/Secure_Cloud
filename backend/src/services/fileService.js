const crypto = require("crypto");
const pool = require("../config/postgres");
const fileRepository = require("../repositories/fileRepository");

// ============================================================
// 1. VALIDATE FILE METADATA
// ============================================================

function validateFileMetadata({
  originalName,
  storageKey,
  mimeType = null,
  sizeBytes,
  checksum = null,
}) {
  if (
    typeof originalName !== "string" ||
    originalName.trim().length === 0 ||
    originalName.length > 255
  ) {
    throw Object.assign(
      new Error("Original file name is required or invalid"),
      {
        statusCode: 400,
        code: "INVALID_FILE_METADATA",
      }
    );
  }

  if (
    typeof storageKey !== "string" ||
    storageKey.trim().length === 0 ||
    storageKey.length > 255
  ) {
    throw Object.assign(
      new Error("Storage key is required or invalid"),
      {
        statusCode: 400,
        code: "INVALID_FILE_METADATA",
      }
    );
  }

  if (
    mimeType !== null &&
    (
      typeof mimeType !== "string" ||
      mimeType.length > 255
    )
  ) {
    throw Object.assign(
      new Error("MIME type is invalid"),
      {
        statusCode: 400,
        code: "INVALID_FILE_METADATA",
      }
    );
  }

  if (
    !Number.isSafeInteger(sizeBytes) ||
    sizeBytes < 0
  ) {
    throw Object.assign(
      new Error("File size must be a non-negative integer"),
      {
        statusCode: 400,
        code: "INVALID_FILE_METADATA",
      }
    );
  }

  if (
    checksum !== null &&
    (
      typeof checksum !== "string" ||
      checksum.length !== 64 ||
      !/^[a-fA-F0-9]{64}$/.test(checksum)
    )
  ) {
    throw Object.assign(
      new Error("Checksum must be a valid SHA-256 hash"),
      {
        statusCode: 400,
        code: "INVALID_FILE_METADATA",
      }
    );
  }
}

// ============================================================
// 2. CREATE FILE METADATA
// ============================================================

async function createFileMetadata(metadata) {
  if (!metadata || typeof metadata !== "object") {
    throw Object.assign(
      new Error("File metadata is required"),
      {
        statusCode: 400,
        code: "INVALID_FILE_METADATA",
      }
    );
  }

  const normalizedMetadata = {
    ...metadata,
    mimeType: metadata.mimeType ?? null,
    checksum: metadata.checksum ?? null,
  };

  validateFileMetadata(normalizedMetadata);

  return fileRepository.createFile(normalizedMetadata);
}

// ============================================================
// 3. CREATE FILE METADATA WITH IDEMPOTENCY
// ============================================================

async function createFileMetadataIdempotently(
  metadata,
  idempotencyKey
) {
  if (
    typeof idempotencyKey !== "string" ||
    idempotencyKey.trim().length === 0
  ) {
    throw Object.assign(
      new Error("Idempotency-Key header is required"),
      {
        statusCode: 400,
        code: "IDEMPOTENCY_KEY_REQUIRED",
      }
    );
  }

  if (idempotencyKey.length > 255) {
    throw Object.assign(
      new Error("Idempotency key must not exceed 255 characters"),
      {
        statusCode: 400,
        code: "INVALID_IDEMPOTENCY_KEY",
      }
    );
  }

  if (!metadata || typeof metadata !== "object") {
    throw Object.assign(
      new Error("File metadata is required"),
      {
        statusCode: 400,
        code: "INVALID_FILE_METADATA",
      }
    );
  }

  const normalizedMetadata = {
    ...metadata,
    mimeType: metadata.mimeType ?? null,
    checksum: metadata.checksum ?? null,
  };

  validateFileMetadata(normalizedMetadata);

  const requestHash = crypto
    .createHash("sha256")
    .update(
      JSON.stringify({
        ownerId: normalizedMetadata.ownerId,
        originalName: normalizedMetadata.originalName,
        storageKey: normalizedMetadata.storageKey,
        mimeType: normalizedMetadata.mimeType,
        sizeBytes: normalizedMetadata.sizeBytes,
        checksum: normalizedMetadata.checksum,
      })
    )
    .digest("hex");

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const reservation = await client.query(
      `
        INSERT INTO idempotency_keys (
          owner_id,
          idempotency_key,
          request_hash
        )
        VALUES ($1, $2, $3)
        ON CONFLICT (owner_id, idempotency_key)
        DO NOTHING
        RETURNING id;
      `,
      [
        normalizedMetadata.ownerId,
        idempotencyKey,
        requestHash,
      ]
    );

    // The key already exists: replay or reject the request.
    if (reservation.rowCount === 0) {
      const existingResult = await client.query(
        `
          SELECT
            request_hash,
            response_status,
            response_body
          FROM idempotency_keys
          WHERE owner_id = $1
            AND idempotency_key = $2
          FOR UPDATE;
        `,
        [
          normalizedMetadata.ownerId,
          idempotencyKey,
        ]
      );

      const existing = existingResult.rows[0];

      if (!existing) {
        throw Object.assign(
          new Error("Idempotency record is unavailable"),
          {
            statusCode: 503,
            code: "IDEMPOTENCY_RECORD_UNAVAILABLE",
          }
        );
      }

      if (existing.request_hash !== requestHash) {
        throw Object.assign(
          new Error(
            "This idempotency key was already used with a different request"
          ),
          {
            statusCode: 409,
            code: "IDEMPOTENCY_KEY_REUSED",
          }
        );
      }

      if (
        existing.response_status === null ||
        existing.response_body === null
      ) {
        throw Object.assign(
          new Error("Original idempotency response is unavailable"),
          {
            statusCode: 503,
            code: "IDEMPOTENCY_RESPONSE_UNAVAILABLE",
          }
        );
      }

      await client.query("COMMIT");

      return {
        statusCode: existing.response_status,
        body: existing.response_body,
        replayed: true,
      };
    }

    // Insert metadata using the same transaction.
    const file = await fileRepository.createFile(
      normalizedMetadata,
      client
    );

    const responseBody = {
      success: true,
      message: "File metadata created successfully",
      data: file,
    };

    await client.query(
      `
        UPDATE idempotency_keys
        SET response_status = $1,
            response_body = $2::jsonb
        WHERE owner_id = $3
          AND idempotency_key = $4;
      `,
      [
        201,
        JSON.stringify(responseBody),
        normalizedMetadata.ownerId,
        idempotencyKey,
      ]
    );

    await client.query("COMMIT");

    return {
      statusCode: 201,
      body: responseBody,
      replayed: false,
    };
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

// ============================================================
// 4. GET FILE METADATA BY ID
// ============================================================

async function getFileMetadata(fileId) {
  if (!fileId) {
    throw new Error("File ID is required");
  }

  return fileRepository.findFileById(fileId);
}

// ============================================================
// 5. GET FILES WITH OPTIONAL CURSOR PAGINATION
// ============================================================

async function getUserFiles(
  ownerId,
  options
) {
  if (!ownerId) {
    throw new Error("Owner ID is required");
  }

  // Preserve the existing API: getUserFiles(ownerId) returns
  // an array when pagination options are not supplied.
  const paginationRequested = options !== undefined;

  const {
    limit = 10,
    cursor = null,
  } = options || {};

  if (
    !Number.isInteger(limit) ||
    limit < 1 ||
    limit > 100
  ) {
    throw Object.assign(
      new Error("Limit must be an integer between 1 and 100"),
      {
        statusCode: 400,
        code: "INVALID_PAGINATION_LIMIT",
      }
    );
  }

  let parsedCursor = null;

  if (cursor !== null) {
    try {
      parsedCursor =
        typeof cursor === "string"
          ? JSON.parse(
              Buffer.from(cursor, "base64url").toString("utf8")
            )
          : cursor;
    } catch {
      throw Object.assign(
        new Error("Invalid pagination cursor"),
        {
          statusCode: 400,
          code: "INVALID_CURSOR",
        }
      );
    }

    if (
      !parsedCursor ||
      typeof parsedCursor.createdAt !== "string" ||
      typeof parsedCursor.id !== "string" ||
      Number.isNaN(Date.parse(parsedCursor.createdAt)) ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        parsedCursor.id
      )
    ) {
      throw Object.assign(
        new Error("Invalid pagination cursor"),
        {
          statusCode: 400,
          code: "INVALID_CURSOR",
        }
      );
    }
  }

  const rows = await fileRepository.findFilesByOwner(
    ownerId,
    {
      limit,
      cursor: parsedCursor,
    }
  );

  // Preserve array return type for existing callers.
  if (!paginationRequested) {
    return rows;
  }

  const hasMore = rows.length > limit;
  const data = rows.slice(0, limit);

  let nextCursor = null;

  if (hasMore && data.length > 0) {
    const lastFile = data[data.length - 1];

    nextCursor = Buffer.from(
      JSON.stringify({
        createdAt: new Date(lastFile.created_at).toISOString(),
        id: lastFile.id,
      })
    ).toString("base64url");
  }

  return {
    data,
    pagination: {
      limit,
      hasMore,
      nextCursor,
    },
  };
}

// ============================================================
// 6. DELETE FILE METADATA
// ============================================================

async function removeFileMetadata(fileId, ownerId) {
  if (!fileId || !ownerId) {
    throw new Error("File ID and owner ID are required");
  }

  return fileRepository.deleteFile(fileId, ownerId);
}

// ============================================================
// 7. GET FILE METADATA WITH OWNERSHIP VALIDATION
// ============================================================

async function getFileMetadataByOwner(fileId, ownerId) {
  if (!fileId || !ownerId) {
    throw new Error("File ID and owner ID are required");
  }

  return fileRepository.findFileByIdAndOwner(
    fileId,
    ownerId
  );
}

// ============================================================
// 8. EXPORT SERVICE FUNCTIONS
// ============================================================

module.exports = {
  validateFileMetadata,
  createFileMetadata,
  createFileMetadataIdempotently,
  getFileMetadata,
  getUserFiles,
  removeFileMetadata,
  getFileMetadataByOwner,
};