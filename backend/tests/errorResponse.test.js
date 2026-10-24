const express = require("express");
const request = require("supertest");
const sendError = require("../src/utils/errorResponse");

describe("Standardized error response utility", () => {
  const app = express();

  app.get("/test/:status", (req, res) => {
    const status = Number(req.params.status);

    return sendError(
      res,
      status,
      "TEST_ERROR",
      "This is a test error"
    );
  });

  test.each([400, 401, 403, 404, 409, 429, 500, 503])(
    "returns a consistent error structure for HTTP %i",
    async (status) => {
      const response = await request(app).get(`/test/${status}`);

      expect(response.status).toBe(status);
      expect(response.body).toEqual({
        success: false,
        error: {
          code: "TEST_ERROR",
          message: "This is a test error",
          details: [],
        },
      });
    }
  );

  test("includes supplied validation details", async () => {
    app.get("/test-details", (req, res) => {
      return sendError(
        res,
        400,
        "VALIDATION_ERROR",
        "Request validation failed",
        [{ field: "email", message: "must be a valid email" }]
      );
    });

    const response = await request(app).get("/test-details");

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Request validation failed",
        details: [
          {
            field: "email",
            message: "must be a valid email",
          },
        ],
      },
    });
  });
});