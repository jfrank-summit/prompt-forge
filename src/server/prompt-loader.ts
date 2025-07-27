// Prompt loading and management system (functional approach)
import { readdir, readFile, stat } from 'fs/promises';
import { join, extname, basename } from 'path';
import type { ParsedPrompt, PromptMetadata } from '../types/prompt.js';
import { createLogger } from './logger.js';

const logger = createLogger('prompt-loader');

export interface PromptLoaderConfig {
  promptsDirectory: string;
}

// Cache for loaded prompts
const promptCache = new Map<string, ParsedPrompt>();
let lastScanTime = 0;

// Load all prompts from the prompts directory
export const loadPrompts = async (
  config: PromptLoaderConfig,
): Promise<ParsedPrompt[]> => {
  try {
    logger.info('Loading prompts', { directory: config.promptsDirectory });

    const promptFiles = await scanForPromptFiles(config.promptsDirectory);
    const prompts: ParsedPrompt[] = [];

    for (const filePath of promptFiles) {
      try {
        const prompt = await parsePromptFile(filePath);
        if (prompt) {
          prompts.push(prompt);
          promptCache.set(prompt.metadata.name, prompt);
        }
      } catch (error) {
        logger.error(`Failed to parse prompt file: ${filePath}`, {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    lastScanTime = Date.now();
    logger.info('Prompts loaded successfully', { count: prompts.length });

    return prompts;
  } catch (error) {
    logger.logError(error as Error, 'Failed to load prompts');
    return [];
  }
};

// Get a specific prompt by name
export const getPrompt = async (
  name: string,
  config: PromptLoaderConfig,
): Promise<ParsedPrompt | null> => {
  // If we have it cached, return it
  if (promptCache.has(name)) {
    return promptCache.get(name)!;
  }

  // Otherwise, reload all prompts and try again
  await loadPrompts(config);
  return promptCache.get(name) || null;
};

// Get all loaded prompts
export const getLoadedPrompts = (): ParsedPrompt[] => {
  return Array.from(promptCache.values());
};

// Scan directory recursively for .yaml/.yml files
const scanForPromptFiles = async (directory: string): Promise<string[]> => {
  const files: string[] = [];

  try {
    const entries = await readdir(directory);

    for (const entry of entries) {
      const fullPath = join(directory, entry);
      const stats = await stat(fullPath);

      if (stats.isDirectory()) {
        // Recursively scan subdirectories
        const subFiles = await scanForPromptFiles(fullPath);
        files.push(...subFiles);
      } else if (stats.isFile()) {
        const ext = extname(entry).toLowerCase();
        if (ext === '.yaml' || ext === '.yml') {
          files.push(fullPath);
        }
      }
    }
  } catch (error) {
    logger.warn(`Cannot scan directory: ${directory}`, {
      error: error instanceof Error ? error.message : String(error),
    });
  }

  return files;
};

// Parse a single YAML prompt file
const parsePromptFile = async (
  filePath: string,
): Promise<ParsedPrompt | null> => {
  try {
    const content = await readFile(filePath, 'utf-8');

    // For now, we'll do a simple YAML-like parsing
    // TODO: In commit 3, we'll add proper YAML parsing
    const lines = content.split('\n');

    // Look for YAML front matter between --- markers
    let yamlStart = -1;
    let yamlEnd = -1;

    for (let i = 0; i < lines.length; i++) {
      if (lines[i].trim() === '---') {
        if (yamlStart === -1) {
          yamlStart = i;
        } else {
          yamlEnd = i;
          break;
        }
      }
    }

    if (yamlStart === -1 || yamlEnd === -1) {
      logger.warn(`No YAML front matter found in: ${filePath}`);
      return null;
    }

    // Extract YAML content and template
    const yamlContent = lines.slice(yamlStart + 1, yamlEnd).join('\n');
    const templateContent = lines
      .slice(yamlEnd + 1)
      .join('\n')
      .trim();

    // Simple YAML parsing (will be improved in commit 3)
    const metadata = parseSimpleYaml(yamlContent);

    // Use filename as fallback name
    if (!metadata.name) {
      metadata.name = basename(filePath, extname(filePath));
    }

    return {
      metadata,
      template: templateContent,
      filePath,
    };
  } catch (error) {
    logger.logError(error as Error, `Failed to parse prompt file: ${filePath}`);
    return null;
  }
};

// Simple YAML parser for basic metadata (improved in commit 3)
const parseSimpleYaml = (yamlContent: string): PromptMetadata => {
  const metadata: Partial<PromptMetadata> = {};
  const lines = yamlContent.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const colonIndex = trimmed.indexOf(':');
    if (colonIndex === -1) {
      continue;
    }

    const key = trimmed.substring(0, colonIndex).trim();
    const value = trimmed
      .substring(colonIndex + 1)
      .trim()
      .replace(/^['"]|['"]$/g, '');

    switch (key) {
      case 'name':
        metadata.name = value;
        break;
      case 'title':
        metadata.title = value;
        break;
      case 'description':
        metadata.description = value;
        break;
      case 'category':
        metadata.category = value;
        break;
    }
  }

  return {
    name: metadata.name || 'untitled',
    title: metadata.title || metadata.name || 'Untitled Prompt',
    description: metadata.description || 'No description provided',
    category: metadata.category,
    tags: metadata.tags || [],
    variables: metadata.variables || [],
    examples: metadata.examples || [],
  };
};

// Default prompts directory configuration
export const createDefaultConfig = (): PromptLoaderConfig => ({
  promptsDirectory: join(process.cwd(), '.product', 'prompts'),
});
