const pool = require("../src/config/postgres");
const fileService = require("../src/services/fileService");

describe("File Ownership", () => {
  let ownerId;
  let anotherUserId;
  let fileId;

  beforeAll(async () => {
    const owner = await pool.query(
      `INSERT INTO users (name, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id`,
      [
        "File Owner Test",
        `owner-${Date.now()}@example.com`,
        "test-password-hash",
      ]
    );

    ownerId = owner.rows[0].id;

    const anotherUser = await pool.query(
      `INSERT INTO users (name, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id`,
      [
        "Another Test User",
        `another-${Date.now()}@example.com`,
        "test-password-hash",
      ]
    );

    anotherUserId = anotherUser.rows[0].id;

    const file = await fileService.createFileMetadata({
      ownerId,
      originalName: "private-document.pdf",
      storageKey: `ownership-${Date.now()}-${Math.random()}.pdf`,
      mimeType: "application/pdf",
      sizeBytes: 1024,
    });

    fileId = file.id;
  });

  afterAll(async () => {
    if (ownerId) {
      await pool.query("DELETE FROM files WHERE owner_id = $1", [ownerId]);
    }

    if (ownerId) {
      await pool.query("DELETE FROM users WHERE id = $1", [ownerId]);
    }

    if (anotherUserId) {
      await pool.query("DELETE FROM users WHERE id = $1", [anotherUserId]);
    }

    await pool.end();
  });

  test("owner should access their file", async () => {
    const file = await fileService.getFileMetadataByOwner(
      fileId,
      ownerId
    );

    expect(file).not.toBeNull();
    expect(file.id).toBe(fileId);
    expect(file.owner_id).toBe(ownerId);
  });

  test("another user should not access the file", async () => {
    const file = await fileService.getFileMetadataByOwner(
      fileId,
      anotherUserId
    );

    expect(file).toBeNull();
  });
});