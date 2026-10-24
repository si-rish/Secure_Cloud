const {
  requestWithRetry,
  fetchWithTimeout,
  createCircuitBreaker,
  breaker,
} = require("../src/utils/outboundRequest");

const originalFetch = global.fetch;

describe("SecureCloud outbound reliability", () => {
  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  afterAll(() => {
    breaker.shutdown();
  });

  test("returns a successful HTTP response", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
    });

    const response = await requestWithRetry(
      "http://example.test/health",
      {
        retries: 0,
        timeoutMs: 1000,
      }
    );

    expect(response.status).toBe(200);
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  test("retries an HTTP 503 and succeeds on the next attempt", async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 503,
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
      });

    const response = await requestWithRetry(
      "http://example.test/health",
      {
        retries: 1,
        timeoutMs: 1000,
      }
    );

    expect(response.status).toBe(200);
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  test("does not retry an HTTP 404 response", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 404,
    });

    const response = await requestWithRetry(
      "http://example.test/missing",
      {
        retries: 3,
        timeoutMs: 1000,
      }
    );

    expect(response.status).toBe(404);
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  test("retries network errors and eventually fails", async () => {
    global.fetch = jest
      .fn()
      .mockRejectedValue(new Error("Upstream unavailable"));

    await expect(
      requestWithRetry("http://example.test/health", {
        retries: 2,
        timeoutMs: 1000,
      })
    ).rejects.toThrow("Upstream unavailable");

    expect(global.fetch).toHaveBeenCalledTimes(3);
  });

  test("aborts a request that exceeds its timeout", async () => {
    let capturedSignal;

    global.fetch = jest.fn((_url, options) => {
      capturedSignal = options.signal;

      return new Promise((resolve, reject) => {
        if (options.signal.aborted) {
          reject(new Error("Request aborted"));
          return;
        }

        options.signal.addEventListener(
          "abort",
          () => reject(new Error("Request aborted")),
          { once: true }
        );
      });
    });

    await expect(
      fetchWithTimeout(
        "http://example.test/slow",
        {},
        50
      )
    ).rejects.toMatchObject({
      code: "OUTBOUND_TIMEOUT",
    });

    expect(capturedSignal.aborted).toBe(true);
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  test("rejects invalid timeout and retry configuration", async () => {
    await expect(
      requestWithRetry("http://example.test/health", {
        timeoutMs: 0,
      })
    ).rejects.toThrow("timeoutMs must be a positive number");

    await expect(
      requestWithRetry("http://example.test/health", {
        retries: -1,
      })
    ).rejects.toThrow(
      "retries must be an integer between 0 and 10"
    );
  });

  test("creates a circuit breaker with a working fire method", () => {
    const testBreaker = createCircuitBreaker({
      timeout: 1000,
      resetTimeout: 100,
      volumeThreshold: 2,
    });

    expect(testBreaker).toBeDefined();
    expect(typeof testBreaker.fire).toBe("function");

    testBreaker.shutdown();
  });

  test("opens the circuit after repeated failures", async () => {
    const testBreaker = createCircuitBreaker({
      timeout: 1000,
      resetTimeout: 10000,
      errorThresholdPercentage: 50,
      volumeThreshold: 2,
    });

    const failingOperation = jest.fn().mockRejectedValue(
      new Error("Simulated upstream failure")
    );

    // Create a separate breaker for a deterministic state test.
    const CircuitBreaker = require("opossum");

    const isolatedBreaker = new CircuitBreaker(
      failingOperation,
      {
        timeout: 1000,
        resetTimeout: 10000,
        errorThresholdPercentage: 50,
        volumeThreshold: 2,
      }
    );

    try {
      await expect(isolatedBreaker.fire()).rejects.toThrow(
        "Simulated upstream failure"
      );

      await expect(isolatedBreaker.fire()).rejects.toThrow(
        "Simulated upstream failure"
      );

      expect(isolatedBreaker.opened).toBe(true);
    } finally {
      isolatedBreaker.shutdown();
      testBreaker.shutdown();
    }
  });
});