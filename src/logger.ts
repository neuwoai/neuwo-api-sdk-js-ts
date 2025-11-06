/**
 * Logging system for Neuwo API SDK.
 *
 * Provides configurable logging with different levels and the ability
 * to enable/disable logging. Tokens are automatically sanitised in log output.
 */

/**
 * Log levels matching standard severity.
 */
export enum LogLevel {
    DEBUG = 0,
    INFO = 1,
    WARNING = 2,
    ERROR = 3,
    NONE = 999,
}

/**
 * Logger configuration.
 */
interface LoggerConfig {
    level: LogLevel;
    enabled: boolean;
}

/**
 * Global logger configuration.
 */
const loggerConfig: LoggerConfig = {
    level: LogLevel.WARNING,
    enabled: true,
};

/**
 * Sanitise sensitive information from log messages.
 */
function sanitise(message: string): string {
    // Replace tokens in URLs and headers
    return message
        .replace(/token=[^&\s]+/gi, "token=***")
        .replace(/["']token["']:\s*["'][^"']+["']/gi, '"token": "***"')
        .replace(/Authorization:\s*[^\s]+/gi, "Authorization: ***");
}

/**
 * Format log message with timestamp and level.
 */
function formatMessage(level: string, message: string): string {
    const timestamp = new Date().toISOString();
    return `${timestamp} - neuwo-api - ${level} - ${sanitise(message)}`;
}

/**
 * Log a message if logging is enabled and level is sufficient.
 */
function log(level: LogLevel, levelName: string, message: string): void {
    if (!loggerConfig.enabled || level < loggerConfig.level) {
        return;
    }

    const formatted = formatMessage(levelName, message);

    switch (level) {
        case LogLevel.DEBUG:
        case LogLevel.INFO:
            console.log(formatted);
            break;
        case LogLevel.WARNING:
            console.warn(formatted);
            break;
        case LogLevel.ERROR:
            console.error(formatted);
            break;
    }
}

/**
 * Logger instance with methods for each log level.
 */
export const logger = {
    /**
     * Log debug message.
     */
    debug(message: string): void {
        log(LogLevel.DEBUG, "DEBUG", message);
    },

    /**
     * Log info message.
     */
    info(message: string): void {
        log(LogLevel.INFO, "INFO", message);
    },

    /**
     * Log warning message.
     */
    warning(message: string): void {
        log(LogLevel.WARNING, "WARNING", message);
    },

    /**
     * Log error message.
     */
    error(message: string): void {
        log(LogLevel.ERROR, "ERROR", message);
    },
};

/**
 * Configure the logger with custom settings.
 *
 * @param level - Minimum log level to display
 * @example
 * ```typescript
 * import { setupLogger, LogLevel } from 'neuwo-api';
 *
 * // Enable debug logging
 * setupLogger(LogLevel.DEBUG);
 *
 * // Only show warnings and errors
 * setupLogger(LogLevel.WARNING);
 * ```
 */
export function setupLogger(level: LogLevel = LogLevel.WARNING): void {
    loggerConfig.level = level;
    loggerConfig.enabled = true;
}

/**
 * Disable all logging output.
 *
 * @example
 * ```typescript
 * import { disableLogger } from 'neuwo-api';
 *
 * disableLogger();
 * ```
 */
export function disableLogger(): void {
    loggerConfig.enabled = false;
}

/**
 * Enable logging with specified level.
 *
 * @param level - Minimum log level to display (default: WARNING)
 * @example
 * ```typescript
 * import { enableLogger, LogLevel } from 'neuwo-api';
 *
 * enableLogger(LogLevel.INFO);
 * ```
 */
export function enableLogger(level: LogLevel = LogLevel.WARNING): void {
    loggerConfig.level = level;
    loggerConfig.enabled = true;
}

/**
 * Get current logger configuration.
 */
export function getLoggerConfig(): Readonly<LoggerConfig> {
    return { ...loggerConfig };
}
