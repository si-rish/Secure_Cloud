const jwt = require("jsonwebtoken");
const sendError = require("../utils/errorResponse");

function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    // Check whether the token exists
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return sendError(
        res,
        401,
        "UNAUTHORIZED",
        "Authentication token is required"
      );
    }

    // Extract the JWT
    const token = authHeader.split(" ")[1];

    // Reject an empty token
    if (!token) {
      return sendError(
        res,
        401,
        "UNAUTHORIZED",
        "Invalid or expired authentication token"
      );
    }

    // Verify the token
    const decoded = jwt.verify(token, process.env.JWT_SECRET, {
      issuer: "securecloud",
      audience: "securecloud-api",
    });

    // Attach authenticated user information
    req.user = {
      id: decoded.id,
      role: decoded.role,
    };

    next();
  } catch (error) {
    return sendError(
      res,
      401,
      "UNAUTHORIZED",
      "Invalid or expired authentication token"
    );
  }
}

module.exports = authMiddleware;