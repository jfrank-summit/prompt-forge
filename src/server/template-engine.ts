// Template rendering engine for prompt variable substitution (functional approach)
import Handlebars from 'handlebars';
import type { ParsedPrompt, PromptVariable } from '../types/prompt.js';
import { createLogger } from './logger.js';

const logger = createLogger('template-engine');

export interface TemplateRenderResult {
  success: boolean;
  rendered?: string;
  errors: string[];
}

export interface VariableValidationError {
  variable: string;
  message: string;
  provided?: unknown;
  expected?: string;
}

/**
 * Register helpful Handlebars helpers organized by functionality
 */
const registerHandlebarsHelpers = (): void => {
  // String transformation helpers
  registerStringHelpers();

  // Array manipulation helpers
  registerArrayHelpers();

  // Utility helpers
  registerUtilityHelpers();

  logger.debug('Handlebars helpers registered');
};

/**
 * Register string transformation helpers
 */
const registerStringHelpers = (): void => {
  // Capitalize first letter of string
  Handlebars.registerHelper('capitalize', (str: string) => {
    if (typeof str !== 'string') {
      return str;
    }
    return str.charAt(0).toUpperCase() + str.slice(1);
  });

  // Convert string to uppercase
  Handlebars.registerHelper('upper', (str: string) => {
    if (typeof str !== 'string') {
      return str;
    }
    return str.toUpperCase();
  });

  // Convert string to lowercase
  Handlebars.registerHelper('lower', (str: string) => {
    if (typeof str !== 'string') {
      return str;
    }
    return str.toLowerCase();
  });

  // Convert string to title case (each word capitalized)
  Handlebars.registerHelper('titleCase', (str: string) => {
    if (typeof str !== 'string') {
      return str;
    }
    return str.replace(
      /\w\S*/g,
      (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase(),
    );
  });

  // Convert camelCase or PascalCase to kebab-case
  Handlebars.registerHelper('kebabCase', (str: string) => {
    if (typeof str !== 'string') {
      return str;
    }
    return str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
  });
};

/**
 * Register array manipulation helpers
 */
const registerArrayHelpers = (): void => {
  // Join array elements with separator
  Handlebars.registerHelper('join', (array: unknown[], separator = ', ') => {
    if (!Array.isArray(array)) {
      return '';
    }
    return array.join(separator);
  });

  // Get first element of array
  Handlebars.registerHelper('first', (array: unknown[]) => {
    if (!Array.isArray(array) || array.length === 0) {
      return '';
    }
    return array[0];
  });

  // Get last element of array
  Handlebars.registerHelper('last', (array: unknown[]) => {
    if (!Array.isArray(array) || array.length === 0) {
      return '';
    }
    return array[array.length - 1];
  });

  // Get array length
  Handlebars.registerHelper('length', (array: unknown[]) => {
    if (!Array.isArray(array)) {
      return 0;
    }
    return array.length;
  });
};

/**
 * Register utility helpers
 */
const registerUtilityHelpers = (): void => {
  // Provide default value if variable is falsy
  Handlebars.registerHelper(
    'default',
    (value: unknown, defaultValue: unknown) => {
      return value || defaultValue;
    },
  );

  // Check if value equals comparison value
  Handlebars.registerHelper('eq', (value: unknown, comparison: unknown) => {
    return value === comparison;
  });

  // Check if value is not equal to comparison value
  Handlebars.registerHelper('neq', (value: unknown, comparison: unknown) => {
    return value !== comparison;
  });

  // Conditional helper for greater than
  Handlebars.registerHelper('gt', (value: number, comparison: number) => {
    return value > comparison;
  });

  // Conditional helper for less than
  Handlebars.registerHelper('lt', (value: number, comparison: number) => {
    return value < comparison;
  });

  // Format number with commas (e.g., 1000 -> 1,000)
  Handlebars.registerHelper('formatNumber', (num: number) => {
    if (typeof num !== 'number') {
      return num;
    }
    return num.toLocaleString();
  });
};

/**
 * Render a prompt template with the provided variables
 */
export const renderPrompt = (
  prompt: ParsedPrompt,
  variables: Record<string, unknown>,
): TemplateRenderResult => {
  try {
    logger.debug('Rendering prompt template', {
      prompt: prompt.metadata.name,
      variableCount: Object.keys(variables).length,
    });

    // Validate variables first
    const validationErrors = validateVariables(
      prompt.metadata.variables,
      variables,
    );
    if (validationErrors.length > 0) {
      return {
        success: false,
        errors: validationErrors.map((e) => e.message),
      };
    }

    // Compile and render the template
    const template = Handlebars.compile(prompt.template);
    const rendered = template(variables);

    logger.debug('Template rendered successfully', {
      prompt: prompt.metadata.name,
      renderedLength: rendered.length,
    });

    return {
      success: true,
      rendered,
      errors: [],
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.logError(
      error as Error,
      `Failed to render template for ${prompt.metadata.name}`,
    );

    return {
      success: false,
      errors: [`Template rendering error: ${errorMessage}`],
    };
  }
};

/**
 * Validate variables against prompt variable definitions
 */
const validateVariables = (
  promptVariables: PromptVariable[],
  providedVariables: Record<string, unknown>,
): VariableValidationError[] => {
  const errors: VariableValidationError[] = [];

  // Check required variables
  for (const variable of promptVariables) {
    const value = providedVariables[variable.name];

    // Check if required variable is missing
    if (
      variable.required &&
      (value === undefined || value === null || value === '')
    ) {
      errors.push({
        variable: variable.name,
        message: `Required variable '${variable.name}' is missing`,
        provided: value,
        expected: variable.type,
      });
      continue;
    }

    // Skip validation if variable is not provided and not required
    if (value === undefined || value === null) {
      continue;
    }

    // Type-specific validation
    const typeError = validateVariableType(variable, value);
    if (typeError) {
      errors.push(typeError);
    }
  }

  // Check for unknown variables (warn but don't fail)
  const declaredVariables = new Set(promptVariables.map((v) => v.name));
  for (const providedVar of Object.keys(providedVariables)) {
    if (!declaredVariables.has(providedVar)) {
      logger.warn('Unknown variable provided', {
        variable: providedVar,
        value: providedVariables[providedVar],
      });
    }
  }

  return errors;
};

/**
 * Validate a single variable against its type definition
 */
const validateVariableType = (
  variable: PromptVariable,
  value: unknown,
): VariableValidationError | null => {
  switch (variable.type) {
    case 'text':
      if (typeof value !== 'string') {
        return {
          variable: variable.name,
          message: `Variable '${variable.name}' must be a string`,
          provided: value,
          expected: 'string',
        };
      }
      if (variable.max_length && value.length > variable.max_length) {
        return {
          variable: variable.name,
          message: `Variable '${variable.name}' exceeds maximum length of ${variable.max_length}`,
          provided: value,
          expected: `string with max length ${variable.max_length}`,
        };
      }
      break;

    case 'number':
      if (typeof value !== 'number' || isNaN(value)) {
        return {
          variable: variable.name,
          message: `Variable '${variable.name}' must be a number`,
          provided: value,
          expected: 'number',
        };
      }
      if (variable.min !== undefined && value < variable.min) {
        return {
          variable: variable.name,
          message: `Variable '${variable.name}' must be at least ${variable.min}`,
          provided: value,
          expected: `number >= ${variable.min}`,
        };
      }
      if (variable.max !== undefined && value > variable.max) {
        return {
          variable: variable.name,
          message: `Variable '${variable.name}' must be at most ${variable.max}`,
          provided: value,
          expected: `number <= ${variable.max}`,
        };
      }
      break;

    case 'boolean':
      if (typeof value !== 'boolean') {
        return {
          variable: variable.name,
          message: `Variable '${variable.name}' must be a boolean`,
          provided: value,
          expected: 'boolean',
        };
      }
      break;

    case 'enum':
      if (typeof value !== 'string') {
        return {
          variable: variable.name,
          message: `Variable '${variable.name}' must be a string for enum type`,
          provided: value,
          expected: 'string',
        };
      }
      if (variable.values && !variable.values.includes(value)) {
        return {
          variable: variable.name,
          message: `Variable '${variable.name}' must be one of: ${variable.values.join(', ')}`,
          provided: value,
          expected: `one of: ${variable.values.join(', ')}`,
        };
      }
      break;

    case 'array':
      if (!Array.isArray(value)) {
        return {
          variable: variable.name,
          message: `Variable '${variable.name}' must be an array`,
          provided: value,
          expected: 'array',
        };
      }
      break;

    default:
      logger.warn('Unknown variable type', {
        variable: variable.name,
        type: variable.type,
      });
  }

  return null;
};

/**
 * Get available variable information for a prompt
 */
export const getVariableInfo = (
  prompt: ParsedPrompt,
): {
  variables: PromptVariable[];
  required: string[];
  optional: string[];
} => {
  const required = prompt.metadata.variables
    .filter((v) => v.required)
    .map((v) => v.name);

  const optional = prompt.metadata.variables
    .filter((v) => !v.required)
    .map((v) => v.name);

  return {
    variables: prompt.metadata.variables,
    required,
    optional,
  };
};

// Initialize helpers after all functions are defined
registerHandlebarsHelpers();
