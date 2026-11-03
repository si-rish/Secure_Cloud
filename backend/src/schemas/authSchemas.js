const registerSchema = {
  type: "object",
  properties: {
    name: {
      type: "string",
      minLength: 1,
      maxLength: 100,
      pattern: ".*\\S.*"
    },
    email: {
      type: "string",
      format: "email",
      maxLength: 255
    },
    password: {
      type: "string",
      minLength: 8,
      maxLength: 72
    },
    organizationMode: {
      type: "string",
      enum: ["create", "join"]
    },
    organizationName: {
      type: "string",
      minLength: 2,
      maxLength: 150,
      pattern: ".*\\S.*"
    },
    invitationCode: {
      type: "string",
      minLength: 10,
      maxLength: 40,
      pattern: "^[A-Z0-9-]+$"
    }
  },
  required: [
    "name",
    "email",
    "password",
    "organizationMode"
  ],
  allOf: [
    {
      if: {
        properties: {
          organizationMode: { const: "create" }
        },
        required: ["organizationMode"]
      },
      then: {
        required: ["organizationName"],
        not: {
          required: ["invitationCode"]
        }
      }
    },
    {
      if: {
        properties: {
          organizationMode: { const: "join" }
        },
        required: ["organizationMode"]
      },
      then: {
        required: ["invitationCode"],
        not: {
          required: ["organizationName"]
        }
      }
    }
  ],
  additionalProperties: false
};

const loginSchema = {
  type: "object",
  properties: {
    email: {
      type: "string",
      format: "email"
    },
    password: {
      type: "string",
      minLength: 1
    }
  },
  required: ["email", "password"],
  additionalProperties: false
};

module.exports = {
  registerSchema,
  loginSchema
};