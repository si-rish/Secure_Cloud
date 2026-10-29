const jwt = require("jsonwebtoken");
const sendError = require("../utils/errorResponse");

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  if (
    typeof authHeader !== "string" ||
    !authHeader.startsWith("Bearer ")
  ) {
    return sendError(
      res,
      401,
      "UNAUTHORIZED",
      "Authentication token is required"
    );
  }

  const token = authHeader.slice(7).trim();

  if (!token) {
    return sendError(
      res,
      401,
      "UNAUTHORIZED",
      "Authentication token is required"
    );
  }

  if (!process.env.JWT_SECRET) {
    return next(new Error("JWT_SECRET is not configured"));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET, {
      issuer: process.env.JWT_ISSUER || "securecloud",
      audience: process.env.JWT_AUDIENCE || "securecloud-users",
      algorithms: ["HS256"],
    });

    const userId = decoded.sub || decoded.id;

    if (typeof userId !== "string" || !userId.trim()) {
      return sendError(
        res,
        401,
        "UNAUTHORIZED",
        "Invalid authentication token payload"
      );
    }

    req.user = {
      id: userId,
    };

    return next();
  } catch (error) {
    if (
      error.name === "TokenExpiredError" ||
      error.name === "JsonWebTokenError" ||
      error.name === "NotBeforeError"
    ) {
      return sendError(
        res,
        401,
        "UNAUTHORIZED",
        "Invalid or expired authentication token"
      );
    }

    return next(error);
  }
}

module.exports = authMiddleware;
