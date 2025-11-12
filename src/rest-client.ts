/**
 * REST API client for Neuwo API.
 *
 * This module provides a client for analysis where content is provided directly as text.
 */

import { ValidationError, ValueError } from "./errors.js";
import { logger } from "./logger.js";
import {
    ApiArticle,
    ApiGetAiTopicsResponse,
    ApiSimilarArticle,
    ApiTrainingTag,
    Article,
    GetAiTopicsResponse,
    SimilarArticle,
    TrainingTag,
} from "./models.js";
import type {
    GetAiTopicsParams,
    GetSimilarParams,
    TrainAiTopicsParams,
    UpdateArticleParams,
} from "./types.js";
import {
    formatDate,
    parseJsonResponse,
    RequestHandler,
    sanitiseContent,
} from "./utils.js";

/**
 * Client for Neuwo REST API endpoints.
 *
 * REST endpoints operate over standard HTTP methods and use a REST API token passed as a query parameter.
 * REST endpoints are designed for server-side integration where content is provided directly as text.
 * The REST API serves publishers who want to enrich the data before publishing by analysing content.
 */
export class NeuwoRestClient {
    private static readonly DEFAULT_TIMEOUT = 60;

    private readonly requestHandler: RequestHandler;

    /**
     * Initialise the REST API client.
     *
     * @param config - Client configuration
     * @param config.token - REST API authentication token
     * @param config.baseUrl - Base URL for the API server
     * @param config.timeout - Request timeout in seconds (default: 60)
     */
    constructor(config: { token: string; baseUrl: string; timeout?: number }) {
        if (!config.token || typeof config.token !== "string") {
            throw new ValueError("Token must be a non-empty string");
        }

        if (!config.baseUrl || typeof config.baseUrl !== "string") {
            throw new ValueError("Base URL must be a non-empty string");
        }

        const token = config.token.trim();
        const baseUrl = config.baseUrl.trim().replace(/\/$/, "");
        const timeout = config.timeout || NeuwoRestClient.DEFAULT_TIMEOUT;

        this.requestHandler = new RequestHandler(token, baseUrl, timeout);

        logger.info(`Initialised NeuwoRestClient with base URL: ${baseUrl}`);
    }

    /**
     * Retrieve AI-generated tags (raw response).
     *
     * Returns the raw HTTP response without parsing. Useful for custom processing or debugging.
     *
     * @returns Raw HTTP Response object
     * @throws {ValueError} If content is invalid
     * @throws {ValidationError} If parameters are invalid
     * @throws {AuthenticationError} If token is invalid
     * @throws {ForbiddenError} If token lacks permissions
     * @throws {NeuwoAPIError} For other API errors
     */
    async getAiTopicsRaw(
        params: GetAiTopicsParams & { format?: string }
    ): Promise<Response> {
        params.format ||= "json";
        const content = sanitiseContent(params.content);

        const data: Record<string, string | number | boolean> = {
            content,
            format: params.format,
            tag_limit: params.tagLimit !== undefined ? params.tagLimit : 15,
            tag_min_score:
                params.tagMinScore !== undefined ? params.tagMinScore : 0.1,
            marketing_min_score:
                params.marketingMinScore !== undefined
                    ? params.marketingMinScore
                    : 0.3,
            include_in_sim:
                params.includeInSim !== undefined ? params.includeInSim : true,
        };

        if (params.documentId !== undefined) {
            data.documentid = params.documentId;
        }
        if (params.lang !== undefined) {
            data.lang = params.lang;
        }
        if (params.publicationId !== undefined) {
            data.publicationid = params.publicationId;
        }
        if (params.headline !== undefined) {
            data.headline = params.headline;
        }
        if (params.marketingLimit !== undefined) {
            data.marketing_limit = params.marketingLimit;
        }
        if (params.articleUrl !== undefined) {
            data.articleURL = params.articleUrl;
        }

        logger.info(
            `Getting AI topics for content (length: ${content.length})`
        );

        return this.requestHandler.request({
            method: "POST",
            endpoint: "/GetAiTopics",
            data,
        });
    }

    /**
     * Retrieve AI-generated tags and classifications for text content.
     *
     * Sends text content to Neuwo's REST API to obtain AI-generated tag classifications
     * including subject tags, brand safety, marketing categories (IAB taxonomies), and
     * smart tags. Optionally saves the article in the database if documentId is provided.
     *
     * @returns GetAiTopicsResponse object containing tags, brand safety, marketing categories, and smart tags
     * @throws {ValueError} If content is invalid
     * @throws {ValidationError} If parameters are invalid
     * @throws {AuthenticationError} If token is invalid
     * @throws {ForbiddenError} If token lacks permissions
     * @throws {NeuwoAPIError} For other API errors
     */
    async getAiTopics(params: GetAiTopicsParams): Promise<GetAiTopicsResponse> {
        const response = await this.getAiTopicsRaw({
            ...params,
            format: "json",
        });
        const data = await parseJsonResponse<ApiGetAiTopicsResponse>(response);
        const result = GetAiTopicsResponse.fromApiResponse(data);

        logger.info(
            `Retrieved ${result.tags.length} tags and ${result.smartTags.length} smart tags`
        );

        return result;
    }

