const express = require("express");

const router = express.Router();

const authController = require("../controllers/authController");
const validateRequest = require("../middleware/validateRequest");

const {
registerSchema,
loginSchema,
} = require("../schemas/authSchemas");

// Register a new user with request validation
router.post(
"/register",
validateRequest(registerSchema),
authController.register
);

// Login with request validation
router.post(
"/login",
validateRequest(loginSchema),
authController.login
);

module.exports = router;
