const pool = require("../config/postgres");

// Helper: send consistent error responses
function handleError(res, error) {
  console.error("Workspace controller error:", error);

  if (error.code === "23505") {
    return res.status(409).json({
      success: false,
      message: "This record already exists.",
    });
  }

  if (error.code === "23503") {
    return res.status(400).json({
      success: false,
      message: "The referenced record does not exist.",
    });
  }

  return res.status(500).json({
    success: false,
    message: "An internal server error occurred.",
  });
}

function getUser(req) {
  return req.user;
}

function getOrganizationId(req) {
  return getUser(req)?.organizationId;
}

// PROFILE

async function getProfile(req, res) {
  try {
    const result = await pool.query(
      `SELECT id, name, email, role, organization_id,
              department_id, is_active, created_at
       FROM users
       WHERE id = $1`,
      [getUser(req).id]
    );

    if (!result.rows.length) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    return res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    return handleError(res, error);
  }
}

async function updateProfile(req, res) {
  try {
    const { name } = req.body;

    if (typeof name !== "string" || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: "A valid name is required.",
      });
    }

    const result = await pool.query(
      `UPDATE users
       SET name = $1
       WHERE id = $2
       RETURNING id, name, email, role, organization_id,
                 department_id, is_active, created_at`,
      [name.trim(), getUser(req).id]
    );

    return res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    return handleError(res, error);
  }
}

// ORGANIZATION

async function getOrganization(req, res) {
  try {
    const result = await pool.query(
      `SELECT *
       FROM organizations
       WHERE id = $1`,
      [getOrganizationId(req)]
    );

    if (!result.rows.length) {
      return res.status(404).json({
        success: false,
        message: "Organization not found.",
      });
    }

    return res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    return handleError(res, error);
  }
}

async function updateOrganization(req, res) {
  try {
    const { name } = req.body;

    if (typeof name !== "string" || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: "Organization name is required.",
      });
    }

    const result = await pool.query(
      `UPDATE organizations
       SET name = $1
       WHERE id = $2
       RETURNING *`,
      [name.trim(), getOrganizationId(req)]
    );

    if (!result.rows.length) {
      return res.status(404).json({
        success: false,
        message: "Organization not found.",
      });
    }

    return res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    return handleError(res, error);
  }
}

// USERS

async function listUsers(req, res) {
  try {
    const result = await pool.query(
      `SELECT id, name, email, role, department_id,
              is_active, created_at
       FROM users
       WHERE organization_id = $1
       ORDER BY created_at DESC`,
      [getOrganizationId(req)]
    );

    return res.json({
      success: true,
      data: { users: result.rows, total: result.rowCount },
    });
  } catch (error) {
    return handleError(res, error);
  }
}

async function createUser(req, res) {
  try {
    const { name, email, password, role, departmentId } = req.body;

    if (
      !name?.trim() ||
      !email?.trim() ||
      typeof password !== "string" ||
      password.length < 8
    ) {
      return res.status(400).json({
        success: false,
        message: "Name, email, and a password of at least 8 characters are required.",
      });
    }

    if (role && !["user", "manager"].includes(role)) {
      return res.status(400).json({
        success: false,
        message: "New accounts may have the user or manager role.",
      });
    }

    // Reuse the existing authentication service so passwords
    // are hashed using the project's established implementation.
    const authService = require("../services/authService");

    const created = await authService.registerUser({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password,
    });

    let user = created;

    // Public registration assigns the default role and organization.
    // Only an administrator may assign a different role or department.
    if (role || departmentId) {
      const updated = await pool.query(
        `UPDATE users
         SET role = COALESCE($1, role),
             department_id = COALESCE($2, department_id)
         WHERE id = $3
           AND organization_id = $4
         RETURNING id, name, email, role, department_id,
                   is_active, created_at`,
        [
          role || null,
          departmentId || null,
          created.id,
          getOrganizationId(req),
        ]
      );

      if (updated.rows.length) {
        user = updated.rows[0];
      }
    }

    return res.status(201).json({ success: true, data: user });
  } catch (error) {
    return handleError(res, error);
  }
}

async function updateUser(req, res) {
  try {
    const { role, departmentId, isActive } = req.body;

    if (role && !["admin", "manager", "user"].includes(role)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user role.",
      });
    }

    const result = await pool.query(
      `UPDATE users
       SET role = COALESCE($1, role),
           department_id = COALESCE($2, department_id),
           is_active = COALESCE($3, is_active)
       WHERE id = $4
         AND organization_id = $5
       RETURNING id, name, email, role, department_id,
                 is_active, created_at`,
      [
        role || null,
        departmentId || null,
        typeof isActive === "boolean" ? isActive : null,
        req.params.id,
        getOrganizationId(req),
      ]
    );

    if (!result.rows.length) {
      return res.status(404).json({
        success: false,
        message: "User not found in your organization.",
      });
    }

    return res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    return handleError(res, error);
  }
}

