const createFileSchema = {
  type: "object",
  properties: {
    originalName: {
      type: "string",
      minLength: 1,
      maxLength: 255,
    },
    storageKey: {
      type: "string",
      minLength: 1,
      maxLength: 255,
    },
    mimeType: {
      type: ["string", "null"],
      maxLength: 255,
    },
    sizeBytes: {
      type: "integer",
      minimum: 0,
      maximum: Number.MAX_SAFE_INTEGER,
    },
    checksum: {
      type: ["string", "null"],
      maxLength: 64,
      pattern: "^[a-fA-F0-9]{64}$",
    },
  },
  required: ["originalName", "storageKey", "sizeBytes"],
  additionalProperties: false,
};

module.exports = {
  createFileSchema,
};