/**
 * EDGE API client for Neuwo API.
 *
 * This module provides a client for analysis where content is identified by URL (websites).
 */

import {
    ContentNotAvailableError,
    NoDataAvailableError,
    ValueError,
} from "./errors.js";
import { logger } from "./logger.js";
import {
    ApiGetAiTopicsListItem,
    ApiGetAiTopicsResponse,
    GetAiTopicsResponse,
    SimilarArticle,
} from "./models.js";
import type {
    EdgeGetAiTopicsListParams,
    EdgeGetAiTopicsParams,
    EdgeGetAiTopicsWaitParams,
    EdgeGetSimilarParams,
} from "./types.js";
import {
    parseJsonResponse,
    prepareUrlListFile,
    RequestHandler,
    sleep,
    validateUrl,
} from "./utils.js";

/**
 * Client for Neuwo EDGE API endpoints.
 *
 * EDGE endpoints operate over standard HTTP methods and use an EDGE API token passed as a query parameter.
 * EDGE endpoints are designed for client-side integration where content is identified by URL.
 * The EDGE API serves publishers who want to enrich the data of published articles.
 */
export class NeuwoEdgeClient {
    private static readonly DEFAULT_TIMEOUT = 60;

    private readonly requestHandler: RequestHandler;
    private readonly defaultOrigin?: string;

    /**
     * Initialise the EDGE API client.
     *
     * @param config - Client configuration
     * @param config.token - EDGE API authentication token
     * @param config.baseUrl - Base URL for the API server
     * @param config.timeout - Request timeout in seconds (default: 60)
     * @param config.defaultOrigin - Default origin header for requests
     */
    constructor(config: {
        token: string;
        baseUrl: string;
        timeout?: number;
        defaultOrigin?: string;
    }) {
        if (!config.token || typeof config.token !== "string") {
            throw new ValueError("Token must be a non-empty string");
        }

        if (!config.baseUrl || typeof config.baseUrl !== "string") {
            throw new ValueError("Base URL must be a non-empty string");
        }

        const token = config.token.trim();
        const baseUrl = config.baseUrl.trim().replace(/\/$/, "");
        const timeout = config.timeout || NeuwoEdgeClient.DEFAULT_TIMEOUT;

        this.requestHandler = new RequestHandler(token, baseUrl, timeout);
        this.defaultOrigin = config.defaultOrigin;

        logger.info(`Initialised NeuwoEdgeClient with base URL: ${baseUrl}`);
    }

    /**
     * Retrieve AI-generated tags for a URL (raw response).
     *
     * Returns the raw HTTP response without parsing.
     *
     * @returns Raw HTTP Response object
     * @throws {ValidationError} If URL is invalid
     * @throws {AuthenticationError} If token is invalid
     * @throws {ForbiddenError} If token lacks permissions
     * @throws {NoDataAvailableError} If URL hasn't been processed yet
     * @throws {ContentNotAvailableError} If tagging could not be created
     * @throws {NeuwoAPIError} For other API errors
     */
    async getAiTopicsRaw(params: EdgeGetAiTopicsParams): Promise<Response> {
        validateUrl(params.url);

        const queryParams = {
            url: params.url,
        };

        const headers: Record<string, string> = {};
        const origin = params.origin || this.defaultOrigin;
        if (origin) {
            headers.Origin = origin;
        }

        logger.info(`Getting AI topics for URL: ${params.url}`);

        return this.requestHandler.request({
            method: "GET",
            endpoint: "/edge/GetAiTopics",
            params: queryParams,
            headers: Object.keys(headers).length > 0 ? headers : undefined,
        });
    }

    /**
     * Retrieve AI-generated tags and classifications for a URL.
     *
     * If the URL has been processed by the Neuwo crawler, returns tags, brand safety,
     * marketing categories (IAB Content Taxonomy, IAB Audience Taxonomy, Google Topics),
     * and smart tags for the article.
     *
     * When called for the first time with a specific URL or if the URL is still in the
     * queue being processed, raises NoDataAvailableError (the URL is queued for
     * processing, which typically takes 10-60 seconds).
     *
     * @returns GetAiTopicsResponse object containing tags, brand safety, marketing categories, and smart tags
     * @throws {ValidationError} If URL is invalid
     * @throws {AuthenticationError} If token is invalid
     * @throws {ForbiddenError} If token lacks permissions
     * @throws {NoDataAvailableError} If URL hasn't been processed yet
     * @throws {ContentNotAvailableError} If tagging could not be created
     * @throws {NeuwoAPIError} For other API errors
     */
    async getAiTopics(
        params: EdgeGetAiTopicsParams
    ): Promise<GetAiTopicsResponse> {
        const response = await this.getAiTopicsRaw(params);
        const data = await parseJsonResponse(response);
        const result = GetAiTopicsResponse.fromApiResponse(
            data as unknown as ApiGetAiTopicsResponse
        );

        logger.info(
            `Retrieved ${result.tags.length} tags and ${result.smartTags.length} smart tags`
        );

        return result;
    }

