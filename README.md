# Neuwo API JavaScript/TypeScript SDK

JavaScript/TypeScript SDK client for the Neuwo content classification API.

[![npm version](https://img.shields.io/npm/v/neuwo-api.svg)](https://www.npmjs.com/package/neuwo-api)
[![npm bundle size](https://img.shields.io/bundlephobia/minzip/neuwo-api)](https://bundlephobia.com/package/neuwo-api)
[![JSR](https://jsr.io/badges/@neuwo/neuwo-api)](https://jsr.io/@neuwo/neuwo-api)
[![JSR Score](https://jsr.io/badges/@neuwo/neuwo-api/score)](https://jsr.io/@neuwo/neuwo-api)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/node/v/neuwo-api.svg)](https://nodejs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Support

- **Neuwo**: [https://neuwo.ai](https://neuwo.ai)
- **Documentation**: [https://docs.neuwo.ai](https://docs.neuwo.ai)
- **Repository**: [GitHub](https://github.com/neuwoai/neuwo-api-sdk-js-ts)
- **Issues**: [GitHub Issues](https://github.com/neuwoai/neuwo-api-sdk-js-ts/issues)
- **Email Support**: [neuwo-helpdesk@neuwo.ai](mailto:neuwo-helpdesk@neuwo.ai)

## Installation

Install the package using npm:

```bash
npm install neuwo-api
```

## Requirements

- Node.js 18.0.0 or higher (for native fetch API support)
- Modern browsers with fetch support

### Browser Compatibility

The SDK uses native fetch API which is supported in:

- **Chrome/Edge**: 42+
- **Firefox**: 39+
- **Safari**: 10.1+
- **Node.js**: 18.0+

For older browsers, you'll need to provide a fetch polyfill.

## Quick Start

For more detailed examples and use cases, see the [examples folder](examples/) in the repository.

### Usage in Different Environments

#### Node.js (ESM)

```typescript
import { NeuwoRestClient, NeuwoEdgeClient } from "neuwo-api";
```

#### Node.js (CommonJS)

```typescript
const { NeuwoRestClient, NeuwoEdgeClient } = require("neuwo-api");
```

#### Browser (ESM)

```html
<script type="module">
  import { NeuwoEdgeClient } from "https://cdn.jsdelivr.net/npm/neuwo-api/+esm";
</script>
```

### REST API Client

```typescript
import { NeuwoRestClient } from "neuwo-api";

// Initialise client
const client = new NeuwoRestClient({
  token: "your-rest-api-token",
  baseUrl: "https://custom.api.com",
});

// Analyse text content
const response = await client.getAiTopics({
  content: "Cats make wonderful pets for modern households.",
  documentId: "article-123",
  headline: "Why Cats Make Great Pets",
});

// Access results
console.log(`Tags: ${response.tags.length}`);
response.tags.forEach((tag) => {
  console.log(`  - ${tag.value} (score: ${tag.score})`);
});

console.log(`Brand Safe: ${response.brandSafety.isSafe}`);
console.log(`IAB Categories: ${response.marketingCategories.iabTier1.length}`);
```

### EDGE API Client

```typescript
import { NeuwoEdgeClient } from "neuwo-api";

// Initialise client
const client = new NeuwoEdgeClient({
  token: "your-edge-api-token",
  baseUrl: "https://custom.api.com",
  defaultOrigin: "https://yourwebsite.com", // Optional: default origin for requests
});

// Analyse article by URL
const response = await client.getAiTopics({
  url: "https://example.com/article",
});

// Or wait for analysis to complete (with automatic retry)
const responseWithWait = await client.getAiTopicsWait({
  url: "https://example.com/new-article",
  maxRetries: 10,
  retryInterval: 6,
});

console.log(`Found ${responseWithWait.tags.length} tags for the article`);
```

## Configuration

### REST Client Parameters

| Parameter | Type     | Default      | Description                   |
| --------- | -------- | ------------ | ----------------------------- |
| `token`   | `string` | **Required** | REST API authentication token |
| `baseUrl` | `string` | **Required** | Base URL for the API          |
| `timeout` | `number` | `60`         | Request timeout in seconds    |

```typescript
const client = new NeuwoRestClient({
  token: "your-token",
  baseUrl: "https://custom.api.com",
  timeout: 120,
});
```

### EDGE Client Parameters

| Parameter       | Type     | Default      | Description                        |
| --------------- | -------- | ------------ | ---------------------------------- |
| `token`         | `string` | **Required** | EDGE API authentication token      |
| `baseUrl`       | `string` | **Required** | Base URL for the API               |
| `timeout`       | `number` | `60`         | Request timeout in seconds         |
| `defaultOrigin` | `string` | `undefined`  | Default Origin header for requests |

```typescript
const client = new NeuwoEdgeClient({
  token: "your-token",
  baseUrl: "https://custom.api.com",
  defaultOrigin: "https://yoursite.com",
  timeout: 90,
});
```

### API Methods

#### REST API

##### Get AI Topics

```typescript
const response = await client.getAiTopics({
  content: "Text to analyse", // Required
  documentId: "doc123", // Optional: save to database
  lang: "en", // Optional: ISO 639-1 code
  publicationId: "pub1", // Optional
  headline: "Article Headline", // Optional
  tagLimit: 15, // Optional: max tags (default: 15)
  tagMinScore: 0.1, // Optional: min score (default: 0.1)
  marketingLimit: undefined, // Optional
  marketingMinScore: 0.3, // Optional (default: 0.3)
  includeInSim: true, // Optional (default: true)
  articleUrl: "https://example.com", // Optional
});
```

##### Get Similar Articles

```typescript
const articles = await client.getSimilar({
  documentId: "doc123", // Required
  maxRows: 10, // Optional: limit results
  pastDays: 30, // Optional: limit by date
  publicationIds: ["pub1", "pub2"], // Optional: filter by publication
});
```

##### Update Article

```typescript
const article = await client.updateArticle({
  documentId: "doc123", // Required
  published: new Date("2024-01-15"), // Optional
  headline: "Updated Headline", // Optional
  writer: "Author Name", // Optional
  category: "News", // Optional
  content: "Updated content", // Optional
  summary: "Summary", // Optional
  publicationId: "pub1", // Optional
  articleUrl: "https://example.com", // Optional
  includeInSim: true, // Optional
});
```

##### Train AI Topics

```typescript
const trainingTags = await client.trainAiTopics({
  documentId: "doc123", // Required
  tags: ["tag1", "tag2", "tag3"], // Required
});
```

#### EDGE API

##### Get AI Topics (Single URL)

```typescript
const response = await client.getAiTopics({
  url: "https://example.com/article", // Required
  origin: "https://yoursite.com", // Optional: override default origin
});
```

##### Get AI Topics with Auto-Retry

```typescript
const response = await client.getAiTopicsWait({
  url: "https://example.com/article", // Required
  origin: "https://yoursite.com", // Optional
  maxRetries: 10, // Optional (default: 10)
  retryInterval: 6, // Optional (default: 6s)
  initialDelay: 2, // Optional (default: 2s)
});
```

#### Raw Response Methods

All methods have `*Raw` variants that return the raw `Response` object:

```typescript
// REST
const rawResponse = await client.getAiTopicsRaw({
  content: "Text",
});
console.log(rawResponse.status);
console.log(await rawResponse.text());

// EDGE
const rawResponse = await client.getAiTopicsRaw({
  url: "https://example.com",
});
console.log(await rawResponse.json());
```

## Error Handling

The SDK provides specific exceptions for different error scenarios:

```typescript
import {
  NeuwoRestClient,
  ValidationError,
  AuthenticationError,
  NoDataAvailableError,
  ContentNotAvailableError,
  NetworkError,
} from "neuwo-api";

const client = new NeuwoRestClient({
  token: "your-token",
  baseUrl: "https://custom.api.com",
});

try {
  const response = await client.getAiTopics({
    content: "Your content here",
  });
} catch (error) {
  if (error instanceof ValidationError) {
    console.error(`Invalid input: ${error.message}`);
  } else if (error instanceof AuthenticationError) {
    console.error(`Authentication failed: ${error.message}`);
  } else if (error instanceof NoDataAvailableError) {
    console.error(`Data not yet available: ${error.message}`);
  } else if (error instanceof ContentNotAvailableError) {
    console.error(`Content could not be analysed: ${error.message}`);
  } else if (error instanceof NetworkError) {
    console.error(`Network error: ${error.message}`);
  } else {
    console.error(`Unexpected error: ${error.message}`);
  }
}
```

### Exception Hierarchy

- `NeuwoAPIError` - Base exception for all API errors
  - `AuthenticationError` - Invalid or missing token (401)
  - `ForbiddenError` - Token lacks permissions (403)
  - `NotFoundError` - Resource not found (404)
    - `NoDataAvailableError` - URL not yet processed (404)
  - `BadRequestError` - Malformed request (400)
  - `ValidationError` - Request validation failed (422)
  - `RateLimitError` - Rate limit exceeded (429)
  - `ServerError` - Server error (5xx)
  - `NetworkError` - Network communication failed
  - `ContentNotAvailableError` - Content tagging failed

## Logging

The SDK provides configurable logging for debugging and monitoring:

```typescript
import { setupLogger, disableLogger, LogLevel } from "neuwo-api";

// Enable debug logging
setupLogger(LogLevel.DEBUG);

// Only show warnings and errors (default)
setupLogger(LogLevel.WARNING);

// Disable logging
disableLogger();
```

**Available log levels:**

- `LogLevel.DEBUG` - Detailed API request/response information
- `LogLevel.INFO` - General operation info
- `LogLevel.WARNING` - Warnings (default)
- `LogLevel.ERROR` - Errors only
- `LogLevel.NONE` - Disable all logging

**Note:** Sensitive information like tokens are automatically sanitised in log output.

## TypeScript Support

The SDK is written in TypeScript and includes full type definitions. All models and parameters are fully typed:

```typescript
import { NeuwoRestClient, GetAiTopicsResponse, Tag } from "neuwo-api";

const client = new NeuwoRestClient({
  token: "your-token",
  baseUrl: "https://api.example.com",
});

const response: GetAiTopicsResponse = await client.getAiTopics({
  content: "Sample text",
  tagLimit: 10,
});

response.tags.forEach((tag: Tag) => {
  console.log(`${tag.value}: ${tag.score}`);
});
```

## Development

### Setup Development Environment

```bash
# Clone repository
git clone https://github.com/neuwoai/neuwo-api-sdk-js-ts.git
cd neuwo-api-sdk-js-ts

# Install dependencies
npm install
```

### Running Tests

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Generate coverage report
npm run test:coverage:report
```

### Code Quality

```bash
# Format code
npm run format

# Check formatting without changes
npm run format:check

# Lint code
npm run lint

# Lint and auto-fix issues
npm run lint:fix

# Type checking
npm run type-check

# Run all checks (format, lint, type-check)
npm run check

# Run all checks including tests
npm run check:all

# Auto-fix formatting and linting issues
npm run fix
```

### Building Distribution

```bash
# Build for production
npm run rebuild

# Build both CJS and ESM
npm run build

# Build only CJS
npm run build:cjs

# Build only ESM
npm run build:esm

# Clean build output
npm run clean
```

### Pre-publish Package Validation

Before publishing, validate your package to ensure it's configured correctly:

```bash
# Clean build the package first
npm run rebuild

# Verify package contents (dry-run)
npm pack --dry-run

# Check for type issues in the package
npx @arethetypeswrong/cli --pack

# Validate package.json configuration
npx publint --strict

# Test npm publish (dry-run)
npm publish --dry-run

# Test JSR publish (dry-run)
npx jsr publish --dry-run
```

These validation steps are automatically run in the CI/CD pipeline before publishing.

## CI/CD

### Automated Testing

The [Unit Tests Coverage workflow](.github/workflows/unit-tests-coverage.yml) automatically runs on every push to `main` or `dev` branches and on pull requests:

- **Node.js versions tested**: 18, 20, 22
- **Coverage reporting**: Results uploaded to Codecov
- **Test execution**: Full test suite with coverage analysis

### Publishing Pipeline

The [Publish JavaScript/TypeScript SDK workflow](.github/workflows/publish-sdk.yml) enables manual deployment with the following options:

#### Workflow Features:

- Manual trigger via GitHub Actions UI
- Deploy to **npm** registry
- Deploy to **JSR** (JavaScript Registry)
- Auto-create **GitHub releases** with tags
- Automatic version extraction from `package.json`
- Package validation with `@arethetypeswrong/cli` and `publint`

#### Setup Requirements:

Add GitHub secrets for API tokens:

- `NPM_TOKEN` - npm registry authentication token
- `JSR_TOKEN` - JSR registry authentication token

#### Workflow Inputs

| Input            | Type    | Default | Description                          |
| ---------------- | ------- | ------- | ------------------------------------ |
| `publish_to_npm` | boolean | true    | Publish to npm registry              |
| `publish_to_jsr` | boolean | true    | Publish to JSR (JavaScript Registry) |
| `create_release` | boolean | true    | Create GitHub release with tag       |

#### Usage:

1. **Prepare release**:
   - Update version in [package.json](package.json) and [README.md](README.md)
   - Commit changes to repository

2. **Publish**:
   - Go to Actions > Publish JavaScript/TypeScript SDK > Run workflow
   - Select desired options (npm, JSR, GitHub release)
   - Creates tag (e.g., `v0.1.0`), GitHub release, and publishes to selected registries

3. **Verify**:
   - Check npm: https://www.npmjs.com/package/neuwo-api
   - Check JSR: https://jsr.io/@neuwo/neuwo-api
   - Check GitHub Release: https://github.com/neuwoai/neuwo-api-sdk-js-ts/releases
   - Test installation: `npm install neuwo-api@latest`

#### What gets created:

- npm package: https://www.npmjs.com/package/neuwo-api
- JSR package: https://jsr.io/@neuwo/neuwo-api
- GitHub release with `.tgz` and distribution files
- Git tag following `v{VERSION}` format
- CDN links (unpkg, jsDelivr, esm.sh)

**Versioning:**

Follow [Semantic Versioning](https://semver.org/) (`MAJOR.MINOR.PATCH`):

- **MAJOR**: Breaking changes
- **MINOR**: New features (backward compatible)
- **PATCH**: Bug fixes (backward compatible)

## License

This project is licensed under the MIT License - see the [LICENCE](LICENCE) file for details.
