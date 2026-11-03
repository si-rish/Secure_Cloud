const multer = require("multer");
const path = require("path");
const crypto = require("crypto");
const fs = require("fs");

const fileTypeFromFile = (...args) =>
  import("file-type").then((module) =>
    module.fileTypeFromFile(...args)
  );

const storageRoot = path.resolve(
  process.env.STORAGE_ROOT ||
  path.resolve(__dirname, "../../SecureCloud_Storage")
);

const legacyUploadDirectory = path.join(
  storageRoot,
  "uploads"
);

fs.mkdirSync(legacyUploadDirectory, { recursive: true });

const allowedTypes = {
  ".pdf": ["application/pdf"],
  ".png": ["image/png"],
  ".jpg": ["image/jpeg"],
  ".jpeg": ["image/jpeg"],
  ".txt": ["text/plain"],
};

const storage = multer.diskStorage({
  destination: (req, file, callback) => {
  try {
    const { id, organizationId, role } = req.user || {};

    if (!id || !organizationId || !role) {
      return callback(new Error("Invalid user storage information"));
    }

    const roleFolder = {
      admin: "Admins",
      manager: "Managers",
      user: "Users",
    }[role];

    if (!roleFolder) {
      return callback(new Error("Invalid user role"));
    }

    const extension = path
  .extname(file.originalname)
  .toLowerCase();

const category =
  [".pdf", ".txt", ".doc", ".docx"].includes(extension)
    ? "Documents"
    : [".png", ".jpg", ".jpeg", ".gif", ".webp"].includes(extension)
      ? "Images"
      : "Other";

const userDirectory = path.join(
  storageRoot,
  "Organizations",
  String(organizationId),
  roleFolder,
  String(id),
  category
);

fs.mkdirSync(userDirectory, { recursive: true });

callback(null, userDirectory);
  } catch (error) {
    callback(error);
  }
},

  filename: (req, file, callback) => {
    const extension = path
      .extname(file.originalname)
      .toLowerCase();

    callback(null, `${crypto.randomUUID()}${extension}`);
  },
});

// Preliminary validation: filename extension and declared MIME type.
function fileFilter(req, file, callback) {
  const extension = path
    .extname(file.originalname)
    .toLowerCase();

  const allowedMimeTypes = allowedTypes[extension];

  if (
    !allowedMimeTypes ||
    !allowedMimeTypes.includes(file.mimetype)
  ) {
    const error = new Error(
      "Unsupported file type. Allowed types: PDF, PNG, JPG, JPEG, and TXT."
    );

    error.statusCode = 400;
    return callback(error);
  }

  callback(null, true);
}

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024,
    files: 1,
  },
});

// Validate the actual file signature after Multer saves the file.
async function validateActualFileType(req, res, next) {
  if (!req.file) {
    return next();
  }

  try {
    const extension = path
      .extname(req.file.originalname)
      .toLowerCase();

    const detectedType = await fileTypeFromFile(req.file.path);

    // Plain-text files generally have no binary signature.
    // Check that their contents are valid UTF-8 text.
    if (extension === ".txt") {
      const buffer = await fs.promises.readFile(req.file.path);

      const text = new TextDecoder("utf-8", {
        fatal: true,
      }).decode(buffer);

      if (text.includes("\u0000")) {
        throw new Error("Invalid text file contents");
      }
    } else {
      const allowedMimeTypes = allowedTypes[extension];

      if (
        !detectedType ||
        !allowedMimeTypes.includes(detectedType.mime)
      ) {
        const error = new Error(
          "File contents do not match the declared file type."
        );

        error.statusCode = 400;
        throw error;
      }
    }

    return next();
  } catch (error) {
    // Remove rejected uploads so invalid files are not left on disk.
    try {
      await fs.promises.unlink(req.file.path);
    } catch (cleanupError) {
      if (cleanupError.code !== "ENOENT") {
        console.error(
          "Failed to remove rejected upload:",
          cleanupError.message
        );
      }
    }

    return next(error.statusCode
      ? error
      : Object.assign(
          new Error("Unable to validate file contents."),
          { statusCode: 400 }
        ));
  }
}

module.exports = {
  upload,
  validateActualFileType,
};