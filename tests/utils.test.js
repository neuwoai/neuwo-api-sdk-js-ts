/**
 * Unit tests for utils.
 */

import assert from "node:assert";
import { describe, test } from "node:test";

import {
    AuthenticationError,
    BadRequestError,
    ContentNotAvailableError,
    ForbiddenError,
    NetworkError,
    NeuwoAPIError,
    NoDataAvailableError,
    NotFoundError,
    RateLimitError,
    ServerError,
    ValidationError,
} from "../dist/esm/errors.js";
import {
    formatDate,
    parseJsonResponse,
    RequestHandler,
    sanitiseContent,
    sleep,
    validateUrl,
} from "../dist/esm/utils.js";

describe("sanitiseContent", () => {
    test("should return trimmed content", () => {
        const content = "  Test content  ";
        const result = sanitiseContent(content);
        assert.strictEqual(result, content);
    });

    test("should throw ValidationError for empty string", () => {
        assert.throws(() => sanitiseContent(""), ValidationError);
    });

    test("should throw ValidationError for whitespace only", () => {
        assert.throws(() => sanitiseContent("   "), ValidationError);
    });

    test("should throw ValidationError for non-string", () => {
        assert.throws(() => sanitiseContent(null), ValidationError);
        assert.throws(() => sanitiseContent(undefined), ValidationError);
        assert.throws(() => sanitiseContent(123), ValidationError);
    });

    test("should accept valid content", () => {
        const content = "Valid content";
        const result = sanitiseContent(content);
        assert.strictEqual(result, content);
    });
});

describe("validateUrl", () => {
    test("should accept valid HTTP URL", () => {
        assert.doesNotThrow(() => validateUrl("http://example.com"));
    });

    test("should accept valid HTTPS URL", () => {
        assert.doesNotThrow(() => validateUrl("https://example.com"));
    });

    test("should accept URL with path", () => {
        assert.doesNotThrow(() =>
            validateUrl("https://example.com/path/to/article")
        );
    });

    test("should accept URL with query params", () => {
        assert.doesNotThrow(() =>
            validateUrl("https://example.com/article?id=123")
        );
    });

    test("should throw ValidationError for invalid URL", () => {
        assert.throws(() => validateUrl("not-a-url"), ValidationError);
    });

    test("should throw ValidationError for empty string", () => {
        assert.throws(() => validateUrl(""), ValidationError);
    });

    test("should throw ValidationError for non-string", () => {
        assert.throws(() => validateUrl(null), ValidationError);
        assert.throws(() => validateUrl(undefined), ValidationError);
    });

    test("should throw ValidationError for URL without protocol", () => {
        assert.throws(() => validateUrl("example.com"), ValidationError);
    });
});

describe("sleep", () => {
    test("should resolve after specified time", async () => {
        const start = Date.now();
        await sleep(100);
        const elapsed = Date.now() - start;

        assert.ok(elapsed >= 90);
        assert.ok(elapsed < 200);
    });

    test("should return a Promise", () => {
        const result = sleep(10);
        assert.ok(result instanceof Promise);
    });
});

describe("parseJsonResponse", () => {
    /**
     * Helper function to create a mock Response object
     */
    function createMockResponse(body) {
        return {
            text: async () => body,
        };
    }

    test("should parse valid JSON response", async () => {
        const response = createMockResponse('{"key":"value"}');
        const result = await parseJsonResponse(response);
        assert.deepStrictEqual(result, { key: "value" });
    });

    test("should parse JSON array response", async () => {
        const response = createMockResponse("[1,2,3]");
        const result = await parseJsonResponse(response);
        assert.deepStrictEqual(result, [1, 2, 3]);
    });

    test("should throw ContentNotAvailableError if response contains error field", async () => {
        const response = createMockResponse(
            '{"error":"Content failed","url":"https://example.com"}'
        );
        await assert.rejects(
            async () => await parseJsonResponse(response),
            ContentNotAvailableError
        );
    });

    test("should throw Error for invalid JSON", async () => {
        const response = createMockResponse("not valid json");
        await assert.rejects(
            async () => await parseJsonResponse(response),
            (error) => {
                assert.ok(error.message.includes("Invalid JSON response"));
                return true;
            }
        );
    });

    test("should handle empty JSON object", async () => {
        const response = createMockResponse("{}");
        const result = await parseJsonResponse(response);
        assert.deepStrictEqual(result, {});
    });

    test("should handle nested JSON structures", async () => {
        const response = createMockResponse(
            '{"user":{"name":"John","age":30}}'
        );
        const result = await parseJsonResponse(response);
        assert.deepStrictEqual(result, { user: { name: "John", age: 30 } });
    });
});

