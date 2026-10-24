const request = require("supertest");
const jwt = require("jsonwebtoken");
const fs = require("fs/promises");
const path = require("path");

const app = require("../src/app");

const uploadDirectory = path.resolve(
  __dirname,
  "../storage/uploads"
);

describe("SecureCloud Upload Security", () => {
  let token;

  beforeAll(() => {
    token = jwt.sign(
      {
        id: "698ebcf1-c26b-43ba-bb93-9f4b71e949d0",
        role: "user",
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "1h",
        issuer: "securecloud",
        audience: "securecloud-api",
      }
    );
  });

afterEach(async () => {
  const files = await fs.readdir(uploadDirectory);

  for (const file of files) {
    if (file.startsWith("upload-security-test-")) {
      await fs.unlink(path.join(uploadDirectory, file));
    }
  }
});

  test("rejects requests without authentication", async () => {
    const response = await request(app)
      .post("/api/v1/files/content");

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
  });

  test("rejects a text file disguised as a PDF", async () => {
    const response = await request(app)
      .post("/api/v1/files/content")
      .set("Authorization", `Bearer ${token}`)
      .attach(
        "file",
        Buffer.from("This is not a genuine PDF."),
        {
          filename: "upload-security-test-fake.pdf",
          contentType: "application/pdf",
        }
      );

    expect(response.status).toBe(400);
    expect(response.body.error.message).toMatch(/file contents/i);
expect(response.body.error.code).toBe("VALIDATION_ERROR");
    const files = await fs.readdir(uploadDirectory);

expect(
  files.some((file) =>
    file.startsWith("upload-security-test-fake")
  )
).toBe(false);
  });

  test("rejects an unsupported file extension", async () => {
    const response = await request(app)
      .post("/api/v1/files/content")
      .set("Authorization", `Bearer ${token}`)
      .attach(
        "file",
        Buffer.from("test"),
        {
          filename: "upload-security-test.exe",
          contentType: "application/octet-stream",
        }
      );

    expect(response.status).toBe(400);
  });

  test("rejects a file larger than 10 MB", async () => {
    const oversizedFile = Buffer.alloc(
      10 * 1024 * 1024 + 1,
      65
    );

    const response = await request(app)
      .post("/api/v1/files/content")
      .set("Authorization", `Bearer ${token}`)
      .attach(
        "file",
        oversizedFile,
        {
          filename: "upload-security-test-large.txt",
          contentType: "text/plain",
        }
      );

    expect(response.status).toBe(413);
    expect(response.body.error.message).toMatch(/10 MB limit/i);
expect(response.body.error.code).toBe("FILE_TOO_LARGE");
    const files = await fs.readdir(uploadDirectory);

expect(
  files.some((file) =>
    file.startsWith("upload-security-test-large")
  )
).toBe(false);
  });
});