    /**
     * Find similar articles (raw response).
     *
     * Returns the raw HTTP response without parsing.
     *
     * @returns Raw HTTP Response object
     * @throws {ValidationError} If parameters are invalid
     * @throws {AuthenticationError} If token is invalid
     * @throws {ForbiddenError} If token lacks permissions
     * @throws {NeuwoAPIError} For other API errors
     */
    async getSimilarRaw(
        params: GetSimilarParams & { format?: string }
    ): Promise<Response> {
        params.format ||= "json";

        const queryParams: Record<string, string | number | string[]> = {
            documentid: params.documentId,
            format: params.format,
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

        logger.info(
            `Getting similar articles for document: ${params.documentId}`
        );

        return this.requestHandler.request({
            method: "GET",
            endpoint: "/GetSimilar",
            params: queryParams,
        });
    }

    /**
     * Find articles similar to the specified document.
     *
     * Returns a list of similar articles with metadata including articleID, headline,
     * articleURL, imageURL, similarity score, publication date, and publication ID.
     *
     * @returns Array of SimilarArticle objects with article metadata and similarity scores
     * @throws {ValidationError} If parameters are invalid
     * @throws {AuthenticationError} If token is invalid
     * @throws {ForbiddenError} If token lacks permissions
     * @throws {NeuwoAPIError} For other API errors
     */
    async getSimilar(params: GetSimilarParams): Promise<SimilarArticle[]> {
        const response = await this.getSimilarRaw({
            ...params,
            format: "json",
        });
        const data = await parseJsonResponse<ApiSimilarArticle[]>(response);

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

    /**
     * Update article fields (raw response).
     *
     * Returns the raw HTTP response without parsing.
     *
     * @returns Raw HTTP Response object
     * @throws {ValidationError} If parameters are invalid
     * @throws {AuthenticationError} If token is invalid
     * @throws {ForbiddenError} If token lacks permissions
     * @throws {NeuwoAPIError} For other API errors
     */
    async updateArticleRaw(
        params: UpdateArticleParams & { format?: string }
    ): Promise<Response> {
        params.format ||= "json";

        const data: Record<string, string | boolean> = {
            format: params.format,
        };

        if (params.published !== undefined) {
            data.published = formatDate(params.published);
        }
        if (params.headline !== undefined) {
            data.headline = params.headline;
        }
        if (params.writer !== undefined) {
            data.writer = params.writer;
        }
        if (params.category !== undefined) {
            data.category = params.category;
        }
        if (params.content !== undefined) {
            data.content = params.content;
        }
        if (params.summary !== undefined) {
            data.summary = params.summary;
        }
        if (params.publicationId !== undefined) {
            data.publicationid = params.publicationId;
        }
        if (params.articleUrl !== undefined) {
            data.articleURL = params.articleUrl;
        }
        if (params.imageUrl !== undefined) {
            data.imageURL = params.imageUrl;
        }
        if (params.includeInSim !== undefined) {
            data.include_in_sim = params.includeInSim;
        }

        logger.info(`Updating article: ${params.documentId}`);

        return this.requestHandler.request({
            method: "PUT",
            endpoint: `/UpdateArticle/${params.documentId}`,
            data,
        });
    }

    /**
     * Update article fields in the database.
     *
     * This endpoint can only be used with articles that were assigned a documentId
     * when analysing with getAiTopics(). Only fields provided in the request
     * will be updated. Returns the updated article with all fields.
     *
     * @returns Article object with all updated fields
     * @throws {ValidationError} If parameters are invalid
     * @throws {AuthenticationError} If token is invalid
     * @throws {ForbiddenError} If token lacks permissions
     * @throws {NeuwoAPIError} For other API errors
     */
    async updateArticle(params: UpdateArticleParams): Promise<Article> {
        const response = await this.updateArticleRaw({
            ...params,
            format: "json",
        });
        const data = await parseJsonResponse<ApiArticle>(response);
        const article = Article.fromApiResponse(data);

        logger.info(`Successfully updated article: ${params.documentId}`);

        return article;
    }

    /**
     * Save training tags for an article (raw response).
     *
     * Returns the raw HTTP response without parsing.
     *
     * @returns Raw HTTP Response object
     * @throws {ValidationError} If tags array is empty or invalid
     * @throws {AuthenticationError} If token is invalid
     * @throws {ForbiddenError} If token lacks permissions
     * @throws {NeuwoAPIError} For other API errors
     */
    async trainAiTopicsRaw(
        params: TrainAiTopicsParams & { format?: string }
    ): Promise<Response> {
        params.format ||= "json";

        if (
            !params.tags ||
            !Array.isArray(params.tags) ||
            params.tags.length === 0
        ) {
            throw new ValidationError(
                "You must provide some training tag values"
            );
        }

        const data = {
            documentid: params.documentId,
            tags: params.tags,
            format: params.format,
        };

        logger.info(
            `Adding ${params.tags.length} training tags to article: ${params.documentId}`
        );

        return this.requestHandler.request({
            method: "POST",
            endpoint: "/TrainAiTopics",
            data,
        });
    }

    /**
     * Save training tags for an article.
     *
     * Saves a list of training tags for an article in the database.
     * Returns all newly added TrainingTags (tags that weren't already in the database).
     * If all tags already exist, returns an empty array.
     *
     * @returns Array of TrainingTag objects representing newly added tags
     * @throws {ValidationError} If tags array is empty or invalid
     * @throws {AuthenticationError} If token is invalid
     * @throws {ForbiddenError} If token lacks permissions
     * @throws {NeuwoAPIError} For other API errors
     */
    async trainAiTopics(params: TrainAiTopicsParams): Promise<TrainingTag[]> {
        const response = await this.trainAiTopicsRaw({
            ...params,
            format: "json",
        });
        const data = await parseJsonResponse<ApiTrainingTag[]>(response);

        if (!Array.isArray(data)) {
            logger.warning(`Expected array response, got: ${typeof data}`);
            return [];
        }

        const trainingTags = data.map((item) =>
            TrainingTag.fromApiResponse(item)
        );

        logger.info(`Added ${trainingTags.length} new training tags`);

        return trainingTags;
    }
}
