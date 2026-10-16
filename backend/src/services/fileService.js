const fileRepository = require("../repositories/fileRepository");

async function createFileMetadata({
  ownerId,
  originalName,
  storageKey,
  mimeType,
  sizeBytes,
  checksum = null,
}) {
  // Validate required fields
  if (!ownerId || !originalName || !storageKey) {
    throw new Error(
      "Owner ID, original filename, and storage key are required"
    );
  }

  // Validate file size
  const size = Number(sizeBytes);

  if (!Number.isSafeInteger(size) || size < 0) {
    throw new Error("File size must be a valid non-negative integer");
  }

  // Validate filename
  if (originalName.length > 255) {
    throw new Error("Filename cannot exceed 255 characters");
  }

  // Save validated metadata
  return fileRepository.createFile({
    ownerId,
    originalName,
    storageKey,
    mimeType,
    sizeBytes: size,
    checksum,
  });
}

async function getFileMetadata(fileId) {
  if (!fileId) {
    throw new Error("File ID is required");
  }

  return fileRepository.findFileById(fileId);
}

async function getUserFiles(ownerId) {
  if (!ownerId) {
    throw new Error("Owner ID is required");
  }

  return fileRepository.findFilesByOwner(ownerId);
}

async function removeFileMetadata(fileId, ownerId) {
  if (!fileId || !ownerId) {
    throw new Error("File ID and owner ID are required");
  }

  return fileRepository.deleteFile(fileId, ownerId);
}

async function getFileMetadataByOwner(fileId, ownerId) {
  if (!fileId || !ownerId) {
    throw new Error("File ID and owner ID are required");
  }

  return fileRepository.findFileByIdAndOwner(fileId, ownerId);
}

module.exports = {
  createFileMetadata,
  getFileMetadata,
  getFileMetadataByOwner,
  getUserFiles,
  removeFileMetadata,
};