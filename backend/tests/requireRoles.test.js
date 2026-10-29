const requireRoles = require("../src/middleware/requireRoles");

describe("requireRoles middleware", () => {
  function createResponse() {
    return {
      statusCode: 200,
      body: null,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(body) {
        this.body = body;
        return this;
      },
    };
  }

  test("allows an administrator", () => {
    const middleware = requireRoles("admin");
    const req = { user: { id: "1", role: "admin" } };
    const res = createResponse();
    const next = jest.fn();

    middleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.statusCode).toBe(200);
  });

  test("allows a manager when manager role is permitted", () => {
    const middleware = requireRoles("admin", "manager");
    const req = { user: { id: "2", role: "manager" } };
    const res = createResponse();
    const next = jest.fn();

    middleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
  });

  test("rejects a regular user from an admin-only route", () => {
    const middleware = requireRoles("admin");
    const req = { user: { id: "3", role: "user" } };
    const res = createResponse();
    const next = jest.fn();

    middleware(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(403);
  });

  test("rejects unauthenticated requests", () => {
    const middleware = requireRoles("admin");
    const req = {};
    const res = createResponse();
    const next = jest.fn();

    middleware(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(401);
  });

  test("rejects invalid role configuration", () => {
    expect(() => requireRoles("superadmin")).toThrow();
    expect(() => requireRoles()).toThrow();
  });
});
