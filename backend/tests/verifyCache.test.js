const request = require("supertest");
const jwt = require("jsonwebtoken");
const fs = require("fs/promises");
const path = require("path");
const crypto = require("crypto");

const pool = require("../src/config/postgres");
const fileService = require("../src/services/fileService");
const app = require("../src/app");

describe("File Integrity Verification Cache-Control", () => {
  let ownerId;
  let fileId;
  let ownerToken;
  let filePath;

  const originalContent = "SecureCloud cache verification test";
  const storageKey = `verify-cache-${Date.now()}.txt`;

  const checksum = crypto
    .createHash("sha256")
    .update(originalContent)
    .digest("hex");

  beforeAll(async () => {
    // Create the upload directory and physical test file
    const uploadDirectory = path.resolve(
      __dirname,
      "../storage/uploads"
    );

    await fs.mkdir(uploadDirectory, { recursive: true });

    filePath = path.join(uploadDirectory, storageKey);

    await fs.writeFile(filePath, originalContent);

    // Create a test user
    const owner = await pool.query(
      `INSERT INTO users (name, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id`,
      [
        "Verify Cache Owner",
        `verify-cache-${Date.now()}@example.com`,
        "test-password-hash",
      ]
    );

    ownerId = owner.rows[0].id;

    // Create metadata with the real file checksum
    const file = await fileService.createFileMetadata({
      ownerId,
      originalName: "verify-cache-test.txt",
      storageKey,
      mimeType: "text/plain",
      sizeBytes: Buffer.byteLength(originalContent),
      checksum,
    });

    fileId = file.id;

    // Generate a JWT using the existing authentication claims
    ownerToken = jwt.sign(
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
        "DELETE FROM files WHERE owner_id = $1",
        [ownerId]
      );

      await pool.query(
        "DELETE FROM users WHERE id = $1",
        [ownerId]
      );
    }

    if (filePath) {
      await fs.rm(filePath, { force: true });
    }
    await pool.end();
  });

  test("returns verified integrity and private Cache-Control headers", async () => {
    const response = await request(app)
      .get(`/api/v1/files/${fileId}/integrity`)
      .set("Authorization", `Bearer ${ownerToken}`);

    expect(response.status).toBe(200);

    expect(response.headers["cache-control"]).toBe(
      "private, no-cache"
    );

    expect(response.body.success).toBe(true);

    expect(response.body.data.integrity).toBe("verified");

    expect(response.body.data.fileId).toBe(fileId);
  });
});