const express = require("express");
const request = require("supertest");
const sendNegotiatedResponse = require("../src/utils/contentNegotiation");

describe("Content Negotiation", () => {
  let app;

  beforeEach(() => {
    app = express();

    app.get("/test", (req, res) => {
      return sendNegotiatedResponse(req, res, 200, {
        success: true,
        message: "Content negotiation works",
      });
    });
  });

  test("returns JSON when JSON is requested", async () => {
    const response = await request(app)
      .get("/test")
      .set("Accept", "application/json");

    expect(response.status).toBe(200);
    expect(response.headers["content-type"]).toMatch(/application\/json/);
    expect(response.body.success).toBe(true);
    expect(response.body.message).toBe("Content negotiation works");
  });

  test("returns XML when XML is requested", async () => {
    const response = await request(app)
      .get("/test")
      .set("Accept", "application/xml");

    expect(response.status).toBe(200);
    expect(response.headers["content-type"]).toMatch(/application\/xml/);
    expect(response.text).toContain("<response>");
    expect(response.text).toContain("<success>true</success>");
    expect(response.text).toContain(
      "<message>Content negotiation works</message>"
    );
  });

  test("returns 406 for an unsupported response format", async () => {
    const response = await request(app)
      .get("/test")
      .set("Accept", "text/csv");

    expect(response.status).toBe(406);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe("NOT_ACCEPTABLE");
  });

  test("includes Vary: Accept", async () => {
    const response = await request(app)
      .get("/test")
      .set("Accept", "application/json");

    expect(response.headers.vary).toContain("Accept");
  });
});