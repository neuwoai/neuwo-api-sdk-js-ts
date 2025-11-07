/**
 * Unit tests for EDGE client.
 */

import assert from "node:assert";
import { describe, test } from "node:test";

import { NeuwoEdgeClient } from "../dist/esm/edge-client.js";
import { ValidationError } from "../dist/esm/errors.js";

describe("NeuwoEdgeClient", () => {
    describe("constructor", () => {
        test("should create client with valid config", () => {
            const client = new NeuwoEdgeClient({
                token: "test-token",
                baseUrl: "https://api.example.com",
            });

            assert.ok(client instanceof NeuwoEdgeClient);
        });

        test("should accept origin parameter", () => {
            const client = new NeuwoEdgeClient({
                token: "test-token",
                baseUrl: "https://api.example.com",
                defaultOrigin: "https://example.com",
            });

            assert.ok(client instanceof NeuwoEdgeClient);
        });

        test("should use default timeout", () => {
            const client = new NeuwoEdgeClient({
                token: "test-token",
                baseUrl: "https://api.example.com",
            });

            assert.ok(client instanceof NeuwoEdgeClient);
        });

        test("should accept custom timeout", () => {
            const client = new NeuwoEdgeClient({
                token: "test-token",
                baseUrl: "https://api.example.com",
                timeout: 120,
            });

            assert.ok(client instanceof NeuwoEdgeClient);
        });

        test("should throw error for empty token", () => {
            assert.throws(
                () =>
                    new NeuwoEdgeClient({
                        token: "",
                        baseUrl: "https://api.example.com",
                    }),
                /Token must be a non-empty string/
            );
        });

        test("should throw error for missing baseUrl", () => {
            assert.throws(
                () =>
                    new NeuwoEdgeClient({
                        token: "test-token",
                        baseUrl: null,
                    }),
                /Base URL must be a non-empty string/
            );
        });

        test("should trim token and baseUrl", () => {
            const client = new NeuwoEdgeClient({
                token: "  test-token  ",
                baseUrl: "  https://api.example.com/  ",
            });

            assert.ok(client instanceof NeuwoEdgeClient);
        });
    });

    describe("getAiTopics", () => {
        test("should validate URL format", async () => {
            const client = new NeuwoEdgeClient({
                token: "test-token",
                baseUrl: "https://api.example.com",
            });

            await assert.rejects(
                async () => client.getAiTopics({ url: "invalid-url" }),
                ValidationError
            );
        });

        test("should validate URL is not empty", async () => {
            const client = new NeuwoEdgeClient({
                token: "test-token",
                baseUrl: "https://api.example.com",
            });

            await assert.rejects(
                async () => client.getAiTopics({ url: "" }),
                ValidationError
            );
        });
    });

    describe("getAiTopicsWait", () => {
        test("should accept wait parameters", () => {
            const _client = new NeuwoEdgeClient({
                token: "test-token",
                baseUrl: "https://api.example.com",
            });

            const params = {
                url: "https://example.com/article",
                maxRetries: 5,
                retryInterval: 3,
                initialDelay: 1,
            };

            assert.ok(params.url);
            assert.strictEqual(params.maxRetries, 5);
        });

        test("should use default retry parameters when not provided", async () => {
            const client = new NeuwoEdgeClient({
                token: "test-token",
                baseUrl: "https://api.example.com",
            });

            // Mock getAiTopics to succeed on first call
            let callCount = 0;
            client.getAiTopics = async () => {
                callCount++;
                return {
                    tags: [],
                    smartTags: [],
                    brandSafety: [],
                    iabContentCategories: [],
                    iabAudienceCategories: [],
                    googleTopics: [],
                };
            };

            await client.getAiTopicsWait({
                url: "https://example.com/article",
            });

            // Should have been called once (success on first try)
            assert.strictEqual(callCount, 1);
        });

        test("should retry on NoDataAvailableError", async () => {
            const client = new NeuwoEdgeClient({
                token: "test-token",
                baseUrl: "https://api.example.com",
            });

            let callCount = 0;
            const { NoDataAvailableError } = await import(
                "../dist/esm/errors.js"
            );

            client.getAiTopics = async () => {
                callCount++;
                if (callCount < 3) {
                    throw new NoDataAvailableError("Data not yet available");
                }
                return {
                    tags: [],
                    smartTags: [],
                    brandSafety: [],
                    iabContentCategories: [],
                    iabAudienceCategories: [],
                    googleTopics: [],
                };
            };

            await client.getAiTopicsWait({
                url: "https://example.com/article",
                maxRetries: 5,
                retryInterval: 0.01, // Fast retry for testing
                initialDelay: 0,
            });

            // Should have retried until success
            assert.strictEqual(callCount, 3);
        });

        test("should throw NoDataAvailableError after max retries", async () => {
            const client = new NeuwoEdgeClient({
                token: "test-token",
                baseUrl: "https://api.example.com",
            });

            let callCount = 0;
            const { NoDataAvailableError } = await import(
                "../dist/esm/errors.js"
            );

            client.getAiTopics = async () => {
                callCount++;
                throw new NoDataAvailableError("Data not yet available");
            };

            await assert.rejects(
                async () =>
                    client.getAiTopicsWait({
                        url: "https://example.com/article",
                        maxRetries: 2,
                        retryInterval: 0.01,
                        initialDelay: 0,
                    }),
                (error) => {
                    assert(error instanceof NoDataAvailableError);
                    assert(
                        error.message.includes("not available after 3 attempts")
                    );
                    return true;
                }
            );

            // Should have tried maxRetries + 1 times (initial + retries)
            assert.strictEqual(callCount, 3);
        });

        test("should not retry on ContentNotAvailableError", async () => {
            const client = new NeuwoEdgeClient({
                token: "test-token",
                baseUrl: "https://api.example.com",
            });

            let callCount = 0;
            const { ContentNotAvailableError } = await import(
                "../dist/esm/errors.js"
            );

            client.getAiTopics = async () => {
                callCount++;
                throw new ContentNotAvailableError(
                    "Content could not be processed"
                );
            };

            await assert.rejects(
                async () =>
                    client.getAiTopicsWait({
                        url: "https://example.com/article",
                        maxRetries: 5,
                        retryInterval: 0.01,
                        initialDelay: 0,
                    }),
                ContentNotAvailableError
            );

            // Should have only tried once (no retry for permanent errors)
            assert.strictEqual(callCount, 1);
        });

        test("should not retry on AuthenticationError", async () => {
            const client = new NeuwoEdgeClient({
                token: "test-token",
                baseUrl: "https://api.example.com",
            });

            let callCount = 0;
            const { AuthenticationError } = await import(
                "../dist/esm/errors.js"
            );

            client.getAiTopics = async () => {
                callCount++;
                throw new AuthenticationError("Invalid token");
            };

            await assert.rejects(
                async () =>
                    client.getAiTopicsWait({
                        url: "https://example.com/article",
                        maxRetries: 5,
                        retryInterval: 0.01,
                        initialDelay: 0,
                    }),
                AuthenticationError
            );

            // Should have only tried once (no retry for auth errors)
            assert.strictEqual(callCount, 1);
        });

        test("should respect maxRetries parameter", async () => {
            const client = new NeuwoEdgeClient({
                token: "test-token",
                baseUrl: "https://api.example.com",
            });

            let callCount = 0;
            const { NoDataAvailableError } = await import(
                "../dist/esm/errors.js"
            );

            client.getAiTopics = async () => {
                callCount++;
                throw new NoDataAvailableError("Data not yet available");
            };

            const maxRetries = 4;
            await assert.rejects(
                async () =>
                    client.getAiTopicsWait({
                        url: "https://example.com/article",
                        maxRetries,
                        retryInterval: 0.01,
                        initialDelay: 0,
                    }),
                NoDataAvailableError
            );

            // Should have tried maxRetries + 1 times
            assert.strictEqual(callCount, maxRetries + 1);
        });

        test("should respect initialDelay parameter", async () => {
            const client = new NeuwoEdgeClient({
                token: "test-token",
                baseUrl: "https://api.example.com",
            });

            const startTime = Date.now();
            const initialDelay = 0.1; // 100ms

            client.getAiTopics = async () => {
                return {
                    tags: [],
                    smartTags: [],
                    brandSafety: [],
                    iabContentCategories: [],
                    iabAudienceCategories: [],
                    googleTopics: [],
                };
            };

            await client.getAiTopicsWait({
                url: "https://example.com/article",
                initialDelay,
                maxRetries: 0,
            });

            const elapsedTime = Date.now() - startTime;
            // Should have waited at least the initial delay
            assert(
                elapsedTime >= initialDelay * 1000 - 50,
                `Expected elapsed time >= ${initialDelay * 1000}ms, got ${elapsedTime}ms`
            );
        });

        test("should respect retryInterval parameter", async () => {
            const client = new NeuwoEdgeClient({
                token: "test-token",
                baseUrl: "https://api.example.com",
            });

            let callCount = 0;
            const retryInterval = 0.1; // 100ms
            const { NoDataAvailableError } = await import(
                "../dist/esm/errors.js"
            );

            const startTime = Date.now();

            client.getAiTopics = async () => {
                callCount++;
                if (callCount < 3) {
                    throw new NoDataAvailableError("Data not yet available");
                }
                return {
                    tags: [],
                    smartTags: [],
                    brandSafety: [],
                    iabContentCategories: [],
                    iabAudienceCategories: [],
                    googleTopics: [],
                };
            };

            await client.getAiTopicsWait({
                url: "https://example.com/article",
                maxRetries: 5,
                retryInterval,
                initialDelay: 0,
            });

            const elapsedTime = Date.now() - startTime;
            // Should have waited for 2 retries * retryInterval
            const expectedMinTime = 2 * retryInterval * 1000;
            assert(
                elapsedTime >= expectedMinTime - 50,
                `Expected elapsed time >= ${expectedMinTime}ms, got ${elapsedTime}ms`
            );
        });

        test("should skip initialDelay when set to 0", async () => {
            const client = new NeuwoEdgeClient({
                token: "test-token",
                baseUrl: "https://api.example.com",
            });

            const startTime = Date.now();

            client.getAiTopics = async () => {
                return {
                    tags: [],
                    smartTags: [],
                    brandSafety: [],
                    iabContentCategories: [],
                    iabAudienceCategories: [],
                    googleTopics: [],
                };
            };

            await client.getAiTopicsWait({
                url: "https://example.com/article",
                initialDelay: 0,
                maxRetries: 0,
            });

            const elapsedTime = Date.now() - startTime;
            // Should have minimal delay
            assert(
                elapsedTime < 50,
                `Expected minimal delay, got ${elapsedTime}ms`
            );
        });

        test("should return correct response on successful retry", async () => {
            const client = new NeuwoEdgeClient({
                token: "test-token",
                baseUrl: "https://api.example.com",
            });

            let callCount = 0;
            const { NoDataAvailableError } = await import(
                "../dist/esm/errors.js"
            );

            const expectedResponse = {
                tags: ["tag1", "tag2"],
                smartTags: ["smart1"],
                brandSafety: [],
                iabContentCategories: [],
                iabAudienceCategories: [],
                googleTopics: [],
            };

            client.getAiTopics = async () => {
                callCount++;
                if (callCount < 2) {
                    throw new NoDataAvailableError("Data not yet available");
                }
                return expectedResponse;
            };

            const result = await client.getAiTopicsWait({
                url: "https://example.com/article",
                maxRetries: 5,
                retryInterval: 0.01,
                initialDelay: 0,
            });

            assert.deepStrictEqual(result, expectedResponse);
        });

        test("should pass origin parameter to getAiTopics", async () => {
            const client = new NeuwoEdgeClient({
                token: "test-token",
                baseUrl: "https://api.example.com",
            });

            let capturedParams = null;

            client.getAiTopics = async (params) => {
                capturedParams = params;
                return {
                    tags: [],
                    smartTags: [],
                    brandSafety: [],
                    iabContentCategories: [],
                    iabAudienceCategories: [],
                    googleTopics: [],
                };
            };

            await client.getAiTopicsWait({
                url: "https://example.com/article",
                origin: "https://custom-origin.com",
                maxRetries: 0,
                initialDelay: 0,
            });

            assert.strictEqual(
                capturedParams.url,
                "https://example.com/article"
            );
            assert.strictEqual(
                capturedParams.origin,
                "https://custom-origin.com"
            );
        });

        test("should handle exactly maxRetries attempts before failing", async () => {
            const client = new NeuwoEdgeClient({
                token: "test-token",
                baseUrl: "https://api.example.com",
            });

            const attempts = [];
            const { NoDataAvailableError } = await import(
                "../dist/esm/errors.js"
            );

            client.getAiTopics = async () => {
                attempts.push(Date.now());
                throw new NoDataAvailableError("Data not yet available");
            };

            await assert.rejects(
                async () =>
                    client.getAiTopicsWait({
                        url: "https://example.com/article",
                        maxRetries: 3,
                        retryInterval: 0.01,
                        initialDelay: 0,
                    }),
                NoDataAvailableError
            );

            // Should make initial attempt + maxRetries (3) = 4 total attempts
            assert.strictEqual(attempts.length, 4);
        });

        test("should succeed on last allowed retry", async () => {
            const client = new NeuwoEdgeClient({
                token: "test-token",
                baseUrl: "https://api.example.com",
            });

            let callCount = 0;
            const maxRetries = 3;
            const { NoDataAvailableError } = await import(
                "../dist/esm/errors.js"
            );

            client.getAiTopics = async () => {
                callCount++;
                // Fail until the last possible attempt (initial + maxRetries)
                if (callCount < maxRetries + 1) {
                    throw new NoDataAvailableError("Data not yet available");
                }
                return {
                    tags: ["success"],
                    smartTags: [],
                    brandSafety: [],
                    iabContentCategories: [],
                    iabAudienceCategories: [],
                    googleTopics: [],
                };
            };

            const result = await client.getAiTopicsWait({
                url: "https://example.com/article",
                maxRetries,
                retryInterval: 0.01,
                initialDelay: 0,
            });

            assert.strictEqual(callCount, maxRetries + 1);
            assert.strictEqual(result.tags[0], "success");
        });
    });

    describe("parameter handling", () => {
        test("should accept origin override", () => {
            const _client = new NeuwoEdgeClient({
                token: "test-token",
                baseUrl: "https://api.example.com",
                defaultOrigin: "https://default.com",
            });

            const params = {
                url: "https://example.com/article",
                origin: "https://override.com",
            };

            assert.ok(params.url);
            assert.strictEqual(params.origin, "https://override.com");
        });
    });
});