// DEPARTMENTS

async function listDepartments(req, res) {
  try {
    const result = await pool.query(
      `SELECT d.*,
              (SELECT COUNT(*)
               FROM users u
               WHERE u.department_id = d.id
                 AND u.organization_id = d.organization_id) AS user_count
       FROM departments d
       WHERE d.organization_id = $1
       ORDER BY d.name`,
      [getOrganizationId(req)]
    );

    return res.json({
      success: true,
      data: {
        departments: result.rows,
        total: result.rowCount,
      },
    });
  } catch (error) {
    return handleError(res, error);
  }
}

async function createDepartment(req, res) {
  try {
    const { name, description } = req.body;

    if (typeof name !== "string" || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: "Department name is required.",
      });
    }

    const result = await pool.query(
      `INSERT INTO departments (organization_id, name, description)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [
        getOrganizationId(req),
        name.trim(),
        typeof description === "string" ? description.trim() : null,
      ]
    );

    return res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    return handleError(res, error);
  }
}

async function updateDepartment(req, res) {
  try {
    const { name, description } = req.body;

    if (typeof name !== "string" || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: "Department name is required.",
      });
    }

    const result = await pool.query(
      `UPDATE departments
       SET name = $1, description = $2
       WHERE id = $3 AND organization_id = $4
       RETURNING *`,
      [
        name.trim(),
        typeof description === "string" ? description.trim() : null,
        req.params.id,
        getOrganizationId(req),
      ]
    );

    if (!result.rows.length) {
      return res.status(404).json({
        success: false,
        message: "Department not found.",
      });
    }

    return res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    return handleError(res, error);
  }
}

async function deleteDepartment(req, res) {
  try {
    const result = await pool.query(
      `DELETE FROM departments
       WHERE id = $1 AND organization_id = $2
       RETURNING id`,
      [req.params.id, getOrganizationId(req)]
    );

    if (!result.rowCount) {
      return res.status(404).json({
        success: false,
        message: "Department not found.",
      });
    }

    return res.json({
      success: true,
      message: "Department deleted successfully.",
    });
  } catch (error) {
    return handleError(res, error);
  }
}

// ACTIVITY

async function activity(req, res) {
  try {
    const user = getUser(req);
    const organizationId = getOrganizationId(req);

    const result = await pool.query(
      `SELECT *
       FROM activity_logs
       WHERE organization_id = $1
         AND ($2 = 'admin' OR user_id = $3)
       ORDER BY created_at DESC
       LIMIT 100`,
      [organizationId, user.role, user.id]
    );

    return res.json({ success: true, data: result.rows });
  } catch (error) {
    // Some project versions store activity in MongoDB or use
    // a differently named table. Return a useful empty result
    // only when this particular table is absent.
    if (error.code === "42P01") {
      return res.json({ success: true, data: [] });
    }

    return handleError(res, error);
  }
}

// FOLDERS

async function listFolders(req, res) {
  try {
    const result = await pool.query(
      `SELECT *
       FROM folders
       WHERE organization_id = $1
         AND owner_id = $2
       ORDER BY created_at DESC`,
      [getOrganizationId(req), getUser(req).id]
    );

    return res.json({ success: true, data: result.rows });
  } catch (error) {
    if (error.code === "42P01") {
      return res.json({ success: true, data: [] });
    }

    return handleError(res, error);
  }
}

async function createFolder(req, res) {
  try {
    const { name, parentId } = req.body;

    if (typeof name !== "string" || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: "Folder name is required.",
      });
    }

    const result = await pool.query(
      `INSERT INTO folders
         (organization_id, owner_id, name, parent_id)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [
        getOrganizationId(req),
        getUser(req).id,
        name.trim(),
        parentId || null,
      ]
    );

    return res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    return handleError(res, error);
  }
}

async function deleteFolder(req, res) {
  try {
    const result = await pool.query(
      `DELETE FROM folders
       WHERE id = $1
         AND organization_id = $2
         AND owner_id = $3
       RETURNING id`,
      [req.params.id, getOrganizationId(req), getUser(req).id]
    );

    if (!result.rowCount) {
      return res.status(404).json({
        success: false,
        message: "Folder not found.",
      });
    }

    return res.json({ success: true, message: "Folder deleted." });
  } catch (error) {
    return handleError(res, error);
  }
}

// FILE SHARING

