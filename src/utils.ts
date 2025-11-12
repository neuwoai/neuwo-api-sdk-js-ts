/**
 * Utility functions and HTTP request handler for Neuwo API.
 *
 * Provides low-level HTTP communication, parameter encoding,
 * validation, and response parsing.
 */

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
} from "./errors.js";
import { logger } from "./logger.js";
import { RequestOptions, RequestValue } from "./types.js";

/**
 * Validate URL format.
 * Throws ValidationError if URL is invalid.
 *
 * @param url - URL string to validate
 * @throws {ValidationError} If URL is invalid or empty
 */
export function validateUrl(url: string): void {
    if (!url || typeof url !== "string") {
        throw new ValidationError("URL must be a non-empty string");
    }

    try {
        new URL(url);
    } catch {
        throw new ValidationError(`Invalid URL format: ${url}`);
    }
}

/**
 * Parse JSON response from API.
 * Throws ContentNotAvailableError if response contains an error field.
 *
 * @param response - Fetch API Response object
 * @returns Parsed JSON data (caller should validate/cast to expected type)
 * @throws {ContentNotAvailableError} If response contains an error field
 * @throws {Error} If response is not valid JSON
 */
export async function parseJsonResponse<T = unknown>(
    response: Response
): Promise<T> {
    const text = await response.text();

    try {
        const data = JSON.parse(text);

        // Check for error field (EDGE API specific)
        if (data.error) {
            throw new ContentNotAvailableError(data.error, data.url);
        }

        return data;
    } catch (error) {
        if (error instanceof ContentNotAvailableError) {
            throw error;
        }
        logger.error(
            `Failed to parse JSON response: ${text.substring(0, 200)}`
        );
        throw new Error(`Invalid JSON response: ${text.substring(0, 100)}`);
    }
}

/**
 * Validate and sanitise content string.
 * Throws ValidationError if content is empty or only whitespace.
 *
 * @param content - Content string to validate
 * @returns Original content if valid
 * @throws {ValidationError} If content is empty or only whitespace
 */
export function sanitiseContent(content: string): string {
    if (!content || typeof content !== "string") {
        throw new ValidationError("Content must be a non-empty string");
    }

    const trimmed = content.trim();

    if (trimmed.length === 0) {
        throw new ValidationError("Content cannot be empty or only whitespace");
    }

    return content;
}

/**
 * Sleep for specified milliseconds.
 *
 * @param ms - Number of milliseconds to sleep
 * @returns Promise that resolves after the specified time
 */
export function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Format a Date to YYYY-MM-DD string.
 *
 * @param date - Date object to format
 * @returns Formatted date string in YYYY-MM-DD format
 */
export function formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

/**
 * Request handler for making HTTP requests to Neuwo API.
 */
export class RequestHandler {
    private readonly token: string;
    private readonly baseUrl: string;
    private readonly timeout: number;

    /**
     * @param token - API authentication token
     * @param baseUrl - Base URL for API requests
     * @param timeout - Request timeout in seconds
     */
    constructor(token: string, baseUrl: string, timeout: number) {
        this.token = token;
        this.baseUrl = baseUrl;
        this.timeout = timeout;
    }

    /**
     * Build full URL with query parameters including token.
     *
     * @param endpoint - API endpoint path
     * @param params - Optional query parameters to append
     * @returns Complete URL string with token and parameters
     */
    private buildUrl(
        endpoint: string,
        params?: Record<string, RequestValue>
    ): string {
        // Ensure baseUrl ends with / and endpoint doesn't start with / for clean joining
        const base = this.baseUrl.endsWith("/")
            ? this.baseUrl
            : this.baseUrl + "/";
        const path = endpoint.startsWith("/") ? endpoint.slice(1) : endpoint;
        const url = new URL(path, base);

        // Always add token as query parameter
        url.searchParams.append("token", this.token);

        // Add additional parameters
        if (params) {
            for (const [key, value] of Object.entries(params)) {
                if (value !== undefined && value !== null) {
                    if (Array.isArray(value)) {
                        // For arrays, repeat the parameter name
                        for (const item of value) {
                            url.searchParams.append(key, String(item));
                        }
                    } else {
                        url.searchParams.append(key, String(value));
                    }
                }
            }
        }

        return url.toString();
    }

    /**
     * Encode a value for form data.
     *
     * @param value - Value to encode (string, number, boolean, Date, etc.)
     * @returns String representation of the value
     */
    private encodeValue(value: RequestValue): string {
        if (typeof value === "boolean") {
            return value ? "true" : "false";
        }
        return String(value);
    }

    /**
     * Encode data as application/x-www-form-urlencoded.
     *
     * Handles arrays by repeating the parameter name for each value.
     * For example: {tags: ['a', 'b']} becomes 'tags=a&tags=b'
     *
     * @param data - Data object to encode
     * @returns URL-encoded string
     */
    private encodeFormData(data: Record<string, RequestValue>): string {
        const params = new URLSearchParams();

        for (const [key, value] of Object.entries(data)) {
            if (value !== null && value !== undefined) {
                if (Array.isArray(value)) {
                    // Repeat parameter for each value in array
                    for (const item of value) {
                        if (item !== null && item !== undefined) {
                            params.append(key, this.encodeValue(item));
                        }
                    }
                } else {
                    params.append(key, this.encodeValue(value));
                }
            }
        }

        return params.toString();
    }

