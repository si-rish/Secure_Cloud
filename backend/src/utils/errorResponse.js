function sendError(
  res,
  statusCode,
  code,
  message,
  details = []
) {
  return res.status(statusCode).json({
    success: false,
    error: {
      code,
      message,
      details,
    },
  });
}

module.exports = sendError;