async function sharedFiles(req, res) {
  try {
    const result = await pool.query(
      `SELECT fs.*, f.original_name, f.size_bytes, f.mime_type
       FROM file_shares fs
       JOIN files f ON f.id = fs.file_id
                   AND f.organization_id = fs.organization_id
       WHERE fs.organization_id = $1
         AND fs.shared_with_user_id = $2
       ORDER BY fs.created_at DESC`,
      [getOrganizationId(req), getUser(req).id]
    );

    return res.json({ success: true, data: result.rows });
  } catch (error) {
    return handleError(res, error);
  }
}

async function shareFile(req, res) {
  try {
    const { userId, permission = "read" } = req.body;

    if (!userId || !["read", "write"].includes(permission)) {
      return res.status(400).json({
        success: false,
        message: "A target user and valid permission (read or write) are required.",
      });
    }

    const fileResult = await pool.query(
      `SELECT id, owner_id
       FROM files
       WHERE id = $1 AND organization_id = $2`,
      [req.params.id, getOrganizationId(req)]
    );

    if (!fileResult.rows.length) {
      return res.status(404).json({
        success: false,
        message: "File not found.",
      });
    }

    if (
      fileResult.rows[0].owner_id !== getUser(req).id &&
      getUser(req).role !== "admin"
    ) {
      return res.status(403).json({
        success: false,
        message: "Only the file owner or an administrator can share this file.",
      });
    }

    const target = await pool.query(
      `SELECT id FROM users
       WHERE id = $1 AND organization_id = $2 AND is_active = TRUE`,
      [userId, getOrganizationId(req)]
    );

    if (!target.rows.length) {
      return res.status(400).json({
        success: false,
        message: "The target user is not active in this organization.",
      });
    }

    const result = await pool.query(
      `INSERT INTO file_shares
         (organization_id, file_id, shared_by_user_id,
          shared_with_user_id, permission)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (file_id, shared_with_user_id)
       DO UPDATE SET permission = EXCLUDED.permission
       RETURNING *`,
      [
        getOrganizationId(req),
        req.params.id,
        getUser(req).id,
        userId,
        permission,
      ]
    );

    return res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    return handleError(res, error);
  }
}

async function listFileShares(req, res) {
  try {
    const result = await pool.query(
      `SELECT fs.*, u.name AS shared_with_name, u.email AS shared_with_email
       FROM file_shares fs
       JOIN files f ON f.id = fs.file_id
                   AND f.organization_id = fs.organization_id
       JOIN users u ON u.id = fs.shared_with_user_id
       WHERE fs.file_id = $1 AND fs.organization_id = $2
       ORDER BY fs.created_at DESC`,
      [req.params.id, getOrganizationId(req)]
    );

    return res.json({ success: true, data: result.rows });
  } catch (error) {
    return handleError(res, error);
  }
}

async function revokeShare(req, res) {
  try {
    const result = await pool.query(
      `DELETE FROM file_shares
       WHERE id = $1
         AND file_id = $2
         AND organization_id = $3
         AND shared_by_user_id = $4
       RETURNING id`,
      [
        req.params.shareId,
        req.params.id,
        getOrganizationId(req),
        getUser(req).id,
      ]
    );

    if (!result.rowCount) {
      return res.status(404).json({
        success: false,
        message: "File share not found or you cannot revoke it.",
      });
    }

    return res.json({ success: true, message: "File share revoked." });
  } catch (error) {
    return handleError(res, error);
  }
}
// ADMIN DASHBOARD STATISTICS
async function getStats(req, res) {
  try {
    const organizationId = getOrganizationId(req);

    if (!organizationId) {
      return res.status(400).json({
        success: false,
        message: "Organization information is missing.",
      });
    }

    const result = await pool.query(
      `SELECT
         COUNT(DISTINCT u.id)::int AS total_users,
         COUNT(f.id)::int AS total_files,
         COALESCE(SUM(f.size_bytes), 0) AS storage_used_bytes,
         COUNT(DISTINCT u.id)
           FILTER (WHERE u.is_active = TRUE)::int AS active_users
       FROM users u
       LEFT JOIN files f ON f.owner_id = u.id
       WHERE u.organization_id = $1`,
      [organizationId]
    );

    return res.status(200).json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    return handleError(res, error);
  }
}

module.exports = {
  getProfile,
  updateProfile,
  getOrganization,
  updateOrganization,
  listUsers,
  createUser,
  updateUser,
  listDepartments,
  createDepartment,
  updateDepartment,
  deleteDepartment,
  activity,
  listFolders,
  createFolder,
  deleteFolder,
  sharedFiles,
  shareFile,
  listFileShares,
  revokeShare,
  getStats,
};