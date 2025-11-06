/**
 * Unit tests for logger.
 */

import assert from "node:assert";
import { beforeEach, describe, test } from "node:test";

import {
    disableLogger,
    enableLogger,
    getLoggerConfig,
    LogLevel,
    setupLogger,
} from "../dist/esm/logger.js";

describe("Logger", () => {
    beforeEach(() => {
        // Reset to default state before each test
        setupLogger(LogLevel.WARNING);
    });

    test("should have default configuration", () => {
        const config = getLoggerConfig();
        assert.strictEqual(config.level, LogLevel.WARNING);
        assert.strictEqual(config.enabled, true);
    });

    test("setupLogger should change log level", () => {
        setupLogger(LogLevel.DEBUG);
        const config = getLoggerConfig();
        assert.strictEqual(config.level, LogLevel.DEBUG);
        assert.strictEqual(config.enabled, true);
    });

    test("disableLogger should disable logging", () => {
        disableLogger();
        const config = getLoggerConfig();
        assert.strictEqual(config.enabled, false);
    });

    test("enableLogger should enable logging", () => {
        disableLogger();
        enableLogger(LogLevel.INFO);
        const config = getLoggerConfig();
        assert.strictEqual(config.enabled, true);
        assert.strictEqual(config.level, LogLevel.INFO);
    });

    test("enableLogger should use WARNING as default level", () => {
        disableLogger();
        enableLogger();
        const config = getLoggerConfig();
        assert.strictEqual(config.level, LogLevel.WARNING);
    });

    test("LogLevel enum should have correct values", () => {
        assert.strictEqual(LogLevel.DEBUG, 0);
        assert.strictEqual(LogLevel.INFO, 1);
        assert.strictEqual(LogLevel.WARNING, 2);
        assert.strictEqual(LogLevel.ERROR, 3);
        assert.strictEqual(LogLevel.NONE, 999);
    });

    test("getLoggerConfig should return immutable copy", () => {
        const config1 = getLoggerConfig();
        const config2 = getLoggerConfig();
        assert.notStrictEqual(config1, config2);
        assert.deepStrictEqual(config1, config2);
    });
});
