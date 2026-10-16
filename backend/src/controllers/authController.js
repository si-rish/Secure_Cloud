const authService = require("../services/authService");
const sendError = require("../utils/errorResponse");

// Register a new user
async function register(req, res, next) {
  try {
    const user = await authService.registerUser({
      name: req.body.name,
      email: req.body.email,
      password: req.body.password,
    });

    return res.status(201).json({
      success: true,
      message: "Registration successful",
      data: user,
    });
  } catch (error) {
    if (error.statusCode === 409) {
      return sendError(
        res,
        409,
        "CONFLICT",
        error.message
      );
    }

    if (
      error.message === "Name, email, and password are required" ||
      error.message.startsWith("Name must") ||
      error.message.startsWith("Please provide a valid email") ||
      error.message.startsWith("Password must")
    ) {
      return sendError(
        res,
        400,
        "VALIDATION_ERROR",
        error.message
      );
    }

    return next(error);
  }
}

// Login an existing user
async function login(req, res, next) {
  try {
    const result = await authService.loginUser({
      email: req.body.email,
      password: req.body.password,
    });

    return res.status(200).json({
      success: true,
      message: "Login successful",
      data: result,
    });
  } catch (error) {
    if ([401, 403].includes(error.statusCode)) {
      const code =
        error.statusCode === 403 ? "FORBIDDEN" : "UNAUTHORIZED";

      return sendError(
        res,
        error.statusCode,
        code,
        error.message
      );
    }

    if (
      error.message === "Email and password are required" ||
      error.message === "Email and password must be strings"
    ) {
      return sendError(
        res,
        400,
        "VALIDATION_ERROR",
        error.message
      );
    }

    return next(error);
  }
}

module.exports = {
  register,
  login,
};