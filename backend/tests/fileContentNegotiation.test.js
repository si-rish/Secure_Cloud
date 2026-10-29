const express = require("express");
const request = require("supertest");

jest.mock("../src/services/fileService", () => ({
  getUserFiles: jest.fn(),
  getFileMetadataByOwner: jest.fn(),
}));

jest.mock("../src/middleware/authMiddleware", () =>
  (req, res, next) => {
    req.user = { id: "test-user-123" };
    next();
  }
);

jest.mock("../src/middleware/loadCurrentUser", () =>
  (req, res, next) => {
    next();
  }
);

const fileService = require("../src/services/fileService");
const fileRoutes = require("../src/routes/fileRoutes");

describe("File API Content Negotiation", () => {
  let app;

  beforeEach(() => {
    jest.clearAllMocks();

    app = express();
    app.use(express.json());
    app.use("/api/v1/files", fileRoutes);

    fileService.getUserFiles.mockResolvedValue({
      data: [
        {
          id: "file-123",
          original_name: "example.txt",
          size_bytes: 100,
        },
      ],
      pagination: {
        limit: 10,
        hasMore: false,
        nextCursor: null,
      },
    });

    fileService.getFileMetadataByOwner.mockResolvedValue({
      id: "file-123",
      original_name: "example.txt",
      size_bytes: 100,
    });
  });

  test("GET /api/v1/files returns JSON", async () => {
    const response = await request(app)
      .get("/api/v1/files")
      .set("Accept", "application/json");

    expect(response.status).toBe(200);
    expect(response.headers["content-type"]).toMatch(
      /application\/json/
    );
    expect(response.body.success).toBe(true);
    expect(response.body.count).toBe(1);
  });

  test("GET /api/v1/files returns XML", async () => {
    const response = await request(app)
      .get("/api/v1/files")
      .set("Accept", "application/xml");

    expect(response.status).toBe(200);
    expect(response.headers["content-type"]).toMatch(
      /application\/xml/
    );
    expect(response.text).toContain("<response>");
    expect(response.text).toContain("<success>true</success>");
  });

  test("GET /api/v1/files/:id returns JSON", async () => {
    const response = await request(app)
      .get("/api/v1/files/file-123")
      .set("Accept", "application/json");

    expect(response.status).toBe(200);
    expect(response.headers["content-type"]).toMatch(
      /application\/json/
    );
    expect(response.body.success).toBe(true);
    expect(response.body.data.id).toBe("file-123");
  });

  test("GET /api/v1/files/:id returns XML", async () => {
    const response = await request(app)
      .get("/api/v1/files/file-123")
      .set("Accept", "application/xml");

    expect(response.status).toBe(200);
    expect(response.headers["content-type"]).toMatch(
      /application\/xml/
    );
    expect(response.text).toContain("<response>");
    expect(response.text).toContain("<success>true</success>");
    expect(response.text).toContain("<id>file-123</id>");
  });

  test("file listing includes private cache policy", async () => {
    const response = await request(app)
      .get("/api/v1/files")
      .set("Accept", "application/json");

    expect(response.headers["cache-control"]).toContain("private");
    expect(response.headers["cache-control"]).toContain("no-cache");
  });

  test("file metadata includes an ETag", async () => {
    const response = await request(app)
      .get("/api/v1/files/file-123")
      .set("Accept", "application/json");

    expect(response.status).toBe(200);
    expect(response.headers.etag).toBeDefined();
  });

  test("file metadata returns 304 when If-None-Match matches ETag", async () => {
    const initialResponse = await request(app)
      .get("/api/v1/files/file-123")
      .set("Accept", "application/json");

    expect(initialResponse.status).toBe(200);

    const etag = initialResponse.headers.etag;
    expect(etag).toBeDefined();

    const cachedResponse = await request(app)
      .get("/api/v1/files/file-123")
      .set("Accept", "application/json")
      .set("If-None-Match", etag);

    expect(cachedResponse.status).toBe(304);
    expect(cachedResponse.text).toBe("");
  });
});
