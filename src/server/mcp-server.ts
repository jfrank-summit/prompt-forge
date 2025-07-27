import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListResourceTemplatesRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import type { MCPServerConfig } from '../types/mcp.js';
import { createLogger } from './logger.js';
import {
  loadPrompts,
  getPrompt,
  createDefaultConfig,
} from './prompt-loader.js';
import type { ParsedPrompt } from '../types/prompt.js';

const logger = createLogger('mcp-server');

// Create and configure MCP server (with prompt loading)
export const createMCPServer = (config: MCPServerConfig): Server => {
  const promptConfig = createDefaultConfig();
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

  // Register request handlers with actual implementations
  server.setRequestHandler(ListResourcesRequestSchema, async () => {
    try {
      const prompts = await loadPrompts(promptConfig);
      const resources = prompts.map((prompt) => ({
        uri: `prompt://${prompt.metadata.name}`,
        name: prompt.metadata.title,
        description: prompt.metadata.description,
        mimeType: 'text/yaml',
      }));

      logger.info('Listed resources', { count: resources.length });
      return { resources };
    } catch (error) {
      logger.logError(error as Error, 'Failed to list resources');
      return { resources: [] };
    }
  });

  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    try {
      const uri = request.params.uri;

      // Parse prompt:// URI
      if (!uri.startsWith('prompt://')) {
        throw new Error(`Unsupported URI scheme: ${uri}`);
      }

      const promptName = uri.substring('prompt://'.length);
      const prompt = await getPrompt(promptName, promptConfig);

      if (!prompt) {
        throw new Error(`Prompt not found: ${promptName}`);
      }

      // Return raw YAML file content for browsing
      logger.info('Read resource', { uri, name: prompt.metadata.name });
      return {
        contents: [
          {
            uri,
            mimeType: 'text/yaml',
            text: `---
name: ${prompt.metadata.name}
title: ${prompt.metadata.title}
description: ${prompt.metadata.description}
category: ${prompt.metadata.category || 'general'}
---
${prompt.template}`,
          },
        ],
      };
    } catch (error) {
      logger.logError(error as Error, 'Failed to read resource', {
        uri: request.params.uri,
      });
      throw error;
    }
  });

  server.setRequestHandler(ListResourceTemplatesRequestSchema, async () => {
    // Resource templates for browsing prompts by category
    return {
      resourceTemplates: [
        {
          uriTemplate: 'prompt://{name}',
          name: 'Prompt',
          description: 'Access a specific prompt by name',
          mimeType: 'text/yaml',
        },
      ],
    };
  });

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    try {
      const prompts = await loadPrompts(promptConfig);
      const tools = prompts.map((prompt) => ({
        name: `execute-prompt-${prompt.metadata.name}`,
        description: `Execute the ${prompt.metadata.title} prompt`,
        inputSchema: {
          type: 'object',
          properties: {
            variables: {
              type: 'object',
              description: 'Variables to substitute in the prompt template',
              additionalProperties: true,
            },
          },
          required: [],
        },
      }));

      logger.info('Listed tools', { count: tools.length });
      return { tools };
    } catch (error) {
      logger.logError(error as Error, 'Failed to list tools');
      return { tools: [] };
    }
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    try {
      const toolName = request.params.name;

      // Extract prompt name from tool name
      if (!toolName.startsWith('execute-prompt-')) {
        throw new Error(`Unknown tool: ${toolName}`);
      }

      const promptName = toolName.substring('execute-prompt-'.length);
      const prompt = await getPrompt(promptName, promptConfig);

      if (!prompt) {
        throw new Error(`Prompt not found: ${promptName}`);
      }

      // Get variables from tool arguments
      const variables = request.params.arguments?.variables || {};

      // For now, just return the template with basic variable info
      // TODO: In commit 5, implement proper template rendering
      logger.info('Executed tool', { tool: toolName, prompt: promptName });
      return {
        content: [
          {
            type: 'text' as const,
            text: `Prompt: ${prompt.metadata.title}

Template:
${prompt.template}

Variables provided: ${JSON.stringify(variables, null, 2)}

(Template rendering will be implemented in commit 5)`,
          },
        ],
      };
    } catch (error) {
      logger.logError(error as Error, 'Failed to execute tool', {
        tool: request.params.name,
      });
      return {
        content: [
          {
            type: 'text' as const,
            text: `Error executing tool: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  });

  logger.info('MCP server created with proper SDK request handlers');

  return server;
};
