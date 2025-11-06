/**
 * Unit tests for models.
 */

import assert from "node:assert";
import { describe, test } from "node:test";

import {
    Article,
    BrandSafetyTag,
    GetAiTopicsResponse,
    MarketingCategories,
    SimilarArticle,
    SmartTag,
    Tag,
    TaxonomyArticle,
    TrainingTag,
} from "../dist/esm/models.js";

describe("Tag", () => {
    test("should create Tag from API response with uppercase URI", () => {
        const apiData = {
            URI: "tag123",
            value: "Technology",
            score: "0.95",
            parents: [[{ Level_1: { value: "Science", URI: "parent123" } }]],
        };

        const tag = Tag.fromApiResponse(apiData);

        assert.strictEqual(tag.uri, "tag123");
        assert.strictEqual(tag.value, "Technology");
        assert.strictEqual(tag.score, 0.95);
        assert.ok(Array.isArray(tag.parents));
        assert.strictEqual(tag.parents[0][0].level, "Level_1");
        assert.strictEqual(tag.parents[0][0].uri, "parent123");
    });

    test("should create Tag from API response with lowercase uri", () => {
        const apiData = {
            uri: "tag456",
            value: "Science",
            score: "0.88",
            parents: [[{ Level_1: { value: "Research", uri: "parent456" } }]],
        };

        const tag = Tag.fromApiResponse(apiData);

        assert.strictEqual(tag.uri, "tag456");
        assert.strictEqual(tag.value, "Science");
        assert.strictEqual(tag.score, 0.88);
        assert.ok(Array.isArray(tag.parents));
        assert.strictEqual(tag.parents[0][0].uri, "parent456");
    });

    test("should handle Tag without parents", () => {
        const apiData = {
            URI: "tag123",
            value: "Technology",
            score: "0.95",
        };

        const tag = Tag.fromApiResponse(apiData);

        assert.strictEqual(tag.uri, "tag123");
        assert.strictEqual(tag.parents, undefined);
    });

    test("should throw error if Tag has neither URI nor uri", () => {
        const apiData = {
            value: "Technology",
            score: "0.95",
        };

        assert.throws(
            () => Tag.fromApiResponse(apiData),
            /must have either URI or uri field/
        );
    });

    test("should handle mixed case parents (uppercase URI in parent)", () => {
        const apiData = {
            uri: "tag789",
            value: "Mixed",
            score: "0.77",
            parents: [[{ Level_1: { value: "Parent", URI: "parent789" } }]],
        };

        const tag = Tag.fromApiResponse(apiData);

        assert.strictEqual(tag.uri, "tag789");
        assert.strictEqual(tag.parents[0][0].uri, "parent789");
    });

    test("should parse real API response with multiple parent levels", () => {
        // Real API response structure from the wild
        const apiData = {
            value: "BBC",
            score: "0.84217",
            uri: "https://tags.neuwo.ai/masterID108595",
            parents: [
                [
                    {
                        Level_2: {
                            value: "Organizations",
                            uri: "https://tags.neuwo.ai/hierarchyID5-5",
                        },
                    },
                    {
                        Level_2: {
                            value: "Media",
                            uri: "https://tags.neuwo.ai/hierarchyID6-2",
                        },
                    },
                    {
                        Level_1: {
                            value: "Business & Labour",
                            uri: "https://tags.neuwo.ai/hierarchyID5",
                        },
                    },
                    {
                        Level_1: {
                            value: "Media",
                            uri: "https://tags.neuwo.ai/hierarchyID6",
                        },
                    },
                ],
            ],
        };

        const tag = Tag.fromApiResponse(apiData);

        assert.strictEqual(tag.uri, "https://tags.neuwo.ai/masterID108595");
        assert.strictEqual(tag.value, "BBC");
        assert.strictEqual(tag.score, 0.84217);
        assert.ok(Array.isArray(tag.parents));
        assert.strictEqual(tag.parents[0].length, 4);

        // Check first parent (Level_2 - Organizations)
        assert.strictEqual(tag.parents[0][0].level, "Level_2");
        assert.strictEqual(tag.parents[0][0].value, "Organizations");
        assert.strictEqual(
            tag.parents[0][0].uri,
            "https://tags.neuwo.ai/hierarchyID5-5"
        );

        // Check second parent (Level_2 - Media)
        assert.strictEqual(tag.parents[0][1].level, "Level_2");
        assert.strictEqual(tag.parents[0][1].value, "Media");

        // Check third parent (Level_1 - Business & Labour)
        assert.strictEqual(tag.parents[0][2].level, "Level_1");
        assert.strictEqual(tag.parents[0][2].value, "Business & Labour");
    });
});

