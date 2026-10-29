const pool = require("../config/postgres");
const sendError = require("../utils/errorResponse");

const VALID_ROLES = new Set(["admin", "manager", "user"]);

async function loadCurrentUser(req, res, next) {
  try {
    // Authentication must run before this middleware.
    if (!req.user?.id) {
      return sendError(
        res,
        401,
        "UNAUTHORIZED",
        "Authentication is required"
      );
    }

    const result = await pool.query(
      `SELECT
         u.id,
         u.role,
         u.organization_id,
         u.department_id,
         u.is_active,
         o.is_active AS organization_is_active
       FROM users u
       INNER JOIN organizations o
         ON o.id = u.organization_id
       WHERE u.id = $1
       LIMIT 1`,
      [req.user.id]
    );

    const user = result.rows[0];

    if (!user || !user.is_active || !user.organization_is_active) {
      return sendError(
        res,
        401,
        "UNAUTHORIZED",
        "User account or organization is unavailable"
      );
    }

    if (!VALID_ROLES.has(user.role)) {
      return sendError(
        res,
        403,
        "FORBIDDEN",
        "User account has an invalid role"
      );
    }

    if (user.role === "manager" && !user.department_id) {
      return sendError(
        res,
        403,
        "FORBIDDEN",
        "Manager must be assigned to a department"
      );
    }

    // Trust current database values, not stale JWT role information.
    req.user = {
      id: user.id,
      role: user.role,
      organizationId: user.organization_id,
      departmentId: user.department_id,
    };

    return next();
  } catch (error) {
    return next(error);
  }
}

module.exports = loadCurrentUser;
