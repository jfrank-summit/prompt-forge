// MCP Resource handlers for prompt discovery
import type {
  Resource,
  ResourceTemplate,
  ResourceContents,
} from '@modelcontextprotocol/sdk/types.js';
import {
  loadPrompts,
  getAllCategories,
  getPromptsByCategory,
  searchPrompts,
  getLoadedPrompts,
  createDefaultConfig,
  type PromptLoaderConfig,
} from './prompt-loader.js';
import type { ParsedPrompt } from '../types/prompt.js';
import { createLogger } from './logger.js';

const logger = createLogger('resource-handlers');

export class PromptResourceManager {
  private config: PromptLoaderConfig;
  private initialized = false;

  constructor(config?: PromptLoaderConfig) {
    this.config = config || createDefaultConfig();
  }

  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    logger.info('Initializing prompt resource manager');
    await loadPrompts(this.config);
    this.initialized = true;
    logger.info('Prompt resource manager initialized');
  }

  async listResources(): Promise<Resource[]> {
    await this.initialize();

    const resources: Resource[] = [];

    // Add categories resource
    resources.push({
      uri: 'prompt://categories',
      name: 'Prompt Categories',
      description: 'List all available prompt categories',
      mimeType: 'application/json',
    });

    // Add category resources
    const categories = getAllCategories();
    for (const category of categories) {
      resources.push({
        uri: `prompt://category/${category}`,
        name: `${category} prompts`,
        description: `All prompts in the ${category} category`,
        mimeType: 'application/json',
      });
    }

    // Add individual prompt resources
    const prompts = getLoadedPrompts();
    for (const prompt of prompts) {
      const category = prompt.metadata.category || 'uncategorized';
      resources.push({
        uri: `prompt://prompt/${category}/${prompt.metadata.name}`,
        name: prompt.metadata.title,
        description: prompt.metadata.description,
        mimeType: 'application/json',
      });
    }

    logger.debug('Listed resources', { count: resources.length });
    return resources;
  }

  async listResourceTemplates(): Promise<ResourceTemplate[]> {
    await this.initialize();

    const templates: ResourceTemplate[] = [
      {
        uriTemplate: 'prompt://categories',
        name: 'prompt-categories',
        description: 'List all prompt categories',
        mimeType: 'application/json',
      },
      {
        uriTemplate: 'prompt://category/{category}',
        name: 'prompt-category',
        description: 'Browse prompts in a specific category',
        mimeType: 'application/json',
      },
      {
        uriTemplate: 'prompt://search/{query}',
        name: 'prompt-search',
        description: 'Search prompts by keyword or description',
        mimeType: 'application/json',
      },
      {
        uriTemplate: 'prompt://prompt/{category}/{name}',
        name: 'prompt-detail',
        description: 'Get detailed information about a specific prompt',
        mimeType: 'application/json',
      },
    ];

    logger.debug('Listed resource templates', { count: templates.length });
    return templates;
  }

  async readResource(uri: string): Promise<ResourceContents> {
    await this.initialize();

    logger.debug('Reading resource', { uri });

    const parsed = this.parsePromptUri(uri);

    switch (parsed.type) {
      case 'categories':
        return this.getCategoriesResource(uri);

      case 'category':
        return this.getCategoryResource(uri, parsed.category!);

      case 'search':
        return this.getSearchResource(uri, parsed.query!);

      case 'prompt':
        return this.getPromptResource(uri, parsed.category!, parsed.name!);

      default:
        throw new Error(`Unknown resource URI: ${uri}`);
    }
  }

  private parsePromptUri(uri: string): {
    type: 'categories' | 'category' | 'search' | 'prompt';
    category?: string;
    name?: string;
    query?: string;
  } {
    // Remove prompt:// prefix
    const path = uri.replace(/^prompt:\/\//, '');
    const segments = path.split('/');

    if (path === 'categories') {
      return { type: 'categories' };
    }

    if (segments[0] === 'category' && segments[1]) {
      return { type: 'category', category: segments[1] };
    }

    if (segments[0] === 'search' && segments[1]) {
      return { type: 'search', query: decodeURIComponent(segments[1]) };
    }

    if (segments[0] === 'prompt' && segments[1] && segments[2]) {
      return {
        type: 'prompt',
        category: segments[1],
        name: segments[2],
      };
    }

    throw new Error(`Invalid prompt URI format: ${uri}`);
  }

  private getCategoriesResource(uri: string): ResourceContents {
    const categories = getAllCategories();
    const categoriesWithCounts = categories.map((category) => {
      const prompts = getPromptsByCategory(category);
      return {
        name: category,
        count: prompts.length,
        prompts: prompts.map((p) => ({
          name: p.metadata.name,
          title: p.metadata.title,
          description: p.metadata.description,
        })),
      };
    });

    return {
      uri,
      contents: [
        {
          uri,
          mimeType: 'application/json',
          text: JSON.stringify(
            {
              categories: categoriesWithCounts,
              total: categories.length,
            },
            null,
            2,
          ),
        },
      ],
    };
  }

  private getCategoryResource(uri: string, category: string): ResourceContents {
    const prompts = getPromptsByCategory(category);

    if (prompts.length === 0) {
      throw new Error(`Category not found: ${category}`);
    }

    const promptList = prompts.map((prompt) => ({
      name: prompt.metadata.name,
      title: prompt.metadata.title,
      description: prompt.metadata.description,
      tags: prompt.metadata.tags,
      variables: prompt.metadata.variables.map((v) => ({
        name: v.name,
        type: v.type,
        required: v.required,
        description: v.description,
      })),
      uri: `prompt://prompt/${category}/${prompt.metadata.name}`,
    }));

    return {
      uri,
      contents: [
        {
          uri,
          mimeType: 'application/json',
          text: JSON.stringify(
            {
              category,
              prompts: promptList,
              count: prompts.length,
            },
            null,
            2,
          ),
        },
      ],
    };
  }

  private getSearchResource(uri: string, query: string): ResourceContents {
    const results = searchPrompts(query);

    const searchResults = results.map((prompt) => ({
      name: prompt.metadata.name,
      title: prompt.metadata.title,
      description: prompt.metadata.description,
      category: prompt.metadata.category,
      tags: prompt.metadata.tags,
      uri: `prompt://prompt/${prompt.metadata.category || 'uncategorized'}/${prompt.metadata.name}`,
    }));

    return {
      uri,
      contents: [
        {
          uri,
          mimeType: 'application/json',
          text: JSON.stringify(
            {
              query,
              results: searchResults,
              count: results.length,
            },
            null,
            2,
          ),
        },
      ],
    };
  }

  private getPromptResource(
    uri: string,
    category: string,
    name: string,
  ): ResourceContents {
    const prompts = getPromptsByCategory(category);
    const prompt = prompts.find((p) => p.metadata.name === name);

    if (!prompt) {
      throw new Error(`Prompt not found: ${category}/${name}`);
    }

    const promptData = {
      name: prompt.metadata.name,
      title: prompt.metadata.title,
      description: prompt.metadata.description,
      category: prompt.metadata.category,
      tags: prompt.metadata.tags,
      variables: prompt.metadata.variables,
      examples: prompt.metadata.examples,
      template: prompt.template,
      filePath: prompt.filePath,
    };

    return {
      uri,
      contents: [
        {
          uri,
          mimeType: 'application/json',
          text: JSON.stringify(promptData, null, 2),
        },
      ],
    };
  }
}
