const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const pinoHttp = require("pino-http");
const multer = require("multer");
const { rateLimit } = require("express-rate-limit");
const swaggerUi = require("swagger-ui-express");
const YAML = require("yaml");
const fs = require("fs");
const path = require("path");
const graphqlRouter = require("./graphql/graphqlRouter");
const attachSoapServer = require("./soap/soapServer");

const fileRoutes = require("./routes/fileRoutes");
const authRoutes = require("./routes/authRoutes");
const sendError = require("./utils/errorResponse");

const openApiPath = path.join(__dirname, "docs", "openapi.yaml");

const openApiDocument = YAML.parse(
  fs.readFileSync(openApiPath, "utf8")
);

const app = express();

// Security middleware
app.use(helmet());
const allowedFrontendOrigin = process.env.FRONTEND_URL;

app.use(
  cors({
    origin: (requestOrigin, callback) => {
      // Allow requests without an Origin header (e.g. server-to-server).
      if (!requestOrigin) {
        return callback(null, true);
      }

      // Allow only the configured frontend.
      if (requestOrigin === allowedFrontendOrigin) {
        return callback(null, true);
      }

      // Do not grant CORS access to other origins.
      return callback(null, false);
    },
    methods: ["GET", "POST", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "Idempotency-Key",
      "If-None-Match"
    ],
    exposedHeaders: [
      "ETag",
      "Idempotency-Replayed",
      "RateLimit",
      "RateLimit-Policy",
      "Retry-After",
      "Content-Disposition"
    ]
  })
);
app.use(express.json());

// Structured HTTP logging
app.use(
  pinoHttp({
    genReqId: (req) => {
      const incomingId = req.headers["x-correlation-id"];

      if (
        typeof incomingId === "string" &&
        incomingId.length > 0 &&
        incomingId.length <= 128 &&
        /^[a-zA-Z0-9._-]+$/.test(incomingId)
      ) {
        return incomingId;
      }

      return require("crypto").randomUUID();
    },
    customProps: (req) => ({
      correlationId: req.id,
    }),
    redact: {
      paths: ["req.headers.authorization"],
      censor: "[REDACTED]",
    },
  })
);

// General API rate limiter
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 100, // Maximum 100 requests per window per IP
  standardHeaders: "draft-8",
  legacyHeaders: false,
  handler: (req, res) => {
    return sendError(
      res,
      429,
      "RATE_LIMIT_EXCEEDED",
      "Too many requests. Please try again later."
    );
  },
});

// Stricter rate limiter for authentication endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 10, // Maximum 10 requests per window per IP
  standardHeaders: "draft-8",
  legacyHeaders: false,
  handler: (req, res) => {
    return sendError(
      res,
      429,
      "AUTH_RATE_LIMIT_EXCEEDED",
      "Too many authentication attempts. Please try again later."
    );
  },
});

// Health check — excluded from API rate limiting
app.get("/health", (req, res) => {
  res.set("Cache-Control", "no-store");

  res.status(200).json({
    success: true,
    message: "SecureCloud backend is running",
    timestamp: new Date().toISOString(),
  });
});

// Swagger UI — interactive API documentation
app.use(
  "/api-docs",
  swaggerUi.serve,
  swaggerUi.setup(openApiDocument, {
    explorer: true,
    customSiteTitle: "SecureCloud API Documentation",
  })
);

// Raw OpenAPI specification in JSON format
app.get("/api-docs.json", (req, res) => {
  res.set("Cache-Control", "no-cache");
  return res.status(200).json(openApiDocument);
});

// Authentication routes use their dedicated rate limiter
app.use("/api/v1/auth", authLimiter, authRoutes);

// Apply general rate limiting to the remaining API routes
app.use("/api/v1", apiLimiter);

app.use("/api/v1/graphql", graphqlRouter);

// Other versioned API routes
app.use("/api/v1/files", fileRoutes);

// Centralized 404 handler
app.use((req, res) => {
  return sendError(res, 404, "NOT_FOUND", "Route not found");
});

// Centralized error handler
app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);

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

    return sendError(res, 400, "VALIDATION_ERROR", "Invalid file upload");
  }

  if (err.statusCode === 400) {
    return sendError(res, 400, "VALIDATION_ERROR", err.message);
  }

  if (err.statusCode === 401) {
    return sendError(res, 401, "UNAUTHORIZED", err.message);
  }

  if (err.statusCode === 403) {
    return sendError(res, 403, "FORBIDDEN", err.message);
  }

  if (err.statusCode === 404) {
    return sendError(res, 404, "NOT_FOUND", err.message);
  }

  if (err.statusCode === 409) {
    return sendError(res, 409, "CONFLICT", err.message);
  }

  console.error("Unhandled error:", err.message);

  return sendError(
    res,
    500,
    "INTERNAL_SERVER_ERROR",
    "Internal server error"
  );
});

const http = require("http");

const httpServer = http.createServer(app);
attachSoapServer(httpServer);

module.exports = app;
module.exports.httpServer = httpServer;