    /**
     * Retrieve AI-generated tags for a URL with automatic retry on 404.
     *
     * This method automatically handles the case when a URL hasn't been processed yet.
     * It will wait and retry multiple times until the data is available or max retries
     * is reached. Typically processing takes 10-60 seconds for new URLs.
     *
     * @returns GetAiTopicsResponse object containing tags, brand safety, marketing categories, and smart tags
     * @throws {ValidationError} If URL is invalid
     * @throws {AuthenticationError} If token is invalid
     * @throws {ForbiddenError} If token lacks permissions
     * @throws {NoDataAvailableError} If data not available after max retries
     * @throws {ContentNotAvailableError} If tagging could not be created
     * @throws {NeuwoAPIError} For other API errors
     */
    async getAiTopicsWait(
        params: EdgeGetAiTopicsWaitParams
    ): Promise<GetAiTopicsResponse> {
        const maxRetries = params.maxRetries ?? 10;
        const retryInterval = params.retryInterval ?? 6;
        const initialDelay = params.initialDelay ?? 2;

        logger.info(
            `Will retry up to ${maxRetries} times with ${retryInterval}s interval`
        );

        // Initial delay to give the system time to queue the request
        if (initialDelay > 0) {
            logger.info(
                `Initial delay of ${initialDelay}s before first request`
            );
            await sleep(initialDelay * 1000);
        }

        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                logger.info(
                    `Attempt ${attempt + 1}/${maxRetries + 1} to get AI topics`
                );
                return await this.getAiTopics({
                    url: params.url,
                    origin: params.origin,
                });
            } catch (error) {
                if (error instanceof NoDataAvailableError) {
                    // Handle 404 "No data yet available" error
                    logger.debug(
                        `Attempt ${attempt + 1}/${maxRetries + 1}: Data not yet available`
                    );

                    if (attempt >= maxRetries) {
                        logger.error(
                            `Max retries (${maxRetries}) reached, giving up`
                        );
                        throw new NoDataAvailableError(
                            `Data not available after ${maxRetries + 1} attempts (${maxRetries * retryInterval + initialDelay}s total). ` +
                                `The URL may still be processing or unavailable.`
                        );
                    }

                    // Wait before retrying
                    logger.info(
                        `Waiting ${retryInterval}s before retry ${attempt + 2}/${maxRetries + 1}...`
                    );
                    await sleep(retryInterval * 1000);
                } else if (error instanceof ContentNotAvailableError) {
                    // Tagging could not be created - this is a permanent error, don't retry
                    logger.error(`Content not available: ${error.message}`);
                    throw error;
                } else {
                    throw error;
                }
            }
        }

        // Should not reach here, but just in case
        throw new NoDataAvailableError(
            `Failed to get data for URL: ${params.url}`
        );
    }

    /**
     * Retrieve AI-generated tags for multiple URLs (raw response).
     *
     * Returns the raw HTTP response without parsing.
     *
     * @returns Raw HTTP Response object
     * @throws {ValidationError} If URLs are invalid
     * @throws {AuthenticationError} If token is invalid
     * @throws {ForbiddenError} If token lacks permissions
     * @throws {NeuwoAPIError} For other API errors
     */
    async getAiTopicsListRaw(
        params: EdgeGetAiTopicsListParams
    ): Promise<Response> {
        let fileContent: ArrayBuffer;

        if (Array.isArray(params.urls)) {
            fileContent = prepareUrlListFile(params.urls);
            logger.info(`Getting AI topics for ${params.urls.length} URLs`);
        } else {
            fileContent = params.urls;
            logger.info("Getting AI topics for URL list");
        }

        const files = {
            urllist: {
                filename: "urllist.txt",
                content: fileContent,
                contentType: "text/plain",
            },
        };

        const headers: Record<string, string> = {};
        const origin = params.origin || this.defaultOrigin;
        if (origin) {
            headers.Origin = origin;
        }

        return this.requestHandler.request({
            method: "POST",
            endpoint: "/edge/GetAiTopicsList",
            files,
            headers: Object.keys(headers).length > 0 ? headers : undefined,
        });
    }

    /**
     * Retrieve AI-generated tags and classifications for multiple URLs.
     *
     * Accepts a list of URLs and returns AI-generated tag classifications for each URL
     * that has been processed by the Neuwo crawler. If one or more URLs have not been
     * processed, the response will include results only for previously analysed URLs.
     * Unprocessed URLs are queued for crawling and will be available in subsequent
     * requests after processing completes (typically 5-10 seconds per URL).
     *
     * Note: Individual URLs that have errors (e.g., tagging not created) will raise
     * ContentNotAvailableError during parsing. This method only returns successfully
     * analysed URLs.
     *
     * @returns Array of GetAiTopicsResponse objects for successfully processed URLs
     * @throws {ValidationError} If URLs are invalid
     * @throws {AuthenticationError} If token is invalid
     * @throws {ForbiddenError} If token lacks permissions
     * @throws {ContentNotAvailableError} If a URL has tagging errors
     * @throws {NeuwoAPIError} For other API errors
     */
    async getAiTopicsList(
        params: EdgeGetAiTopicsListParams
    ): Promise<GetAiTopicsResponse[]> {
        const response = await this.getAiTopicsListRaw(params);
        const data = await parseJsonResponse(response);

        if (!Array.isArray(data)) {
            logger.warning(`Expected array response, got: ${typeof data}`);
            return [];
        }

        const results: GetAiTopicsResponse[] = [];
        for (const item of data) {
            // Type guard to check if item is an error response
            const typedItem = item as ApiGetAiTopicsListItem;

            if (
                typeof typedItem === "object" &&
                typedItem !== null &&
                "error" in typedItem
            ) {
                // TypeScript now knows this has error and url properties
                logger.warning(
                    `Error for URL ${typedItem.url}: ${typedItem.error}`
                );
                throw new ContentNotAvailableError(
                    typedItem.error,
                    typedItem.url
                );
            }

            // TypeScript now knows this is ApiGetAiTopicsResponse
            results.push(GetAiTopicsResponse.fromApiResponse(typedItem));
        }

        logger.info(`Retrieved results for ${results.length} URLs`);

        return results;
    }

    /**
     * Find similar articles by URL (raw response).
     *
     * Returns the raw HTTP response without parsing.
     *
     * @returns Raw HTTP Response object
     * @throws {ValidationError} If URL is invalid
     * @throws {AuthenticationError} If token is invalid
     * @throws {ForbiddenError} If token lacks permissions
     * @throws {NeuwoAPIError} For other API errors
     */
    async getSimilarRaw(params: EdgeGetSimilarParams): Promise<Response> {
        validateUrl(params.documentUrl);

        const queryParams: Record<string, string | number | string[]> = {
            document_url: params.documentUrl,
        };

        if (params.maxRows !== undefined) {
            queryParams.max_rows = params.maxRows;
        }
        if (params.pastDays !== undefined) {
            queryParams.past_days = params.pastDays;
        }
        if (params.publicationIds !== undefined) {
            queryParams.publicationid = params.publicationIds;
        }

        const headers: Record<string, string> = {};
        const origin = params.origin || this.defaultOrigin;
        if (origin) {
            headers.Origin = origin;
        }

        logger.info(`Getting similar articles for URL: ${params.documentUrl}`);

        return this.requestHandler.request({
            method: "GET",
            endpoint: "/edge/GetSimilar",
            params: queryParams,
            headers: Object.keys(headers).length > 0 ? headers : undefined,
        });
    }

    /**
     * Find articles similar to the specified document URL.
     *
     * Returns a list of similar articles with metadata including articleID, headline,
     * articleURL, imageURL, similarity score, publication date, and publication ID.
     *
     * @returns Array of SimilarArticle objects with article metadata and similarity scores
     * @throws {ValidationError} If URL is invalid
     * @throws {AuthenticationError} If token is invalid
     * @throws {ForbiddenError} If token lacks permissions
     * @throws {NeuwoAPIError} For other API errors
     */
    async getSimilar(params: EdgeGetSimilarParams): Promise<SimilarArticle[]> {
        const response = await this.getSimilarRaw(params);
        const data = await parseJsonResponse(response);

        if (!Array.isArray(data)) {
            logger.warning(`Expected array response, got: ${typeof data}`);
            return [];
        }

        const similarArticles = data.map((item) =>
            SimilarArticle.fromApiResponse(item)
        );

        logger.info(`Found ${similarArticles.length} similar articles`);

        return similarArticles;
    }
}
