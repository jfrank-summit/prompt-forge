import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { MCPServerConfig } from '../types/mcp.js';
import { createLogger } from './logger.js';

const logger = createLogger('transport');

// Create stdio transport for Cursor integration
export const createStdioTransport = (): StdioServerTransport => {
  logger.debug('Creating STDIO transport for MCP communication');
  return new StdioServerTransport();
};

// Server configuration for MCP
export const createServerConfig = (): MCPServerConfig => ({
  name: 'prompt-forge',
  version: '0.1.0',
});

// Transport connection helper
export const connectTransport = async (
  server: Server,
  transport: StdioServerTransport,
): Promise<void> => {
  try {
    await server.connect(transport);
    logger.info('MCP server connected via STDIO transport');
  } catch (error) {
    logger.logError(error as Error, 'Failed to connect server to transport');
    throw error;
  }
};