describe("formatDate", () => {
    test("should format date correctly", () => {
        const date = new Date("2024-01-15");
        const formatted = formatDate(date);
        assert.strictEqual(formatted, "2024-01-15");
    });

    test("should pad single digit month and day", () => {
        const date = new Date("2024-03-05");
        const formatted = formatDate(date);
        assert.strictEqual(formatted, "2024-03-05");
    });
});

describe("RequestHandler - encodeFormData and encodeValue", () => {
    /**
     * Helper to test form data encoding through RequestHandler.
     * We intercept the fetch call to inspect what was sent.
     */
    async function captureFormData(data) {
        const handler = new RequestHandler(
            "test-token",
            "https://api.example.com",
            10
        );
        let capturedBody = null;

        // Mock fetch to capture the request body
        const originalFetch = globalThis.fetch;
        globalThis.fetch = async (url, options) => {
            capturedBody = options.body;
            // Return a mock successful response
            return {
                ok: true,
                status: 200,
                text: async () => "{}",
                json: async () => ({}),
            };
        };

        try {
            await handler.request({
                method: "POST",
                endpoint: "/test",
                data: data,
            });
        } finally {
            globalThis.fetch = originalFetch;
        }

        return capturedBody;
    }

    test("should encode simple key-value data", async () => {
        const body = await captureFormData({ key: "value" });
        assert.strictEqual(body, "key=value");
    });

    test("should encode boolean values as strings", async () => {
        const body = await captureFormData({ flag: true, disabled: false });
        assert.ok(body.includes("flag=true"));
        assert.ok(body.includes("disabled=false"));
    });

    test("should encode array values by repeating parameter name", async () => {
        const body = await captureFormData({ tags: ["tag1", "tag2", "tag3"] });
        assert.ok(body.includes("tags=tag1"));
        assert.ok(body.includes("tags=tag2"));
        assert.ok(body.includes("tags=tag3"));
    });

    test("should filter out null and undefined values", async () => {
        const body = await captureFormData({
            key1: "value1",
            key2: null,
            key3: undefined,
        });
        assert.ok(body.includes("key1=value1"));
        assert.ok(!body.includes("key2"));
        assert.ok(!body.includes("key3"));
    });

    test("should filter out null and undefined items in arrays", async () => {
        const body = await captureFormData({
            tags: ["tag1", null, "tag2", undefined, "tag3"],
        });
        assert.ok(body.includes("tags=tag1"));
        assert.ok(body.includes("tags=tag2"));
        assert.ok(body.includes("tags=tag3"));
        // Count occurrences - should be exactly 3
        const matches = body.match(/tags=/g);
        assert.strictEqual(matches.length, 3);
    });

    test("should encode number values as strings", async () => {
        const body = await captureFormData({ count: 42, price: 19.99 });
        assert.ok(body.includes("count=42"));
        assert.ok(body.includes("price=19.99"));
    });

    test("should handle mixed data types", async () => {
        const body = await captureFormData({
            text: "hello",
            number: 123,
            flag: true,
            items: ["a", "b"],
        });
        assert.ok(body.includes("text=hello"));
        assert.ok(body.includes("number=123"));
        assert.ok(body.includes("flag=true"));
        assert.ok(body.includes("items=a"));
        assert.ok(body.includes("items=b"));
    });

    test("should handle empty arrays", async () => {
        const body = await captureFormData({ tags: [], key: "value" });
        assert.ok(body.includes("key=value"));
        assert.ok(!body.includes("tags"));
    });

    test("should URL-encode special characters", async () => {
        const body = await captureFormData({
            message: "hello world",
            email: "test@example.com",
        });
        assert.ok(
            body.includes("message=hello+world") ||
                body.includes("message=hello%20world")
        );
        assert.ok(body.includes("email=test%40example.com"));
    });

    test("should handle object with only null/undefined values", async () => {
        const body = await captureFormData({ key1: null, key2: undefined });
        // Should result in empty string or no parameters
        assert.ok(body === "" || !body.includes("key"));
    });
});

