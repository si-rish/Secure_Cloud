const pool = require("../config/postgres");

const VALID_PERMISSIONS = new Set(["read", "write"]);

/**
 * Get a file only when the requesting user is authorized to access it.
 *
 * Rules:
 * - Admin: may access files belonging to their organization.
 * - Manager: may access files owned by members of their department.
 * - Regular user: may access their own files and files explicitly shared
 *   with them.
 * - Explicitly shared files must belong to the same organization.
 * - Inactive users and organizations cannot access files.
 *
 * requiredPermission:
 * - "read": viewing/downloading the file
 * - "write": modifying a file through a write-authorized operation
 *
 * Returns null when access is denied or the file is unavailable.
 */
async function getAccessibleFile(
  fileId,
  user,
  requiredPermission = "read"
) {
  if (!fileId || !user?.id) {
    return null;
  }

  if (!VALID_PERMISSIONS.has(requiredPermission)) {
    throw new Error("Invalid file permission requirement");
  }

  const result = await pool.query(
    `SELECT
        f.*,
        owner.name AS owner_name,
        owner.email AS owner_email,
        owner.department_id AS owner_department_id,
        requester.role AS requester_role,
        requester.department_id AS requester_department_id,
        COALESCE(share.permission, 'read') AS granted_permission,
        share.id AS active_share_id
     FROM files f
     INNER JOIN users owner
       ON owner.id = f.owner_id
      AND owner.organization_id = f.organization_id
     INNER JOIN users requester
       ON requester.id = $2
      AND requester.organization_id = f.organization_id
     INNER JOIN organizations org
       ON org.id = requester.organization_id
     LEFT JOIN file_shares share
       ON share.file_id = f.id
      AND share.organization_id = f.organization_id
      AND share.shared_with_user_id = requester.id
      AND share.revoked_at IS NULL
     WHERE f.id = $1
       AND requester.is_active = TRUE
       AND owner.is_active = TRUE
       AND org.is_active = TRUE
       AND (
         -- Owners can access their own files.
         f.owner_id = requester.id

         -- Administrators can access files within their organization.
         OR requester.role = 'admin'

         -- Managers can access files owned by their department.
         OR (
           requester.role = 'manager'
           AND requester.department_id IS NOT NULL
           AND owner.department_id = requester.department_id
         )

         -- Other users can access explicitly shared files.
         OR share.id IS NOT NULL
       )
     LIMIT 1`,
    [fileId, user.id]
  );

  const file = result.rows[0];

  if (!file) {
    return null;
  }

  // A write request must not succeed with read-only sharing permission.
  if (
    requiredPermission === "write" &&
    file.owner_id !== user.id &&
    file.requester_role !== "admin" &&
    file.granted_permission !== "write"
  ) {
    return null;
  }

  return file;
}

/**
 * List files that administrators and managers are permitted to manage.
 *
 * Administrators see all files in their organization.
 * Managers see files owned by members of their department.
 */
async function listFilesForManagement(
  userId,
  { limit = 100, offset = 0 } = {}
) {
  const safeLimit = Math.min(
    Math.max(Number.parseInt(limit, 10) || 100, 1),
    200
  );

  const safeOffset = Math.max(
    Number.parseInt(offset, 10) || 0,
    0
  );

  const result = await pool.query(
    `SELECT
        f.*,
        owner.name AS owner_name,
        owner.email AS owner_email
     FROM files f
     INNER JOIN users requester
       ON requester.id = $1
     INNER JOIN organizations org
       ON org.id = requester.organization_id
     INNER JOIN users owner
       ON owner.id = f.owner_id
      AND owner.organization_id = f.organization_id
     WHERE requester.is_active = TRUE
       AND owner.is_active = TRUE
       AND org.is_active = TRUE
       AND f.organization_id = requester.organization_id
       AND (
         requester.role = 'admin'
         OR (
           requester.role = 'manager'
           AND requester.department_id IS NOT NULL
           AND owner.department_id = requester.department_id
         )
       )
     ORDER BY f.created_at DESC, f.id DESC
     LIMIT $2 OFFSET $3`,
    [userId, safeLimit, safeOffset]
  );

  return result.rows;
}

/**
 * List active files explicitly shared with a user.
 *
 * Results are restricted to the recipient's active organization.
 */
async function listSharedWithUser(
  userId,
  { limit = 50, offset = 0 } = {}
) {
  const safeLimit = Math.min(
    Math.max(Number.parseInt(limit, 10) || 50, 1),
    100
  );

  const safeOffset = Math.max(
    Number.parseInt(offset, 10) || 0,
    0
  );

  const result = await pool.query(
    `SELECT
        f.*,
        share.permission,
        share.created_at AS shared_at,
        sharer.name AS shared_by_name,
        sharer.email AS shared_by_email
     FROM file_shares share
     INNER JOIN files f
       ON f.id = share.file_id
      AND f.organization_id = share.organization_id
     INNER JOIN users recipient
       ON recipient.id = share.shared_with_user_id
      AND recipient.organization_id = share.organization_id
     INNER JOIN users sharer
       ON sharer.id = share.shared_by
      AND sharer.organization_id = share.organization_id
     INNER JOIN organizations org
       ON org.id = recipient.organization_id
     WHERE recipient.id = $1
       AND recipient.is_active = TRUE
       AND sharer.is_active = TRUE
       AND org.is_active = TRUE
       AND share.revoked_at IS NULL
     ORDER BY share.created_at DESC, f.id DESC
     LIMIT $2 OFFSET $3`,
    [userId, safeLimit, safeOffset]
  );

  return result.rows;
}

module.exports = {
  getAccessibleFile,
  listFilesForManagement,
  listSharedWithUser,
};
