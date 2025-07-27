// Prompt validation system with comprehensive error handling
import { z, ZodError } from 'zod';
import type {
  PromptFile,
  PromptValidationError,
  PromptLoadResult,
  ParsedPrompt,
  PromptFileSchema,
} from '../types/prompt.js';
import { PromptFileSchema as Schema } from '../types/prompt.js';
import { createLogger } from './logger.js';

const logger = createLogger('prompt-validator');

export const validatePromptData = (
  data: unknown,
  filePath: string,
): PromptLoadResult => {
  try {
    logger.debug('Validating prompt data', { file: filePath });

    // First, validate the basic structure
    const result = Schema.safeParse(data);

    if (!result.success) {
      const errors = formatZodErrors(result.error, filePath);
      logger.warn('Prompt validation failed', {
        file: filePath,
        errorCount: errors.length,
      });

      return {
        success: false,
        errors,
      };
    }

    const validated = result.data;

    // Additional custom validations
    const customErrors = performCustomValidations(validated, filePath);

    if (customErrors.length > 0) {
      logger.warn('Custom validation failed', {
        file: filePath,
        errorCount: customErrors.length,
      });

      return {
        success: false,
        errors: customErrors,
      };
    }

    // Create ParsedPrompt from validated data
    const prompt: ParsedPrompt = {
      metadata: {
        name: validated.name,
        title: validated.title,
        description: validated.description,
        category: validated.category,
        tags: validated.tags || [],
        variables: validated.variables || [],
        examples: validated.examples || [],
      },
      template: validated.template,
      filePath,
    };

    logger.debug('Prompt validation successful', {
      file: filePath,
      name: validated.name,
    });

    return {
      success: true,
      prompt,
      errors: [],
    };
  } catch (error) {
    logger.logError(
      error as Error,
      `Unexpected validation error for ${filePath}`,
    );

    return {
      success: false,
      errors: [
        {
          file: filePath,
          message: `Unexpected validation error: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
    };
  }
};

const formatZodErrors = (
  error: ZodError<any>,
  filePath: string,
): PromptValidationError[] => {
  return error.issues.map((err) => ({
    file: filePath,
    field: err.path.join('.'),
    message: `${err.path.join('.')}: ${err.message}`,
  }));
};

const performCustomValidations = (
  data: PromptFile,
  filePath: string,
): PromptValidationError[] => {
  const errors: PromptValidationError[] = [];

  // Validate variable names are unique
  const variableNames = new Set<string>();
  for (const variable of data.variables || []) {
    if (variableNames.has(variable.name)) {
      errors.push({
        file: filePath,
        field: 'variables',
        message: `Duplicate variable name: ${variable.name}`,
      });
    }
    variableNames.add(variable.name);
  }

  // Validate enum variables have values
  for (const variable of data.variables || []) {
    if (
      variable.type === 'enum' &&
      (!variable.values || variable.values.length === 0)
    ) {
      errors.push({
        file: filePath,
        field: `variables.${variable.name}`,
        message: `Enum variable '${variable.name}' must have at least one value`,
      });
    }
  }

  // Validate template references match declared variables
  const templateVariables = extractTemplateVariables(data.template);
  const declaredVariables = new Set((data.variables || []).map((v) => v.name));

  for (const templateVar of templateVariables) {
    if (!declaredVariables.has(templateVar)) {
      errors.push({
        file: filePath,
        field: 'template',
        message: `Template references undefined variable: {{${templateVar}}}`,
      });
    }
  }

  // Validate example variables match declared variables
  for (const example of data.examples || []) {
    const exampleVars = new Set(Object.keys(example.variables));
    for (const exampleVar of exampleVars) {
      if (!declaredVariables.has(exampleVar)) {
        errors.push({
          file: filePath,
          field: `examples.${example.title}`,
          message: `Example '${example.title}' uses undefined variable: ${exampleVar}`,
        });
      }
    }
  }

  return errors;
};

// Extract variable references from Handlebars template
const extractTemplateVariables = (template: string): Set<string> => {
  const variables = new Set<string>();

  // Match {{variable}} and {{#if variable}} patterns
  const patterns = [
    /\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\}\}/g,
    /\{\{\s*#if\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\}\}/g,
    /\{\{\s*#unless\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\}\}/g,
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(template)) !== null) {
      variables.add(match[1]);
    }
  }

  return variables;
};

export const validatePromptName = (name: string): boolean => {
  // Prompt names should be valid identifiers
  return /^[a-zA-Z][a-zA-Z0-9_-]*$/.test(name);
};

export const validateCategory = (category: string): boolean => {
  // Categories should be kebab-case
  return /^[a-z][a-z0-9-]*$/.test(category);
};
