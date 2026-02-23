(function () {
  "use strict";

  var DEFAULT_TIMEOUT_MS = 15000;
  var DEFAULT_RETRIES = 1;
  var DEFAULT_RETRY_DELAY_MS = 400;
  var RETRYABLE_HTTP_STATUS = {
    408: true,
    425: true,
    429: true,
    500: true,
    502: true,
    503: true,
    504: true
  };

  function cloneShallow(obj) {
    var out = {};
    if (!obj || typeof obj !== "object") {
      return out;
    }
    Object.keys(obj).forEach(function (key) {
      out[key] = obj[key];
    });
    return out;
  }

  function createFetchError(code, message, meta) {
    var err = new Error(message || "Request failed");
    err.name = "FnedFetchError";
    err.code = code || "FETCH_ERROR";
    if (meta && typeof meta === "object") {
      Object.keys(meta).forEach(function (key) {
        err[key] = meta[key];
      });
    }
    return err;
  }

  function normalizeFetchError(error, fallbackCode, meta) {
    if (error && error.name === "AbortError") {
      return createFetchError(
        "TIMEOUT",
        "Request timed out",
        meta || {}
      );
    }

    if (error && error.name === "FnedFetchError") {
      if (meta && typeof meta === "object") {
        Object.keys(meta).forEach(function (key) {
          if (typeof error[key] === "undefined") {
            error[key] = meta[key];
          }
        });
      }
      return error;
    }

    var message = error && error.message ? String(error.message) : "Network request failed";
    var normalized = createFetchError(fallbackCode || "NETWORK_ERROR", message, meta || {});
    if (error && typeof error.httpStatus === "number") {
      normalized.httpStatus = error.httpStatus;
    }
    return normalized;
  }

  function getDefaultExpectedType(parseAs) {
    if (parseAs === "json") {
      return "json";
    }
    return null;
  }

  function contentTypeMatches(expectedType, contentType) {
    if (!expectedType || expectedType === "any") {
      return true;
    }

    var ct = (contentType || "").toLowerCase();
    if (!ct) {
      return false;
    }

    if (Array.isArray(expectedType)) {
      for (var i = 0; i < expectedType.length; i++) {
        if (contentTypeMatches(expectedType[i], ct)) {
          return true;
        }
      }
      return false;
    }

    if (expectedType === "json") {
      return (
        ct.indexOf("application/json") >= 0 ||
        ct.indexOf("+json") >= 0 ||
        ct.indexOf("text/json") >= 0 ||
        ct.indexOf("text/plain") >= 0
      );
    }

    if (expectedType === "xml") {
      return ct.indexOf("xml") >= 0;
    }

    if (expectedType === "text") {
      return (
        ct.indexOf("text/") === 0 ||
        ct.indexOf("json") >= 0 ||
        ct.indexOf("xml") >= 0 ||
        ct.indexOf("javascript") >= 0
      );
    }

    return ct.indexOf(String(expectedType).toLowerCase()) >= 0;
  }

  function getFeedStatusApi(explicitApi) {
    if (explicitApi && typeof explicitApi === "object") {
      return explicitApi;
    }
    return window.FNED_FEED_STATUS_API || null;
  }

  function feedStart(api, feedKey, url) {
    if (!feedKey || !api || typeof api.start !== "function") {
      return;
    }
    api.start(feedKey, url);
  }

  function feedOk(api, feedKey, httpStatus) {
    if (!feedKey || !api || typeof api.ok !== "function") {
      return;
    }
    api.ok(feedKey, { httpStatus: httpStatus || null });
  }

  function feedFail(api, feedKey, error) {
    if (!feedKey || !api || typeof api.fail !== "function") {
      return;
    }
    api.fail(feedKey, error, {
      httpStatus: error && error.httpStatus ? error.httpStatus : null
    });
  }

  function isRetryable(error) {
    if (!error) {
      return false;
    }
    if (error.code === "TIMEOUT" || error.code === "NETWORK_ERROR") {
      return true;
    }
    if (error.code === "HTTP_ERROR" && RETRYABLE_HTTP_STATUS[error.httpStatus]) {
      return true;
    }
    return !!error.retryable;
  }

  function wait(ms) {
    return new Promise(function (resolve) {
      setTimeout(resolve, ms);
    });
  }

  async function request(url, options) {
    var opts = options && typeof options === "object" ? options : {};
    var parseAs = opts.parseAs || "text";
    var timeoutMs =
      typeof opts.timeoutMs === "number" && opts.timeoutMs > 0
        ? Math.floor(opts.timeoutMs)
        : DEFAULT_TIMEOUT_MS;
    var retries =
      typeof opts.retries === "number" && opts.retries >= 0
        ? Math.floor(opts.retries)
        : DEFAULT_RETRIES;
    var retryDelayMs =
      typeof opts.retryDelayMs === "number" && opts.retryDelayMs >= 0
        ? Math.floor(opts.retryDelayMs)
        : DEFAULT_RETRY_DELAY_MS;
    var expectedContentType = opts.expectedContentType || getDefaultExpectedType(parseAs);
    var feedKey = opts.feedKey || "";
    var statusApi = getFeedStatusApi(opts.feedStatusApi);
    var baseFetchOptions = cloneShallow(opts.fetchOptions || {});
    var method = baseFetchOptions.method || "GET";

    for (var attemptIndex = 0; attemptIndex <= retries; attemptIndex++) {
      var attempt = attemptIndex + 1;
      var fetchOptions = cloneShallow(baseFetchOptions);
      var controller = null;
      var timeoutId = null;
      var response = null;

      feedStart(statusApi, feedKey, url);

      try {
        if (typeof AbortController !== "undefined" && !fetchOptions.signal) {
          controller = new AbortController();
          fetchOptions.signal = controller.signal;
          timeoutId = setTimeout(function () {
            controller.abort();
          }, timeoutMs);
        }

        response = await fetch(url, fetchOptions);

        if (!response.ok) {
          throw createFetchError(
            "HTTP_ERROR",
            "HTTP " + response.status + " " + response.statusText,
            {
              url: url,
              method: method,
              attempt: attempt,
              httpStatus: response.status,
              retryable: !!RETRYABLE_HTTP_STATUS[response.status]
            }
          );
        }

        var contentType = "";
        if (response.headers && typeof response.headers.get === "function") {
          contentType = response.headers.get("content-type") || "";
        }

        if (expectedContentType && !contentTypeMatches(expectedContentType, contentType)) {
          throw createFetchError(
            "BAD_CONTENT_TYPE",
            "Unexpected content type: " + (contentType || "(empty)"),
            {
              url: url,
              method: method,
              attempt: attempt,
              httpStatus: response.status,
              contentType: contentType,
              expectedContentType: String(expectedContentType)
            }
          );
        }

        var payload;
        if (parseAs === "json") {
          payload = await response.json();
        } else if (parseAs === "arrayBuffer") {
          payload = await response.arrayBuffer();
        } else {
          payload = await response.text();
        }

        feedOk(statusApi, feedKey, response.status);
        return payload;
      } catch (error) {
        var normalized = normalizeFetchError(error, "NETWORK_ERROR", {
          url: url,
          method: method,
          attempt: attempt
        });

        if (
          normalized.code === "TIMEOUT" &&
          typeof normalized.timeoutMs === "undefined"
        ) {
          normalized.timeoutMs = timeoutMs;
          normalized.message = "Request timed out after " + timeoutMs + "ms";
        }

        if (
          normalized.code === "HTTP_ERROR" &&
          RETRYABLE_HTTP_STATUS[normalized.httpStatus]
        ) {
          normalized.retryable = true;
        }

        if (
          normalized.code === "NETWORK_ERROR" &&
          typeof normalized.retryable === "undefined"
        ) {
          normalized.retryable = true;
        }

        feedFail(statusApi, feedKey, normalized);

        if (attemptIndex < retries && isRetryable(normalized)) {
          if (retryDelayMs > 0) {
            await wait(retryDelayMs * attempt);
          }
          continue;
        }

        throw normalized;
      } finally {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
      }
    }

    throw createFetchError("UNKNOWN", "Request failed");
  }

  function fetchText(url, options) {
    var opts = cloneShallow(options || {});
    opts.parseAs = "text";
    return request(url, opts);
  }

  function fetchJson(url, options) {
    var opts = cloneShallow(options || {});
    opts.parseAs = "json";
    if (!opts.expectedContentType) {
      opts.expectedContentType = "json";
    }
    return request(url, opts);
  }

  function fetchArrayBuffer(url, options) {
    var opts = cloneShallow(options || {});
    opts.parseAs = "arrayBuffer";
    return request(url, opts);
  }

  window.FNED_FETCH = {
    request: request,
    fetchText: fetchText,
    fetchJson: fetchJson,
    fetchArrayBuffer: fetchArrayBuffer,
    createFetchError: createFetchError
  };
})();
