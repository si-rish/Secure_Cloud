const request = require("supertest");
const express = require("express");

jest.mock("../src/services/fileService", () => ({
  getUserFiles: jest.fn(),
}));

jest.mock("../src/utils/contentNegotiation", () =>
  jest.fn((req, res, statusCode, body) => {
    return res.status(statusCode).json(body);
  })
);

const fileService = require("../src/services/fileService");
const fileController = require("../src/controllers/fileController");

const app = express();

app.use(express.json());

// Simulate an authenticated user for these controller tests.
app.use((req, res, next) => {
  req.user = { id: "user-123" };
  next();
});

app.get("/api/v1/files", fileController.getUserFiles);

describe("File Pagination API", () => {
  const sampleFiles = [
    {
      id: "file-1",
      original_name: "first.txt",
      size_bytes: 100,
    },
    {
      id: "file-2",
      original_name: "second.txt",
      size_bytes: 200,
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("uses the default limit of 10", async () => {
    fileService.getUserFiles.mockResolvedValue({
      data: sampleFiles,
      pagination: {
        limit: 10,
        hasMore: false,
        nextCursor: null,
      },
    });

    const response = await request(app).get("/api/v1/files");

    expect(response.status).toBe(200);
    expect(fileService.getUserFiles).toHaveBeenCalledWith("user-123", {
      limit: 10,
      cursor: null,
    });
    expect(response.body.count).toBe(2);
    expect(response.body.pagination.limit).toBe(10);
  });

  test("accepts a custom limit of 5", async () => {
    fileService.getUserFiles.mockResolvedValue({
      data: sampleFiles,
      pagination: {
        limit: 5,
        hasMore: false,
        nextCursor: null,
      },
    });

    const response = await request(app).get(
      "/api/v1/files?limit=5"
    );

    expect(response.status).toBe(200);
    expect(fileService.getUserFiles).toHaveBeenCalledWith("user-123", {
      limit: 5,
      cursor: null,
    });
    expect(response.body.pagination.limit).toBe(5);
  });

  test("returns a next-page link when more files exist", async () => {
    const nextCursor = Buffer.from(
      JSON.stringify({
        createdAt: "2026-10-20T10:00:00.000Z",
        id: "file-2",
      })
    ).toString("base64url");

    fileService.getUserFiles.mockResolvedValue({
      data: sampleFiles,
      pagination: {
        limit: 2,
        hasMore: true,
        nextCursor,
      },
    });

    const response = await request(app).get(
      "/api/v1/files?limit=2"
    );

    expect(response.status).toBe(200);
    expect(response.body.pagination.hasMore).toBe(true);
    expect(response.body.pagination.nextCursor).toBe(nextCursor);
    expect(response.body.links.next).toContain(
      "/api/v1/files?"
    );
    expect(response.body.links.next).toContain("limit=2");
    expect(response.body.links.next).toContain(
      `cursor=${encodeURIComponent(nextCursor)}`
    );
  });

  test.each(["0", "101", "abc"])(
    "rejects invalid limit %s",
    async (limit) => {
      const response = await request(app).get(
        `/api/v1/files?limit=${limit}`
      );

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe("VALIDATION_ERROR");
      expect(fileService.getUserFiles).not.toHaveBeenCalled();
    }
  );

  test("passes the supplied cursor to the service", async () => {
    const cursor = Buffer.from(
      JSON.stringify({
        createdAt: "2026-10-20T10:00:00.000Z",
        id: "file-1",
      })
    ).toString("base64url");

    fileService.getUserFiles.mockResolvedValue({
      data: [sampleFiles[1]],
      pagination: {
        limit: 10,
        hasMore: false,
        nextCursor: null,
      },
    });

    const response = await request(app).get(
      `/api/v1/files?cursor=${encodeURIComponent(cursor)}`
    );

    expect(response.status).toBe(200);
    expect(fileService.getUserFiles).toHaveBeenCalledWith("user-123", {
      limit: 10,
      cursor,
    });
  });

  test("returns null next link when there are no more files", async () => {
    fileService.getUserFiles.mockResolvedValue({
      data: sampleFiles,
      pagination: {
        limit: 10,
        hasMore: false,
        nextCursor: null,
      },
    });

    const response = await request(app).get("/api/v1/files");

    expect(response.status).toBe(200);
    expect(response.body.links.next).toBeNull();
  });
});