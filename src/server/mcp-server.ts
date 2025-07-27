import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListResourceTemplatesRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { createLogger } from './logger.js';

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

  // Set up request handlers exactly like the docs
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

  server.setRequestHandler(ListResourcesRequestSchema, async () => {
    logger.debug('Handling ListResourcesRequestSchema');
    return {
      resources: [
        {
          uri: 'test://example',
          name: 'Test Resource',
          description: 'A simple test resource',
          mimeType: 'text/plain',
        },
      ],
    };
  });

  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    logger.info('Handling ReadResourceRequestSchema', {
      uri: request.params.uri,
    });

    if (request.params.uri === 'test://example') {
      return {
        contents: [
          {
            uri: request.params.uri,
            mimeType: 'text/plain',
            text: 'This is a test resource content!',
          },
        ],
      };
    }

    throw new Error(`Unknown resource: ${request.params.uri}`);
  });

  server.setRequestHandler(ListResourceTemplatesRequestSchema, async () => {
    logger.debug('Handling ListResourceTemplatesRequestSchema');
    return {
      resourceTemplates: [
        {
          uriTemplate: 'test://{name}',
          name: 'Test Template',
          description: 'A simple test template',
          mimeType: 'text/plain',
        },
      ],
    };
  });

  logger.info('PromptForge MCP server configured with basic handlers');
  return server;
};
