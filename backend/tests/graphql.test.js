const express = require("express");
const request = require("supertest");
const jwt = require("jsonwebtoken");

jest.mock("../src/services/fileService", () => ({
  getUserFiles: jest.fn(),
  getFileMetadataByOwner: jest.fn(),
}));

const fileService = require("../src/services/fileService");
const graphqlRouter = require("../src/graphql/graphqlRouter");

const app = express();
app.use(express.json());
app.use("/api/v1/graphql", graphqlRouter);

const JWT_SECRET = process.env.JWT_SECRET || "graphql-test-secret";

function createToken(userId) {
  return jwt.sign(
    { id: userId, role: "user" },
    JWT_SECRET,
    {
      expiresIn: "1h",
      issuer: "securecloud",
      audience: "securecloud-api",
    }
  );
}

describe("SecureCloud GraphQL API", () => {
  const ownerId = "user-123";
  const anotherUserId = "user-456";

  const ownerFile = {
    id: "file-123",
    owner_id: ownerId,
    original_name: "private-document.pdf",
    mime_type: "application/pdf",
    size_bytes: 1024,
    checksum: "abc123",
    created_at: "2026-10-23T10:00:00.000Z",
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("rejects requests without a JWT", async () => {
    const response = await request(app)
      .post("/api/v1/graphql")
      .send({ query: "{ myFiles { id } }" });

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe("UNAUTHORIZED");
  });

  test("rejects an invalid JWT", async () => {
    const response = await request(app)
      .post("/api/v1/graphql")
      .set("Authorization", "Bearer invalid-token")
      .send({ query: "{ myFiles { id } }" });

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe("UNAUTHORIZED");
  });

  test("returns only the authenticated user's files", async () => {
    fileService.getUserFiles.mockResolvedValue({
      data: [ownerFile],
      nextCursor: null,
    });

    const response = await request(app)
      .post("/api/v1/graphql")
      .set("Authorization", `Bearer ${createToken(ownerId)}`)
      .send({
        query: "{ myFiles(limit: 10) { id original_name } }",
      });

    expect(response.status).toBe(200);
    expect(response.body.errors).toBeUndefined();
    expect(response.body.data.myFiles).toEqual([
      {
        id: "file-123",
        original_name: "private-document.pdf",
      },
    ]);

    expect(fileService.getUserFiles).toHaveBeenCalledWith(ownerId, {
      limit: 10,
      cursor: null,
    });
  });

  test("returns a file owned by the authenticated user", async () => {
    fileService.getFileMetadataByOwner.mockResolvedValue(ownerFile);

    const response = await request(app)
      .post("/api/v1/graphql")
      .set("Authorization", `Bearer ${createToken(ownerId)}`)
      .send({
        query: 'query { myFile(id: "file-123") { id original_name } }',
      });

    expect(response.status).toBe(200);
    expect(response.body.errors).toBeUndefined();
    expect(response.body.data.myFile.id).toBe("file-123");

    expect(fileService.getFileMetadataByOwner).toHaveBeenCalledWith(
      "file-123",
      ownerId
    );
  });

  test("does not return another user's file", async () => {
    fileService.getFileMetadataByOwner.mockResolvedValue(null);

    const response = await request(app)
      .post("/api/v1/graphql")
      .set("Authorization", `Bearer ${createToken(anotherUserId)}`)
      .send({
        query: 'query { myFile(id: "file-123") { id original_name } }',
      });

    expect(response.status).toBe(200);
    expect(response.body.errors).toBeUndefined();
    expect(response.body.data.myFile).toBeNull();

    expect(fileService.getFileMetadataByOwner).toHaveBeenCalledWith(
      "file-123",
      anotherUserId
    );
  });

  test("rejects requests without a GraphQL query", async () => {
    const response = await request(app)
      .post("/api/v1/graphql")
      .set("Authorization", `Bearer ${createToken(ownerId)}`)
      .send({});

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });

  test("returns GraphQL errors for an invalid field", async () => {
    const response = await request(app)
      .post("/api/v1/graphql")
      .set("Authorization", `Bearer ${createToken(ownerId)}`)
      .send({
        query: "{ myFiles { fieldThatDoesNotExist } }",
      });

    expect(response.status).toBe(200);
    expect(response.body.errors).toBeDefined();
    expect(response.body.errors.length).toBeGreaterThan(0);
  });

  test("rejects an invalid file-list limit", async () => {
    const response = await request(app)
      .post("/api/v1/graphql")
      .set("Authorization", `Bearer ${createToken(ownerId)}`)
      .send({
        query: "{ myFiles(limit: 101) { id } }",
      });

    expect(response.status).toBe(200);
    expect(response.body.errors).toBeDefined();
    expect(fileService.getUserFiles).not.toHaveBeenCalled();
  });
});