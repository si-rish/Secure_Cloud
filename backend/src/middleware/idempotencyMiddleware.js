const crypto = require("crypto");

const idempotencyStore = new Map();

function idempotencyMiddleware(req, res, next) {
  const key = req.get("Idempotency-Key");

  // Idempotency key is required for POST requests
  if (!key) {
    return res.status(400).json({
      success: false,
      error: {
        code: "IDEMPOTENCY_KEY_REQUIRED",
        message: "Idempotency-Key header is required",
      },
    });
  }

  // Prevent excessively long keys
  if (key.length > 255) {
    return res.status(400).json({
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Idempotency-Key must not exceed 255 characters",
      },
    });
  }

  const scope = `${req.user?.id || "anonymous"}:${req.method}:${req.originalUrl}:${key}`;
  const existing = idempotencyStore.get(scope);

  if (existing) {
    if (existing.status === "processing") {
      return res.status(409).json({
        success: false,
        error: {
          code: "IDEMPOTENCY_IN_PROGRESS",
          message: "A request with this idempotency key is already processing",
        },
      });
    }

    res.status(existing.statusCode);
    return res.json(existing.body);
  }

  // Mark the request as processing
  const entry = { status: "processing" };
  idempotencyStore.set(scope, entry);

  const originalJson = res.json.bind(res);

  res.json = function (body) {
    if (res.statusCode >= 200 && res.statusCode < 300) {
      entry.status = "completed";
      entry.statusCode = res.statusCode;
      entry.body = body;
    } else {
      idempotencyStore.delete(scope);
    }

    return originalJson(body);
  };

  res.on("close", () => {
    if (entry.status === "processing") {
      idempotencyStore.delete(scope);
    }
  });

  next();
}

module.exports = idempotencyMiddleware;