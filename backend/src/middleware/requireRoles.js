const sendError = require("../utils/errorResponse");

const VALID_ROLES = new Set(["admin", "manager", "user"]);

function requireRoles(...allowedRoles) {
  // Catch incorrect role configuration during application setup.
  if (
    allowedRoles.length === 0 ||
    allowedRoles.some((role) => !VALID_ROLES.has(role))
  ) {
    throw new Error(
      "requireRoles requires at least one valid role: admin, manager, user"
    );
  }

  return function roleAuthorization(req, res, next) {
    // Authentication must run before role authorization.
    if (!req.user?.id) {
      return sendError(
        res,
        401,
        "UNAUTHORIZED",
        "Authentication is required"
      );
    }

    if (!VALID_ROLES.has(req.user.role)) {
      return sendError(
        res,
        403,
        "FORBIDDEN",
        "User role is invalid"
      );
    }

    if (!allowedRoles.includes(req.user.role)) {
      return sendError(
        res,
        403,
        "FORBIDDEN",
        "You do not have permission to perform this action"
      );
    }

    return next();
  };
}

module.exports = requireRoles;
