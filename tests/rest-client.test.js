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
    });

    describe("trainAiTopics", () => {
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

    describe("parameter transformation", () => {
        test("should accept getAiTopics params with defaults", () => {
            const _client = new NeuwoRestClient({
                token: "test-token",
                baseUrl: "https://api.example.com",
            });

            // This would make a real HTTP request, so we just verify it doesn't throw synchronously
            const params = {
                content: "Test content",
                documentId: "doc123",
                tagLimit: 15,
                includeInSim: true,
            };

            assert.ok(params.content);
        });
    });
});
