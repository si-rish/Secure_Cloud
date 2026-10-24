const pool = require("../src/config/postgres");
const fileRepository = require("../src/repositories/fileRepository");

describe("File Repository", () => {
  let userId;
  let otherUserId;
  let fileId;

  const paginationFileIds = [];

  async function createTestFile(
    ownerId,
    originalName,
    createdAt = new Date()
  ) {
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
       RETURNING *`,
      [
        ownerId,
        originalName,
        `${Date.now()}-${Math.random()}-${originalName}`,
        "text/plain",
        100,
        null,
        createdAt,
      ]
    );

    return result.rows[0];
  }

  beforeAll(async () => {
    const uniqueId = `${Date.now()}-${Math.random()}`;

    const userResult = await pool.query(
      `INSERT INTO users (name, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id`,
      [
        "Repository Test User",
        `repository-test-${uniqueId}@example.com`,
        "test-password-hash",
      ]
    );

    userId = userResult.rows[0].id;

    const otherUserResult = await pool.query(
      `INSERT INTO users (name, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id`,
      [
        "Repository Other Test User",
        `repository-other-${uniqueId}@example.com`,
        "test-password-hash",
      ]
    );

    otherUserId = otherUserResult.rows[0].id;
  });

  afterAll(async () => {
    try {
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

      if (otherUserId) {
        await pool.query(
          "DELETE FROM files WHERE owner_id = $1",
          [otherUserId]
        );

        await pool.query(
          "DELETE FROM users WHERE id = $1",
          [otherUserId]
        );
      }
    } finally {
      await pool.end();
    }
  });

  test("creates file metadata", async () => {
    const file = await fileRepository.createFile({
      ownerId: userId,
      originalName: "test-document.pdf",
      storageKey: `test-${Date.now()}-${Math.random()}.pdf`,
      mimeType: "application/pdf",
      sizeBytes: 1024,
      checksum: null,
    });

    fileId = file.id;

    expect(file).toBeDefined();
    expect(file.original_name).toBe("test-document.pdf");
    expect(Number(file.size_bytes)).toBe(1024);
    expect(file.owner_id).toBe(userId);
  });

  test("finds file by ID", async () => {
    const file = await fileRepository.findFileById(fileId);

    expect(file).toBeDefined();
    expect(file.id).toBe(fileId);
  });

  test("returns files belonging only to the requested owner", async () => {
    const ownFile = await createTestFile(
      userId,
      "owner-file.txt"
    );

    const otherFile = await createTestFile(
      otherUserId,
      "other-owner-file.txt"
    );

    const files = await fileRepository.findFilesByOwner(
      userId,
      { limit: 100 }
    );

    const returnedIds = files.map((file) => file.id);

    expect(returnedIds).toContain(ownFile.id);
    expect(returnedIds).not.toContain(otherFile.id);
    expect(files.every((file) => file.owner_id === userId)).toBe(true);
  });

  test("fetches at most limit + 1 records", async () => {
    const files = await fileRepository.findFilesByOwner(
      userId,
      { limit: 1 }
    );

    expect(files.length).toBeLessThanOrEqual(2);
  });

  test("returns files in deterministic descending order", async () => {
    const files = await fileRepository.findFilesByOwner(
      userId,
      { limit: 100 }
    );

    for (let i = 1; i < files.length; i++) {
      const previous = files[i - 1];
      const current = files[i];

      const previousTime = new Date(previous.created_at).getTime();
      const currentTime = new Date(current.created_at).getTime();

      const correctlyOrdered =
        previousTime > currentTime ||
        (
          previousTime === currentTime &&
          previous.id.localeCompare(current.id) >= 0
        );

      expect(correctlyOrdered).toBe(true);
    }
  });

  describe("cursor pagination integration", () => {
    beforeAll(async () => {
      for (let i = 0; i < 5; i++) {
        const createdAt = new Date(
          Date.UTC(2026, 0, 1, 0, 0, i)
        );

        const file = await createTestFile(
          userId,
          `pagination-${i}.txt`,
          createdAt
        );

        paginationFileIds.push(file.id);
      }
    });

    test("retrieves every pagination-specific file without duplicates or omissions", async () => {
      const collectedIds = [];
      const pageSize = 2;

      let cursor = null;
      let pageCount = 0;
      let hasMore = true;

      while (hasMore && pageCount < 10) {
        const rows = await fileRepository.findFilesByOwner(
          userId,
          {
            limit: pageSize,
            cursor,
          }
        );

        expect(rows.length).toBeLessThanOrEqual(pageSize + 1);

        const page = rows.slice(0, pageSize);

        collectedIds.push(
          ...page
            .filter((file) => paginationFileIds.includes(file.id))
            .map((file) => file.id)
        );

        hasMore = rows.length > pageSize;
        pageCount++;

        if (hasMore) {
          const lastFile = page[page.length - 1];

          cursor = {
            createdAt: new Date(lastFile.created_at).toISOString(),
            id: lastFile.id,
          };
        }
      }

      expect(pageCount).toBeGreaterThan(1);
      expect(hasMore).toBe(false);

      expect(new Set(collectedIds).size).toBe(collectedIds.length);

      expect([...collectedIds].sort()).toEqual(
        [...paginationFileIds].sort()
      );
    });

    test("uses ID as a tie-breaker for identical timestamps", async () => {
      const sharedTimestamp = new Date(
        Date.UTC(2026, 1, 1, 12, 0, 0)
      );

      const first = await createTestFile(
        userId,
        "equal-time-a.txt",
        sharedTimestamp
      );

      const second = await createTestFile(
        userId,
        "equal-time-b.txt",
        sharedTimestamp
      );

      const files = await fileRepository.findFilesByOwner(
        userId,
        { limit: 100 }
      );

      const matchingFiles = files.filter(
        (file) =>
          new Date(file.created_at).getTime() ===
          sharedTimestamp.getTime()
      );

      expect(matchingFiles.map((file) => file.id)).toEqual(
        [first.id, second.id].sort((a, b) =>
          b.localeCompare(a)
        )
      );
    });

    test("returns an empty result when the cursor is beyond the final page", async () => {
      const rows = await fileRepository.findFilesByOwner(
        userId,
        {
          limit: 2,
          cursor: {
            createdAt: "2000-01-01T00:00:00.000Z",
            id: "ffffffff-ffff-ffff-ffff-ffffffffffff",
          },
        }
      );

      expect(rows).toEqual([]);
    });
  });

  test("does not delete another user's file", async () => {
    const otherFile = await createTestFile(
      otherUserId,
      "protected-file.txt"
    );

    const deleted = await fileRepository.deleteFile(
      otherFile.id,
      userId
    );

    expect(deleted).toBe(false);

    const existingFile = await fileRepository.findFileById(
      otherFile.id
    );

    expect(existingFile).not.toBeNull();
    expect(existingFile.id).toBe(otherFile.id);
  });

  test("deletes file metadata belonging to its owner", async () => {
    const deleted = await fileRepository.deleteFile(
      fileId,
      userId
    );

    expect(deleted).toBe(true);

    const file = await fileRepository.findFileById(fileId);

    expect(file).toBeNull();

    fileId = null;
  });
});