const pool = require("../src/config/postgres");
const fileService = require("../src/services/fileService");

describe("File Service", () => {
  let userId;
  let fileId;

  beforeAll(async () => {
    const result = await pool.query(
      `INSERT INTO users (name, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id`,
      [
        "File Service Test User",
        `file-service-${Date.now()}@example.com`,
        "test-password-hash",
      ]
    );

    userId = result.rows[0].id;
  });

  afterAll(async () => {
    if (userId) {
      await pool.query("DELETE FROM files WHERE owner_id = $1", [userId]);
      await pool.query("DELETE FROM users WHERE id = $1", [userId]);
    }

    await pool.end();
  });

  test("should create file metadata", async () => {
    const file = await fileService.createFileMetadata({
      ownerId: userId,
      originalName: "service-test.pdf",
      storageKey: `service-${Date.now()}-${Math.random()}.pdf`,
      mimeType: "application/pdf",
      sizeBytes: 2048,
      checksum: "service-checksum",
    });

    fileId = file.id;

    expect(file).toBeDefined();
    expect(file.original_name).toBe("service-test.pdf");
    expect(Number(file.size_bytes)).toBe(2048);
  });

  test("should retrieve file metadata", async () => {
    const file = await fileService.getFileMetadata(fileId);

    expect(file).toBeDefined();
    expect(file.id).toBe(fileId);
  });

  test("should retrieve files belonging to a user", async () => {
    const files = await fileService.getUserFiles(userId);

    expect(Array.isArray(files)).toBe(true);
    expect(files.some((file) => file.id === fileId)).toBe(true);
  });

  test("should reject a negative file size", async () => {
    await expect(
      fileService.createFileMetadata({
        ownerId: userId,
        originalName: "invalid.pdf",
        storageKey: "invalid-test-key",
        sizeBytes: -1,
      })
    ).rejects.toThrow();
  });

  test("should delete file metadata", async () => {
    const deleted = await fileService.removeFileMetadata(fileId, userId);

    expect(deleted).toBe(true);

    const file = await fileService.getFileMetadata(fileId);

    expect(file).toBeNull();
    fileId = null;
  });
});