describe("BrandSafetyTag", () => {
    test("should create BrandSafetyTag from API response with uppercase variant", () => {
        const apiData = {
            BS_score: "0.98",
            BS_indication: "yes",
        };

        const brandSafety = BrandSafetyTag.fromApiResponse(apiData);

        assert.strictEqual(brandSafety.score, 0.98);
        assert.strictEqual(brandSafety.indication, "yes");
        assert.strictEqual(brandSafety.isSafe, true);
    });

    test("should create BrandSafetyTag from API response with lowercase variant (boolean true)", () => {
        const apiData = {
            score: "0.92",
            indication: true,
        };

        const brandSafety = BrandSafetyTag.fromApiResponse(apiData);

        assert.strictEqual(brandSafety.score, 0.92);
        assert.strictEqual(brandSafety.indication, "yes");
        assert.strictEqual(brandSafety.isSafe, true);
    });

    test("should create BrandSafetyTag from API response with lowercase variant (boolean false)", () => {
        const apiData = {
            score: "0.35",
            indication: false,
        };

        const brandSafety = BrandSafetyTag.fromApiResponse(apiData);

        assert.strictEqual(brandSafety.score, 0.35);
        assert.strictEqual(brandSafety.indication, "no");
        assert.strictEqual(brandSafety.isSafe, false);
    });

    test("should have isSafe as false when indication is no (uppercase variant)", () => {
        const apiData = {
            BS_score: "0.45",
            BS_indication: "no",
        };

        const brandSafety = BrandSafetyTag.fromApiResponse(apiData);

        assert.strictEqual(brandSafety.isSafe, false);
    });

    test("should throw error if neither variant fields are present", () => {
        const apiData = {
            BS_score: "0.95",
        };

        assert.throws(
            () => BrandSafetyTag.fromApiResponse(apiData),
            /must have either \(BS_score, BS_indication\) or \(score, indication\)/
        );
    });

    test("should throw error if only lowercase score is present", () => {
        const apiData = {
            score: "0.95",
        };

        assert.throws(
            () => BrandSafetyTag.fromApiResponse(apiData),
            /must have either \(BS_score, BS_indication\) or \(score, indication\)/
        );
    });
});

describe("TaxonomyArticle", () => {
    test("should create TaxonomyArticle from API response", () => {
        const apiData = {
            ID: "IAB1",
            label: "Arts & Entertainment",
            relevance: "0.87",
        };

        const taxonomy = TaxonomyArticle.fromApiResponse(apiData);

        assert.strictEqual(taxonomy.id, "IAB1");
        assert.strictEqual(taxonomy.label, "Arts & Entertainment");
        assert.strictEqual(taxonomy.relevance, 0.87);
    });
});

describe("MarketingCategories", () => {
    test("should create MarketingCategories from API response", () => {
        const apiData = {
            iab_tier_1: [{ ID: "IAB1", label: "Arts", relevance: "0.9" }],
            iab_tier_2: [{ ID: "IAB1-1", label: "Books", relevance: "0.85" }],
            google_topics: [],
        };

        const categories = MarketingCategories.fromApiResponse(apiData);

        assert.strictEqual(categories.iabTier1.length, 1);
        assert.strictEqual(categories.iabTier1[0].id, "IAB1");
        assert.strictEqual(categories.iabTier2.length, 1);
        assert.strictEqual(categories.googleTopics.length, 0);
    });

    test("should handle empty MarketingCategories", () => {
        const categories = MarketingCategories.fromApiResponse({});

        assert.strictEqual(categories.iabTier1.length, 0);
        assert.strictEqual(categories.iabTier2.length, 0);
        assert.strictEqual(categories.iabTier3.length, 0);
    });
});

describe("SmartTag", () => {
    test("should create SmartTag from API response", () => {
        const apiData = {
            ID: "smart123",
            name: "Breaking News",
        };

        const smartTag = SmartTag.fromApiResponse(apiData);

        assert.strictEqual(smartTag.id, "smart123");
        assert.strictEqual(smartTag.name, "Breaking News");
    });
});

describe("TrainingTag", () => {
    test("should create TrainingTag from API response", () => {
        const apiData = {
            articleID: "article123",
            tag: "Technology",
            addedDate: "2024-01-15 10:30:45",
        };

        const trainingTag = TrainingTag.fromApiResponse(apiData);

        assert.strictEqual(trainingTag.articleId, "article123");
        assert.strictEqual(trainingTag.tag, "Technology");
        assert.ok(trainingTag.addedDate instanceof Date);
    });

    test("should handle ISO format datetime", () => {
        const apiData = {
            articleID: "article123",
            tag: "Technology",
            addedDate: "2024-01-15T10:30:45",
        };

        const trainingTag = TrainingTag.fromApiResponse(apiData);

        assert.ok(trainingTag.addedDate instanceof Date);
    });
});

describe("SimilarArticle", () => {
    test("should create SimilarArticle from API response", () => {
        const apiData = {
            articleID: "article456",
            headline: "Test Article",
            articleURL: "https://example.com/article",
            imageURL: "https://example.com/image.jpg",
            score: 0.92,
            published: "2024-01-15",
            publicationID: "pub123",
        };

        const article = SimilarArticle.fromApiResponse(apiData);

        assert.strictEqual(article.articleId, "article456");
        assert.strictEqual(article.headline, "Test Article");
        assert.strictEqual(article.articleUrl, "https://example.com/article");
        assert.strictEqual(article.score, 0.92);
        assert.ok(article.published instanceof Date);
    });

    test("should handle optional fields", () => {
        const apiData = {
            articleID: "article456",
            score: 0.92,
        };

        const article = SimilarArticle.fromApiResponse(apiData);

        assert.strictEqual(article.articleId, "article456");
        assert.strictEqual(article.headline, undefined);
        assert.strictEqual(article.published, undefined);
    });
});

