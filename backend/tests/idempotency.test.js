const request = require("supertest");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");

const app = require("../src/app");
const pool = require("../src/config/postgres");

describe("File API Idempotency", () => {
  let ownerId;
  let token;

  const testEmail = `idempotency-${crypto.randomUUID()}@example.com`;

  beforeAll(async () => {
    // Create a dedicated user for these tests.
    const userResult = await pool.query(
      `INSERT INTO users (name, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id`,
      ["Idempotency Test User", testEmail, "test-password-hash"]
    );

    ownerId = userResult.rows[0].id;

    token = jwt.sign(
      {
        id: ownerId,
        role: "user",
      },
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

  function filePayload(storageKey) {
    return {
      originalName: `${storageKey}.txt`,
      storageKey,
      mimeType: "text/plain",
      sizeBytes: 100,
      checksum: crypto
        .createHash("sha256")
        .update(storageKey)
        .digest("hex"),
    };
  }

  function postFile(payload, idempotencyKey) {
    const req = request(app)
      .post("/api/v1/files")
      .set("Authorization", `Bearer ${token}`);

    if (idempotencyKey !== undefined) {
      req.set("Idempotency-Key", idempotencyKey);
    }

    return req.send(payload);
  }

  test("returns 400 when the Idempotency-Key header is missing", async () => {
    const response = await postFile(filePayload("missing-key-file"));

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe("IDEMPOTENCY_KEY_REQUIRED");
  });

  test("creates file metadata with a new idempotency key", async () => {
    const payload = filePayload("first-idempotent-file");

    const response = await postFile(payload, crypto.randomUUID());


    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toBeDefined();

    const result = await pool.query(
      `SELECT COUNT(*)::int AS count
       FROM files
       WHERE owner_id = $1
         AND storage_key = $2`,
      [ownerId, payload.storageKey]
    );

    expect(result.rows[0].count).toBe(1);
  });

  test("replays the original response for the same key and payload", async () => {
    const payload = filePayload("replay-idempotent-file");
    const key = crypto.randomUUID();

    const firstResponse = await postFile(payload, key);
    const secondResponse = await postFile(payload, key);

    expect(firstResponse.status).toBe(201);
    expect(secondResponse.status).toBe(201);

    expect(secondResponse.headers["idempotency-replayed"]).toBe("true");
    expect(secondResponse.body).toEqual(firstResponse.body);

    const result = await pool.query(
      `SELECT COUNT(*)::int AS count
       FROM files
       WHERE owner_id = $1
         AND storage_key = $2`,
      [ownerId, payload.storageKey]
    );

    expect(result.rows[0].count).toBe(1);
  });

  test("returns 409 when the same key is reused with a different payload", async () => {
    const key = crypto.randomUUID();

    const firstPayload = filePayload("conflict-first-file");
    const secondPayload = filePayload("conflict-second-file");

    const firstResponse = await postFile(firstPayload, key);
    const secondResponse = await postFile(secondPayload, key);

    expect(firstResponse.status).toBe(201);

    expect(secondResponse.status).toBe(409);
    expect(secondResponse.body.success).toBe(false);
    expect(secondResponse.body.error.code).toBe("IDEMPOTENCY_KEY_REUSED");

    // Count only the two files involved in this test.
    // Other tests may have created files for the same test user.
    const result = await pool.query(
      `SELECT COUNT(*)::int AS count
       FROM files
       WHERE owner_id = $1
         AND storage_key = ANY($2::text[])`,
      [ownerId, [firstPayload.storageKey, secondPayload.storageKey]]
    );

    // Only the first request should have created a file.
    expect(result.rows[0].count).toBe(1);
  });

  test("creates only one file for concurrent requests using the same key", async () => {
    const payload = filePayload("concurrent-idempotent-file");
    const key = crypto.randomUUID();

    const [firstResponse, secondResponse] = await Promise.all([
      postFile(payload, key),
      postFile(payload, key),
    ]);

    expect(firstResponse.status).toBe(201);
    expect(secondResponse.status).toBe(201);

    const replayHeaders = [
      firstResponse.headers["idempotency-replayed"],
      secondResponse.headers["idempotency-replayed"],
    ];

    expect(replayHeaders.filter((value) => value === "true")).toHaveLength(1);

    expect(firstResponse.body).toEqual(secondResponse.body);

    const result = await pool.query(
      `SELECT COUNT(*)::int AS count
       FROM files
       WHERE owner_id = $1
         AND storage_key = $2`,
      [ownerId, payload.storageKey]
    );

    expect(result.rows[0].count).toBe(1);
  });
});
