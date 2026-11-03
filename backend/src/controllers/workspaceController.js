const pool = require("../config/postgres");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");

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


async function createFileAuditLog(
  db,
  {
    organizationId,
    fileId,
    fileName,
    actor,
    eventType,
    targetUserId = null,
    details = {},
  }
) {
  // Get the actor's actual details from PostgreSQL.
  const actorResult = await db.query(
    `SELECT id, name, email
     FROM users
     WHERE id = $1
       AND organization_id = $2
       AND is_active = TRUE`,
    [actor.id, organizationId]
  );

  if (!actorResult.rows.length) {
    throw new Error("Unable to identify the audit log actor.");
  }

  const actorDetails = actorResult.rows[0];
  const actorName =
    actorDetails.name?.trim() ||
    actorDetails.email?.trim() ||
    `User ${actorDetails.id}`;

  await db.query(
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
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [
      organizationId,
      fileId,
      fileName,
      actorDetails.id,
      actorName,
      actorDetails.email || null,
      eventType,
      targetUserId,
      JSON.stringify(details),
    ]
  );
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

const STORAGE_PLANS = {
  Basic: 1n * 1024n * 1024n * 1024n,
  Business: 10n * 1024n * 1024n * 1024n,
  Enterprise: 100n * 1024n * 1024n * 1024n,
};

async function getStoragePlan(req, res) {
  try {
    const result = await pool.query(
      `SELECT
         o.storage_plan,
         o.storage_quota_bytes,
         COALESCE(SUM(f.size_bytes), 0)::text AS used_bytes
       FROM organizations o
       LEFT JOIN files f ON f.organization_id = o.id
       WHERE o.id = $1
       GROUP BY o.id`,
      [getOrganizationId(req)]
    );

    if (!result.rows.length) {
      return res.status(404).json({
        success: false,
        message: "Organization not found.",
      });
    }

    const row = result.rows[0];
    const quota = BigInt(row.storage_quota_bytes);
    const used = BigInt(row.used_bytes);

    return res.json({
      success: true,
      data: {
        plan: row.storage_plan,
        quotaBytes: quota.toString(),
        usedBytes: used.toString(),
        availableBytes: (quota > used ? quota - used : 0n).toString(),
        plans: {
          Basic: STORAGE_PLANS.Basic.toString(),
          Business: STORAGE_PLANS.Business.toString(),
          Enterprise: STORAGE_PLANS.Enterprise.toString(),
        },
      },
    });
  } catch (error) {
    return handleError(res, error);
  }
}

async function updateStoragePlan(req, res) {
  const client = await pool.connect();

  try {
    const { plan, customQuotaBytes } = req.body;
    const organizationId = getOrganizationId(req);
    const actorId = getUser(req).id;

    let newQuota;

    if (plan === "Custom") {
      if (
        !/^[1-9]\d*$/.test(String(customQuotaBytes)) ||
        BigInt(customQuotaBytes) > BigInt(Number.MAX_SAFE_INTEGER)
      ) {
        return res.status(400).json({
          success: false,
          message: "A valid custom quota in bytes is required.",
        });
      }

      newQuota = BigInt(customQuotaBytes);
    } else if (STORAGE_PLANS[plan]) {
      newQuota = STORAGE_PLANS[plan];
    } else {
      return res.status(400).json({
        success: false,
        message: "Invalid storage plan.",
      });
    }

    await client.query("BEGIN");

    const organization = await client.query(
      `SELECT storage_plan, storage_quota_bytes
       FROM organizations
       WHERE id = $1 AND is_active = TRUE
       FOR UPDATE`,
      [organizationId]
    );

    if (!organization.rows.length) {
      throw Object.assign(new Error("Organization not found."), {
        statusCode: 404,
      });
    }

    const current = organization.rows[0];

    const usage = await client.query(
      `SELECT COALESCE(SUM(size_bytes), 0)::text AS used_bytes
       FROM files WHERE organization_id = $1`,
      [organizationId]
    );

    const used = BigInt(usage.rows[0].used_bytes);

    if (newQuota < used) {
      await client.query("ROLLBACK");

      return res.status(409).json({
        success: false,
        message: "Cannot reduce quota below current storage usage.",
        data: {
          usedBytes: used.toString(),
          requestedQuotaBytes: newQuota.toString(),
        },
      });
    }

    await client.query(
      `UPDATE organizations
       SET storage_plan = $1,
           storage_quota_bytes = $2,
           updated_at = NOW()
       WHERE id = $3`,
      [plan, newQuota.toString(), organizationId]
    );

    await client.query(
      `INSERT INTO organization_storage_history (
         organization_id, previous_plan, new_plan,
         previous_quota_bytes, new_quota_bytes, changed_by
       )
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        organizationId,
        current.storage_plan,
        plan,
        current.storage_quota_bytes,
        newQuota.toString(),
        actorId,
      ]
    );

    await client.query("COMMIT");

    return res.json({
      success: true,
      message: "Storage plan updated successfully.",
      data: {
        plan,
        quotaBytes: newQuota.toString(),
        usedBytes: used.toString(),
      },
    });
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    return handleError(res, error);
  } finally {
    client.release();
  }
}

async function getOrganization(req, res) {
  try {
    const result = await pool.query(
      `SELECT id, name, slug, is_active, created_at, updated_at,
              join_code_expires_at
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
       SET name = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING id, name, slug, is_active, created_at, updated_at,
                 join_code_expires_at`,
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

async function generateInvitationCode(req, res) {
  try {
    const organizationId = getOrganizationId(req);

    if (!organizationId) {
      return res.status(400).json({
        success: false,
        message: "Organization information is missing.",
      });
    }

    // Generate a cryptographically secure 24-character code.
    const invitationCode = crypto.randomBytes(12).toString("hex").toUpperCase();

    // Store only its SHA-256 hash.
    const codeHash = crypto
      .createHash("sha256")
      .update(invitationCode)
      .digest("hex");

    const result = await pool.query(
      `UPDATE organizations
       SET join_code_hash = $1,
           join_code_expires_at = NOW() + INTERVAL '7 days',
           updated_at = NOW()
       WHERE id = $2 AND is_active = TRUE
       RETURNING join_code_expires_at`,
      [codeHash, organizationId]
    );

    if (!result.rows.length) {
      return res.status(404).json({
        success: false,
        message: "Active organization not found.",
      });
    }

    return res.status(201).json({
      success: true,
      message: "Invitation code generated successfully.",
      data: {
        invitationCode,
        expiresAt: result.rows[0].join_code_expires_at,
      },
    });
  } catch (error) {
    return handleError(res, error);
  }
}

async function revokeInvitationCode(req, res) {
  try {
    const result = await pool.query(
      `UPDATE organizations
       SET join_code_hash = NULL,
           join_code_expires_at = NULL,
           updated_at = NOW()
       WHERE id = $1
       RETURNING id`,
      [getOrganizationId(req)]
    );

    if (!result.rows.length) {
      return res.status(404).json({
        success: false,
        message: "Organization not found.",
      });
    }

    return res.json({
      success: true,
      message: "Invitation code revoked successfully.",
    });
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
  const client = await pool.connect();

  try {
    const { name, email, password, role, departmentId } = req.body;

    const normalizedName = String(name || "").trim();
    const normalizedEmail = String(email || "").trim().toLowerCase();
    const organizationId = getOrganizationId(req);

    if (
      !normalizedName ||
      !normalizedEmail ||
      typeof password !== "string" ||
      password.length < 8 ||
      password.length > 72
    ) {
      return res.status(400).json({
        success: false,
        message: "Name, valid email, and a password between 8 and 72 characters are required.",
      });
    }

    if (role && !["user", "manager"].includes(role)) {
      return res.status(400).json({
        success: false,
        message: "New accounts may have the user or manager role.",
      });
    }

    if (!organizationId) {
      return res.status(400).json({
        success: false,
        message: "Organization information is missing.",
      });
    }

    await client.query("BEGIN");

    if (departmentId) {
      const department = await client.query(
        `SELECT id
         FROM departments
         WHERE id = $1 AND organization_id = $2`,
        [departmentId, organizationId]
      );

      if (!department.rows.length) {
        throw Object.assign(
          new Error("Department does not belong to your organization."),
          { statusCode: 400 }
        );
      }
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const result = await client.query(
      `INSERT INTO users
         (name, email, password_hash, role, organization_id, department_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, name, email, role, department_id,
                 is_active, created_at`,
      [
        normalizedName,
        normalizedEmail,
        passwordHash,
        role || "user",
        organizationId,
        departmentId || null,
      ]
    );

    await client.query("COMMIT");

    return res.status(201).json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    await client.query("ROLLBACK");

    if (error.code === "23505") {
      return res.status(409).json({
        success: false,
        message: "This email is already registered.",
      });
    }

    if (error.statusCode === 400) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    return handleError(res, error);
  } finally {
    client.release();
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
         AND fs.revoked_at IS NULL
       ORDER BY fs.created_at DESC`,
      [getOrganizationId(req), getUser(req).id]
    );

    return res.json({ success: true, data: result.rows });
  } catch (error) {
    return handleError(res, error);
  }
}



async function shareFile(req, res) {
  const db = await pool.connect();

  try {
    const { userId, permission = "read" } = req.body;
    const actor = getUser(req);
    const organizationId = getOrganizationId(req);

    if (!userId || !["read", "write"].includes(permission)) {
      return res.status(400).json({
        success: false,
        message: "A target user and valid permission are required.",
      });
    }

    await db.query("BEGIN");

    const fileResult = await db.query(
      `SELECT id, owner_id, original_name
       FROM files
       WHERE id = $1 AND organization_id = $2
       FOR UPDATE`,
      [req.params.id, organizationId]
    );

    if (!fileResult.rows.length) {
      await db.query("ROLLBACK");

      return res.status(404).json({
        success: false,
        message: "File not found.",
      });
    }

    const file = fileResult.rows[0];

    if (
      file.owner_id !== actor.id &&
      actor.role !== "admin"
    ) {
      await db.query("ROLLBACK");

      return res.status(403).json({
        success: false,
        message: "Only the file owner or an administrator can share this file.",
      });
    }

    const targetResult = await db.query(
      `SELECT id
       FROM users
       WHERE id = $1
         AND organization_id = $2
         AND is_active = TRUE`,
      [userId, organizationId]
    );

    if (!targetResult.rows.length) {
      await db.query("ROLLBACK");

      return res.status(400).json({
        success: false,
        message: "The target user is not active in this organization.",
      });
    }

    const existingResult = await db.query(
      `SELECT *
       FROM file_shares
       WHERE file_id = $1
         AND organization_id = $2
         AND shared_with_user_id = $3
         AND revoked_at IS NULL
       ORDER BY created_at DESC
       LIMIT 1
       FOR UPDATE`,
      [file.id, organizationId, userId]
    );

    let share;
    let eventType;

    if (existingResult.rows.length) {
      const existing = existingResult.rows[0];

      if (existing.permission === permission) {
        await db.query("COMMIT");

        return res.json({
          success: true,
          message: "File is already shared with this permission.",
          data: existing,
        });
      }

      const updated = await db.query(
        `UPDATE file_shares
         SET permission = $1,
             updated_at = NOW()
         WHERE id = $2
         RETURNING *`,
        [permission, existing.id]
      );

      share = updated.rows[0];
      eventType = "permission_change";
    } else {
      const revokedResult = await db.query(
        `SELECT id
         FROM file_shares
         WHERE file_id = $1
           AND organization_id = $2
           AND shared_with_user_id = $3
           AND revoked_at IS NOT NULL
         ORDER BY created_at DESC
         LIMIT 1
         FOR UPDATE`,
        [file.id, organizationId, userId]
      );

      if (revokedResult.rows.length) {
        const restored = await db.query(
          `UPDATE file_shares
           SET permission = $1,
               shared_by_user_id = $2,
               revoked_at = NULL,
               updated_at = NOW()
           WHERE id = $3
           RETURNING *`,
          [permission, actor.id, revokedResult.rows[0].id]
        );

        share = restored.rows[0];
      } else {
        const created = await db.query(
          `INSERT INTO file_shares (
            organization_id,
            file_id,
            shared_by_user_id,
            shared_with_user_id,
            permission
          )
          VALUES ($1,$2,$3,$4,$5)
          RETURNING *`,
          [organizationId, file.id, actor.id, userId, permission]
        );

        share = created.rows[0];
      }

      eventType = "share";
    }

    await createFileAuditLog(db, {
      organizationId,
      fileId: file.id,
      fileName: file.original_name,
      actor,
      eventType,
      targetUserId: userId,
      details: { permission },
    });

    await db.query("COMMIT");

    return res.status(201).json({
      success: true,
      data: share,
    });
  } catch (error) {
    await db.query("ROLLBACK").catch(() => { });
    return handleError(res, error);
  } finally {
    db.release();
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
       WHERE fs.file_id = $1
  AND fs.organization_id = $2
  AND fs.revoked_at IS NULL
       ORDER BY fs.created_at DESC`,
      [req.params.id, getOrganizationId(req)]
    );

    return res.json({ success: true, data: result.rows });
  } catch (error) {
    return handleError(res, error);
  }
}

async function revokeShare(req, res) {
  const db = await pool.connect();

  try {
    const actor = getUser(req);
    const organizationId = getOrganizationId(req);

    await db.query("BEGIN");

    const result = await db.query(
      `SELECT fs.*, f.original_name
       FROM file_shares fs
       JOIN files f
         ON f.id = fs.file_id
        AND f.organization_id = fs.organization_id
       WHERE fs.id = $1
         AND fs.file_id = $2
         AND fs.organization_id = $3
         AND fs.shared_by_user_id = $4
         AND fs.revoked_at IS NULL
       FOR UPDATE OF fs`,
      [
        req.params.shareId,
        req.params.id,
        organizationId,
        actor.id,
      ]
    );

    if (!result.rows.length) {
      await db.query("ROLLBACK");

      return res.status(404).json({
        success: false,
        message: "File share not found or you cannot revoke it.",
      });
    }

    const share = result.rows[0];

    await db.query(
      `UPDATE file_shares
       SET revoked_at = NOW(),
           updated_at = NOW()
       WHERE id = $1`,
      [share.id]
    );

    await createFileAuditLog(db, {
      organizationId,
      fileId: share.file_id,
      fileName: share.original_name,
      actor,
      eventType: "unshare",
      targetUserId: share.shared_with_user_id,
      details: {
        previousPermission: share.permission,
      },
    });

    await db.query("COMMIT");

    return res.json({
      success: true,
      message: "File share revoked.",
    });
  } catch (error) {
    await db.query("ROLLBACK").catch(() => { });
    return handleError(res, error);
  } finally {
    db.release();
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
  generateInvitationCode,
  revokeInvitationCode,
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
  getStoragePlan,
updateStoragePlan,
};