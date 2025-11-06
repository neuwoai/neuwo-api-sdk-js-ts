/**
 * Error classes for Neuwo API.
 *
 * This module defines a hierarchy of error classes for handling various
 * API error scenarios. All errors extend from the base NeuwoAPIError class.
 */

/**
 * Base error class for all Neuwo API errors.
 *
 * All API-related errors inherit from this class, making it easy to catch
 * any Neuwo API error with a single catch block.
 */
export class NeuwoAPIError extends Error {
    /** HTTP status code if available */
    public statusCode?: number;

    /**
     * Creates a new NeuwoAPIError.
     *
     * @param message - Error message
     * @param statusCode - HTTP status code
     */
    constructor(message: string, statusCode?: number) {
        super(message);
        this.name = "NeuwoAPIError";
        this.statusCode = statusCode;

        // Maintains proper stack trace for where error was thrown (V8 engines only)
        if (
            "captureStackTrace" in Error &&
            typeof Error.captureStackTrace === "function"
        ) {
            Error.captureStackTrace(this, this.constructor);
        }
    }
}

/**
 * Error thrown when authentication fails (401).
 *
 * Indicates that the provided token is invalid or missing.
 */
export class AuthenticationError extends NeuwoAPIError {
    constructor(message: string = "Unauthorised - Invalid or missing token") {
        super(message, 401);
        this.name = "AuthenticationError";
    }
}

/**
 * Error thrown when token lacks necessary permissions (403).
 *
 * The token is valid but doesn't have permission to access the requested resource.
 */
export class ForbiddenError extends NeuwoAPIError {
    constructor(
        message: string = "Forbidden - Token lacks necessary permissions"
    ) {
        super(message, 403);
        this.name = "ForbiddenError";
    }
}

/**
 * Error thrown when requested resource is not found (404).
 *
 * The requested resource doesn't exist or hasn't been processed yet.
 */
export class NotFoundError extends NeuwoAPIError {
    constructor(message: string = "Not Found - Resource not found") {
        super(message, 404);
        this.name = "NotFoundError";
    }
}

/**
 * Error thrown when data is not yet available (URL not processed).
 *
 * This is a specialized NotFoundError (404) for EDGE endpoints, indicating
 * the URL has been queued for processing and results will be available
 * after crawling completes (typically 10-60 seconds).
 */
export class NoDataAvailableError extends NotFoundError {
    constructor(
        message: string = "No data yet available - URL queued for processing"
    ) {
        super(message);
        this.name = "NoDataAvailableError";
    }
}

/**
 * Error thrown when request is malformed (400).
 *
 * The request syntax is invalid or missing required parameters.
 */
export class BadRequestError extends NeuwoAPIError {
    constructor(message: string = "Bad Request - Malformed request") {
        super(message, 400);
        this.name = "BadRequestError";
    }
}

/**
 * Error thrown when request validation fails (422).
 *
 * The request is well-formed but contains invalid values or fails
 * validation rules (e.g., empty content, invalid URL format).
 */
export class ValidationError extends NeuwoAPIError {
    /** Structured validation error details from the API */
    public validationDetails?: unknown[];

    /**
     * Creates a new ValidationError.
     *
     * @param message - Error message
     * @param validationDetails - Structured validation errors (typically an array of field-level errors)
     */
    constructor(
        message: string = "Validation Error - Request validation failed",
        validationDetails?: unknown[]
    ) {
        super(message, 422);
        this.name = "ValidationError";
        this.validationDetails = validationDetails;
    }
}

/**
 * Error thrown when rate limit is exceeded (429).
 *
 * Too many requests have been made in a given time period.
 * Wait before retrying.
 */
export class RateLimitError extends NeuwoAPIError {
    /** Number of seconds to wait before retrying (from Retry-After header) */
    public retryAfter?: number;

    /**
     * Creates a new RateLimitError.
     *
     * @param message - Error message
     * @param retryAfter - Number of seconds to wait before retrying
     */
    constructor(
        message: string = "Rate Limit Exceeded - Too many requests",
        retryAfter?: number
    ) {
        super(message, 429);
        this.name = "RateLimitError";
        this.retryAfter = retryAfter;
    }
}

/**
 * Error thrown when server encounters an error (5xx).
 *
 * The server encountered an unexpected condition that prevented it
 * from fulfilling the request.
 */
export class ServerError extends NeuwoAPIError {
    constructor(
        message: string = "Server Error - Internal server error",
        statusCode: number = 500
    ) {
        super(message, statusCode);
        this.name = "ServerError";
    }
}

/**
 * Error thrown when network communication fails.
 *
 * Indicates a network-level error such as timeout, connection refused,
 * or DNS resolution failure.
 */
export class NetworkError extends NeuwoAPIError {
    /** Original error that caused the network failure */
    public cause?: Error;

    constructor(
        message: string = "Network Error - Failed to communicate with server",
        cause?: Error
    ) {
        super(message);
        this.name = "NetworkError";
        this.cause = cause;
    }
}

/**
 * Error thrown when content tagging could not be created (EDGE API).
 *
 * This is a permanent error indicating that the content at the URL
 * could not be analysed. This is different from NoDataAvailableError
 * which is temporary.
 */
export class ContentNotAvailableError extends NeuwoAPIError {
    /** The URL that could not be processed */
    public url?: string;

    constructor(
        message: string = "Content Not Available - Tagging could not be created",
        url?: string
    ) {
        super(message);
        this.name = "ContentNotAvailableError";
        this.url = url;
    }
}

export class ValueError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "ValueError";
    }
}
