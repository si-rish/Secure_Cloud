const CircuitBreaker = require("opossum");

describe("Circuit breaker recovery", () => {
  jest.setTimeout(10000);

  test("opens after failures and closes after a successful recovery probe", async () => {
    let shouldFail = true;

    const operation = jest.fn(async () => {
      if (shouldFail) {
        throw new Error("Simulated upstream failure");
      }

      return { status: 200 };
    });

    const breaker = new CircuitBreaker(operation, {
      timeout: 1000,
      errorThresholdPercentage: 50,
      resetTimeout: 300,
      volumeThreshold: 2,
    });

    try {
      // First failure.
      await expect(breaker.fire()).rejects.toThrow(
        "Simulated upstream failure"
      );

      // Second failure reaches the volume threshold.
      await expect(breaker.fire()).rejects.toThrow(
        "Simulated upstream failure"
      );

      expect(breaker.opened).toBe(true);

      // Wait for the breaker to permit a recovery probe.
      await new Promise((resolve) => setTimeout(resolve, 350));

      shouldFail = false;

      // A successful probe should close the breaker.
      const result = await breaker.fire();

      expect(result).toEqual({ status: 200 });
      expect(breaker.closed).toBe(true);
      expect(breaker.opened).toBe(false);
    } finally {
      breaker.shutdown();
    }
  });
});
