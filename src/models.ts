/**
 * Data models for Neuwo API requests and responses.
 *
 * This module defines internal API interfaces (exact API structure) and
 * exported SDK classes (JavaScript conventions) with transformation methods.
 */

// ============================================================================
// API Response Interfaces (internal - exact API structure)
// ============================================================================

// API returns parent objects with dynamic keys like: { "Level_1": { value: "...", uri: "..." } }
interface ApiTagParent {
    [key: string]: {
        value: string;
        URI?: string; // Uppercase variant
        uri?: string; // Lowercase variant
    };
}

interface ApiTag {
    URI?: string; // Uppercase variant
    uri?: string; // Lowercase variant
    value: string;
    score: string;
    parents?: ApiTagParent[][];
}

interface ApiBrandSafetyTag {
    // Uppercase variant
    BS_score?: string;
    BS_indication?: "yes" | "no";
    // Lowercase variant
    score?: string;
    indication?: boolean;
}

interface ApiTaxonomyArticle {
    ID: string;
    label: string;
    relevance: string;
}

interface ApiMarketingCategories {
    iab_tier_1?: ApiTaxonomyArticle[];
    iab_tier_2?: ApiTaxonomyArticle[];
    iab_tier_3?: ApiTaxonomyArticle[];
    iab_audience_tier_3?: ApiTaxonomyArticle[];
    iab_audience_tier_4?: ApiTaxonomyArticle[];
    iab_audience_tier_5?: ApiTaxonomyArticle[];
    google_topics?: ApiTaxonomyArticle[];
    Marketing_items?: ApiTaxonomyArticle[];
}

interface ApiSmartTag {
    ID: string;
    name: string;
}

interface ApiTrainingTag {
    articleID: string;
    tag: string;
    addedDate: string;
}

interface ApiSimilarArticle {
    articleID: string;
    headline?: string;
    articleURL?: string;
    imageURL?: string;
    score: number;
    published?: string;
    publicationID?: string;
}

/**
 * Internal API response interface for Article data.
 * Used for parsing JSON responses from the API.
 */
export interface ApiArticle {
    articleID: string;
    fetchDate: string;
    published?: string;
    headline?: string;
    writer?: string;
    category?: string;
    content?: string;
    summary?: string;
    publicationID?: string;
    articleURL?: string;
    imageURL?: string;
    includeInSim?: string | boolean;
}

/**
 * Internal API response interface for GetAiTopics endpoint.
 * Used for parsing JSON responses from the API.
 */
export interface ApiGetAiTopicsResponse {
    tags?: ApiTag[];
    brand_safety?: ApiBrandSafetyTag;
    marketing_categories?: ApiMarketingCategories;
    smart_tags?: ApiSmartTag[];
}

/**
 * API response item from GetAiTopicsList endpoint.
 * Can be either a successful response or an error response.
 */
export type ApiGetAiTopicsListItem =
    | ApiGetAiTopicsResponse
    | { error: string; url: string };

// ============================================================================
// SDK Model Classes (exported - JavaScript conventions)
// ============================================================================

/**
 * Tag parent in the ontology hierarchy.
 */
export class TagParent {
    /**
     * @param level - Hierarchy level of the parent tag
     * @param value - Display value of the parent tag
     * @param uri - URI identifier for the parent tag
     */
    constructor(
        public readonly level: string,
        public readonly value: string,
        public readonly uri: string
    ) {}

    static fromApiResponse(data: ApiTagParent): TagParent {
        // Extract the level key (e.g., "Level_1", "Level_2", etc.)
        const levelKey = Object.keys(data)[0];
        if (!levelKey) {
            throw new Error(
                "Invalid API response: TagParent must have a level key"
            );
        }

        const parentData = data[levelKey];

        // Handle both uppercase URI and lowercase uri variants
        const uri = parentData.URI ?? parentData.uri;
        if (!uri) {
            throw new Error(
                "Invalid API response: TagParent must have either URI or uri field"
            );
        }
        return new TagParent(levelKey, parentData.value, uri);
    }
}

/**
 * Subject tag with relevance score.
 */
export class Tag {
    /**
     * @param uri - URI identifier for the tag
     * @param value - Display value of the tag
     * @param score - Relevance score (0-1)
     * @param parents - Optional hierarchy of parent tags
     */
    constructor(
        public readonly uri: string,
        public readonly value: string,
        public readonly score: number,
        public readonly parents?: TagParent[][]
    ) {}

