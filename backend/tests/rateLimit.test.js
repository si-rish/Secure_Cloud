const request = require("supertest");
const app = require("../src/app");

describe("Rate Limiting", () => {
  test("should include rate-limit headers on API responses", async () => {
    const response = await request(app).get(
      "/api/v1/this-route-does-not-exist"
    );

    expect(response.status).toBe(404);

    // express-rate-limit draft-8 standard headers
    expect(response.headers["ratelimit"]).toBeDefined();
    expect(response.headers["ratelimit-policy"]).toBeDefined();
  });

  test("should return standardized 429 response when rate limit is exceeded", async () => {
    const responses = [];

    // Send enough requests to exceed the general API limit.
    // Authentication requests are subject to both limiters.
    for (let i = 0; i < 110; i++) {
      responses.push(
        await request(app).get("/api/v1/this-route-does-not-exist")
      );

      if (responses[responses.length - 1].status === 429) {
        break;
      }
    }

    const limitedResponse = responses.find(
      (response) => response.status === 429
    );

    expect(limitedResponse).toBeDefined();

    expect(limitedResponse.body).toEqual({
      success: false,
      error: {
        code: "RATE_LIMIT_EXCEEDED",
        message: "Too many requests. Please try again later.",
        details: [],
      },
    });

    expect(limitedResponse.headers["ratelimit"]).toBeDefined();
  });

  test("health endpoint should remain accessible without rate-limit headers", async () => {
    const response = await request(app).get("/health");

    expect(response.status).toBe(200);
    expect(response.headers["cache-control"]).toBe("no-store");

    // The health endpoint is excluded from the API limiter.
    expect(response.headers["ratelimit"]).toBeUndefined();
  });
    test("should apply a stricter rate limit to authentication endpoints", async () => {
    let limitedResponse;

    for (let i = 0; i < 15; i++) {
      const response = await request(app)
        .post("/api/v1/auth/login")
        .send({
          email: `ratelimit${i}@example.com`,
          password: "WrongPassword123!",
        });

      if (response.status === 429) {
        limitedResponse = response;
        break;
      }
    }

    expect(limitedResponse).toBeDefined();
    expect(limitedResponse.body).toEqual({
      success: false,
      error: {
        code: "AUTH_RATE_LIMIT_EXCEEDED",
        message: "Too many authentication attempts. Please try again later.",
        details: [],
      },
    });

    expect(limitedResponse.headers["ratelimit"]).toBeDefined();
  });
});