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
import { listPromptTools, callPromptTool } from './tool-handlers.js';

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

  // Tool handlers for prompt execution
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    logger.debug('Handling ListToolsRequestSchema');
    try {
      const tools = await listPromptTools();
      return { tools };
    } catch (error) {
      logger.logError(error as Error, 'Failed to list tools');
      throw error;
    }
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    logger.debug('Handling CallToolRequestSchema', {
      tool: request.params.name,
    });

    try {
      return await callPromptTool(
        request.params.name,
        request.params.arguments || {},
      );
    } catch (error) {
      logger.logError(
        error as Error,
        `Failed to call tool: ${request.params.name}`,
      );
      throw error;
    }
  });

  // Resource handlers for prompt discovery (kept for future when Cursor supports resources)
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

  logger.info(
    'PromptForge MCP server configured with prompt execution tools and resource handlers',
  );
  return server;
};
