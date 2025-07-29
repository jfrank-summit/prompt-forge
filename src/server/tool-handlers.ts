// MCP Tool handlers for prompt execution and discovery (functional approach)
import type { Tool, CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { PromptResourceManager } from './resource-handlers.js';
import { renderPrompt, getVariableInfo } from './template-engine.js';
import {
  searchPrompts,
  getPromptsByCategory,
  getLoadedPrompts,
  createDefaultConfig,
  type PromptLoaderConfig,
} from './prompt-loader.js';
import type { ParsedPrompt } from '../types/prompt.js';
import { createLogger } from './logger.js';

const logger = createLogger('tool-handlers');

// State for the prompt system
let resourceManager: PromptResourceManager | null = null;
let initialized = false;

const initializePromptSystem = async (
  config?: PromptLoaderConfig,
): Promise<void> => {
  if (initialized) {
    return;
  }

  logger.info('Initializing prompt tool system');
  resourceManager = new PromptResourceManager(config || createDefaultConfig());
  await resourceManager.initialize();
  initialized = true;
  logger.info('Prompt tool system initialized');
};

/**
 * Get list of available tools
 */
export const listPromptTools = async (): Promise<Tool[]> => {
  await initializePromptSystem();

  return [
    {
      name: 'execute-prompt',
      description: 'Render a prompt with variable substitution',
      inputSchema: {
        type: 'object',
        properties: {
          promptUri: {
            type: 'string',
            description:
              'Prompt resource URI (e.g., prompt://prompt/code-review/comprehensive-code-review)',
          },
          variables: {
            type: 'object',
            description: 'Variables for template substitution',
            additionalProperties: true,
          },
        },
        required: ['promptUri'],
      },
    },
    {
      name: 'search-prompts',
      description: 'Find prompts matching specific criteria',
      inputSchema: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Search query to find prompts',
          },
          category: {
            type: 'string',
            description: 'Filter by category (optional)',
          },
          tags: {
            type: 'array',
            items: { type: 'string' },
            description: 'Filter by tags (optional)',
          },
        },
        required: ['query'],
      },
    },
  ];
};

/**
 * Execute a tool call
 */
export const callPromptTool = async (
  name: string,
  args: any,
): Promise<CallToolResult> => {
  await initializePromptSystem();

  logger.debug('Calling tool', { tool: name, args });

  switch (name) {
    case 'execute-prompt':
      return executePromptTool(args);

    case 'search-prompts':
      return searchPromptsTool(args);

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
};

/**
 * Execute prompt tool - render a prompt with variables
 */
const executePromptTool = async (args: {
  promptUri: string;
  variables?: Record<string, unknown>;
}): Promise<CallToolResult> => {
  try {
    const { promptUri, variables = {} } = args;

    logger.info('Executing prompt', {
      promptUri,
      variableCount: Object.keys(variables).length,
    });

    // Parse the prompt URI to find the prompt
    const prompt = await findPromptByUri(promptUri);
    if (!prompt) {
      return {
        content: [
          {
            type: 'text',
            text: `Error: Prompt not found for URI: ${promptUri}`,
          },
        ],
        isError: true,
      };
    }

    // Get variable information
    const variableInfo = getVariableInfo(prompt);

    // Render the prompt
    const renderResult = renderPrompt(prompt, variables);

    if (!renderResult.success) {
      return {
        content: [
          {
            type: 'text',
            text: `Error rendering prompt: ${renderResult.errors.join('; ')}`,
          },
        ],
        isError: true,
      };
    }

    // Return successful result
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              prompt: {
                name: prompt.metadata.name,
                title: prompt.metadata.title,
                description: prompt.metadata.description,
                category: prompt.metadata.category,
              },
              variables: {
                provided: variables,
                required: variableInfo.required,
                optional: variableInfo.optional,
              },
              rendered: renderResult.rendered,
            },
            null,
            2,
          ),
        },
      ],
    };
  } catch (error) {
    logger.logError(error as Error, 'Failed to execute prompt');
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
};

/**
 * Search prompts tool - find prompts by criteria
 */
const searchPromptsTool = async (args: {
  query: string;
  category?: string;
  tags?: string[];
}): Promise<CallToolResult> => {
  try {
    const { query, category, tags } = args;

    logger.info('Searching prompts', { query, category, tags });

    let results: ParsedPrompt[] = [];

    // Search by query
    if (query) {
      results = searchPrompts(query);
    } else {
      results = getLoadedPrompts();
    }

    // Filter by category if specified
    if (category) {
      results = results.filter((p) => p.metadata.category === category);
    }

    // Filter by tags if specified
    if (tags && tags.length > 0) {
      results = results.filter((p) =>
        tags.some((tag) => p.metadata.tags.includes(tag)),
      );
    }

    // Format results
    const searchResults = results.map((prompt) => ({
      uri: `prompt://prompt/${prompt.metadata.category || 'uncategorized'}/${prompt.metadata.name}`,
      name: prompt.metadata.name,
      title: prompt.metadata.title,
      description: prompt.metadata.description,
      category: prompt.metadata.category,
      tags: prompt.metadata.tags,
      variables: prompt.metadata.variables.map((v) => ({
        name: v.name,
        type: v.type,
        required: v.required,
        description: v.description,
      })),
    }));

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              query,
              filters: { category, tags },
              results: searchResults,
              count: searchResults.length,
            },
            null,
            2,
          ),
        },
      ],
    };
  } catch (error) {
    logger.logError(error as Error, 'Failed to search prompts');
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
};

/**
 * Find a prompt by its URI
 */
const findPromptByUri = async (uri: string): Promise<ParsedPrompt | null> => {
  try {
    // Parse URI: prompt://prompt/{category}/{name}
    const match = uri.match(/^prompt:\/\/prompt\/([^/]+)\/(.+)$/);
    if (!match) {
      logger.warn('Invalid prompt URI format', { uri });
      return null;
    }

    const [, category, name] = match;

    // Find the prompt
    const categoryPrompts = getPromptsByCategory(category);
    const prompt = categoryPrompts.find((p) => p.metadata.name === name);

    if (!prompt) {
      logger.warn('Prompt not found', { category, name, uri });
      return null;
    }

    return prompt;
  } catch (error) {
    logger.logError(error as Error, `Failed to find prompt by URI: ${uri}`);
    return null;
  }
};
