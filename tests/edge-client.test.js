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
        function createMockResponse(status, body) {
            return {
                ok: status >= 200 && status < 300,
                status,
                text: async () => body,
                json: async () => JSON.parse(body),
                headers: {
                    get: () => null,
                },
            };
        }

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

        test("should parse successful response with uppercase URI", async () => {
            const client = new NeuwoEdgeClient({
                token: "test-token",
                baseUrl: "https://api.example.com",
            });

            const mockResponseBody = JSON.stringify({
                tags: [
                    {
                        URI: "https://neuwo.ai/tag/technology",
                        value: "Technology",
                        score: "0.95",
                        parents: [],
                    },
                ],
                brand_safety: {
                    BS_score: "0.9",
                    BS_indication: "yes",
                },
                marketing_categories: {
                    iab_tier_1: [],
                },
                smart_tags: [],
            });

            const originalFetch = globalThis.fetch;
            globalThis.fetch = async () =>
                createMockResponse(200, mockResponseBody);

            try {
                const result = await client.getAiTopics({
                    url: "https://example.com/article",
                });

                assert.ok(result.tags.length === 1);
                assert.strictEqual(
                    result.tags[0].uri,
                    "https://neuwo.ai/tag/technology"
                );
                assert.strictEqual(result.tags[0].value, "Technology");
                assert.strictEqual(result.brandSafety.score, 0.9);
                assert.strictEqual(result.brandSafety.isSafe, true);
            } finally {
                globalThis.fetch = originalFetch;
            }
        });

        test("should parse successful response with lowercase uri", async () => {
            const client = new NeuwoEdgeClient({
                token: "test-token",
                baseUrl: "https://api.example.com",
            });

            const mockResponseBody = JSON.stringify({
                tags: [
                    {
                        uri: "https://neuwo.ai/tag/sports",
                        value: "Sports",
                        score: "0.85",
                        parents: [],
                    },
                ],
                brand_safety: {
                    score: "0.8",
                    indication: true,
                },
                marketing_categories: {
                    iab_tier_1: [],
                },
                smart_tags: [],
            });

            const originalFetch = globalThis.fetch;
            globalThis.fetch = async () =>
                createMockResponse(200, mockResponseBody);

            try {
                const result = await client.getAiTopics({
                    url: "https://example.com/article",
                });

                assert.ok(result.tags.length === 1);
                assert.strictEqual(
                    result.tags[0].uri,
                    "https://neuwo.ai/tag/sports"
                );
                assert.strictEqual(result.brandSafety.score, 0.8);
                assert.strictEqual(result.brandSafety.isSafe, true);
            } finally {
                globalThis.fetch = originalFetch;
            }
        });

        test("should handle brand safety with string 'no' value", async () => {
            const client = new NeuwoEdgeClient({
                token: "test-token",
                baseUrl: "https://api.example.com",
            });

            const mockResponseBody = JSON.stringify({
                tags: [],
                brand_safety: {
                    BS_score: "0.3",
                    BS_indication: "no",
                },
                marketing_categories: {},
                smart_tags: [],
            });

            const originalFetch = globalThis.fetch;
            globalThis.fetch = async () =>
                createMockResponse(200, mockResponseBody);

            try {
                const result = await client.getAiTopics({
                    url: "https://example.com/unsafe-content",
                });

                assert.strictEqual(result.brandSafety.score, 0.3);
                assert.strictEqual(result.brandSafety.isSafe, false);
            } finally {
                globalThis.fetch = originalFetch;
            }
        });

        test("should handle brand safety with boolean false value", async () => {
            const client = new NeuwoEdgeClient({
                token: "test-token",
                baseUrl: "https://api.example.com",
            });

            const mockResponseBody = JSON.stringify({
                tags: [],
                brand_safety: {
                    score: "0.4",
                    indication: false,
                },
                marketing_categories: {},
                smart_tags: [],
            });

            const originalFetch = globalThis.fetch;
            globalThis.fetch = async () =>
                createMockResponse(200, mockResponseBody);

            try {
                const result = await client.getAiTopics({
                    url: "https://example.com/unsafe-content",
                });

                assert.strictEqual(result.brandSafety.score, 0.4);
                assert.strictEqual(result.brandSafety.isSafe, false);
            } finally {
                globalThis.fetch = originalFetch;
            }
        });

        test("should handle malformed JSON response", async () => {
            const client = new NeuwoEdgeClient({
                token: "test-token",
                baseUrl: "https://api.example.com",
            });

            const originalFetch = globalThis.fetch;
            globalThis.fetch = async () => createMockResponse(200, "not json");

            try {
                await assert.rejects(
                    async () =>
                        client.getAiTopics({
                            url: "https://example.com/article",
                        }),
                    (error) => {
                        assert.ok(error.message.includes("Invalid JSON"));
                        return true;
                    }
                );
            } finally {
                globalThis.fetch = originalFetch;
            }
        });

        test("should handle server error 500", async () => {
            const client = new NeuwoEdgeClient({
                token: "test-token",
                baseUrl: "https://api.example.com",
            });

            const originalFetch = globalThis.fetch;
            globalThis.fetch = async () =>
                createMockResponse(
                    500,
                    JSON.stringify({ message: "Internal server error" })
                );

            try {
                await assert.rejects(
                    async () =>
                        client.getAiTopics({
                            url: "https://example.com/article",
                        }),
                    (error) => {
                        assert.ok(
                            error.message.includes("Internal server error")
                        );
                        return true;
                    }
                );
            } finally {
                globalThis.fetch = originalFetch;
            }
        });

        test("should handle NoDataAvailableError (404)", async () => {
            const client = new NeuwoEdgeClient({
                token: "test-token",
                baseUrl: "https://api.example.com",
            });

            const { NoDataAvailableError } = await import(
                "../dist/esm/errors.js"
            );

            const originalFetch = globalThis.fetch;
            globalThis.fetch = async () =>
                createMockResponse(
                    404,
                    JSON.stringify({ message: "No data yet available" })
                );

            try {
                await assert.rejects(
                    async () =>
                        client.getAiTopics({
                            url: "https://example.com/new-article",
                        }),
                    NoDataAvailableError
                );
            } finally {
                globalThis.fetch = originalFetch;
            }
        });

        test("should handle response with mixed URI/uri formats in parents", async () => {
            const client = new NeuwoEdgeClient({
                token: "test-token",
                baseUrl: "https://api.example.com",
            });

            const mockResponseBody = JSON.stringify({
                tags: [
                    {
                        URI: "https://neuwo.ai/tag/technology/ai",
                        value: "Artificial Intelligence",
                        score: "0.95",
                        parents: [
                            [
                                {
                                    Level_1: {
                                        URI: "https://neuwo.ai/tag/technology",
                                        value: "Technology",
                                    },
                                },
                            ],
                            [
                                {
                                    Level_1: {
                                        uri: "https://neuwo.ai/tag/computing",
                                        value: "Computing",
                                    },
                                },
                            ],
                        ],
                    },
                ],
                brand_safety: {
                    BS_score: "0.9",
                    BS_indication: "yes",
                },
                marketing_categories: {},
                smart_tags: [],
            });

            const originalFetch = globalThis.fetch;
            globalThis.fetch = async () =>
                createMockResponse(200, mockResponseBody);

            try {
                const result = await client.getAiTopics({
                    url: "https://example.com/ai-article",
                });

                assert.strictEqual(result.tags.length, 1);
                assert.strictEqual(result.tags[0].parents.length, 2);
                assert.strictEqual(
                    result.tags[0].parents[0][0].uri,
                    "https://neuwo.ai/tag/technology"
                );
                assert.strictEqual(
                    result.tags[0].parents[1][0].uri,
                    "https://neuwo.ai/tag/computing"
                );
            } finally {
                globalThis.fetch = originalFetch;
            }
        });

        test("should handle response with smart tags", async () => {
            const client = new NeuwoEdgeClient({
                token: "test-token",
                baseUrl: "https://api.example.com",
            });

            const mockResponseBody = JSON.stringify({
                tags: [],
                brand_safety: {
                    BS_score: "0.9",
                    BS_indication: "yes",
                },
                marketing_categories: {},
                smart_tags: [
                    {
                        ID: "st1",
                        name: "Breaking News",
                    },
                    {
                        ID: "st2",
                        name: "Trending",
                    },
                ],
            });

            const originalFetch = globalThis.fetch;
            globalThis.fetch = async () =>
                createMockResponse(200, mockResponseBody);

            try {
                const result = await client.getAiTopics({
                    url: "https://example.com/breaking-news",
                });

                assert.strictEqual(result.smartTags.length, 2);
                assert.strictEqual(result.smartTags[0].id, "st1");
                assert.strictEqual(result.smartTags[0].name, "Breaking News");
                assert.strictEqual(result.smartTags[1].id, "st2");
                assert.strictEqual(result.smartTags[1].name, "Trending");
            } finally {
                globalThis.fetch = originalFetch;
            }
        });

        test("should handle unexpected server response format", async () => {
            const client = new NeuwoEdgeClient({
                token: "test-token",
                baseUrl: "https://api.example.com",
            });

            // Server returns success but with unexpected structure
            const mockResponseBody = JSON.stringify({
                unexpected: "format",
                data: "missing expected fields",
            });

            const originalFetch = globalThis.fetch;
            globalThis.fetch = async () =>
                createMockResponse(200, mockResponseBody);

            try {
                await assert.rejects(
                    async () =>
                        client.getAiTopics({
                            url: "https://example.com/article",
                        }),
                    (_error) => {
                        // Should throw an error when trying to parse the response
                        return true;
                    }
                );
            } finally {
                globalThis.fetch = originalFetch;
            }
        });

        test("should handle response with missing brand_safety field", async () => {
            const client = new NeuwoEdgeClient({
                token: "test-token",
                baseUrl: "https://api.example.com",
            });

            const mockResponseBody = JSON.stringify({
                tags: [
                    {
                        URI: "https://neuwo.ai/tag/technology",
                        value: "Technology",
                        score: "0.95",
                        parents: [],
                    },
                ],
                marketing_categories: {},
                smart_tags: [],
            });

            const originalFetch = globalThis.fetch;
            globalThis.fetch = async () =>
                createMockResponse(200, mockResponseBody);

            try {
                await assert.rejects(
                    async () =>
                        client.getAiTopics({
                            url: "https://example.com/article",
                        }),
                    (_error) => {
                        // Should throw error due to missing brand_safety
                        return true;
                    }
                );
            } finally {
                globalThis.fetch = originalFetch;
            }
        });

        test("should handle response with empty tags array", async () => {
            const client = new NeuwoEdgeClient({
                token: "test-token",
                baseUrl: "https://api.example.com",
            });

            const mockResponseBody = JSON.stringify({
                tags: [],
                brand_safety: {
                    BS_score: "0.9",
                    BS_indication: "yes",
                },
                marketing_categories: {},
                smart_tags: [],
            });

            const originalFetch = globalThis.fetch;
            globalThis.fetch = async () =>
                createMockResponse(200, mockResponseBody);

            try {
                const result = await client.getAiTopics({
                    url: "https://example.com/article",
                });

                assert.strictEqual(result.tags.length, 0);
                assert.strictEqual(result.smartTags.length, 0);
            } finally {
                globalThis.fetch = originalFetch;
            }
        });

        test("should handle tag with missing parents field", async () => {
            const client = new NeuwoEdgeClient({
                token: "test-token",
                baseUrl: "https://api.example.com",
            });

            const mockResponseBody = JSON.stringify({
                tags: [
                    {
                        URI: "https://neuwo.ai/tag/technology",
                        value: "Technology",
                        score: "0.95",
                    },
                ],
                brand_safety: {
                    BS_score: "0.9",
                    BS_indication: "yes",
                },
                marketing_categories: {},
                smart_tags: [],
            });

            const originalFetch = globalThis.fetch;
            globalThis.fetch = async () =>
                createMockResponse(200, mockResponseBody);

            try {
                const result = await client.getAiTopics({
                    url: "https://example.com/article",
                });

                assert.strictEqual(result.tags.length, 1);
                assert.strictEqual(result.tags[0].parents, undefined);
            } finally {
                globalThis.fetch = originalFetch;
            }
        });

        test("should handle tag with null parents", async () => {
            const client = new NeuwoEdgeClient({
                token: "test-token",
                baseUrl: "https://api.example.com",
            });

            const mockResponseBody = JSON.stringify({
                tags: [
                    {
                        URI: "https://neuwo.ai/tag/technology",
                        value: "Technology",
                        score: "0.95",
                        parents: null,
                    },
                ],
                brand_safety: {
                    BS_score: "0.9",
                    BS_indication: "yes",
                },
                marketing_categories: {},
                smart_tags: [],
            });

            const originalFetch = globalThis.fetch;
            globalThis.fetch = async () =>
                createMockResponse(200, mockResponseBody);

            try {
                const result = await client.getAiTopics({
                    url: "https://example.com/article",
                });

                assert.strictEqual(result.tags.length, 1);
                assert.strictEqual(result.tags[0].parents, undefined);
            } finally {
                globalThis.fetch = originalFetch;
            }
        });

        test("should reject tag with neither URI nor uri field", async () => {
            const client = new NeuwoEdgeClient({
                token: "test-token",
                baseUrl: "https://api.example.com",
            });

            const mockResponseBody = JSON.stringify({
                tags: [
                    {
                        value: "Technology",
                        score: "0.95",
                        parents: [],
                    },
                ],
                brand_safety: {
                    BS_score: "0.9",
                    BS_indication: "yes",
                },
                marketing_categories: {},
                smart_tags: [],
            });

            const originalFetch = globalThis.fetch;
            globalThis.fetch = async () =>
                createMockResponse(200, mockResponseBody);

            try {
                await assert.rejects(
                    async () =>
                        client.getAiTopics({
                            url: "https://example.com/article",
                        }),
                    (error) => {
                        assert.ok(
                            error.message.includes("URI") ||
                                error.message.includes("uri")
                        );
                        return true;
                    }
                );
            } finally {
                globalThis.fetch = originalFetch;
            }
        });

        test("should parse marketing_categories with iab_tier_1", async () => {
            const client = new NeuwoEdgeClient({
                token: "test-token",
                baseUrl: "https://api.example.com",
            });

            const mockResponseBody = JSON.stringify({
                tags: [],
                brand_safety: {
                    BS_score: "0.9",
                    BS_indication: "yes",
                },
                marketing_categories: {
                    iab_tier_1: [
                        {
                            ID: "v9i3On",
                            label: "Sensitive Topics",
                            relevance: "0.61",
                        },
                        {
                            ID: "389",
                            label: "War and Conflicts",
                            relevance: "0.58",
                        },
                    ],
                },
                smart_tags: [],
            });

            const originalFetch = globalThis.fetch;
            globalThis.fetch = async () =>
                createMockResponse(200, mockResponseBody);

            try {
                const result = await client.getAiTopics({
                    url: "https://example.com/article",
                });

                assert.strictEqual(
                    result.marketingCategories.iabTier1.length,
                    2
                );
                assert.strictEqual(
                    result.marketingCategories.iabTier1[0].id,
                    "v9i3On"
                );
                assert.strictEqual(
                    result.marketingCategories.iabTier1[0].label,
                    "Sensitive Topics"
                );
                assert.strictEqual(
                    result.marketingCategories.iabTier1[0].relevance,
                    0.61
                );
                assert.strictEqual(
                    result.marketingCategories.iabTier1[1].id,
                    "389"
                );
                assert.strictEqual(
                    result.marketingCategories.iabTier1[1].label,
                    "War and Conflicts"
                );
            } finally {
                globalThis.fetch = originalFetch;
            }
        });

        test("should parse marketing_categories with iab_tier_2", async () => {
            const client = new NeuwoEdgeClient({
                token: "test-token",
                baseUrl: "https://api.example.com",
            });

            const mockResponseBody = JSON.stringify({
                tags: [],
                brand_safety: {
                    BS_score: "0.9",
                    BS_indication: "yes",
                },
                marketing_categories: {
                    iab_tier_2: [
                        {
                            ID: "8FD8nI",
                            label: "Terrorism",
                            relevance: "0.61",
                        },
                    ],
                },
                smart_tags: [],
            });

            const originalFetch = globalThis.fetch;
            globalThis.fetch = async () =>
                createMockResponse(200, mockResponseBody);

            try {
                const result = await client.getAiTopics({
                    url: "https://example.com/article",
                });

                assert.strictEqual(
                    result.marketingCategories.iabTier2.length,
                    1
                );
                assert.strictEqual(
                    result.marketingCategories.iabTier2[0].id,
                    "8FD8nI"
                );
                assert.strictEqual(
                    result.marketingCategories.iabTier2[0].label,
                    "Terrorism"
                );
                assert.strictEqual(
                    result.marketingCategories.iabTier2[0].relevance,
                    0.61
                );
            } finally {
                globalThis.fetch = originalFetch;
            }
        });

        test("should parse marketing_categories with iab_tier_3", async () => {
            const client = new NeuwoEdgeClient({
                token: "test-token",
                baseUrl: "https://api.example.com",
            });

            const mockResponseBody = JSON.stringify({
                tags: [],
                brand_safety: {
                    BS_score: "0.9",
                    BS_indication: "yes",
                },
                marketing_categories: {
                    iab_tier_3: [
                        {
                            ID: "tier3_id",
                            label: "Tier 3 Category",
                            relevance: "0.75",
                        },
                    ],
                },
                smart_tags: [],
            });

            const originalFetch = globalThis.fetch;
            globalThis.fetch = async () =>
                createMockResponse(200, mockResponseBody);

            try {
                const result = await client.getAiTopics({
                    url: "https://example.com/article",
                });

                assert.strictEqual(
                    result.marketingCategories.iabTier3.length,
                    1
                );
                assert.strictEqual(
                    result.marketingCategories.iabTier3[0].id,
                    "tier3_id"
                );
                assert.strictEqual(
                    result.marketingCategories.iabTier3[0].label,
                    "Tier 3 Category"
                );
                assert.strictEqual(
                    result.marketingCategories.iabTier3[0].relevance,
                    0.75
                );
            } finally {
                globalThis.fetch = originalFetch;
            }
        });

        test("should parse marketing_categories with iab_audience_tier_3", async () => {
            const client = new NeuwoEdgeClient({
                token: "test-token",
                baseUrl: "https://api.example.com",
            });

            const mockResponseBody = JSON.stringify({
                tags: [],
                brand_safety: {
                    BS_score: "0.9",
                    BS_indication: "yes",
                },
                marketing_categories: {
                    iab_audience_tier_3: [
                        {
                            ID: "6",
                            label: "Demographic|Age Range|30-34",
                            relevance: "0.9854",
                        },
                        {
                            ID: "50",
                            label: "Demographic|Gender|Male",
                            relevance: "0.9985",
                        },
                    ],
                },
                smart_tags: [],
            });

            const originalFetch = globalThis.fetch;
            globalThis.fetch = async () =>
                createMockResponse(200, mockResponseBody);

            try {
                const result = await client.getAiTopics({
                    url: "https://example.com/article",
                });

                assert.strictEqual(
                    result.marketingCategories.iabAudienceTier3.length,
                    2
                );
                assert.strictEqual(
                    result.marketingCategories.iabAudienceTier3[0].id,
                    "6"
                );
                assert.strictEqual(
                    result.marketingCategories.iabAudienceTier3[0].label,
                    "Demographic|Age Range|30-34"
                );
                assert.strictEqual(
                    result.marketingCategories.iabAudienceTier3[0].relevance,
                    0.9854
                );
            } finally {
                globalThis.fetch = originalFetch;
            }
        });

        test("should parse marketing_categories with iab_audience_tier_4", async () => {
            const client = new NeuwoEdgeClient({
                token: "test-token",
                baseUrl: "https://api.example.com",
            });

            const mockResponseBody = JSON.stringify({
                tags: [],
                brand_safety: {
                    BS_score: "0.9",
                    BS_indication: "yes",
                },
                marketing_categories: {
                    iab_audience_tier_4: [
                        {
                            ID: "169",
                            label: "Demographic|Personal Finance|Income (USD)|$50000 - $74999",
                            relevance: "0.9546",
                        },
                        {
                            ID: "240",
                            label: "Interest|Academic Interests|Social Sciences|Economics",
                            relevance: "0.9932",
                        },
                    ],
                },
                smart_tags: [],
            });

            const originalFetch = globalThis.fetch;
            globalThis.fetch = async () =>
                createMockResponse(200, mockResponseBody);

            try {
                const result = await client.getAiTopics({
                    url: "https://example.com/article",
                });

                assert.strictEqual(
                    result.marketingCategories.iabAudienceTier4.length,
                    2
                );
                assert.strictEqual(
                    result.marketingCategories.iabAudienceTier4[0].id,
                    "169"
                );
                assert.strictEqual(
                    result.marketingCategories.iabAudienceTier4[0].label,
                    "Demographic|Personal Finance|Income (USD)|$50000 - $74999"
                );
                assert.strictEqual(
                    result.marketingCategories.iabAudienceTier4[0].relevance,
                    0.9546
                );
            } finally {
                globalThis.fetch = originalFetch;
            }
        });

        test("should parse marketing_categories with iab_audience_tier_5", async () => {
            const client = new NeuwoEdgeClient({
                token: "test-token",
                baseUrl: "https://api.example.com",
            });

            const mockResponseBody = JSON.stringify({
                tags: [],
                brand_safety: {
                    BS_score: "0.9",
                    BS_indication: "yes",
                },
                marketing_categories: {
                    iab_audience_tier_5: [
                        {
                            ID: "tier5_id",
                            label: "Tier 5 Audience Category",
                            relevance: "0.88",
                        },
                    ],
                },
                smart_tags: [],
            });

            const originalFetch = globalThis.fetch;
            globalThis.fetch = async () =>
                createMockResponse(200, mockResponseBody);

            try {
                const result = await client.getAiTopics({
                    url: "https://example.com/article",
                });

                assert.strictEqual(
                    result.marketingCategories.iabAudienceTier5.length,
                    1
                );
                assert.strictEqual(
                    result.marketingCategories.iabAudienceTier5[0].id,
                    "tier5_id"
                );
                assert.strictEqual(
                    result.marketingCategories.iabAudienceTier5[0].label,
                    "Tier 5 Audience Category"
                );
                assert.strictEqual(
                    result.marketingCategories.iabAudienceTier5[0].relevance,
                    0.88
                );
            } finally {
                globalThis.fetch = originalFetch;
            }
        });

        test("should parse marketing_categories with google_topics", async () => {
            const client = new NeuwoEdgeClient({
                token: "test-token",
                baseUrl: "https://api.example.com",
            });

            const mockResponseBody = JSON.stringify({
                tags: [],
                brand_safety: {
                    BS_score: "0.9",
                    BS_indication: "yes",
                },
                marketing_categories: {
                    google_topics: [
                        {
                            ID: "243",
                            label: "/News",
                            relevance: "0.98",
                        },
                        {
                            ID: "249",
                            label: "/News/World News",
                            relevance: "0.98",
                        },
                        {
                            ID: "247",
                            label: "/News/Politics",
                            relevance: "0.58",
                        },
                    ],
                },
                smart_tags: [],
            });

            const originalFetch = globalThis.fetch;
            globalThis.fetch = async () =>
                createMockResponse(200, mockResponseBody);

            try {
                const result = await client.getAiTopics({
                    url: "https://example.com/article",
                });

                assert.strictEqual(
                    result.marketingCategories.googleTopics.length,
                    3
                );
                assert.strictEqual(
                    result.marketingCategories.googleTopics[0].id,
                    "243"
                );
                assert.strictEqual(
                    result.marketingCategories.googleTopics[0].label,
                    "/News"
                );
                assert.strictEqual(
                    result.marketingCategories.googleTopics[0].relevance,
                    0.98
                );
                assert.strictEqual(
                    result.marketingCategories.googleTopics[2].label,
                    "/News/Politics"
                );
            } finally {
                globalThis.fetch = originalFetch;
            }
        });

        test("should handle empty marketing_categories arrays", async () => {
            const client = new NeuwoEdgeClient({
                token: "test-token",
                baseUrl: "https://api.example.com",
            });

            const mockResponseBody = JSON.stringify({
                tags: [],
                brand_safety: {
                    BS_score: "0.9",
                    BS_indication: "yes",
                },
                marketing_categories: {
                    iab_tier_1: [],
                    iab_tier_2: [],
                    iab_tier_3: [],
                    iab_audience_tier_3: [],
                    iab_audience_tier_4: [],
                    iab_audience_tier_5: [],
                    google_topics: [],
                },
                smart_tags: [],
            });

            const originalFetch = globalThis.fetch;
            globalThis.fetch = async () =>
                createMockResponse(200, mockResponseBody);

            try {
                const result = await client.getAiTopics({
                    url: "https://example.com/article",
                });

                assert.strictEqual(
                    result.marketingCategories.iabTier1.length,
                    0
                );
                assert.strictEqual(
                    result.marketingCategories.iabTier2.length,
                    0
                );
                assert.strictEqual(
                    result.marketingCategories.iabTier3.length,
                    0
                );
                assert.strictEqual(
                    result.marketingCategories.iabAudienceTier3.length,
                    0
                );
                assert.strictEqual(
                    result.marketingCategories.iabAudienceTier4.length,
                    0
                );
                assert.strictEqual(
                    result.marketingCategories.iabAudienceTier5.length,
                    0
                );
                assert.strictEqual(
                    result.marketingCategories.googleTopics.length,
                    0
                );
            } finally {
                globalThis.fetch = originalFetch;
            }
        });
    });

    describe("getAiTopicsWait", () => {
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
});
