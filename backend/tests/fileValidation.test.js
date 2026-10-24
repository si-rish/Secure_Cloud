const request = require("supertest");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");

const app = require("../src/app");
const pool = require("../src/config/postgres");

describe("File Metadata Schema Validation", () => {
  let ownerId;
  let token;

  const testEmail = `file-validation-${crypto.randomUUID()}@example.com`;

  beforeAll(async () => {
    const result = await pool.query(
      `INSERT INTO users (name, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id`,
      ["File Validation Test User", testEmail, "test-password-hash"]
    );

    ownerId = result.rows[0].id;

    token = jwt.sign(
      { id: ownerId, role: "user" },
      process.env.JWT_SECRET,
      {
        issuer: "securecloud",
        audience: "securecloud-api",
        expiresIn: "15m",
      }
    );
  });

  afterAll(async () => {
    if (ownerId) {
      await pool.query(
        `DELETE FROM idempotency_keys WHERE owner_id = $1`,
        [ownerId]
      );

      await pool.query(`DELETE FROM files WHERE owner_id = $1`, [ownerId]);

      await pool.query(`DELETE FROM users WHERE id = $1`, [ownerId]);
    }
  });

  function sendFileMetadata(payload) {
    return request(app)
      .post("/api/v1/files")
      .set("Authorization", `Bearer ${token}`)
      .set("Idempotency-Key", crypto.randomUUID())
      .send(payload);
  }

  test("rejects a missing originalName", async () => {
    const response = await sendFileMetadata({
      storageKey: "validation-missing-name",
      sizeBytes: 100,
    });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });

  test("rejects a negative file size", async () => {
    const response = await sendFileMetadata({
      originalName: "test.txt",
      storageKey: "validation-negative-size",
      sizeBytes: -1,
    });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });

  test("rejects a non-integer file size", async () => {
    const response = await sendFileMetadata({
      originalName: "test.txt",
      storageKey: "validation-decimal-size",
      sizeBytes: 10.5,
    });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });

  test("rejects unexpected properties", async () => {
    const response = await sendFileMetadata({
      originalName: "test.txt",
      storageKey: "validation-extra-field",
      sizeBytes: 100,
      unexpectedField: "not allowed",
    });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });

  test("rejects an invalid checksum", async () => {
    const response = await sendFileMetadata({
      originalName: "test.txt",
      storageKey: "validation-invalid-checksum",
      sizeBytes: 100,
      checksum: "invalid-checksum",
    });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });
});