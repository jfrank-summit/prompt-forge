import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListResourceTemplatesRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import type { MCPServerConfig } from '../types/mcp.js';

// Create and configure MCP server (basic setup)
export const createMCPServer = (config: MCPServerConfig): Server => {
  const server = new Server(
    {
      name: config.name,
      version: config.version,
    },
    {
      capabilities: {
        tools: {},
        resources: {},
      },
    },
  );

  // Register request handlers with proper SDK schemas
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    // TODO: Return actual tools in commit 2
    return { tools: [] };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    // TODO: Implement tool execution in commit 2
    return {
      content: [
        {
          type: 'text' as const,
          text: `Tool execution not yet implemented for: ${request.params.name}`,
        },
      ],
      isError: true,
    };
  });

  server.setRequestHandler(ListResourcesRequestSchema, async () => {
    // TODO: Return actual resources in commit 2
    return { resources: [] };
  });

  server.setRequestHandler(ListResourceTemplatesRequestSchema, async () => {
    // TODO: Return actual resource templates in commit 2
    return { resourceTemplates: [] };
  });

  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    // TODO: Implement resource reading in commit 2
    throw new Error(
      `Resource reading not implemented for: ${request.params.uri}`,
    );
  });

  console.error('MCP server created with proper SDK request handlers');

  return server;
};
