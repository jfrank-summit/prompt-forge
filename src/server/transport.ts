import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { MCPServerConfig } from '../types/mcp.js';

// Create stdio transport for Cursor integration
export const createStdioTransport = (): StdioServerTransport => {
  return new StdioServerTransport();
};

// Server configuration for MCP
export const createServerConfig = (): MCPServerConfig => ({
  name: 'prompt-forge',
  version: '1.0.0',
});

// Transport connection helper
export const connectTransport = async (
  server: Server,
  transport: StdioServerTransport,
): Promise<void> => {
  await server.connect(transport);
  console.error('PromptForge MCP server connected via stdio');
};