    /**
     * Handle API error responses by parsing and creating appropriate exceptions.
     *
     * Parses the error response, extracts relevant error information, and maps
     * HTTP status codes to specific exception types for better error handling.
     *
     * @param response - HTTP response object with status code >= 400
     * @returns Appropriate exception instance based on the status code and error content
     */
    public static async handleAPIError(
        response: Response
    ): Promise<NeuwoAPIError> {
        const statusCode = response.status;
        const responseText = await response.text();
        let errorData: Record<string, unknown> = {};
        let message: string | null = null;
        let detail: string | unknown | undefined;
        let validationErrors: unknown[] | undefined;

        // Try to parse response as JSON
        try {
            errorData = JSON.parse(responseText);
        } catch {
            errorData = {};
            logger.debug("Could not parse error response as JSON");
            // Store raw response text as detail for non-JSON responses
            if (responseText && responseText.length < 500) {
                detail = responseText;
            }
        }

        logger.error(
            `API error ${statusCode}: ${
                errorData && Object.keys(errorData).length > 0
                    ? JSON.stringify(errorData)
                    : responseText.slice(0, 500)
            }`
        );

        // Extract message
        if (errorData.message && typeof errorData.message === "string") {
            message = errorData.message;
        } else if (errorData.detail && typeof errorData.detail === "string") {
            message = errorData.detail;
        } else if (errorData.error && typeof errorData.error === "string") {
            message = errorData.error;
        }

        // Store detail separately if it's not used as message
        if (errorData.detail && errorData.detail !== message) {
            detail = errorData.detail;
            if (Array.isArray(detail)) {
                validationErrors = detail;
            }
        }

        // Fallback to response text if no message found
        if (!message) {
            if (responseText && responseText.length < 500) {
                message = responseText;
            } else {
                message = `API error with status ${statusCode}`;
            }
        }

        // Merge detail into message if it contains additional information
        if (detail && typeof detail === "string" && detail !== message) {
            message = `${message}: ${detail}`;
        }

        // Map status codes to specific errors
        switch (statusCode) {
            case 400:
                return new BadRequestError(message);
            case 401:
                return new AuthenticationError(message);
            case 403:
                return new ForbiddenError(message);
            case 404:
                // Check if this is "No data yet available" error
                if (message.toLowerCase().includes("no data yet available")) {
                    return new NoDataAvailableError(message);
                }
                return new NotFoundError(message);
            case 422:
                // Extract validation details if present
                if (Array.isArray(validationErrors)) {
                    return new ValidationError(message, validationErrors);
                }
                return new ValidationError(message);
            case 429: {
                // Extract retry_after from headers if present
                let retryAfter: number | undefined;
                const retryAfterHeader = response.headers.get("Retry-After");
                if (retryAfterHeader) {
                    try {
                        retryAfter = parseInt(retryAfterHeader, 10);
                    } catch {
                        logger.debug(
                            `Could not parse Retry-After header: ${retryAfterHeader}`
                        );
                    }
                }
                return new RateLimitError(message, retryAfter);
            }
            case 500:
            case 502:
            case 503:
            case 504:
                return new ServerError(message, statusCode);
            default:
                if (statusCode >= 500) {
                    return new ServerError(message, statusCode);
                }
                return new NeuwoAPIError(message, statusCode);
        }
    }

    /**
     * Make an HTTP request to the API.
     *
     * @param options - Request configuration options
     * @returns Fetch API Response object
     * @throws {NetworkError} On network failure or timeout
     * @throws {NeuwoAPIError} On API error responses
     */
    async request(options: RequestOptions): Promise<Response> {
        const { method, endpoint, params, data, headers } = options;

        // Build full URL with query parameters and token
        const url = this.buildUrl(endpoint, params);

        // Prepare headers
        const requestHeaders: Record<string, string> = {
            ...headers,
        };

        // Prepare request body
        let body: string | undefined;

        if (data && method !== "GET") {
            // Form URL encoded data
            requestHeaders["Content-Type"] =
                "application/x-www-form-urlencoded";
            body = this.encodeFormData(data);
        }

        logger.debug(`Making ${method} request to ${url}`);

        try {
            // Create abort controller for timeout
            const controller = new AbortController();
            const timeoutId = setTimeout(
                () => controller.abort(),
                this.timeout * 1000
            );

            const response = await fetch(url, {
                method,
                headers: requestHeaders,
                body,
                signal: controller.signal,
            });

            clearTimeout(timeoutId);

            logger.debug(`Response status: ${response.status}`);

            // Handle error status codes
            if (!response.ok) {
                throw await RequestHandler.handleAPIError(response);
            }

            return response;
        } catch (error) {
            if (error instanceof Error) {
                if (error.name === "AbortError") {
                    logger.error(
                        `Request timeout after ${this.timeout} seconds`
                    );
                    throw new NetworkError(
                        `Request timeout after ${this.timeout} seconds`,
                        error
                    );
                }
                if (
                    error.name === "TypeError" &&
                    error.message.includes("fetch")
                ) {
                    logger.error(`Connection error: ${error.message}`);
                    throw new NetworkError(
                        "Failed to connect to API server",
                        error
                    );
                }
            }
            // Re-throw if it's already one of our custom errors
            throw error;
        }
    }
}
