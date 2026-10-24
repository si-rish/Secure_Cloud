const pool = require("../src/config/postgres");
const fileService = require("../src/services/fileService");
const crypto = require("crypto");

describe("File Service", () => {
  let userId;
  let fileId;
  let paginationFileIds = [];

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
      await pool.query(
        "DELETE FROM files WHERE owner_id = $1",
        [userId]
      );

      await pool.query(
        "DELETE FROM users WHERE id = $1",
        [userId]
      );
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
      checksum: crypto
        .createHash("sha256")
        .update("service-checksum")
        .digest("hex"),
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

  test("should return a paginated result with the requested limit", async () => {
    const result = await fileService.getUserFiles(userId, {
      limit: 1,
    });

    expect(result).toHaveProperty("data");
    expect(result).toHaveProperty("pagination");
    expect(result.data.length).toBeLessThanOrEqual(1);
    expect(result.pagination.limit).toBe(1);
    expect(typeof result.pagination.hasMore).toBe("boolean");
  });

  test("should generate a next cursor when more records exist", async () => {
    // Create three records with distinct timestamps.
    for (let i = 0; i < 3; i++) {
      const createdAt = new Date(
        Date.UTC(2026, 1, 1, 0, 0, i)
      );

      const result = await pool.query(
        `INSERT INTO files (
           owner_id,
           original_name,
           storage_key,
           mime_type,
           size_bytes,
           checksum,
           created_at
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id`,
        [
          userId,
          `service-pagination-${i}.txt`,
          `service-pagination-${Date.now()}-${i}.txt`,
          "text/plain",
          100 + i,
          null,
          createdAt,
        ]
      );

      paginationFileIds.push(result.rows[0].id);
    }

    const firstPage = await fileService.getUserFiles(userId, {
      limit: 1,
    });

    expect(firstPage.data).toHaveLength(1);
    expect(firstPage.pagination.hasMore).toBe(true);
    expect(firstPage.pagination.nextCursor).toEqual(
      expect.any(String)
    );

    const decodedCursor = JSON.parse(
      Buffer.from(
        firstPage.pagination.nextCursor,
        "base64url"
      ).toString("utf8")
    );

    expect(decodedCursor).toHaveProperty("createdAt");
    expect(decodedCursor).toHaveProperty("id");
    expect(decodedCursor.id).toBe(firstPage.data[0].id);
  });

  test("should retrieve the next page without duplicate records", async () => {
    const firstPage = await fileService.getUserFiles(userId, {
      limit: 1,
    });

    expect(firstPage.pagination.hasMore).toBe(true);

    const secondPage = await fileService.getUserFiles(userId, {
      limit: 1,
      cursor: firstPage.pagination.nextCursor,
    });

    expect(secondPage.data).toHaveLength(1);

    const firstPageIds = firstPage.data.map((file) => file.id);
    const secondPageIds = secondPage.data.map((file) => file.id);

    expect(
      secondPageIds.some((id) => firstPageIds.includes(id))
    ).toBe(false);
  });

  test("should reject a malformed cursor", async () => {
    await expect(
      fileService.getUserFiles(userId, {
        limit: 10,
        cursor: "not-a-valid-cursor",
      })
    ).rejects.toMatchObject({
      statusCode: 400,
      code: "INVALID_CURSOR",
    });
  });

  test("should reject a cursor with an invalid UUID", async () => {
    const cursor = Buffer.from(
      JSON.stringify({
        createdAt: "2026-02-01T00:00:00.000Z",
        id: "invalid-id",
      })
    ).toString("base64url");

    await expect(
      fileService.getUserFiles(userId, {
        limit: 10,
        cursor,
      })
    ).rejects.toMatchObject({
      statusCode: 400,
      code: "INVALID_CURSOR",
    });
  });

  test("should reject a cursor with an invalid timestamp", async () => {
    const cursor = Buffer.from(
      JSON.stringify({
        createdAt: "not-a-timestamp",
        id: "123e4567-e89b-42d3-a456-426614174000",
      })
    ).toString("base64url");

    await expect(
      fileService.getUserFiles(userId, {
        limit: 10,
        cursor,
      })
    ).rejects.toMatchObject({
      statusCode: 400,
      code: "INVALID_CURSOR",
    });
  });

  test("should reject an invalid pagination limit", async () => {
    await expect(
      fileService.getUserFiles(userId, {
        limit: 101,
      })
    ).rejects.toMatchObject({
      statusCode: 400,
      code: "INVALID_PAGINATION_LIMIT",
    });
  });

  test("should delete file metadata", async () => {
    const deleted = await fileService.removeFileMetadata(
      fileId,
      userId
    );

    expect(deleted).toBe(true);

    const file = await fileService.getFileMetadata(fileId);

    expect(file).toBeNull();
    fileId = null;
  });
});