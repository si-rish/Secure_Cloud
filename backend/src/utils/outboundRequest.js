const CircuitBreaker = require("opossum");

// Configuration
const DEFAULT_TIMEOUT_MS = 5000;
const DEFAULT_MAX_RETRIES = 3;
const INITIAL_BACKOFF_MS = 200;
const MAX_BACKOFF_MS = 2000;

// A request can take up to 4 * 5 seconds plus 1.4 seconds
// of backoff with the default settings.
// Keep the breaker timeout above that maximum.
const CIRCUIT_BREAKER_TIMEOUT_MS = 25000;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Performs one HTTP request with a strict timeout.
 */
async function fetchWithTimeout(url, options, timeoutMs) {
  const controller = new AbortController();

  // Respect a caller-provided signal, if present.
  const externalSignal = options.signal;

  if (externalSignal?.aborted) {
    throw new Error("Outbound request aborted");
  }

  let timedOut = false;

  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);

  const abortFromExternalSignal = () => {
    controller.abort();
  };

  externalSignal?.addEventListener(
    "abort",
    abortFromExternalSignal,
    { once: true }
  );

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
    });
  } catch (error) {
    if (timedOut) {
      const timeoutError = new Error(
        `Outbound request timed out after ${timeoutMs} ms`
      );

      timeoutError.code = "OUTBOUND_TIMEOUT";
      throw timeoutError;
    }

    if (externalSignal?.aborted) {
      throw new Error("Outbound request aborted");
    }

    throw error;
  } finally {
    clearTimeout(timer);

    externalSignal?.removeEventListener(
      "abort",
      abortFromExternalSignal
    );
  }
}

/**
 * Makes an outbound HTTP request.
 *
 * Retries:
 * - Network errors
 * - Request timeouts
 * - HTTP 5xx responses
 *
 * Does not retry:
 * - HTTP 4xx responses
 *
 * Backoff: 200 ms, 400 ms, 800 ms by default.
 */
async function requestWithRetry(url, options = {}) {
  const {
    timeoutMs = DEFAULT_TIMEOUT_MS,
    retries = DEFAULT_MAX_RETRIES,
    ...fetchOptions
  } = options;

  if (typeof url !== "string" || !url.trim()) {
    throw new TypeError("A valid outbound URL is required");
  }

  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    throw new TypeError("timeoutMs must be a positive number");
  }

  if (!Number.isInteger(retries) || retries < 0 || retries > 10) {
    throw new TypeError("retries must be an integer between 0 and 10");
  }

  let lastError;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const response = await fetchWithTimeout(
        url,
        fetchOptions,
        timeoutMs
      );

      // Retry server failures, but do not retry client failures.
      if (response.status >= 500 && response.status <= 599) {
        const error = new Error(
          `Upstream server returned HTTP ${response.status}`
        );

        error.code = "UPSTREAM_SERVER_ERROR";
        error.status = response.status;

        throw error;
      }

      // Return successful responses and non-retryable 4xx responses.
      return response;
    } catch (error) {
      lastError = error;

      if (attempt >= retries) {
        break;
      }

      const backoffMs = Math.min(
        INITIAL_BACKOFF_MS * 2 ** attempt,
        MAX_BACKOFF_MS
      );

      await sleep(backoffMs);
    }
  }

  throw lastError;
}

/**
 * Creates an independent circuit breaker.
 * Exposed separately so its state can be tested without
 * contaminating the application's shared breaker.
 */
function createCircuitBreaker(options = {}) {
  const breaker = new CircuitBreaker(
    (url, requestOptions) =>
      requestWithRetry(url, requestOptions),
    {
      timeout: CIRCUIT_BREAKER_TIMEOUT_MS,
      errorThresholdPercentage: 50,
      resetTimeout: 10000,
      volumeThreshold: 3,
      ...options,
    }
  );

  breaker.on("open", () => {
    console.error("Outbound circuit breaker opened");
  });

  breaker.on("halfOpen", () => {
    console.log("Outbound circuit breaker is half-open");
  });

  breaker.on("close", () => {
    console.log("Outbound circuit breaker closed");
  });

  return breaker;
}

// Shared breaker used by application code.
const breaker = createCircuitBreaker();

/**
 * Makes an outbound request through the circuit breaker.
 */
async function outboundRequest(url, options = {}) {
  return breaker.fire(url, options);
}

module.exports = {
  outboundRequest,
  requestWithRetry,
  fetchWithTimeout,
  createCircuitBreaker,
  breaker,
};