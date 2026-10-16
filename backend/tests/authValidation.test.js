const request = require("supertest");
const express = require("express");

const validateRequest = require("../src/middleware/validateRequest");

const {
  registerSchema,
  loginSchema,
} = require("../src/schemas/authSchemas");

function createTestApp(schema) {
  const app = express();

  app.use(express.json());

  app.post("/test", validateRequest(schema), (req, res) => {
    res.status(200).json({
      success: true,
      message: "Validation passed",
    });
  });

  return app;
}

describe("AJV Authentication Validation", () => {
  describe("Login validation", () => {
    const app = createTestApp(loginSchema);

    test("should accept a valid login request", async () => {
      const response = await request(app)
        .post("/test")
        .send({
          email: "shirish@gmail.com",
          password: "TestPassword123",
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    test("should reject an invalid email", async () => {
      const response = await request(app)
        .post("/test")
        .send({
          email: "not-an-email",
          password: "TestPassword123",
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe("VALIDATION_ERROR");
      expect(response.body.error.message).toBe(
        "Request validation failed"
      );

      expect(response.body.error.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: "/email",
          }),
        ])
      );
    });

    test("should reject a missing password", async () => {
      const response = await request(app)
        .post("/test")
        .send({
          email: "shirish@gmail.com",
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe("VALIDATION_ERROR");

      expect(response.body.error.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: "password",
          }),
        ])
      );
    });
  });

  describe("Registration validation", () => {
    const app = createTestApp(registerSchema);

    test("should accept valid registration data", async () => {
      const response = await request(app)
        .post("/test")
        .send({
          name: "Test User",
          email: "newuser@gmail.com",
          password: "TestPassword123",
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    test("should reject missing required fields", async () => {
      const response = await request(app)
        .post("/test")
        .send({
          email: "newuser@gmail.com",
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe("VALIDATION_ERROR");
    });

    test("should reject unexpected properties", async () => {
      const response = await request(app)
        .post("/test")
        .send({
          name: "Test User",
          email: "newuser@gmail.com",
          password: "TestPassword123",
          admin: true,
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe("VALIDATION_ERROR");
    });
  });
});