const request = require("supertest");
const app = require("../src/app");

describe("CORS Configuration", () => {
  const frontendOrigin = process.env.FRONTEND_URL;

  beforeAll(() => {
    expect(frontendOrigin).toBeTruthy();
  });

  test("allows requests from the configured frontend origin", async () => {
    const response = await request(app)
      .get("/health")
      .set("Origin", frontendOrigin);

    expect(response.status).toBe(200);
    expect(response.headers["access-control-allow-origin"])
      .toBe(frontendOrigin);
  });

  test("does not grant CORS access to an unrelated origin", async () => {
    const response = await request(app)
      .get("/health")
      .set("Origin", "https://untrusted.example");

    expect(response.status).toBe(200);
    expect(response.headers["access-control-allow-origin"])
      .toBeUndefined();
  });

  test("handles preflight OPTIONS requests from the frontend", async () => {
    const response = await request(app)
      .options("/api/v1/files")
      .set("Origin", frontendOrigin)
      .set("Access-Control-Request-Method", "POST")
      .set(
        "Access-Control-Request-Headers",
        "authorization,content-type,idempotency-key"
      );

    expect(response.status).toBe(204);
    expect(response.headers["access-control-allow-origin"])
      .toBe(frontendOrigin);
    expect(response.headers["access-control-allow-methods"])
      .toContain("POST");

    const allowedHeaders =
      response.headers["access-control-allow-headers"].toLowerCase();

    expect(allowedHeaders).toContain("authorization");
    expect(allowedHeaders).toContain("content-type");
    expect(allowedHeaders).toContain("idempotency-key");
  });

  test("exposes ETag to the configured frontend", async () => {
    const response = await request(app)
      .get("/health")
      .set("Origin", frontendOrigin);

    expect(response.status).toBe(200);

    const exposedHeaders =
      response.headers["access-control-expose-headers"].toLowerCase();

    expect(exposedHeaders).toContain("etag");
  });
});
