const express = require("express");
const request = require("supertest");
const app = require("../src/app");
const sendError = require("../src/utils/errorResponse");

describe("Centralized Error Handling", () => {
  test("should return standardized 404 response for unknown routes", async () => {
    const response = await request(app).get(
      "/api/v1/this-route-does-not-exist"
    );

    expect(response.status).toBe(404);

    expect(response.body).toEqual({
      success: false,
      error: {
        code: "NOT_FOUND",
        message: "Route not found",
        details: [],
      },
    });
  });

  test("health endpoint should return 200 and prevent caching", async () => {
    const response = await request(app).get("/health");

    expect(response.status).toBe(200);
    expect(response.headers["cache-control"]).toBe("no-store");
    expect(response.body.success).toBe(true);
  });

  test("should return a standardized 500 response for unexpected errors", async () => {
    const testApp = express();

    testApp.get("/test-error", (req, res, next) => {
      next(new Error("Simulated internal failure"));
    });

    testApp.use((err, req, res, next) => {
      if (res.headersSent) {
        return next(err);
      }

      return sendError(
        res,
        500,
        "INTERNAL_SERVER_ERROR",
        "Internal server error"
      );
    });

    const response = await request(testApp).get("/test-error");

    expect(response.status).toBe(500);

    expect(response.body).toEqual({
      success: false,
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "Internal server error",
        details: [],
      },
    });
  });
});