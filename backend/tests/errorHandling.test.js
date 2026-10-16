const request = require("supertest");
const app = require("../src/app");

describe("Centralized Error Handling", () => {
  test("should return standardized 404 response for unknown routes", async () => {
    const response = await request(app)
      .get("/api/v1/this-route-does-not-exist");

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
});