describe("Article", () => {
    test("should create Article from API response", () => {
        const apiData = {
            articleID: "article789",
            fetchDate: "2024-01-15T10:30:45",
            published: "2024-01-15",
            headline: "Test Headline",
            writer: "John Doe",
            category: "Technology",
            content: "Test content",
            summary: "Test summary",
            publicationID: "pub123",
            articleURL: "https://example.com/article",
            imageURL: "https://example.com/image.jpg",
            includeInSim: "true",
        };

        const article = Article.fromApiResponse(apiData);

        assert.strictEqual(article.articleId, "article789");
        assert.ok(article.fetchDate instanceof Date);
        assert.ok(article.published instanceof Date);
        assert.strictEqual(article.headline, "Test Headline");
        assert.strictEqual(article.includeInSim, true);
    });

    test("should handle boolean includeInSim", () => {
        const apiData = {
            articleID: "article789",
            fetchDate: "2024-01-15T10:30:45",
            includeInSim: true,
        };

        const article = Article.fromApiResponse(apiData);

        assert.strictEqual(article.includeInSim, true);
    });

    test("should handle false includeInSim", () => {
        const apiData = {
            articleID: "article789",
            fetchDate: "2024-01-15T10:30:45",
            includeInSim: "false",
        };

        const article = Article.fromApiResponse(apiData);

        assert.strictEqual(article.includeInSim, false);
    });
});

describe("GetAiTopicsResponse", () => {
    test("should create GetAiTopicsResponse from API response", () => {
        const apiData = {
            tags: [
                { URI: "tag1", value: "Tech", score: "0.9" },
                { URI: "tag2", value: "Science", score: "0.8" },
            ],
            brand_safety: {
                BS_score: "0.95",
                BS_indication: "yes",
            },
            marketing_categories: {
                iab_tier_1: [{ ID: "IAB1", label: "Arts", relevance: "0.9" }],
            },
            smart_tags: [{ ID: "smart1", name: "Breaking" }],
        };

        const response = GetAiTopicsResponse.fromApiResponse(apiData);

        assert.strictEqual(response.tags.length, 2);
        assert.strictEqual(response.tags[0].value, "Tech");
        assert.strictEqual(response.brandSafety.isSafe, true);
        assert.strictEqual(response.marketingCategories.iabTier1.length, 1);
        assert.strictEqual(response.smartTags.length, 1);
    });

    test("should handle empty arrays", () => {
        const apiData = {
            brand_safety: {
                BS_score: "0.95",
                BS_indication: "yes",
            },
        };

        const response = GetAiTopicsResponse.fromApiResponse(apiData);

        assert.strictEqual(response.tags.length, 0);
        assert.strictEqual(response.smartTags.length, 0);
    });

    test("should throw error if brand_safety is missing", () => {
        const apiData = {
            tags: [],
        };

        assert.throws(
            () => GetAiTopicsResponse.fromApiResponse(apiData),
            /missing brand_safety field/
        );
    });

    test("should handle lowercase variant in tags and brand_safety", () => {
        const apiData = {
            tags: [
                { uri: "tag1", value: "Tech", score: "0.9" },
                { uri: "tag2", value: "Science", score: "0.8" },
            ],
            brand_safety: {
                score: "0.95",
                indication: true,
            },
            marketing_categories: {
                iab_tier_1: [{ ID: "IAB1", label: "Arts", relevance: "0.9" }],
            },
            smart_tags: [{ ID: "smart1", name: "Breaking" }],
        };

        const response = GetAiTopicsResponse.fromApiResponse(apiData);

        assert.strictEqual(response.tags.length, 2);
        assert.strictEqual(response.tags[0].uri, "tag1");
        assert.strictEqual(response.tags[0].value, "Tech");
        assert.strictEqual(response.brandSafety.isSafe, true);
        assert.strictEqual(response.brandSafety.indication, "yes");
        assert.strictEqual(response.marketingCategories.iabTier1.length, 1);
        assert.strictEqual(response.smartTags.length, 1);
    });

    test("should handle mixed case variants (lowercase tags with uppercase brand_safety)", () => {
        const apiData = {
            tags: [
                { uri: "tag1", value: "Tech", score: "0.9" },
                { URI: "tag2", value: "Science", score: "0.8" },
            ],
            brand_safety: {
                BS_score: "0.95",
                BS_indication: "yes",
            },
        };

        const response = GetAiTopicsResponse.fromApiResponse(apiData);

        assert.strictEqual(response.tags.length, 2);
        assert.strictEqual(response.tags[0].uri, "tag1");
        assert.strictEqual(response.tags[1].uri, "tag2");
        assert.strictEqual(response.brandSafety.isSafe, true);
    });
});
