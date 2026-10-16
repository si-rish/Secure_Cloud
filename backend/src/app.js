const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const pinoHttp = require("pino-http");
const multer = require("multer");

const fileRoutes = require("./routes/fileRoutes");
const authRoutes = require("./routes/authRoutes");
const sendError = require("./utils/errorResponse");

const app = express();

// Security and request middleware
app.use(helmet());
app.use(cors());
app.use(express.json());


app.use(
  pinoHttp({
    redact: {
      paths: ["req.headers.authorization"],
      censor: "[REDACTED]",
    },
  })
);

// Health check
app.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "SecureCloud backend is running",
    timestamp: new Date().toISOString(),
  });
});

// Versioned API routes
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/files", fileRoutes);

// Centralized 404 handler
app.use((req, res) => {
  return sendError(
    res,
    404,
    "NOT_FOUND",
    "Route not found"
  );
});

// Centralized error handler
app.use((err, req, res, next) => {
  // If the response has already started, delegate to Express.
  if (res.headersSent) {
    return next(err);
  }

  // Multer upload errors
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return sendError(
        res,
        413,
        "FILE_TOO_LARGE",
        "File size exceeds the 10 MB limit"
      );
    }

    if (err.code === "LIMIT_FILE_COUNT") {
      return sendError(
        res,
        400,
        "VALIDATION_ERROR",
        "Only one file can be uploaded at a time"
      );
    }

    return sendError(
      res,
      400,
      "VALIDATION_ERROR",
      "Invalid file upload"
    );
  }

  // Known client errors
  if (err.statusCode === 400) {
    return sendError(
      res,
      400,
      "VALIDATION_ERROR",
      err.message
    );
  }

  if (err.statusCode === 401) {
    return sendError(
      res,
      401,
      "UNAUTHORIZED",
      err.message
    );
  }

  if (err.statusCode === 403) {
    return sendError(
      res,
      403,
      "FORBIDDEN",
      err.message
    );
  }

  if (err.statusCode === 404) {
    return sendError(
      res,
      404,
      "NOT_FOUND",
      err.message
    );
  }

  if (err.statusCode === 409) {
    return sendError(
      res,
      409,
      "CONFLICT",
      err.message
    );
  }

  // Unexpected server errors
  console.error("Unhandled error:", err.message);

  return sendError(
    res,
    500,
    "INTERNAL_SERVER_ERROR",
    "Internal server error"
  );
});

module.exports = app;