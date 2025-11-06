/**
 * Unit tests for error classes.
 */

import assert from "node:assert";
import { describe, test } from "node:test";

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
} from "../dist/esm/errors.js";

describe("Error Classes", () => {
    test("NeuwoAPIError should create base error with status code", () => {
        const error = new NeuwoAPIError("Test error", 500);
        assert.strictEqual(error.message, "Test error");
        assert.strictEqual(error.statusCode, 500);
        assert.strictEqual(error.name, "NeuwoAPIError");
        assert.ok(error instanceof Error);
    });

    test("AuthenticationError should have correct defaults", () => {
        const error = new AuthenticationError();
        assert.strictEqual(error.statusCode, 401);
        assert.strictEqual(error.name, "AuthenticationError");
        assert.ok(error.message.includes("Unauthorised"));
    });

    test("AuthenticationError should accept custom message", () => {
        const error = new AuthenticationError("Custom auth error");
        assert.strictEqual(error.message, "Custom auth error");
    });

    test("ForbiddenError should have correct status code", () => {
        const error = new ForbiddenError();
        assert.strictEqual(error.statusCode, 403);
        assert.strictEqual(error.name, "ForbiddenError");
    });

    test("NotFoundError should have correct status code", () => {
        const error = new NotFoundError();
        assert.strictEqual(error.statusCode, 404);
        assert.strictEqual(error.name, "NotFoundError");
    });

    test("NoDataAvailableError should extend NotFoundError", () => {
        const error = new NoDataAvailableError("URL not processed");
        assert.strictEqual(error.statusCode, 404);
        assert.strictEqual(error.name, "NoDataAvailableError");
        assert.ok(error instanceof NotFoundError);
    });

    test("BadRequestError should have correct status code", () => {
        const error = new BadRequestError();
        assert.strictEqual(error.statusCode, 400);
        assert.strictEqual(error.name, "BadRequestError");
    });

    test("ValidationError should store validation errors in validationDetails", () => {
        const validationErrors = [
            {
                loc: ["body", "content"],
                msg: "field required",
                type: "value_error.missing",
            },
        ];
        const error = new ValidationError(
            "Validation failed",
            validationErrors
        );
        assert.strictEqual(error.statusCode, 422);
        assert.strictEqual(error.name, "ValidationError");
        assert.deepStrictEqual(error.validationDetails, validationErrors);
    });

    test("RateLimitError should have correct status code", () => {
        const error = new RateLimitError();
        assert.strictEqual(error.statusCode, 429);
        assert.strictEqual(error.name, "RateLimitError");
    });

    test("ServerError should have correct status code", () => {
        const error = new ServerError();
        assert.strictEqual(error.statusCode, 500);
        assert.strictEqual(error.name, "ServerError");
    });

    test("ServerError should accept custom status code", () => {
        const error = new ServerError("Gateway error", 502);
        assert.strictEqual(error.statusCode, 502);
    });

    test("NetworkError should store cause", () => {
        const cause = new Error("Connection refused");
        const error = new NetworkError("Network failed", cause);
        assert.strictEqual(error.name, "NetworkError");
        assert.strictEqual(error.cause, cause);
    });

    test("ContentNotAvailableError should store URL", () => {
        const error = new ContentNotAvailableError(
            "Tagging failed",
            "https://example.com"
        );
        assert.strictEqual(error.name, "ContentNotAvailableError");
        assert.strictEqual(error.url, "https://example.com");
    });
});
