/**
 * Basic REST API examples for Neuwo API SDK.
 *
 * This example shows basic usage of the REST API client for analyzing text content.
 */

import { AuthenticationError, ValidationError } from "../dist/esm/errors.js";
import { NeuwoRestClient } from "../dist/esm/rest-client.js";

const REST_TOKEN = process.env.NEUWO_REST_TOKEN || "your-rest-token-here";
const BASE_URL = process.env.NEUWO_BASE_URL || "your-api-server-base-url-here";

async function analyzeText() {
    console.log("=".repeat(60));
    console.log("Example 1: Analyze Text Content");
    console.log("=".repeat(60));

    // Initialize client
    const client = new NeuwoRestClient({
        token: REST_TOKEN,
        baseUrl: BASE_URL,
    });

    // Sample content
    const content = `
    Cats make wonderful pets for modern households. These independent animals
    are easy to care for and don't require constant attention like dogs do.
    Cats groom themselves, use litter boxes naturally, and can stay home alone
    during work hours. Beyond convenience, cats provide real health benefits.
    Petting a cat reduces stress and lowers blood pressure. Their purring sound
    is naturally calming and therapeutic.
    `;

    try {
        // Analyze content
        const response = await client.getAiTopics({
            content: content,
            headline: "Why Cats Make Great Pets",
        });

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
        if (error instanceof ValidationError) {
            console.log(`Validation error: ${error.message}`);
        } else if (error instanceof AuthenticationError) {
            console.log(`Authentication error: ${error.message}`);
        } else {
            console.log(`Error: ${error}`);
        }
    }
}

async function analyzeWithDocumentId() {
    console.log("\n" + "=".repeat(60));
    console.log("Example 2: Analyze and Save to Database");
    console.log("=".repeat(60));

    const client = new NeuwoRestClient({
        token: REST_TOKEN,
        baseUrl: BASE_URL,
    });

    // Sample content
    const content = `
    Cats make wonderful pets for modern households. These independent animals
    are easy to care for and don't require constant attention like dogs do.
    Cats groom themselves, use litter boxes naturally, and can stay home alone
    during work hours. Beyond convenience, cats provide real health benefits.
    Petting a cat reduces stress and lowers blood pressure. Their purring sound
    is naturally calming and therapeutic.
    `;

    try {
        const response = await client.getAiTopics({
            content: content,
            documentId: "article-animals-101",
            headline: "Why Cats Make Great Pets",
            publicationId: "animals-blog",
            articleUrl: "https://example.com/animals",
            includeInSim: true,
        });

        console.log("\nArticle saved with ID: article-animals-101");
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

async function customParameters() {
    console.log("\n" + "=".repeat(60));
    console.log("Example 3: Custom Tagging Parameters");
    console.log("=".repeat(60));

    const client = new NeuwoRestClient({
        token: REST_TOKEN,
        baseUrl: BASE_URL,
    });

    // Sample content
    const content = `
    Cats make wonderful pets for modern households. These independent animals
    are easy to care for and don't require constant attention like dogs do.
    Cats groom themselves, use litter boxes naturally, and can stay home alone
    during work hours. Beyond convenience, cats provide real health benefits.
    Petting a cat reduces stress and lowers blood pressure. Their purring sound
    is naturally calming and therapeutic.
    `;

    try {
        const response = await client.getAiTopics({
            content: content,
            tagLimit: 10, // Limit to 10 tags
            tagMinScore: 0.3, // Only tags with score >= 0.3
            marketingMinScore: 0.5, // Only marketing categories with score >= 0.5
        });

        console.log(`\nRetrieved ${response.tags.length} high-confidence tags`);
        for (const tag of response.tags) {
            console.log(`  • ${tag.value}: ${tag.score.toFixed(4)}`);
        }
    } catch (error) {
        console.log(`Error: ${error}`);
    }
}

async function findSimilarArticles() {
    console.log("\n" + "=".repeat(60));
    console.log("Example 4: Find Similar Articles");
    console.log("=".repeat(60));

    const client = new NeuwoRestClient({
        token: REST_TOKEN,
        baseUrl: BASE_URL,
    });

    try {
        const similarArticles = await client.getSimilar({
            documentId: "article-animals-101",
            maxRows: 5,
            pastDays: 30,
        });

        console.log(`\nFound ${similarArticles.length} similar articles:`);
        for (const article of similarArticles) {
            console.log(
                `  • ${article.headline} (similarity: ${article.score.toFixed(4)})`
            );
        }
    } catch (error) {
        console.log(`Error: ${error}`);
    }
}

async function updateArticle() {
    console.log("\n" + "=".repeat(60));
    console.log("Example 5: Update Article");
    console.log("=".repeat(60));

    const client = new NeuwoRestClient({
        token: REST_TOKEN,
        baseUrl: BASE_URL,
    });

    try {
        const updatedArticle = await client.updateArticle({
            documentId: "article-animals-101",
            headline: "Updated: Why Cats Make Great Pets",
            writer: "John Doe",
            category: "Animals",
            summary: "A comprehensive guide to Animals basics.",
        });

        console.log("\nArticle updated successfully");
        console.log(`Headline: ${updatedArticle.headline}`);
        console.log(`Writer: ${updatedArticle.writer}`);
    } catch (error) {
        console.log(`Error: ${error}`);
    }
}

async function trainAiTopics() {
    console.log("\n" + "=".repeat(60));
    console.log("Example 6: Add Training Tags");
    console.log("=".repeat(60));

    const client = new NeuwoRestClient({
        token: REST_TOKEN,
        baseUrl: BASE_URL,
    });

    try {
        const trainingTags = await client.trainAiTopics({
            documentId: "article-animals-101",
            tags: ["animals", "cats", "nature"],
        });

        console.log(`\nAdded ${trainingTags.length} new training tags:`);
        for (const tag of trainingTags) {
            console.log(`  • ${tag.tag} (Article ID: ${tag.articleId})`);
        }
    } catch (error) {
        console.log(`Error: ${error}`);
    }
}

async function main() {
    console.log("Neuwo REST API - Basic Examples");
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
        await analyzeText();
        await analyzeWithDocumentId();
        await customParameters();
        await findSimilarArticles();
        await updateArticle();
        await trainAiTopics();

        console.log("\n" + "=".repeat(60));
        console.log("Examples completed!");
        console.log("=".repeat(60));
    }
}

main();
