const fileService = require("../services/fileService");

function createResolvers(user) {
  if (!user || !user.id) {
    throw new Error("Authentication required");
  }

  return {
    myFiles: async ({ limit = 10 }) => {
      if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
        throw new Error("Limit must be between 1 and 100");
      }

      const result = await fileService.getUserFiles(user.id, {
        limit,
        cursor: null,
      });

      return result.data;
    },

    myFile: async ({ id }) => {
      return fileService.getFileMetadataByOwner(id, user.id);
    },
  };
}

module.exports = { createResolvers };