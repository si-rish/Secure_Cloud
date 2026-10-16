const request = require("supertest");
const express = require("express");
const jwt = require("jsonwebtoken");
const authMiddleware = require("../src/middleware/authMiddleware");

require("dotenv").config();

const app = express();

app.get("/protected", authMiddleware, (req, res) => {
  res.status(200).json({
    success: true,
    user: req.user,
  });
});

describe("Authentication Middleware", () => {
  test("should reject a request without a token", async () => {
    const response = await request(app).get("/protected");

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe("UNAUTHORIZED");
    expect(response.body.error.message).toBe(
      "Authentication token is required"
    );
    expect(response.body.error.details).toEqual([]);
  });

  test("should reject an invalid token", async () => {
    const response = await request(app)
      .get("/protected")
      .set("Authorization", "Bearer invalid-token");

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe("UNAUTHORIZED");
  });

  test("should accept a valid token", async () => {
    const token = jwt.sign(
      {
        id: "test-user-123",
        role: "user",
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "5m",
        issuer: "securecloud",
        audience: "securecloud-api",
      }
    );

    const response = await request(app)
      .get("/protected")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.user.id).toBe("test-user-123");
    expect(response.body.user.role).toBe("user");
  });
});