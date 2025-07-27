import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListResourceTemplatesRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { createLogger } from './logger.js';
import { PromptResourceManager } from './resource-handlers.js';

const logger = createLogger('mcp-server');

export const createMCPServer = () => {
  logger.info('Creating PromptForge MCP server');

  const server = new Server(
    {
      name: 'prompt-forge',
      version: '0.1.0',
    },
    {
      capabilities: {
        tools: {},
        resources: {},
      },
    },
  );

  // Initialize prompt resource manager
  const resourceManager = new PromptResourceManager();

  // Resource handlers for prompt discovery
  server.setRequestHandler(ListResourcesRequestSchema, async () => {
    logger.debug('Handling ListResourcesRequestSchema');
    try {
      const resources = await resourceManager.listResources();
      return { resources };
    } catch (error) {
      logger.logError(error as Error, 'Failed to list resources');
      throw error;
    }
  });

  server.setRequestHandler(ListResourceTemplatesRequestSchema, async () => {
    logger.debug('Handling ListResourceTemplatesRequestSchema');
    try {
      const resourceTemplates = await resourceManager.listResourceTemplates();
      return { resourceTemplates };
    } catch (error) {
      logger.logError(error as Error, 'Failed to list resource templates');
      throw error;
    }
  });

  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    logger.info('Handling ReadResourceRequestSchema', {
      uri: request.params.uri,
    });

    try {
      return await resourceManager.readResource(request.params.uri);
    } catch (error) {
      logger.logError(
        error as Error,
        `Failed to read resource: ${request.params.uri}`,
      );
      throw error;
    }
  });

  // Tool handlers (keeping test tool for now)
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    logger.debug('Handling ListToolsRequestSchema');
    return {
      tools: [
        {
          name: 'test-tool',
          description: 'A simple test tool',
          inputSchema: {
            type: 'object',
            properties: {
              message: {
                type: 'string',
                description: 'A test message',
              },
            },
            required: ['message'],
          },
        },
      ],
    };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    logger.debug('Handling CallToolRequestSchema', {
      tool: request.params.name,
    });

    if (request.params.name === 'test-tool') {
      const args = request.params.arguments || {};
      return {
        content: [
          {
            type: 'text',
            text: `Hello! You said: ${args.message || 'nothing'}`,
          },
        ],
      };
    }

    throw new Error(`Unknown tool: ${request.params.name}`);
  });

  logger.info(
    'PromptForge MCP server configured with prompt resource handlers',
  );
  return server;
};