    static fromApiResponse(data: ApiTag): Tag {
        // Handle both uppercase URI and lowercase uri variants
        const uri = data.URI ?? data.uri;
        if (!uri) {
            throw new Error(
                "Invalid API response: Tag must have either URI or uri field"
            );
        }

        const parents = data.parents?.map((parentGroup) =>
            parentGroup.map((p) => TagParent.fromApiResponse(p))
        );
        return new Tag(uri, data.value, parseFloat(data.score), parents);
    }
}

/**
 * Brand safety classification.
 */
export class BrandSafetyTag {
    /**
     * @param score - Brand safety score
     * @param indication - Brand safety indication ("yes" for safe, "no" for unsafe)
     */
    constructor(
        public readonly score: number,
        public readonly indication: "yes" | "no"
    ) {}

    /**
     * Whether the content is brand safe.
     */
    get isSafe(): boolean {
        return this.indication === "yes";
    }

    static fromApiResponse(data: ApiBrandSafetyTag): BrandSafetyTag {
        // Handle both uppercase (BS_score/BS_indication) and lowercase (score/indication) variants
        let score: number;
        let indication: "yes" | "no";

        if (data.BS_score !== undefined && data.BS_indication !== undefined) {
            // Uppercase variant
            score = parseFloat(data.BS_score);
            indication = data.BS_indication;
        } else if (data.score !== undefined && data.indication !== undefined) {
            // Lowercase variant with boolean indication
            score = parseFloat(data.score);
            indication = data.indication ? "yes" : "no";
        } else {
            throw new Error(
                "Invalid API response: BrandSafetyTag must have either (BS_score, BS_indication) or (score, indication) fields"
            );
        }

        return new BrandSafetyTag(score, indication);
    }
}

/**
 * Taxonomy classification (IAB, Google Topics, etc.).
 */
export class TaxonomyArticle {
    /**
     * @param id - Unique identifier for the taxonomy category
     * @param label - Human-readable label for the category
     * @param relevance - Relevance score for this classification
     */
    constructor(
        public readonly id: string,
        public readonly label: string,
        public readonly relevance: number
    ) {}

    static fromApiResponse(data: ApiTaxonomyArticle): TaxonomyArticle {
        return new TaxonomyArticle(
            data.ID,
            data.label,
            parseFloat(data.relevance)
        );
    }
}

/**
 * Marketing categories including IAB taxonomies and Google Topics.
 */
export class MarketingCategories {
    /**
     * @param iabTier1 - IAB Content Taxonomy tier 1 categories
     * @param iabTier2 - IAB Content Taxonomy tier 2 categories
     * @param iabTier3 - IAB Content Taxonomy tier 3 categories
     * @param iabAudienceTier3 - IAB Audience Taxonomy tier 3 categories
     * @param iabAudienceTier4 - IAB Audience Taxonomy tier 4 categories
     * @param iabAudienceTier5 - IAB Audience Taxonomy tier 5 categories
     * @param googleTopics - Google Topics API classifications
     * @param marketingItems - Custom marketing category items
     */
    constructor(
        public readonly iabTier1: TaxonomyArticle[],
        public readonly iabTier2: TaxonomyArticle[],
        public readonly iabTier3: TaxonomyArticle[],
        public readonly iabAudienceTier3: TaxonomyArticle[],
        public readonly iabAudienceTier4: TaxonomyArticle[],
        public readonly iabAudienceTier5: TaxonomyArticle[],
        public readonly googleTopics: TaxonomyArticle[],
        public readonly marketingItems: TaxonomyArticle[]
    ) {}

    static fromApiResponse(data: ApiMarketingCategories): MarketingCategories {
        return new MarketingCategories(
            (data.iab_tier_1 || []).map(TaxonomyArticle.fromApiResponse),
            (data.iab_tier_2 || []).map(TaxonomyArticle.fromApiResponse),
            (data.iab_tier_3 || []).map(TaxonomyArticle.fromApiResponse),
            (data.iab_audience_tier_3 || []).map(
                TaxonomyArticle.fromApiResponse
            ),
            (data.iab_audience_tier_4 || []).map(
                TaxonomyArticle.fromApiResponse
            ),
            (data.iab_audience_tier_5 || []).map(
                TaxonomyArticle.fromApiResponse
            ),
            (data.google_topics || []).map(TaxonomyArticle.fromApiResponse),
            (data.Marketing_items || []).map(TaxonomyArticle.fromApiResponse)
        );
    }
}

