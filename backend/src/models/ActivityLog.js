const mongoose = require("mongoose");

const activityLogSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },

    action: {
      type: String,
      required: true,
      enum: [
        "LOGIN",
        "LOGOUT",
        "FILE_UPLOAD",
        "FILE_DOWNLOAD",
        "FILE_VIEW",
        "FILE_DELETE",
        "FILE_SHARE",
        "FILE_UPDATE",
        "REGISTER",
      ],
    },

    resourceId: {
      type: String,
      default: null,
    },

    resourceName: {
      type: String,
      default: null,
    },

    details: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    ipAddress: {
      type: String,
      default: null,
    },

    userAgent: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

activityLogSchema.index({ createdAt: -1 });
activityLogSchema.index({ userId: 1, createdAt: -1 });
activityLogSchema.index({ action: 1, createdAt: -1 });

module.exports = mongoose.model("ActivityLog", activityLogSchema);