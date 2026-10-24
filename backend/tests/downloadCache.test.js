const request = require("supertest");
const jwt = require("jsonwebtoken");
const fs = require("fs");
const path = require("path");
const pool = require("../src/config/postgres");
const fileService = require("../src/services/fileService");
const app = require("../src/app");

describe("File Download Cache-Control", () => {
  let ownerId;
  let fileId;
  let ownerToken;
  let storageKey;
  let filePath;

  const testContent = "SecureCloud download cache test";

  beforeAll(async () => {
    // Create a test user
    const owner = await pool.query(
      `INSERT INTO users (name, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id`,
      [
        "Download Cache Owner",
        `download-cache-${Date.now()}@example.com`,
        "test-password-hash",
      ]
    );

    ownerId = owner.rows[0].id;

    // Create a real file in the upload directory
    const uploadDirectory = path.resolve(
      __dirname,
      "../storage/uploads"
    );

    fs.mkdirSync(uploadDirectory, { recursive: true });

    storageKey = `download-cache-${Date.now()}.txt`;
    filePath = path.join(uploadDirectory, storageKey);

    fs.writeFileSync(filePath, testContent);

    // Create matching database metadata
    const file = await fileService.createFileMetadata({
      ownerId,
      originalName: "download-cache-test.txt",
      storageKey,
      mimeType: "text/plain",
      sizeBytes: Buffer.byteLength(testContent),
      checksum: require("crypto")
  .createHash("sha256")
  .update(testContent)
  .digest("hex"),
    });

    fileId = file.id;

    // Generate an authenticated JWT
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
    // Remove test metadata and user
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

    // Remove the physical test file
    if (filePath && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  });

  test("download should return the file with private Cache-Control headers", async () => {
    const response = await request(app)
      .get(`/api/v1/files/${fileId}/content`)
      .set("Authorization", `Bearer ${ownerToken}`);

    expect(response.status).toBe(200);

    expect(response.headers["cache-control"]).toBe(
      "private, no-cache"
    );

    expect(response.headers["content-disposition"]).toContain(
      "attachment"
    );

    expect(response.headers["content-type"]).toContain(
      "text/plain"
    );

    expect(response.text).toBe(testContent);
  });
});