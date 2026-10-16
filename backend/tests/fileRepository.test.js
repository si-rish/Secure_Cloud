const pool = require("../src/config/postgres");
const fileRepository = require("../src/repositories/fileRepository");

describe("File Repository", () => {
  let userId;
  let fileId;

  beforeAll(async () => {
    const userResult = await pool.query(
      `INSERT INTO users (name, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id`,
      [
        "Repository Test User",
        `repository-test-${Date.now()}@example.com`,
        "test-password-hash",
      ]
    );

    userId = userResult.rows[0].id;
  });

  afterAll(async () => {
    if (userId) {
      await pool.query("DELETE FROM files WHERE owner_id = $1", [userId]);
      await pool.query("DELETE FROM users WHERE id = $1", [userId]);
    }

    await pool.end();
  });

  test("should create file metadata", async () => {
    const file = await fileRepository.createFile({
      ownerId: userId,
      originalName: "test-document.pdf",
      storageKey: `test-${Date.now()}-${Math.random()}.pdf`,
      mimeType: "application/pdf",
      sizeBytes: 1024,
      checksum: "test-checksum",
    });

    fileId = file.id;

    expect(file).toBeDefined();
    expect(file.original_name).toBe("test-document.pdf");
    expect(Number(file.size_bytes)).toBe(1024);
  });

  test("should find file by ID", async () => {
    const file = await fileRepository.findFileById(fileId);

    expect(file).toBeDefined();
    expect(file.id).toBe(fileId);
  });

  test("should find files belonging to a user", async () => {
    const files = await fileRepository.findFilesByOwner(userId);

    expect(Array.isArray(files)).toBe(true);
    expect(files.some((file) => file.id === fileId)).toBe(true);
  });

  test("should delete file metadata belonging to the owner", async () => {
    const deleted = await fileRepository.deleteFile(fileId, userId);

    expect(deleted).toBe(true);

    const file = await fileRepository.findFileById(fileId);

    expect(file).toBeNull();
    fileId = null;
  });
});