#!/usr/bin/env node

import { createMCPServer } from './server/mcp-server.js';
import {
  createServerConfig,
  createStdioTransport,
  connectTransport,
} from './server/transport.js';

console.error('PromptForge MCP Server starting...');

const main = async (): Promise<void> => {
  try {
    // Create server configuration
    const config = createServerConfig();
    console.error(`Initializing ${config.name} v${config.version}`);

    // Create MCP server
    const server = createMCPServer(config);

    // Create stdio transport for Cursor integration
    const transport = createStdioTransport();

    // Connect server to transport
    await connectTransport(server, transport);

    console.error('PromptForge MCP server ready');
  } catch (error) {
    console.error('Failed to initialize MCP server:', error);
    throw error;
  }
};

main().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
