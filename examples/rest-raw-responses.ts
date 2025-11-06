/**
 * REST API raw response examples for Neuwo API SDK.
 *
 * This example demonstrates using raw response methods that return
 * the HTTP Response object for custom processing.
 */

import { NeuwoRestClient } from "../dist/esm/rest-client.js";

const REST_TOKEN = process.env.NEUWO_REST_TOKEN || "your-rest-token-here";
const BASE_URL = process.env.NEUWO_BASE_URL || "your-api-server-base-url-here";

async function getAiTopicsRawExample() {
    console.log("=".repeat(60));
    console.log("Example 1: Get AI Topics (Raw Response)");
    console.log("=".repeat(60));

    const client = new NeuwoRestClient({
        token: REST_TOKEN,
        baseUrl: BASE_URL,
    });

    const content = `
    Cats make wonderful pets for modern households. These independent animals
    are easy to care for and don't require constant attention like dogs do.
    `;

    try {
        const response = await client.getAiTopicsRaw({
            content: content,
            headline: "Why Cats Make Great Pets",
            format: "json", // or "xml"
        });

        console.log(`\nStatus: ${response.status} ${response.statusText}`);
        console.log(`Content-Type: ${response.headers.get("content-type")}`);

        // Parse JSON manually
        const data = await response.json();
        console.log(`\nRaw response data:`);
        console.log(JSON.stringify(data, null, 2));
    } catch (error) {
        console.log(`Error: ${error}`);
    }
}

async function getSimilarRawExample() {
    console.log("\n" + "=".repeat(60));
    console.log("Example 2: Get Similar Articles (Raw Response)");
    console.log("=".repeat(60));

    const client = new NeuwoRestClient({
        token: REST_TOKEN,
        baseUrl: BASE_URL,
    });

    try {
        const response = await client.getSimilarRaw({
            documentId: "article-123",
            maxRows: 5,
            format: "json",
        });

        console.log(`\nStatus: ${response.status}`);
        console.log(`Headers:`);
        response.headers.forEach((value, key) => {
            console.log(`  ${key}: ${value}`);
        });

        // Get raw text
        const text = await response.text();
        console.log(`\nRaw response text (first 200 chars):`);
        console.log(text.substring(0, 200));
    } catch (error) {
        console.log(`Error: ${error}`);
    }
}

async function updateArticleRawExample() {
    console.log("\n" + "=".repeat(60));
    console.log("Example 3: Update Article (Raw Response)");
    console.log("=".repeat(60));

    const client = new NeuwoRestClient({
        token: REST_TOKEN,
        baseUrl: BASE_URL,
    });

    try {
        const response = await client.updateArticleRaw({
            documentId: "article-123",
            headline: "Updated Headline",
            format: "json",
        });

        console.log(`\nStatus: ${response.status}`);

        // Clone response for multiple reads
        const response1 = response.clone();
        const response2 = response.clone();

        // Read as JSON
        const jsonData = await response1.json();
        console.log(`JSON data:`, jsonData);

        // Read as text
        const textData = await response2.text();
        console.log(`\nText length: ${textData.length} characters`);
    } catch (error) {
        console.log(`Error: ${error}`);
    }
}

async function trainAiTopicsRawExample() {
    console.log("\n" + "=".repeat(60));
    console.log("Example 4: Train AI Topics (Raw Response)");
    console.log("=".repeat(60));

    const client = new NeuwoRestClient({
        token: REST_TOKEN,
        baseUrl: BASE_URL,
    });

    try {
        const response = await client.trainAiTopicsRaw({
            documentId: "article-123",
            tags: ["technology", "ai", "machine learning"],
            format: "json",
        });

        console.log(`\nStatus: ${response.status}`);

        // Check if response is ok before parsing
        if (response.ok) {
            const data = await response.json();
            console.log(`Training tags response:`, data);
        } else {
            const errorText = await response.text();
            console.log(`Error response: ${errorText}`);
        }
    } catch (error) {
        console.log(`Error: ${error}`);
    }
}

async function customResponseHandling() {
    console.log("\n" + "=".repeat(60));
    console.log("Example 5: Custom Response Handling");
    console.log("=".repeat(60));

    const client = new NeuwoRestClient({
        token: REST_TOKEN,
        baseUrl: BASE_URL,
    });

    try {
        const response = await client.getAiTopicsRaw({
            content: "Sample article content about technology and innovation.",
            format: "json",
        });

        // Custom handling based on status
        if (response.status === 200) {
            console.log(`\nSuccess! Processing response...`);
            const data = await response.json();
            console.log(`Tags count: ${data.tags?.length || 0}`);
        } else if (response.status === 401) {
            console.log(`\nAuthentication failed`);
        } else if (response.status === 400) {
            console.log(`\nBad request`);
            const errorData = await response.json();
            console.log(`Error details:`, errorData);
        } else {
            console.log(`\nUnexpected status: ${response.status}`);
        }
    } catch (error) {
        console.log(`Error: ${error}`);
    }
}

async function main() {
    console.log("Neuwo REST API - Raw Response Examples");
    console.log("=".repeat(60));

    if (REST_TOKEN === "your-rest-token-here") {
        console.log(
            "\n⚠️  Please set your NEUWO_REST_TOKEN environment variable"
        );
        console.log("   export NEUWO_REST_TOKEN='your-actual-token'");
        console.log(
            "   Or edit this script and replace 'your-rest-token-here'\n"
        );
    } else if (BASE_URL === "your-api-server-base-url-here") {
        console.log(
            "\n⚠️  Please set your NEUWO_BASE_URL environment variable"
        );
        console.log("   export NEUWO_BASE_URL='your-api-server-base-url'");
        console.log(
            "   Or edit this script and replace 'your-api-server-base-url-here'\n"
        );
    } else {
        await getAiTopicsRawExample();
        await getSimilarRawExample();
        await updateArticleRawExample();
        await trainAiTopicsRawExample();
        await customResponseHandling();

        console.log("\n" + "=".repeat(60));
        console.log("Raw response examples completed!");
        console.log("=".repeat(60));
    }
}

main();
