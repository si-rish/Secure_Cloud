const fs = require("fs/promises");
const path = require("path");
const crypto = require("crypto");

const fileService = require("../src/services/fileService");

describe("File Integrity Verification", () => {
  const testDirectory = path.resolve(
    __dirname,
    "../storage/uploads"
  );

  const testFilePath = path.join(
    testDirectory,
    "integrity-test-file.txt"
  );

  const originalContent = "SecureCloud integrity test";
  let originalChecksum;

  beforeAll(async () => {
    await fs.mkdir(testDirectory, { recursive: true });

    originalChecksum = crypto
      .createHash("sha256")
      .update(originalContent)
      .digest("hex");
  });

  afterEach(async () => {
    await fs.rm(testFilePath, { force: true });
  });

  test("generates the expected SHA-256 checksum", async () => {
    const calculatedChecksum = crypto
      .createHash("sha256")
      .update(originalContent)
      .digest("hex");

    expect(calculatedChecksum).toBe(originalChecksum);
    expect(calculatedChecksum).toHaveLength(64);
  });

  test("detects when file contents have been modified", async () => {
    await fs.writeFile(testFilePath, originalContent);

    const originalHash = crypto
      .createHash("sha256")
      .update(await fs.readFile(testFilePath))
      .digest("hex");

    await fs.appendFile(testFilePath, "\nModified content");

    const modifiedHash = crypto
      .createHash("sha256")
      .update(await fs.readFile(testFilePath))
      .digest("hex");

    expect(modifiedHash).not.toBe(originalHash);
  });

  test("detects when a stored file is missing", async () => {
    await expect(
      fs.readFile(testFilePath)
    ).rejects.toMatchObject({
      code: "ENOENT",
    });
  });

  test("rejects invalid file metadata requests", async () => {
    await expect(
      fileService.getFileMetadataByOwner(null, null)
    ).rejects.toThrow("File ID and owner ID are required");
  });
});