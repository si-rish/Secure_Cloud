const registerSchema = {
  type: "object",
  properties: {
    name: {
      type: "string",
      minLength: 1,
      maxLength: 100,
    },
    email: {
      type: "string",
      format: "email",
      maxLength: 255,
    },
    password: {
      type: "string",
      minLength: 8,
    },
  },
  required: ["name", "email", "password"],
  additionalProperties: false,
};

const loginSchema = {
  type: "object",
  properties: {
    email: {
      type: "string",
      format: "email",
      maxLength: 255,
    },
    password: {
      type: "string",
      minLength: 1,
    },
  },
  required: ["email", "password"],
  additionalProperties: false,
};

module.exports = {
  registerSchema,
  loginSchema,
};