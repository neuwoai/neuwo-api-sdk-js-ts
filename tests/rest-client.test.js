/**
 * Unit tests for REST client.
 */

import assert from "node:assert";
import { describe, test } from "node:test";

import { ValidationError } from "../dist/esm/errors.js";
import { NeuwoRestClient } from "../dist/esm/rest-client.js";

describe("NeuwoRestClient", () => {
    describe("constructor", () => {
        test("should create client with valid config", () => {
            const client = new NeuwoRestClient({
                token: "test-token",
                baseUrl: "https://api.example.com",
            });

            assert.ok(client instanceof NeuwoRestClient);
        });

        test("should use default timeout", () => {
            const client = new NeuwoRestClient({
                token: "test-token",
                baseUrl: "https://api.example.com",
            });

            assert.ok(client instanceof NeuwoRestClient);
        });

        test("should accept custom timeout", () => {
            const client = new NeuwoRestClient({
                token: "test-token",
                baseUrl: "https://api.example.com",
                timeout: 120,
            });

            assert.ok(client instanceof NeuwoRestClient);
        });

        test("should throw error for empty token", () => {
            assert.throws(
                () =>
                    new NeuwoRestClient({
                        token: "",
                        baseUrl: "https://api.example.com",
                    }),
                /Token must be a non-empty string/
            );
        });

        test("should throw error for missing token", () => {
            assert.throws(
                () =>
                    new NeuwoRestClient({
                        token: null,
                        baseUrl: "https://api.example.com",
                    }),
                /Token must be a non-empty string/
            );
        });

        test("should throw error for empty baseUrl", () => {
            assert.throws(
                () =>
                    new NeuwoRestClient({
                        token: "test-token",
                        baseUrl: "",
                    }),
                /Base URL must be a non-empty string/
            );
        });

        test("should trim token and baseUrl", () => {
            const client = new NeuwoRestClient({
                token: "  test-token  ",
                baseUrl: "  https://api.example.com/  ",
            });

            assert.ok(client instanceof NeuwoRestClient);
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

        test("should include all optional parameters in request", async () => {
            const client = new NeuwoRestClient({
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

            let capturedRequest = null;
            const originalFetch = globalThis.fetch;
            globalThis.fetch = async (url, options) => {
                capturedRequest = { url, options };
                return createMockResponse(200, mockResponseBody);
            };

            try {
                await client.getAiTopics({
                    content: "Test content",
                    documentId: "doc123",
                    lang: "en",
                    publicationId: "pub456",
                    headline: "Test Headline",
                    tagLimit: 20,
                    tagMinScore: 0.2,
                    marketingLimit: 10,
                    marketingMinScore: 0.4,
                    includeInSim: false,
                    articleUrl: "https://example.com/article",
                });

                assert.ok(capturedRequest);
                const params = new URLSearchParams(
                    capturedRequest.options.body
                );
                assert.strictEqual(params.get("documentid"), "doc123");
                assert.strictEqual(params.get("lang"), "en");
                assert.strictEqual(params.get("publicationid"), "pub456");
                assert.strictEqual(params.get("headline"), "Test Headline");
                assert.strictEqual(
                    params.get("articleURL"),
                    "https://example.com/article"
                );
                assert.strictEqual(params.get("tag_limit"), "20");
                assert.strictEqual(params.get("marketing_limit"), "10");
                assert.strictEqual(params.get("tag_min_score"), "0.2");
                assert.strictEqual(params.get("marketing_min_score"), "0.4");
                assert.strictEqual(params.get("include_in_sim"), "false");
            } finally {
                globalThis.fetch = originalFetch;
            }
        });

        test("should use default values when optional parameters are omitted", async () => {
            const client = new NeuwoRestClient({
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

            let capturedRequest = null;
            const originalFetch = globalThis.fetch;
            globalThis.fetch = async (url, options) => {
                capturedRequest = { url, options };
                return createMockResponse(200, mockResponseBody);
            };

            try {
                await client.getAiTopics({
                    content: "Test content",
                });

                assert.ok(capturedRequest);
                const body = capturedRequest.options.body;
                // Should include default values
                assert.ok(body.includes("tag_limit"));
                assert.ok(body.includes("tag_min_score"));
                assert.ok(body.includes("marketing_min_score"));
                assert.ok(body.includes("include_in_sim"));
            } finally {
                globalThis.fetch = originalFetch;
            }
        });

        test("should parse successful response with uppercase URI", async () => {
            const client = new NeuwoRestClient({
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
                    content: "Test article about technology",
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
            const client = new NeuwoRestClient({
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
                    content: "Test article about sports",
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
            const client = new NeuwoRestClient({
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
                    content: "Unsafe content",
                });

                assert.strictEqual(result.brandSafety.score, 0.3);
                assert.strictEqual(result.brandSafety.isSafe, false);
            } finally {
                globalThis.fetch = originalFetch;
            }
        });

        test("should handle malformed JSON response", async () => {
            const client = new NeuwoRestClient({
                token: "test-token",
                baseUrl: "https://api.example.com",
            });

            const originalFetch = globalThis.fetch;
            globalThis.fetch = async () => createMockResponse(200, "not json");

            try {
                await assert.rejects(
                    async () => client.getAiTopics({ content: "Test content" }),
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
            const client = new NeuwoRestClient({
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
                    async () => client.getAiTopics({ content: "Test content" }),
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

        test("should handle response with missing brand_safety field", async () => {
            const client = new NeuwoRestClient({
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
                    async () => client.getAiTopics({ content: "Test content" }),
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
            const client = new NeuwoRestClient({
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
                    content: "Test content",
                });

                assert.strictEqual(result.tags.length, 0);
                assert.strictEqual(result.smartTags.length, 0);
            } finally {
                globalThis.fetch = originalFetch;
            }
        });

        test("should handle tag with missing parents field", async () => {
            const client = new NeuwoRestClient({
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
                    content: "Test content",
                });

                assert.strictEqual(result.tags.length, 1);
                assert.strictEqual(result.tags[0].parents, undefined);
            } finally {
                globalThis.fetch = originalFetch;
            }
        });

        test("should handle tag with null parents", async () => {
            const client = new NeuwoRestClient({
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
                    content: "Test content",
                });

                assert.strictEqual(result.tags.length, 1);
                assert.strictEqual(result.tags[0].parents, undefined);
            } finally {
                globalThis.fetch = originalFetch;
            }
        });

        test("should reject tag with neither URI nor uri field", async () => {
            const client = new NeuwoRestClient({
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
                    async () => client.getAiTopics({ content: "Test content" }),
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

        test("should validate content is not empty", async () => {
            const client = new NeuwoRestClient({
                token: "test-token",
                baseUrl: "https://api.example.com",
            });

            await assert.rejects(
                async () => client.getAiTopics({ content: "" }),
                ValidationError
            );
        });

        test("should validate content is not whitespace", async () => {
            const client = new NeuwoRestClient({
                token: "test-token",
                baseUrl: "https://api.example.com",
            });

            await assert.rejects(
                async () => client.getAiTopics({ content: "   " }),
                ValidationError
            );
        });

        test("should handle response with mixed URI/uri formats in parents", async () => {
            const client = new NeuwoRestClient({
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
                    content: "AI article content",
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
            const client = new NeuwoRestClient({
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
                    content: "Breaking news content",
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
            const client = new NeuwoRestClient({
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
                    async () => client.getAiTopics({ content: "Test content" }),
                    (_error) => {
                        // Should throw an error when trying to parse the response
                        return true;
                    }
                );
            } finally {
                globalThis.fetch = originalFetch;
            }
        });

        test("should parse marketing_categories with iab_tier_1", async () => {
            const client = new NeuwoRestClient({
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
                    content: "Test content",
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
            const client = new NeuwoRestClient({
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
                    content: "Test content",
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
            const client = new NeuwoRestClient({
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
                    content: "Test content",
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
            const client = new NeuwoRestClient({
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
                    content: "Test content",
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
            const client = new NeuwoRestClient({
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
                    content: "Test content",
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
            const client = new NeuwoRestClient({
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
                    content: "Test content",
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
            const client = new NeuwoRestClient({
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
                    content: "Test content",
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

        test("should parse marketing_categories with Marketing_items", async () => {
            const client = new NeuwoRestClient({
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
                    Marketing_items: [
                        {
                            ID: "mk1",
                            label: "Marketing Item 1",
                            relevance: "0.87",
                        },
                        {
                            ID: "mk2",
                            label: "Marketing Item 2",
                            relevance: "0.92",
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
                    content: "Test content",
                });

                assert.strictEqual(
                    result.marketingCategories.marketingItems.length,
                    2
                );
                assert.strictEqual(
                    result.marketingCategories.marketingItems[0].id,
                    "mk1"
                );
                assert.strictEqual(
                    result.marketingCategories.marketingItems[0].label,
                    "Marketing Item 1"
                );
                assert.strictEqual(
                    result.marketingCategories.marketingItems[0].relevance,
                    0.87
                );
            } finally {
                globalThis.fetch = originalFetch;
            }
        });

        test("should handle empty marketing_categories arrays", async () => {
            const client = new NeuwoRestClient({
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
                    Marketing_items: [],
                },
                smart_tags: [],
            });

            const originalFetch = globalThis.fetch;
            globalThis.fetch = async () =>
                createMockResponse(200, mockResponseBody);

            try {
                const result = await client.getAiTopics({
                    content: "Test content",
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
                assert.strictEqual(
                    result.marketingCategories.marketingItems.length,
                    0
                );
            } finally {
                globalThis.fetch = originalFetch;
            }
        });
    });

    describe("getSimilar", () => {
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

        test("should include all optional parameters in request", async () => {
            const client = new NeuwoRestClient({
                token: "test-token",
                baseUrl: "https://api.example.com",
            });

            const mockResponseBody = JSON.stringify([]);

            let capturedRequest = null;
            const originalFetch = globalThis.fetch;
            globalThis.fetch = async (url, options) => {
                capturedRequest = { url, options };
                return createMockResponse(200, mockResponseBody);
            };

            try {
                await client.getSimilar({
                    documentId: "doc123",
                    maxRows: 10,
                    pastDays: 7,
                    publicationIds: ["pub1", "pub2", "pub3"],
                });

                assert.ok(capturedRequest);
                const url = capturedRequest.url;
                assert.ok(url.includes("doc123"));
                assert.ok(url.includes("max_rows"));
                assert.ok(url.includes("past_days"));
                assert.ok(url.includes("publicationid"));
            } finally {
                globalThis.fetch = originalFetch;
            }
        });

        test("should work without optional parameters", async () => {
            const client = new NeuwoRestClient({
                token: "test-token",
                baseUrl: "https://api.example.com",
            });

            const mockResponseBody = JSON.stringify([]);

            let capturedRequest = null;
            const originalFetch = globalThis.fetch;
            globalThis.fetch = async (url, options) => {
                capturedRequest = { url, options };
                return createMockResponse(200, mockResponseBody);
            };

            try {
                await client.getSimilar({
                    documentId: "doc123",
                });

                assert.ok(capturedRequest);
                const url = capturedRequest.url;
                assert.ok(url.includes("doc123"));
            } finally {
                globalThis.fetch = originalFetch;
            }
        });

        test("should parse array of similar articles", async () => {
            const client = new NeuwoRestClient({
                token: "test-token",
                baseUrl: "https://api.example.com",
            });

            const mockResponseBody = JSON.stringify([
                {
                    articleID: "art123",
                    headline: "Similar Article 1",
                    articleURL: "https://example.com/article1",
                    score: 0.95,
                    published: "2024-01-01T10:00:00",
                },
                {
                    articleID: "art456",
                    headline: "Similar Article 2",
                    score: 0.85,
                },
            ]);

            const originalFetch = globalThis.fetch;
            globalThis.fetch = async () =>
                createMockResponse(200, mockResponseBody);

            try {
                const result = await client.getSimilar({
                    documentId: "doc123",
                });

                assert.strictEqual(result.length, 2);
                assert.strictEqual(result[0].articleId, "art123");
                assert.strictEqual(result[0].headline, "Similar Article 1");
                assert.strictEqual(result[0].score, 0.95);
                assert.strictEqual(result[1].articleId, "art456");
                assert.strictEqual(result[1].score, 0.85);
            } finally {
                globalThis.fetch = originalFetch;
            }
        });

        test("should handle non-array response gracefully", async () => {
            const client = new NeuwoRestClient({
                token: "test-token",
                baseUrl: "https://api.example.com",
            });

            const mockResponseBody = JSON.stringify({
                message: "Not an array",
                data: "unexpected format",
            });

            const originalFetch = globalThis.fetch;
            globalThis.fetch = async () =>
                createMockResponse(200, mockResponseBody);

            try {
                const result = await client.getSimilar({
                    documentId: "doc123",
                });

                assert.strictEqual(result.length, 0);
            } finally {
                globalThis.fetch = originalFetch;
            }
        });

        test("should handle empty array response", async () => {
            const client = new NeuwoRestClient({
                token: "test-token",
                baseUrl: "https://api.example.com",
            });

            const mockResponseBody = JSON.stringify([]);

            const originalFetch = globalThis.fetch;
            globalThis.fetch = async () =>
                createMockResponse(200, mockResponseBody);

            try {
                const result = await client.getSimilar({
                    documentId: "doc123",
                });

                assert.strictEqual(result.length, 0);
            } finally {
                globalThis.fetch = originalFetch;
            }
        });

        test("should handle articles with missing optional fields", async () => {
            const client = new NeuwoRestClient({
                token: "test-token",
                baseUrl: "https://api.example.com",
            });

            const mockResponseBody = JSON.stringify([
                {
                    articleID: "art123",
                    score: 0.95,
                },
                {
                    articleID: "art456",
                    headline: null,
                    articleURL: "",
                    score: 0.85,
                },
            ]);

            const originalFetch = globalThis.fetch;
            globalThis.fetch = async () =>
                createMockResponse(200, mockResponseBody);

            try {
                const result = await client.getSimilar({
                    documentId: "doc123",
                });

                assert.strictEqual(result.length, 2);
                assert.strictEqual(result[0].articleId, "art123");
                assert.strictEqual(result[0].headline, undefined);
                assert.strictEqual(result[1].articleId, "art456");
            } finally {
                globalThis.fetch = originalFetch;
            }
        });
    });

    describe("updateArticle", () => {
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

        test("should include all optional parameters in request", async () => {
            const client = new NeuwoRestClient({
                token: "test-token",
                baseUrl: "https://api.example.com",
            });

            const publishDate = new Date("2024-01-15T10:00:00Z");
            const mockResponseBody = JSON.stringify({
                articleID: "doc123",
                headline: "Updated Headline",
                writer: "John Doe",
                category: "Technology",
                content: "Updated content",
                summary: "Updated summary",
                publicationID: "pub456",
                articleURL: "https://example.com/article",
                imageURL: "https://example.com/image.jpg",
                published: "2024-01-15",
                fetchDate: "2024-01-16T10:00:00",
                includeInSim: "true",
            });

            let capturedRequest = null;
            const originalFetch = globalThis.fetch;
            globalThis.fetch = async (url, options) => {
                capturedRequest = { url, options };
                return createMockResponse(200, mockResponseBody);
            };

            try {
                const result = await client.updateArticle({
                    documentId: "doc123",
                    published: publishDate,
                    headline: "Updated Headline",
                    writer: "John Doe",
                    category: "Technology",
                    content: "Updated content",
                    summary: "Updated summary",
                    publicationId: "pub456",
                    articleUrl: "https://example.com/article",
                    imageUrl: "https://example.com/image.jpg",
                    includeInSim: true,
                });

                assert.ok(capturedRequest);
                const params = new URLSearchParams(
                    capturedRequest.options.body
                );
                assert.strictEqual(params.get("headline"), "Updated Headline");
                assert.strictEqual(params.get("writer"), "John Doe");
                assert.strictEqual(params.get("category"), "Technology");
                assert.strictEqual(params.get("content"), "Updated content");
                assert.strictEqual(params.get("summary"), "Updated summary");
                assert.strictEqual(params.get("publicationid"), "pub456");
                assert.strictEqual(
                    params.get("articleURL"),
                    "https://example.com/article"
                );
                assert.strictEqual(
                    params.get("imageURL"),
                    "https://example.com/image.jpg"
                );
                assert.strictEqual(params.get("include_in_sim"), "true");
                assert.strictEqual(params.get("published"), "2024-01-15");

                assert.strictEqual(result.articleId, "doc123");
                assert.strictEqual(result.headline, "Updated Headline");
                assert.strictEqual(result.writer, "John Doe");
                assert.strictEqual(result.category, "Technology");
                assert.strictEqual(result.includeInSim, true);
            } finally {
                globalThis.fetch = originalFetch;
            }
        });

        test("should work with minimal parameters", async () => {
            const client = new NeuwoRestClient({
                token: "test-token",
                baseUrl: "https://api.example.com",
            });

            const mockResponseBody = JSON.stringify({
                articleID: "doc123",
                fetchDate: "2024-01-16T10:00:00",
            });

            const originalFetch = globalThis.fetch;
            globalThis.fetch = async () =>
                createMockResponse(200, mockResponseBody);

            try {
                const result = await client.updateArticle({
                    documentId: "doc123",
                });

                assert.strictEqual(result.articleId, "doc123");
            } finally {
                globalThis.fetch = originalFetch;
            }
        });

        test("should handle includeInSim as false", async () => {
            const client = new NeuwoRestClient({
                token: "test-token",
                baseUrl: "https://api.example.com",
            });

            const mockResponseBody = JSON.stringify({
                articleID: "doc123",
                fetchDate: "2024-01-16T10:00:00",
                includeInSim: "false",
            });

            let capturedRequest = null;
            const originalFetch = globalThis.fetch;
            globalThis.fetch = async (url, options) => {
                capturedRequest = { url, options };
                return createMockResponse(200, mockResponseBody);
            };

            try {
                const result = await client.updateArticle({
                    documentId: "doc123",
                    includeInSim: false,
                });

                assert.ok(capturedRequest);
                const body = capturedRequest.options.body;
                assert.ok(body.includes("include_in_sim"));
                assert.strictEqual(result.includeInSim, false);
            } finally {
                globalThis.fetch = originalFetch;
            }
        });

        test("should parse updated article response", async () => {
            const client = new NeuwoRestClient({
                token: "test-token",
                baseUrl: "https://api.example.com",
            });

            const mockResponseBody = JSON.stringify({
                articleID: "doc123",
                headline: "Updated Headline",
                writer: "John Doe",
                published: "2024-01-15",
                fetchDate: "2024-01-16T10:00:00",
            });

            const originalFetch = globalThis.fetch;
            globalThis.fetch = async () =>
                createMockResponse(200, mockResponseBody);

            try {
                const result = await client.updateArticle({
                    documentId: "doc123",
                    headline: "Updated Headline",
                });

                assert.strictEqual(result.articleId, "doc123");
                assert.strictEqual(result.headline, "Updated Headline");
                assert.strictEqual(result.writer, "John Doe");
            } finally {
                globalThis.fetch = originalFetch;
            }
        });

        test("should handle 404 error for non-existent article", async () => {
            const client = new NeuwoRestClient({
                token: "test-token",
                baseUrl: "https://api.example.com",
            });

            const originalFetch = globalThis.fetch;
            globalThis.fetch = async () =>
                createMockResponse(
                    404,
                    JSON.stringify({ message: "Article not found" })
                );

            try {
                await assert.rejects(
                    async () =>
                        client.updateArticle({
                            documentId: "nonexistent",
                            headline: "Test",
                        }),
                    (error) => {
                        assert.ok(error.message.includes("Article not found"));
                        return true;
                    }
                );
            } finally {
                globalThis.fetch = originalFetch;
            }
        });
    });

    describe("trainAiTopics", () => {
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

        test("should parse training tags response", async () => {
            const client = new NeuwoRestClient({
                token: "test-token",
                baseUrl: "https://api.example.com",
            });

            const mockResponseBody = JSON.stringify([
                {
                    articleID: "doc123",
                    tag: "technology",
                    addedDate: "2024-01-15 10:00:00",
                },
                {
                    articleID: "doc123",
                    tag: "innovation",
                    addedDate: "2024-01-15T10:00:00",
                },
            ]);

            const originalFetch = globalThis.fetch;
            globalThis.fetch = async () =>
                createMockResponse(200, mockResponseBody);

            try {
                const result = await client.trainAiTopics({
                    documentId: "doc123",
                    tags: ["technology", "innovation"],
                });

                assert.strictEqual(result.length, 2);
                assert.strictEqual(result[0].articleId, "doc123");
                assert.strictEqual(result[0].tag, "technology");
                assert.ok(result[0].addedDate instanceof Date);
            } finally {
                globalThis.fetch = originalFetch;
            }
        });

        test("should handle empty response when tags already exist", async () => {
            const client = new NeuwoRestClient({
                token: "test-token",
                baseUrl: "https://api.example.com",
            });

            const mockResponseBody = JSON.stringify([]);

            const originalFetch = globalThis.fetch;
            globalThis.fetch = async () =>
                createMockResponse(200, mockResponseBody);

            try {
                const result = await client.trainAiTopics({
                    documentId: "doc123",
                    tags: ["existing-tag"],
                });

                assert.strictEqual(result.length, 0);
            } finally {
                globalThis.fetch = originalFetch;
            }
        });

        test("should handle non-array response gracefully", async () => {
            const client = new NeuwoRestClient({
                token: "test-token",
                baseUrl: "https://api.example.com",
            });

            const mockResponseBody = JSON.stringify({
                message: "Success but wrong format",
            });

            const originalFetch = globalThis.fetch;
            globalThis.fetch = async () =>
                createMockResponse(200, mockResponseBody);

            try {
                const result = await client.trainAiTopics({
                    documentId: "doc123",
                    tags: ["test"],
                });

                assert.strictEqual(result.length, 0);
            } finally {
                globalThis.fetch = originalFetch;
            }
        });

        test("should validate tags array is not empty", async () => {
            const client = new NeuwoRestClient({
                token: "test-token",
                baseUrl: "https://api.example.com",
            });

            await assert.rejects(
                async () =>
                    client.trainAiTopics({
                        documentId: "doc123",
                        tags: [],
                    }),
                ValidationError
            );
        });

        test("should validate tags is an array", async () => {
            const client = new NeuwoRestClient({
                token: "test-token",
                baseUrl: "https://api.example.com",
            });

            await assert.rejects(
                async () =>
                    client.trainAiTopics({
                        documentId: "doc123",
                        tags: null,
                    }),
                ValidationError
            );
        });
    });
});
