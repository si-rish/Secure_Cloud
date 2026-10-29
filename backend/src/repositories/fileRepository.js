const pool = require("../config/postgres");

// Create file metadata and derive organization from the owner.
async function createFile(
  {
    ownerId,
    originalName,
    storageKey,
    mimeType,
    sizeBytes,
    checksum = null,
  },
  dbClient = pool
) {
  const query = `
    INSERT INTO files (
      owner_id,
      organization_id,
      original_name,
      storage_key,
      mime_type,
      size_bytes,
      checksum
    )
    SELECT
      u.id,
      u.organization_id,
      $2,
      $3,
      $4,
      $5,
      $6
    FROM users u
    WHERE u.id = $1
      AND u.is_active = TRUE
    RETURNING *;
  `;

  const values = [
    ownerId,
    originalName,
    storageKey,
    mimeType,
    sizeBytes,
    checksum,
  ];

  const result = await dbClient.query(query, values);

  if (result.rowCount === 0) {
    const error = new Error(
      "File owner does not exist or is inactive"
    );
    error.statusCode = 403;
    error.code = "FILE_OWNER_UNAVAILABLE";
    throw error;
  }

  return result.rows[0];
}

// Retrieve file metadata by ID.
async function findFileById(fileId) {
  const query = `
    SELECT *
    FROM files
    WHERE id = $1;
  `;

  const result = await pool.query(query, [fileId]);

  return result.rows[0] || null;
}

// Retrieve a page of files belonging to a user.
// Uses cursor-based pagination with created_at and id.
async function findFilesByOwner(
  ownerId,
  { limit = 10, cursor = null } = {}
) {
  const values = [ownerId];
  let cursorCondition = "";

  if (cursor) {
    values.push(cursor.createdAt, cursor.id);

    cursorCondition = `
      AND (created_at, id) < ($2::timestamptz, $3::uuid)
    `;
  }

  values.push(limit + 1);

  const limitPosition = values.length;

  const query = `
    SELECT *
    FROM files
    WHERE owner_id = $1
    ${cursorCondition}
    ORDER BY created_at DESC, id DESC
    LIMIT $${limitPosition};
  `;

  const result = await pool.query(query, values);

  return result.rows;
}

// Delete file metadata belonging to a user.
async function deleteFile(fileId, ownerId) {
  const result = await pool.query(
    `DELETE FROM files
     WHERE id = $1 AND owner_id = $2
     RETURNING id`,
    [fileId, ownerId]
  );

  return result.rowCount > 0;
}

// Retrieve file metadata only when the user owns it.
async function findFileByIdAndOwner(fileId, ownerId) {
  const query = `
    SELECT *
    FROM files
    WHERE id = $1
      AND owner_id = $2;
  `;

  const result = await pool.query(query, [fileId, ownerId]);

  return result.rows[0] || null;
}

module.exports = {
  createFile,
  findFileById,
  findFileByIdAndOwner,
  findFilesByOwner,
  deleteFile,
};