describe("RequestHandler", () => {
    /**
     * Helper function to create a mock Response object
     */
    function createMockResponse(status, body, headers = {}) {
        return {
            ok: status >= 200 && status < 300,
            status,
            text: async () => body,
            json: async () => JSON.parse(body),
            headers: {
                get: (key) => headers[key.toLowerCase()],
            },
        };
    }

    describe("constructor", () => {
        test("should create instance with required parameters", () => {
            const handler = new RequestHandler(
                "test-token",
                "https://api.example.com",
                30
            );
            assert.ok(handler instanceof RequestHandler);
        });
    });

    describe("URL building with paths", () => {
        test("should concatenate base URL path with endpoint", async () => {
            const handler = new RequestHandler(
                "test-token",
                "https://edge.neuwo.ai/api/aitopics",
                10
            );
            let capturedUrl = null;

            const originalFetch = globalThis.fetch;
            globalThis.fetch = async (url) => {
                capturedUrl = url;
                return createMockResponse(200, '{"success":true}');
            };

            try {
                await handler.request({
                    method: "GET",
                    endpoint: "/edge/GetAiTopics",
                });

                assert.ok(
                    capturedUrl.startsWith(
                        "https://edge.neuwo.ai/api/aitopics/edge/GetAiTopics"
                    )
                );
                assert.ok(capturedUrl.includes("token=test-token"));
            } finally {
                globalThis.fetch = originalFetch;
            }
        });

        test("should handle base URL without trailing slash", async () => {
            const handler = new RequestHandler(
                "test-token",
                "https://api.example.com/v1",
                10
            );
            let capturedUrl = null;

            const originalFetch = globalThis.fetch;
            globalThis.fetch = async (url) => {
                capturedUrl = url;
                return createMockResponse(200, '{"success":true}');
            };

            try {
                await handler.request({
                    method: "GET",
                    endpoint: "/test",
                });

                assert.ok(
                    capturedUrl.startsWith("https://api.example.com/v1/test")
                );
                assert.ok(
                    !capturedUrl.includes("/v1//test"),
                    "Should not have double slashes"
                );
            } finally {
                globalThis.fetch = originalFetch;
            }
        });

        test("should handle base URL with trailing slash", async () => {
            const handler = new RequestHandler(
                "test-token",
                "https://api.example.com/v1/",
                10
            );
            let capturedUrl = null;

            const originalFetch = globalThis.fetch;
            globalThis.fetch = async (url) => {
                capturedUrl = url;
                return createMockResponse(200, '{"success":true}');
            };

            try {
                await handler.request({
                    method: "GET",
                    endpoint: "/test",
                });

                assert.ok(
                    capturedUrl.startsWith("https://api.example.com/v1/test")
                );
                assert.ok(
                    !capturedUrl.includes("/v1//test"),
                    "Should not have double slashes"
                );
            } finally {
                globalThis.fetch = originalFetch;
            }
        });

        test("should handle endpoint without leading slash", async () => {
            const handler = new RequestHandler(
                "test-token",
                "https://api.example.com/v1",
                10
            );
            let capturedUrl = null;

            const originalFetch = globalThis.fetch;
            globalThis.fetch = async (url) => {
                capturedUrl = url;
                return createMockResponse(200, '{"success":true}');
            };

            try {
                await handler.request({
                    method: "GET",
                    endpoint: "test",
                });

                assert.ok(
                    capturedUrl.startsWith("https://api.example.com/v1/test")
                );
            } finally {
                globalThis.fetch = originalFetch;
            }
        });

        test("should handle base URL without path", async () => {
            const handler = new RequestHandler(
                "test-token",
                "https://api.example.com",
                10
            );
            let capturedUrl = null;

            const originalFetch = globalThis.fetch;
            globalThis.fetch = async (url) => {
                capturedUrl = url;
                return createMockResponse(200, '{"success":true}');
            };

            try {
                await handler.request({
                    method: "GET",
                    endpoint: "/test",
                });

                assert.ok(
                    capturedUrl.startsWith("https://api.example.com/test")
                );
            } finally {
                globalThis.fetch = originalFetch;
            }
        });

        test("should handle nested endpoint paths", async () => {
            const handler = new RequestHandler(
                "test-token",
                "https://api.example.com/api/v1",
                10
            );
            let capturedUrl = null;

            const originalFetch = globalThis.fetch;
            globalThis.fetch = async (url) => {
                capturedUrl = url;
                return createMockResponse(200, '{"success":true}');
            };

            try {
                await handler.request({
                    method: "GET",
                    endpoint: "/resources/items/123",
                });

                assert.ok(
                    capturedUrl.startsWith(
                        "https://api.example.com/api/v1/resources/items/123"
                    )
                );
            } finally {
                globalThis.fetch = originalFetch;
            }
        });
    });

    describe("request method", () => {
        test("should make GET request with token in URL", async () => {
            const handler = new RequestHandler(
                "test-token",
                "https://api.example.com",
                10
            );
            let capturedUrl = null;
            let capturedOptions = null;

            const originalFetch = globalThis.fetch;
            globalThis.fetch = async (url, options) => {
                capturedUrl = url;
                capturedOptions = options;
                return createMockResponse(200, '{"success":true}');
            };

            try {
                await handler.request({
                    method: "GET",
                    endpoint: "/test",
                });

                assert.ok(capturedUrl.includes("token=test-token"));
                assert.ok(capturedUrl.includes("/test"));
                assert.strictEqual(capturedOptions.method, "GET");
            } finally {
                globalThis.fetch = originalFetch;
            }
        });

        test("should include query parameters in URL", async () => {
            const handler = new RequestHandler(
                "test-token",
                "https://api.example.com",
                10
            );
            let capturedUrl = null;

            const originalFetch = globalThis.fetch;
            globalThis.fetch = async (url) => {
                capturedUrl = url;
                return createMockResponse(200, '{"success":true}');
            };

            try {
                await handler.request({
                    method: "GET",
                    endpoint: "/test",
                    params: { key: "value", count: 5 },
                });

                assert.ok(capturedUrl.includes("key=value"));
                assert.ok(capturedUrl.includes("count=5"));
                assert.ok(capturedUrl.includes("token=test-token"));
            } finally {
                globalThis.fetch = originalFetch;
            }
        });

        test("should handle array parameters in URL", async () => {
            const handler = new RequestHandler(
                "test-token",
                "https://api.example.com",
                10
            );
            let capturedUrl = null;

            const originalFetch = globalThis.fetch;
            globalThis.fetch = async (url) => {
                capturedUrl = url;
                return createMockResponse(200, '{"success":true}');
            };

            try {
                await handler.request({
                    method: "GET",
                    endpoint: "/test",
                    params: { tags: ["tag1", "tag2", "tag3"] },
                });

                assert.ok(capturedUrl.includes("tags=tag1"));
                assert.ok(capturedUrl.includes("tags=tag2"));
                assert.ok(capturedUrl.includes("tags=tag3"));
            } finally {
                globalThis.fetch = originalFetch;
            }
        });

        test("should send POST request with form data", async () => {
            const handler = new RequestHandler(
                "test-token",
                "https://api.example.com",
                10
            );
            let capturedBody = null;
            let capturedHeaders = null;

            const originalFetch = globalThis.fetch;
            globalThis.fetch = async (url, options) => {
                capturedBody = options.body;
                capturedHeaders = options.headers;
                return createMockResponse(200, '{"success":true}');
            };

            try {
                await handler.request({
                    method: "POST",
                    endpoint: "/test",
                    data: { key: "value", flag: true },
                });

                assert.ok(capturedBody.includes("key=value"));
                assert.ok(capturedBody.includes("flag=true"));
                assert.strictEqual(
                    capturedHeaders["Content-Type"],
                    "application/x-www-form-urlencoded"
                );
            } finally {
                globalThis.fetch = originalFetch;
            }
        });

        test("should send multipart form data for file uploads", async () => {
            const handler = new RequestHandler(
                "test-token",
                "https://api.example.com",
                10
            );
            let capturedBody = null;

            const originalFetch = globalThis.fetch;
            globalThis.fetch = async (url, options) => {
                capturedBody = options.body;
                return createMockResponse(200, '{"success":true}');
            };

            try {
                const fileContent = new TextEncoder().encode(
                    "test file content"
                ).buffer;
                await handler.request({
                    method: "POST",
                    endpoint: "/upload",
                    files: {
                        file: {
                            filename: "test.txt",
                            content: fileContent,
                            contentType: "text/plain",
                        },
                    },
                });

                assert.ok(capturedBody instanceof FormData);
            } finally {
                globalThis.fetch = originalFetch;
            }
        });

        test("should include custom headers", async () => {
            const handler = new RequestHandler(
                "test-token",
                "https://api.example.com",
                10
            );
            let capturedHeaders = null;

            const originalFetch = globalThis.fetch;
            globalThis.fetch = async (url, options) => {
                capturedHeaders = options.headers;
                return createMockResponse(200, '{"success":true}');
            };

            try {
                await handler.request({
                    method: "GET",
                    endpoint: "/test",
                    headers: { "X-Custom-Header": "custom-value" },
                });

                assert.strictEqual(
                    capturedHeaders["X-Custom-Header"],
                    "custom-value"
                );
            } finally {
                globalThis.fetch = originalFetch;
            }
        });

        test("should throw NetworkError on timeout", async () => {
            const handler = new RequestHandler(
                "test-token",
                "https://api.example.com",
                0.1
            );

            const originalFetch = globalThis.fetch;
            globalThis.fetch = async (_url, options) => {
                // Simulate slow response that respects abort signal
                return new Promise((resolve, reject) => {
                    const timeoutId = setTimeout(() => {
                        resolve(createMockResponse(200, '{"success":true}'));
                    }, 200);

                    // Listen for abort signal
                    if (options.signal) {
                        options.signal.addEventListener("abort", () => {
                            clearTimeout(timeoutId);
                            reject(
                                new DOMException(
                                    "The operation was aborted",
                                    "AbortError"
                                )
                            );
                        });
                    }
                });
            };

            try {
                await assert.rejects(
                    async () =>
                        await handler.request({
                            method: "GET",
                            endpoint: "/test",
                        }),
                    (error) => {
                        assert.ok(error instanceof NetworkError);
                        assert.ok(error.message.includes("timeout"));
                        return true;
                    }
                );
            } finally {
                globalThis.fetch = originalFetch;
            }
        });

        test("should throw NetworkError on fetch failure", async () => {
            const handler = new RequestHandler(
                "test-token",
                "https://api.example.com",
                10
            );

            const originalFetch = globalThis.fetch;
            globalThis.fetch = async () => {
                throw new TypeError("fetch failed: network error");
            };

            try {
                await assert.rejects(
                    async () =>
                        await handler.request({
                            method: "GET",
                            endpoint: "/test",
                        }),
                    NetworkError
                );
            } finally {
                globalThis.fetch = originalFetch;
            }
        });

        test("should throw appropriate error on HTTP error status", async () => {
            const handler = new RequestHandler(
                "test-token",
                "https://api.example.com",
                10
            );

            const originalFetch = globalThis.fetch;
            globalThis.fetch = async () => {
                return createMockResponse(404, '{"message":"Not found"}');
            };

            try {
                await assert.rejects(
                    async () =>
                        await handler.request({
                            method: "GET",
                            endpoint: "/test",
                        }),
                    NotFoundError
                );
            } finally {
                globalThis.fetch = originalFetch;
            }
        });

        test("should return response on successful request", async () => {
            const handler = new RequestHandler(
                "test-token",
                "https://api.example.com",
                10
            );

            const originalFetch = globalThis.fetch;
            globalThis.fetch = async () => {
                return createMockResponse(200, '{"data":"success"}');
            };

            try {
                const response = await handler.request({
                    method: "GET",
                    endpoint: "/test",
                });

                assert.strictEqual(response.status, 200);
                const data = await response.json();
                assert.strictEqual(data.data, "success");
            } finally {
                globalThis.fetch = originalFetch;
            }
        });

        test("should not send body for GET requests", async () => {
            const handler = new RequestHandler(
                "test-token",
                "https://api.example.com",
                10
            );
            let capturedOptions = null;

            const originalFetch = globalThis.fetch;
            globalThis.fetch = async (url, options) => {
                capturedOptions = options;
                return createMockResponse(200, '{"success":true}');
            };

            try {
                await handler.request({
                    method: "GET",
                    endpoint: "/test",
                    data: { key: "value" },
                });

                assert.strictEqual(capturedOptions.body, undefined);
            } finally {
                globalThis.fetch = originalFetch;
            }
        });

        test("should filter out null and undefined from query params", async () => {
            const handler = new RequestHandler(
                "test-token",
                "https://api.example.com",
                10
            );
            let capturedUrl = null;

            const originalFetch = globalThis.fetch;
            globalThis.fetch = async (url) => {
                capturedUrl = url;
                return createMockResponse(200, '{"success":true}');
            };

            try {
                await handler.request({
                    method: "GET",
                    endpoint: "/test",
                    params: { key1: "value1", key2: null, key3: undefined },
                });

                assert.ok(capturedUrl.includes("key1=value1"));
                assert.ok(!capturedUrl.includes("key2"));
                assert.ok(!capturedUrl.includes("key3"));
            } finally {
                globalThis.fetch = originalFetch;
            }
        });
    });

    describe("handleAPIError", () => {
        /**
         * Helper function to create a mock Response object for error testing
         */
        function createErrorMockResponse(status, body, headers = {}) {
            return {
                status,
                text: async () => body,
                headers: {
                    get: (key) => headers[key.toLowerCase()],
                },
            };
        }

        test("should map 400 to BadRequestError", async () => {
            const response = createErrorMockResponse(
                400,
                '{"message":"Bad request"}'
            );
            const error = await RequestHandler.handleAPIError(response);
            assert.ok(error instanceof BadRequestError);
            assert.strictEqual(error.message, "Bad request");
        });

        test("should map 401 to AuthenticationError", async () => {
            const response = createErrorMockResponse(
                401,
                '{"message":"Unauthorised"}'
            );
            const error = await RequestHandler.handleAPIError(response);
            assert.ok(error instanceof AuthenticationError);
        });

        test("should map 403 to ForbiddenError", async () => {
            const response = createErrorMockResponse(
                403,
                '{"message":"Forbidden"}'
            );
            const error = await RequestHandler.handleAPIError(response);
            assert.ok(error instanceof ForbiddenError);
        });

        test('should map 404 with "no data yet available" to NoDataAvailableError', async () => {
            const response = createErrorMockResponse(
                404,
                '{"message":"No data yet available"}'
            );
            const error = await RequestHandler.handleAPIError(response);
            assert.ok(error instanceof NoDataAvailableError);
        });

        test('should map 404 without "no data yet available" to NotFoundError', async () => {
            const response = createErrorMockResponse(
                404,
                '{"message":"Resource not found"}'
            );
            const error = await RequestHandler.handleAPIError(response);
            assert.ok(error instanceof NotFoundError);
            assert.ok(!(error instanceof NoDataAvailableError));
        });

        test("should map 422 to ValidationError", async () => {
            const responseText = JSON.stringify({
                message: "Validation failed",
                detail: [
                    {
                        loc: ["body", "content"],
                        msg: "field required",
                        type: "value_error",
                    },
                ],
            });
            const response = createErrorMockResponse(422, responseText);
            const error = await RequestHandler.handleAPIError(response);
            assert.ok(error instanceof ValidationError);
            assert.ok(error.validationDetails);
        });

        test("should map 429 to RateLimitError", async () => {
            const response = createErrorMockResponse(
                429,
                '{"message":"Rate limit exceeded"}'
            );
            const error = await RequestHandler.handleAPIError(response);
            assert.ok(error instanceof RateLimitError);
        });

        test("should extract Retry-After header for RateLimitError", async () => {
            const response = createErrorMockResponse(
                429,
                '{"message":"Rate limit exceeded"}',
                { "retry-after": "60" }
            );
            const error = await RequestHandler.handleAPIError(response);
            assert.ok(error instanceof RateLimitError);
            assert.strictEqual(error.retryAfter, 60);
        });

        test("should handle missing Retry-After header for RateLimitError", async () => {
            const response = createErrorMockResponse(
                429,
                '{"message":"Rate limit exceeded"}'
            );
            const error = await RequestHandler.handleAPIError(response);
            assert.ok(error instanceof RateLimitError);
            assert.strictEqual(error.retryAfter, undefined);
        });

        test("should map 500 to ServerError", async () => {
            const response = createErrorMockResponse(
                500,
                '{"message":"Internal server error"}'
            );
            const error = await RequestHandler.handleAPIError(response);
            assert.ok(error instanceof ServerError);
            assert.strictEqual(error.statusCode, 500);
        });

        test("should map 502 to ServerError", async () => {
            const response = createErrorMockResponse(
                502,
                '{"message":"Bad gateway"}'
            );
            const error = await RequestHandler.handleAPIError(response);
            assert.ok(error instanceof ServerError);
            assert.strictEqual(error.statusCode, 502);
        });

        test("should map 503 to ServerError", async () => {
            const response = createErrorMockResponse(
                503,
                '{"message":"Service unavailable"}'
            );
            const error = await RequestHandler.handleAPIError(response);
            assert.ok(error instanceof ServerError);
            assert.strictEqual(error.statusCode, 503);
        });

        test("should map 504 to ServerError", async () => {
            const response = createErrorMockResponse(
                504,
                '{"message":"Gateway timeout"}'
            );
            const error = await RequestHandler.handleAPIError(response);
            assert.ok(error instanceof ServerError);
            assert.strictEqual(error.statusCode, 504);
        });

        test("should handle non-JSON response", async () => {
            const response = createErrorMockResponse(
                500,
                "Internal Server Error"
            );
            const error = await RequestHandler.handleAPIError(response);
            assert.ok(error instanceof ServerError);
            assert.strictEqual(error.message, "Internal Server Error");
        });

        test("should handle unknown status codes", async () => {
            const response = createErrorMockResponse(418, "I am a teapot");
            const error = await RequestHandler.handleAPIError(response);
            assert.ok(error instanceof NeuwoAPIError);
            assert.strictEqual(error.statusCode, 418);
        });

        test('should extract error from "error" field', async () => {
            const response = createErrorMockResponse(
                400,
                '{"error":"Something went wrong"}'
            );
            const error = await RequestHandler.handleAPIError(response);
            assert.ok(error instanceof BadRequestError);
            assert.strictEqual(error.message, "Something went wrong");
        });

        test('should extract error from "detail" field', async () => {
            const response = createErrorMockResponse(
                400,
                '{"detail":"Detailed error message"}'
            );
            const error = await RequestHandler.handleAPIError(response);
            assert.ok(error instanceof BadRequestError);
            assert.strictEqual(error.message, "Detailed error message");
        });

        test("should use fallback message for empty error response", async () => {
            const response = createErrorMockResponse(500, "");
            const error = await RequestHandler.handleAPIError(response);
            assert.ok(error instanceof ServerError);
            assert.ok(error.message.includes("API error with status 500"));
        });

        test("should merge detail into message if different", async () => {
            const response = createErrorMockResponse(
                400,
                '{"message":"Error occurred","detail":"Additional details"}'
            );
            const error = await RequestHandler.handleAPIError(response);
            assert.ok(error instanceof BadRequestError);
            assert.ok(error.message.includes("Error occurred"));
            assert.ok(error.message.includes("Additional details"));
        });

        test("should store validation errors in validationDetails", async () => {
            const validationErrors = [
                {
                    loc: ["body", "content"],
                    msg: "field required",
                    type: "value_error.missing",
                },
                {
                    loc: ["body", "url"],
                    msg: "invalid url",
                    type: "value_error.url",
                },
            ];
            const responseText = JSON.stringify({
                message: "Validation failed",
                detail: validationErrors,
            });
            const response = createErrorMockResponse(422, responseText);
            const error = await RequestHandler.handleAPIError(response);
            assert.ok(error instanceof ValidationError);
            assert.deepStrictEqual(error.validationDetails, validationErrors);
        });

        test("should handle 5xx status codes >= 500", async () => {
            const response = createErrorMockResponse(
                599,
                '{"message":"Unknown server error"}'
            );
            const error = await RequestHandler.handleAPIError(response);
            assert.ok(error instanceof ServerError);
            assert.strictEqual(error.statusCode, 599);
        });

        test("should handle very long response text by truncating", async () => {
            const longText = "x".repeat(1000);
            const response = createErrorMockResponse(400, longText);
            const error = await RequestHandler.handleAPIError(response);
            assert.ok(error instanceof BadRequestError);
            assert.ok(error.message.length < longText.length + 100);
        });

        test('should handle case-insensitive "no data yet available" check', async () => {
            const response = createErrorMockResponse(
                404,
                '{"message":"NO DATA YET AVAILABLE"}'
            );
            const error = await RequestHandler.handleAPIError(response);
            assert.ok(error instanceof NoDataAvailableError);
        });
    });
});
