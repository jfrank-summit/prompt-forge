// Winston-style MCP-compliant logging utilities
// CRITICAL: STDIO servers must NEVER write to stdout - only stderr

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

// Simple log level checking
const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

// Current log level (can be set via environment)
let currentLogLevel: LogLevel = 'info';

// Check if we should log at this level
const shouldLog = (level: LogLevel): boolean => {
  return LOG_LEVELS[level] >= LOG_LEVELS[currentLogLevel];
};

// Format log message with timestamp and module
const formatMessage = (
  level: LogLevel,
  module: string,
  message: string,
  context?: Record<string, unknown>,
): string => {
  const timestamp = new Date().toISOString();
  const contextStr = context ? ` ${JSON.stringify(context)}` : '';
  return `[${timestamp}] ${level.toUpperCase()} [${module}]: ${message}${contextStr}`;
};

// Logger interface for modules
export interface Logger {
  debug: (message: string, context?: Record<string, unknown>) => void;
  info: (message: string, context?: Record<string, unknown>) => void;
  warn: (message: string, context?: Record<string, unknown>) => void;
  error: (message: string, context?: Record<string, unknown>) => void;
  logError: (
    err: Error,
    message?: string,
    context?: Record<string, unknown>,
  ) => void;
}

// Create a logger for a specific module
export const createLogger = (moduleName: string): Logger => {
  return {
    debug: (message: string, context?: Record<string, unknown>): void => {
      if (shouldLog('debug')) {
        console.error(formatMessage('debug', moduleName, message, context));
      }
    },

    info: (message: string, context?: Record<string, unknown>): void => {
      if (shouldLog('info')) {
        console.error(formatMessage('info', moduleName, message, context));
      }
    },

    warn: (message: string, context?: Record<string, unknown>): void => {
      if (shouldLog('warn')) {
        console.error(formatMessage('warn', moduleName, message, context));
      }
    },

    error: (message: string, context?: Record<string, unknown>): void => {
      if (shouldLog('error')) {
        console.error(formatMessage('error', moduleName, message, context));
      }
    },

    logError: (
      err: Error,
      message?: string,
      context?: Record<string, unknown>,
    ): void => {
      if (shouldLog('error')) {
        console.error(
          formatMessage('error', moduleName, message || err.message, {
            ...context,
            error: err.name,
            stack: err.stack,
          }),
        );
      }
    },
  };
};

// Set log level from environment or programmatically
export const setLogLevel = (level: LogLevel): void => {
  currentLogLevel = level;
};

// Configure logging from environment
export const configureLogging = (): void => {
  const envLevel = (process.env.LOG_LEVEL?.toLowerCase() as LogLevel) || 'info';

  if (LOG_LEVELS[envLevel] !== undefined) {
    setLogLevel(envLevel);
    const logger = createLogger('logger');
    logger.debug('Logging configured', { level: envLevel });
  } else {
    const logger = createLogger('logger');
    logger.warn('Invalid LOG_LEVEL environment variable', {
      provided: process.env.LOG_LEVEL,
    });
  }
};
