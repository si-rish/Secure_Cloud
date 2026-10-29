const express = require("express");

const authMiddleware = require("../middleware/authMiddleware");
const loadCurrentUser = require("../middleware/loadCurrentUser");
const requireRoles = require("../middleware/requireRoles");
const controller = require("../controllers/workspaceController");

const router = express.Router();

// Authentication and current database-backed role.
router.use(authMiddleware);
router.use(loadCurrentUser);

// Private workspace responses.
router.use((req, res, next) => {
if (req.method === "GET") {
res.set("Cache-Control", "private, no-cache");
}
next();
});

// Profile
router.get("/profile", controller.getProfile);
router.patch("/profile", controller.updateProfile);

// Organization — administrators only
router.get(
"/organization",
requireRoles("admin"),
controller.getOrganization
);

router.patch(
"/organization",
requireRoles("admin"),
controller.updateOrganization
);

// Admin Dashboard Statistics
router.get(
"/stats",
requireRoles("admin"),
controller.getStats
);

// Activity
router.get("/activity", controller.activity);

// User management
router.get(
"/users",
requireRoles("admin", "manager"),
controller.listUsers
);

router.post(
"/users",
requireRoles("admin"),
controller.createUser
);

router.patch(
"/users/:id",
requireRoles("admin"),
controller.updateUser
);

// Department management
router.get(
"/departments",
requireRoles("admin", "manager"),
controller.listDepartments
);

router.post(
"/departments",
requireRoles("admin"),
controller.createDepartment
);

router.patch(
"/departments/:id",
requireRoles("admin"),
controller.updateDepartment
);

router.delete(
"/departments/:id",
requireRoles("admin"),
controller.deleteDepartment
);

// Personal folders
router.get("/folders", controller.listFolders);
router.post("/folders", controller.createFolder);
router.delete("/folders/:id", controller.deleteFolder);

// File sharing
router.get("/shared-files", controller.sharedFiles);

router.post(
"/files/:id/shares",
controller.shareFile
);

router.get(
"/files/:id/shares",
controller.listFileShares
);

router.delete(
"/files/:id/shares/:shareId",
controller.revokeShare
);

module.exports = router;
