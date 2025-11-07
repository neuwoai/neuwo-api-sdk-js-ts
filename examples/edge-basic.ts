/**
 * Basic EDGE API examples for Neuwo API SDK.
 *
 * This example shows basic usage of the EDGE API client for analyzing URLs.
 */

import { NeuwoEdgeClient } from "../dist/esm/edge-client.js";
import {
    AuthenticationError,
    ContentNotAvailableError,
    NoDataAvailableError,
} from "../dist/esm/errors.js";

const EDGE_TOKEN = process.env.NEUWO_EDGE_TOKEN || "your-edge-token-here";
const BASE_URL = process.env.NEUWO_BASE_URL || "your-api-server-base-url-here";

async function analyzeUrl() {
    console.log("=".repeat(60));
    console.log("Example 1: Analyze URL");
    console.log("=".repeat(60));

    // Initialize client
    const client = new NeuwoEdgeClient({
        token: EDGE_TOKEN,
        baseUrl: BASE_URL,
        defaultOrigin: "https://example.com", // optional
    });

    const url =
        "https://neuwo.ai/blog/2025/05/13/lets-break-the-rules-you-set-the-cpm/";

    try {
        // Analyze URL
        const response = await client.getAiTopics({ url: url });

        // Display tags
        console.log(`\nFound ${response.tags.length} tags:`);
        for (const tag of response.tags.slice(0, 5)) {
            console.log(`  • ${tag.value} (score: ${tag.score.toFixed(4)})`);
        }

        // Display brand safety
        if (response.brandSafety) {
            console.log(`\nBrand Safe: ${response.brandSafety.isSafe}`);
            console.log(
                `Safety Score: ${response.brandSafety.score.toFixed(4)}`
            );
        }

        // Display IAB categories
        if (response.marketingCategories) {
            console.log(
                `\nIAB Tier 1 Categories (${response.marketingCategories.iabTier1.length}):`
            );
            for (const cat of response.marketingCategories.iabTier1.slice(
                0,
                3
            )) {
                console.log(
                    `  • ${cat.label} (relevance: ${cat.relevance.toFixed(2)})`
                );
            }
        }

        // Display smart tags
        if (response.smartTags && response.smartTags.length > 0) {
            console.log(
                `\nSmart Tags: ${response.smartTags.map((st) => st.name).join(", ")}`
            );
        }
    } catch (error) {
        if (error instanceof NoDataAvailableError) {
            console.log(
                `No data available yet: ${error.message}. The URL has been queued for processing.`
            );
        } else if (error instanceof ContentNotAvailableError) {
            console.log(`Content not available: ${error.message}`);
        } else if (error instanceof AuthenticationError) {
            console.log(`Authentication error: ${error.message}`);
        } else {
            console.log(`Error: ${error}`);
        }
    }
}

async function analyzeUrlWithWait() {
    console.log("\n" + "=".repeat(60));
    console.log("Example 2: Analyze URL with Automatic Retry");
    console.log("=".repeat(60));

    const client = new NeuwoEdgeClient({
        token: EDGE_TOKEN,
        baseUrl: BASE_URL,
        defaultOrigin: "https://example.com", // optional
    });

    const url =
        "https://neuwo.ai/blog/2025/05/13/lets-break-the-rules-you-set-the-cpm/";

    try {
        // Analyze URL with automatic retry for new URLs
        const response = await client.getAiTopicsWait({
            url: url,
            maxRetries: 10, // optional, defaults to 10
            retryInterval: 6, // optional, defaults to 6 seconds
            initialDelay: 2, // optional, defaults to 2 seconds
        });

        console.log("\nURL successfully analyzed after waiting");
        console.log(
            `Tags: ${response.tags
                .slice(0, 3)
                .map((t) => t.value)
                .join(", ")}`
        );
    } catch (error) {
        if (error instanceof NoDataAvailableError) {
            console.log(
                `Data still not available after retries: ${error.message}`
            );
        } else {
            console.log(`Error: ${error}`);
        }
    }
}

async function customOriginHeader() {
    console.log("\n" + "=".repeat(60));
    console.log("Example 3: Using Custom Origin Header");
    console.log("=".repeat(60));

    const client = new NeuwoEdgeClient({
        token: EDGE_TOKEN,
        baseUrl: BASE_URL,
        defaultOrigin: "https://example.com", // optional
    });

    try {
        // Override default origin for this request
        const response = await client.getAiTopics({
            url: "https://neuwo.ai/blog/2025/05/13/lets-break-the-rules-you-set-the-cpm/",
            origin: "https://custom-origin.com",
        });

        console.log(`\nAnalyzed URL with custom origin header`);
        console.log(
            `Tags: ${response.tags
                .slice(0, 3)
                .map((t) => t.value)
                .join(", ")}`
        );
    } catch (error) {
        console.log(`Error: ${error}`);
    }
}

async function main() {
    console.log("Neuwo EDGE API - Basic Examples");
    console.log("=".repeat(60));

    if (EDGE_TOKEN === "your-edge-token-here") {
        console.log(
            "\n⚠️  Please set your NEUWO_EDGE_TOKEN environment variable"
        );
        console.log("   export NEUWO_EDGE_TOKEN='your-actual-token'");
        console.log(
            "   Or edit this script and replace 'your-edge-token-here'\n"
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
        await analyzeUrl();
        await analyzeUrlWithWait();
        await customOriginHeader();

        console.log("\n" + "=".repeat(60));
        console.log("Examples completed!");
        console.log("=".repeat(60));
    }
}

main();
