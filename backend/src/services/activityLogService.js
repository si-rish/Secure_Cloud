const ActivityLog = require("../models/ActivityLog");

async function logActivity({
  userId,
  action,
  resourceId = null,
  resourceName = null,
  details = {},
  ipAddress = null,
  userAgent = null,
}) {
  try {
    const activity = await ActivityLog.create({
      userId,
      action,
      resourceId,
      resourceName,
      details,
      ipAddress,
      userAgent,
    });

    return {
      success: true,
      activityId: activity._id,
    };
  } catch (error) {
    console.error("Activity logging failed:", error.message);

    return {
      success: false,
      activityId: null,
    };
  }
}

module.exports = { logActivity };