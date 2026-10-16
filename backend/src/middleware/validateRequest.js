const Ajv = require("ajv");
const addFormats = require("ajv-formats");
const sendError = require("../utils/errorResponse");

const ajv = new Ajv({
  allErrors: true,
  coerceTypes: false,
  removeAdditional: false,
});

addFormats(ajv);

function validateRequest(schema) {
  const validate = ajv.compile(schema);

  return function (req, res, next) {
    const valid = validate(req.body);

    if (!valid) {
      const details = validate.errors.map((error) => ({
        field:
          error.instancePath ||
          error.params.missingProperty ||
          "body",
        message: error.message,
      }));

      return sendError(
        res,
        400,
        "VALIDATION_ERROR",
        "Request validation failed",
        details
      );
    }

    next();
  };
}

module.exports = validateRequest;