/**
 * Neuwo API SDK for JavaScript/TypeScript.
 *
 * This SDK provides convenient access to Neuwo's REST and EDGE APIs for
 * AI-powered content tagging, brand safety analysis, and similarity detection.
 */

// Export clients
export { NeuwoEdgeClient } from "./edge-client.js";
export { NeuwoRestClient } from "./rest-client.js";

// Export models
export {
    Article,
    BrandSafetyTag,
    GetAiTopicsResponse,
    MarketingCategories,
    SimilarArticle,
    SmartTag,
    Tag,
    TagParent,
    TaxonomyArticle,
    TrainingTag,
} from "./models.js";

// Export utility functions
export { formatDate } from "./utils.js";

// Export parameter interfaces
export type {
    EdgeGetAiTopicsParams,
    EdgeGetAiTopicsWaitParams,
    GetAiTopicsParams,
    GetSimilarParams,
    TrainAiTopicsParams,
    UpdateArticleParams,
} from "./types.js";

// Export errors
export {
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
    ValueError,
} from "./errors.js";

// Export logger utilities
export {
    disableLogger,
    enableLogger,
    LogLevel,
    setupLogger,
} from "./logger.js";
