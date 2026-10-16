const pool = require("../config/postgres");

async function createFile({
  ownerId,
  originalName,
  storageKey,
  mimeType,
  sizeBytes,
  checksum = null,
}) {
  const query = `
    INSERT INTO files (
      owner_id,
      original_name,
      storage_key,
      mime_type,
      size_bytes,
      checksum
    )
    VALUES ($1, $2, $3, $4, $5, $6)
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

  const result = await pool.query(query, values);
  return result.rows[0];
}

async function findFileById(fileId) {
  const query = `
    SELECT *
    FROM files
    WHERE id = $1;
  `;

  const result = await pool.query(query, [fileId]);
  return result.rows[0] || null;
}

async function findFilesByOwner(ownerId) {
  const query = `
    SELECT *
    FROM files
    WHERE owner_id = $1
    ORDER BY created_at DESC;
  `;

  const result = await pool.query(query, [ownerId]);
  return result.rows;
}

async function deleteFile(fileId, ownerId) {
  const result = await pool.query(
    `DELETE FROM files
     WHERE id = $1 AND owner_id = $2
     RETURNING id`,
    [fileId, ownerId]
  );

  return result.rowCount > 0;
}

async function findFileByIdAndOwner(fileId, ownerId) {
  const query = `
    SELECT *
    FROM files
    WHERE id = $1 AND owner_id = $2;
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