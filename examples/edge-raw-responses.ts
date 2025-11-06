/**
 * EDGE API raw response examples for Neuwo API SDK.
 *
 * This example demonstrates using raw response methods that return
 * the HTTP Response object for custom processing.
 */

import { NeuwoEdgeClient } from "../dist/esm/edge-client.js";

const EDGE_TOKEN = process.env.NEUWO_EDGE_TOKEN || "your-edge-token-here";
const BASE_URL = process.env.NEUWO_BASE_URL || "your-api-server-base-url-here";

async function getAiTopicsRawExample() {
    console.log("=".repeat(60));
    console.log("Example 1: Get AI Topics by URL (Raw Response)");
    console.log("=".repeat(60));

    const client = new NeuwoEdgeClient({
        token: EDGE_TOKEN,
        baseUrl: BASE_URL,
        defaultOrigin: "https://example.com", // optional
    });

    try {
        const response = await client.getAiTopicsRaw({
            url: "https://neuwo.ai/blog/2025/05/13/lets-break-the-rules-you-set-the-cpm/",
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

async function getAiTopicsListRawExample() {
    console.log("\n" + "=".repeat(60));
    console.log("Example 2: Get AI Topics for Multiple URLs (Raw Response)");
    console.log("=".repeat(60));

    const client = new NeuwoEdgeClient({
        token: EDGE_TOKEN,
        baseUrl: BASE_URL,
        defaultOrigin: "https://example.com", // optional
    });

    const urls = [
        "https://neuwo.ai/blog/2025/05/13/lets-break-the-rules-you-set-the-cpm/",
        "https://neuwo.ai/blog/2025/05/28/the-rise-of-made-for-advertising-mfa-publishers-how-they-impact-the-digital-ad-ecosystem/",
    ];

    try {
        const response = await client.getAiTopicsListRaw({
            urls: urls,
            origin: "https://example.com",
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

async function getSimilarRawExample() {
    console.log("\n" + "=".repeat(60));
    console.log("Example 3: Get Similar Articles by URL (Raw Response)");
    console.log("=".repeat(60));

    const client = new NeuwoEdgeClient({
        token: EDGE_TOKEN,
        baseUrl: BASE_URL,
        defaultOrigin: "https://example.com", // optional
    });

    try {
        const response = await client.getSimilarRaw({
            documentUrl:
                "https://neuwo.ai/blog/2025/05/13/lets-break-the-rules-you-set-the-cpm/",
            maxRows: 5,
            pastDays: 30,
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

async function customResponseHandlingWithOrigin() {
    console.log("\n" + "=".repeat(60));
    console.log("Example 4: Custom Response Handling with Origin Header");
    console.log("=".repeat(60));

    const client = new NeuwoEdgeClient({
        token: EDGE_TOKEN,
        baseUrl: BASE_URL,
        defaultOrigin: "https://example.com", // optional
    });

    try {
        const response = await client.getAiTopicsRaw({
            url: "https://example.com/new-article",
            origin: "https://custom-origin.com",
        });

        // Custom handling based on status
        if (response.status === 200) {
            console.log(`\nSuccess! Processing response...`);
            const data = await response.json();
            console.log(`Tags count: ${data.tags?.length || 0}`);
        } else if (response.status === 404) {
            console.log(`\nData not available yet (URL queued for processing)`);
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

async function urlListFromBuffer() {
    console.log("\n" + "=".repeat(60));
    console.log("Example 5: URL List from Buffer (Raw Response)");
    console.log("=".repeat(60));

    const client = new NeuwoEdgeClient({
        token: EDGE_TOKEN,
        baseUrl: BASE_URL,
        defaultOrigin: "https://example.com", // optional
    });

    // Create a file buffer with URLs
    const urlList = `https://neuwo.ai/blog/2025/05/13/lets-break-the-rules-you-set-the-cpm/1
https://neuwo.ai/blog/2025/05/13/lets-break-the-rules-you-set-the-cpm/2
https://neuwo.ai/blog/2025/05/13/lets-break-the-rules-you-set-the-cpm/3`;
    const fileContent = new TextEncoder().encode(urlList).buffer;

    try {
        const response = await client.getAiTopicsListRaw({
            urls: fileContent,
        });

        console.log(`\nStatus: ${response.status}`);

        if (response.ok) {
            const data = await response.json();
            console.log(`Response contains ${data.length} results`);
            console.log(JSON.stringify(data, null, 2));
        } else {
            const errorText = await response.text();
            console.log(`Error response: ${errorText}`);
        }
    } catch (error) {
        console.log(`Error: ${error}`);
    }
}

async function inspectResponseMetadata() {
    console.log("\n" + "=".repeat(60));
    console.log("Example 6: Inspect Response Metadata");
    console.log("=".repeat(60));

    const client = new NeuwoEdgeClient({
        token: EDGE_TOKEN,
        baseUrl: BASE_URL,
        defaultOrigin: "https://example.com", // optional
    });

    try {
        const response = await client.getAiTopicsRaw({
            url: "https://neuwo.ai/blog/2025/05/13/lets-break-the-rules-you-set-the-cpm/",
        });

        console.log(`\nResponse metadata:`);
        console.log(`  Status: ${response.status}`);
        console.log(`  Status text: ${response.statusText}`);
        console.log(`  OK: ${response.ok}`);
        console.log(`  Redirected: ${response.redirected}`);
        console.log(`  Type: ${response.type}`);
        console.log(`  URL: ${response.url}`);

        console.log(`\nResponse headers:`);
        response.headers.forEach((value, key) => {
            console.log(`  ${key}: ${value}`);
        });
    } catch (error) {
        console.log(`Error: ${error}`);
    }
}

async function main() {
    console.log("Neuwo EDGE API - Raw Response Examples");
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
        await getAiTopicsRawExample();
        await getAiTopicsListRawExample();
        await getSimilarRawExample();
        await customResponseHandlingWithOrigin();
        await urlListFromBuffer();
        await inspectResponseMetadata();

        console.log("\n" + "=".repeat(60));
        console.log("Raw response examples completed!");
        console.log("=".repeat(60));
    }
}

main();