/**
 * Smart tag classification.
 */
export class SmartTag {
    /**
     * @param id - Unique identifier for the smart tag
     * @param name - Display name of the smart tag
     */
    constructor(
        public readonly id: string,
        public readonly name: string
    ) {}

    static fromApiResponse(data: ApiSmartTag): SmartTag {
        return new SmartTag(data.ID, data.name);
    }
}

/**
 * Training tag for model improvement.
 */
export class TrainingTag {
    /**
     * @param articleId - Unique identifier of the article
     * @param tag - Training tag value
     * @param addedDate - Date when the training tag was added
     */
    constructor(
        public readonly articleId: string,
        public readonly tag: string,
        public readonly addedDate: Date
    ) {}

    static fromApiResponse(data: ApiTrainingTag): TrainingTag {
        return new TrainingTag(
            data.articleID,
            data.tag,
            new Date(data.addedDate.replace(" ", "T"))
        );
    }
}

/**
 * Similar article result.
 */
export class SimilarArticle {
    /**
     * @param articleId - Unique identifier of the similar article
     * @param score - Similarity score
     * @param headline - Optional article headline
     * @param articleUrl - Optional URL of the article
     * @param imageUrl - Optional URL of the article image
     * @param published - Optional publication date
     * @param publicationId - Optional publication identifier
     */
    constructor(
        public readonly articleId: string,
        public readonly score: number,
        public readonly headline?: string,
        public readonly articleUrl?: string,
        public readonly imageUrl?: string,
        public readonly published?: Date,
        public readonly publicationId?: string
    ) {}

    static fromApiResponse(data: ApiSimilarArticle): SimilarArticle {
        return new SimilarArticle(
            data.articleID,
            data.score,
            data.headline,
            data.articleURL,
            data.imageURL,
            data.published ? new Date(data.published) : undefined,
            data.publicationID
        );
    }
}

/**
 * Article metadata.
 */
export class Article {
    /**
     * @param articleId - Unique identifier of the article
     * @param fetchDate - Date when the article was fetched
     * @param published - Optional publication date
     * @param headline - Optional article headline
     * @param writer - Optional article author
     * @param category - Optional article category
     * @param content - Optional article content
     * @param summary - Optional article summary
     * @param publicationId - Optional publication identifier
     * @param articleUrl - Optional URL of the article
     * @param imageUrl - Optional URL of the article image
     * @param includeInSim - Optional flag for similarity model inclusion
     */
    constructor(
        public readonly articleId: string,
        public readonly fetchDate: Date,
        public readonly published?: Date,
        public readonly headline?: string,
        public readonly writer?: string,
        public readonly category?: string,
        public readonly content?: string,
        public readonly summary?: string,
        public readonly publicationId?: string,
        public readonly articleUrl?: string,
        public readonly imageUrl?: string,
        public readonly includeInSim?: boolean
    ) {}

    static fromApiResponse(data: ApiArticle): Article {
        return new Article(
            data.articleID,
            new Date(data.fetchDate.replace(" ", "T")),
            data.published ? new Date(data.published) : undefined,
            data.headline,
            data.writer,
            data.category,
            data.content,
            data.summary,
            data.publicationID,
            data.articleURL,
            data.imageURL,
            data.includeInSim === "true" || data.includeInSim === true
        );
    }
}

/**
 * Complete AI topics response including tags, brand safety, and marketing categories.
 */
export class GetAiTopicsResponse {
    /**
     * @param tags - List of subject tags with relevance scores
     * @param brandSafety - Brand safety classification
     * @param marketingCategories - Marketing categories including IAB and Google Topics
     * @param smartTags - List of smart tag classifications
     */
    constructor(
        public readonly tags: Tag[],
        public readonly brandSafety: BrandSafetyTag,
        public readonly marketingCategories: MarketingCategories,
        public readonly smartTags: SmartTag[]
    ) {}

    static fromApiResponse(data: ApiGetAiTopicsResponse): GetAiTopicsResponse {
        if (!data.brand_safety) {
            throw new Error("Invalid API response: missing brand_safety field");
        }

        return new GetAiTopicsResponse(
            (data.tags || []).map(Tag.fromApiResponse),
            BrandSafetyTag.fromApiResponse(data.brand_safety),
            MarketingCategories.fromApiResponse(
                data.marketing_categories || {}
            ),
            (data.smart_tags || []).map(SmartTag.fromApiResponse)
        );
    }
}
