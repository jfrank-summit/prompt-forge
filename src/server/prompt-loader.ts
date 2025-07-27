// Prompt loading and management system with proper YAML parsing
import { readdir, readFile, stat } from 'fs/promises';
import { join, extname, basename, relative } from 'path';
import * as yaml from 'js-yaml';
import type {
  ParsedPrompt,
  PromptMetadata,
  PromptValidationError,
  PromptLoadResult,
} from '../types/prompt.js';
import { validatePromptData } from './prompt-validator.js';
import { createLogger } from './logger.js';

const logger = createLogger('prompt-loader');

export interface PromptLoaderConfig {
  promptsDirectory: string;
  enableFileWatching?: boolean;
}

export interface PromptLoaderStats {
  totalFiles: number;
  successfulLoads: number;
  failedLoads: number;
  errors: PromptValidationError[];
}

// Cache for loaded prompts
const promptCache = new Map<string, ParsedPrompt>();
const filePathCache = new Map<string, string>(); // name -> filePath mapping
let lastScanTime = 0;
let loaderStats: PromptLoaderStats = {
  totalFiles: 0,
  successfulLoads: 0,
  failedLoads: 0,
  errors: [],
};

// Load all prompts from the prompts directory
export const loadPrompts = async (
  config: PromptLoaderConfig,
): Promise<ParsedPrompt[]> => {
  try {
    logger.info('Loading prompts', { directory: config.promptsDirectory });

    // Reset stats
    loaderStats = {
      totalFiles: 0,
      successfulLoads: 0,
      failedLoads: 0,
      errors: [],
    };

    const promptFiles = await scanForPromptFiles(config.promptsDirectory);
    loaderStats.totalFiles = promptFiles.length;

    const prompts: ParsedPrompt[] = [];

    for (const filePath of promptFiles) {
      const result = await loadPromptFile(filePath);

      if (result.success && result.prompt) {
        prompts.push(result.prompt);
        promptCache.set(result.prompt.metadata.name, result.prompt);
        filePathCache.set(result.prompt.metadata.name, filePath);
        loaderStats.successfulLoads++;
      } else {
        loaderStats.failedLoads++;
        loaderStats.errors.push(...result.errors);
      }
    }

    lastScanTime = Date.now();

    logger.info('Prompts loaded', {
      total: loaderStats.totalFiles,
      successful: loaderStats.successfulLoads,
      failed: loaderStats.failedLoads,
    });

    // Log errors but don't fail completely
    if (loaderStats.errors.length > 0) {
      logger.warn('Some prompt files had validation errors', {
        errorCount: loaderStats.errors.length,
      });

      for (const error of loaderStats.errors) {
        logger.error(`Validation error in ${error.file}`, {
          field: error.field,
          message: error.message,
        });
      }
    }

    return prompts;
  } catch (error) {
    logger.logError(error as Error, 'Failed to load prompts');
    return [];
  }
};

// Load a single prompt file with full YAML parsing and validation
const loadPromptFile = async (filePath: string): Promise<PromptLoadResult> => {
  try {
    logger.debug('Loading prompt file', { file: filePath });

    const content = await readFile(filePath, 'utf-8');
    const yamlData = yaml.load(content);

    if (!yamlData || typeof yamlData !== 'object') {
      return {
        success: false,
        errors: [
          {
            file: filePath,
            message: 'Invalid YAML: File does not contain a valid YAML object',
          },
        ],
      };
    }

    // Validate the parsed YAML data
    return validatePromptData(yamlData, filePath);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    // Handle YAML parsing errors specifically
    if (
      errorMessage.includes('YAMLException') ||
      errorMessage.includes('bad indentation')
    ) {
      return {
        success: false,
        errors: [
          {
            file: filePath,
            message: `YAML parsing error: ${errorMessage}`,
          },
        ],
      };
    }

    logger.logError(error as Error, `Failed to load prompt file: ${filePath}`);

    return {
      success: false,
      errors: [
        {
          file: filePath,
          message: `File loading error: ${errorMessage}`,
        },
      ],
    };
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

// Get prompts by category
export const getPromptsByCategory = (category: string): ParsedPrompt[] => {
  return Array.from(promptCache.values()).filter(
    (prompt) => prompt.metadata.category === category,
  );
};

// Get all categories
export const getAllCategories = (): string[] => {
  const categories = new Set<string>();
  for (const prompt of promptCache.values()) {
    if (prompt.metadata.category) {
      categories.add(prompt.metadata.category);
    }
  }
  return Array.from(categories).sort();
};

// Search prompts by query
export const searchPrompts = (query: string): ParsedPrompt[] => {
  const lowerQuery = query.toLowerCase();

  return Array.from(promptCache.values()).filter((prompt) => {
    const metadata = prompt.metadata;

    // Search in name, title, description, and tags
    return (
      metadata.name.toLowerCase().includes(lowerQuery) ||
      metadata.title.toLowerCase().includes(lowerQuery) ||
      metadata.description.toLowerCase().includes(lowerQuery) ||
      metadata.tags.some((tag) => tag.toLowerCase().includes(lowerQuery))
    );
  });
};

// Get loader statistics
export const getLoaderStats = (): PromptLoaderStats => {
  return { ...loaderStats };
};

// Clear the cache (useful for testing or reloading)
export const clearCache = (): void => {
  promptCache.clear();
  filePathCache.clear();
  lastScanTime = 0;
};

// Scan directory recursively for .yaml/.yml files
const scanForPromptFiles = async (directory: string): Promise<string[]> => {
  const files: string[] = [];

  try {
    const entries = await readdir(directory);

    for (const entry of entries) {
      const fullPath = join(directory, entry);

      try {
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
      } catch (statError) {
        logger.warn(`Cannot stat file: ${fullPath}`, {
          error:
            statError instanceof Error ? statError.message : String(statError),
        });
      }
    }
  } catch (error) {
    logger.warn(`Cannot scan directory: ${directory}`, {
      error: error instanceof Error ? error.message : String(error),
    });
  }

  return files;
};

// Default prompts directory configuration
export const createDefaultConfig = (): PromptLoaderConfig => ({
  promptsDirectory: join(process.cwd(), 'src', 'prompts'),
  enableFileWatching: false,
});

// Utility function to get relative path for cleaner logging
export const getRelativePath = (filePath: string, baseDir: string): string => {
  try {
    return relative(baseDir, filePath);
  } catch {
    return filePath;
  }
};
