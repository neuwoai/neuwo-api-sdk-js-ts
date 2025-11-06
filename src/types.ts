/**
 * Type definitions for Neuwo API SDK request parameters.
 *
 * This module contains all parameter interfaces for REST and EDGE client methods.
 */

// ============================================================================
// REST Client Parameter Interfaces
// ============================================================================

/**
 * Parameters for getAiTopics REST endpoint.
 */
export interface GetAiTopicsParams {
    /** Text content to analyse (required) */
    content: string;
    /** Unique identifier for the document/article */
    documentId?: string;
    /** ISO 639-1 language code */
    lang?: string;
    /** Publication identifier */
    publicationId?: string;
    /** Article headline */
    headline?: string;
    /** Maximum number of tags (max 25, default: 15) */
    tagLimit?: number;
    /** Minimum score threshold for tags (default: 0.1) */
    tagMinScore?: number;
    /** Maximum number of marketing categories */
    marketingLimit?: number;
    /** Minimum score threshold for marketing categories (default: 0.3) */
    marketingMinScore?: number;
    /** Whether to include in similarity model (default: true) */
    includeInSim?: boolean;
    /** URL of the article */
    articleUrl?: string;
}

/**
 * Parameters for getSimilar REST endpoint.
 */
export interface GetSimilarParams {
    /** Unique identifier of the document/article (required) */
    documentId: string;
    /** Limit how many similar articles are returned */
    maxRows?: number;
    /** Limit search by ignoring articles older than specified days */
    pastDays?: number;
    /** List of publication IDs to filter results */
    publicationIds?: string[];
}

/**
 * Parameters for updateArticle REST endpoint.
 */
export interface UpdateArticleParams {
    /** Unique identifier of the document/article (required) */
    documentId: string;
    /** Date when article was published */
    published?: Date;
    /** Headline of the article */
    headline?: string;
    /** Writer of the article */
    writer?: string;
    /** Category of the article */
    category?: string;
    /** Article content */
    content?: string;
    /** Article summary */
    summary?: string;
    /** Publication identifier */
    publicationId?: string;
    /** URL of the article */
    articleUrl?: string;
    /** URL of the main image (deprecated) */
    imageUrl?: string;
    /** Whether article is included in similarity model */
    includeInSim?: boolean;
}

/**
 * Parameters for trainAiTopics REST endpoint.
 */
export interface TrainAiTopicsParams {
    /** Unique identifier of the document/article (required) */
    documentId: string;
    /** List of training tag values to add to the article (required) */
    tags: string[];
}

// ============================================================================
// EDGE Client Parameter Interfaces
// ============================================================================

/**
 * Parameters for getAiTopics EDGE endpoint.
 */
export interface EdgeGetAiTopicsParams {
    /** URL to analyse (required) */
    url: string;
    /** Origin header for the request */
    origin?: string;
}

/**
 * Parameters for getAiTopicsWait EDGE endpoint.
 */
export interface EdgeGetAiTopicsWaitParams {
    /** URL to analyse (required) */
    url: string;
    /** Origin header for the request */
    origin?: string;
    /** Maximum number of retry attempts (default: 10) */
    maxRetries?: number;
    /** Seconds to wait between retries (default: 6) */
    retryInterval?: number;
    /** Initial delay before first request in seconds (default: 2) */
    initialDelay?: number;
}

/**
 * Parameters for getAiTopicsList EDGE endpoint.
 */
export interface EdgeGetAiTopicsListParams {
    /** List of URLs or file content as bytes */
    urls: string[] | ArrayBuffer;
    /** Origin header for the request */
    origin?: string;
}

/**
 * Parameters for getSimilar EDGE endpoint.
 */
export interface EdgeGetSimilarParams {
    /** Article URL to find similar articles for (required) */
    documentUrl: string;
    /** Limit how many similar articles are returned */
    maxRows?: number;
    /** Limit search by ignoring articles older than specified days */
    pastDays?: number;
    /** List of publication IDs to filter results */
    publicationIds?: string[];
    /** Origin header for the request */
    origin?: string;
}

/**
 * Allowed types for request parameter and data values.
 * - Primitives: string, number, boolean
 * - Arrays: string[] for repeated query parameters
 * - Date objects (converted to strings during encoding)
 */
export type RequestValue = string | number | boolean | string[] | Date;

/**
 * HTTP request options for making API calls.
 */
export interface RequestOptions {
    /** HTTP method (GET, POST, PUT, DELETE, etc.) */
    method: string;
    /** API endpoint path */
    endpoint: string;
    /** URL query parameters */
    params?: Record<string, RequestValue>;
    /** Request body data (for POST, PUT requests) */
    data?: Record<string, RequestValue>;
    /** HTTP headers to include in the request */
    headers?: Record<string, string>;
    /** File attachments for multipart/form-data requests */
    files?: Record<
        string,
        { filename: string; content: ArrayBuffer; contentType: string }
    >;
}
