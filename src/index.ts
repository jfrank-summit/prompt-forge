#!/usr/bin/env node

import { createMCPServer } from './server/mcp-server.js';
import {
  createServerConfig,
  createStdioTransport,
  connectTransport,
} from './server/transport.js';
import { createLogger, configureLogging } from './server/logger.js';

// Configure logging first
configureLogging();

const logger = createLogger('main');
logger.info('PromptForge MCP Server starting...');

const main = async (): Promise<void> => {
  try {
    // Create server configuration
    const config = createServerConfig();
    logger.info('Initializing server', {
      name: config.name,
      version: config.version,
    });

    // Create MCP server
    const server = createMCPServer(config);

    // Create stdio transport for Cursor integration
    const transport = createStdioTransport();

    // Connect server to transport
    await connectTransport(server, transport);

    logger.info('PromptForge MCP server ready');
  } catch (error) {
    logger.logError(error as Error, 'Failed to initialize MCP server');
    throw error;
  }
};

main().catch((error) => {
  logger.logError(error as Error, 'Failed to start server');
  process.exit(1);
});
