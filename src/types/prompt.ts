// Prompt types for PromptForge
import { z } from 'zod';

// Variable type definitions matching the YAML schema
export const PromptVariableTypeSchema = z.enum([
  'text',
  'number',
  'boolean',
  'enum',
  'array',
]);

export type PromptVariableType = z.infer<typeof PromptVariableTypeSchema>;

export const PromptVariableSchema = z.object({
  name: z.string(),
  type: PromptVariableTypeSchema,
  required: z.boolean().optional().default(false),
  description: z.string().optional(),
  default: z.unknown().optional(),
  values: z.array(z.string()).optional(), // For enum type
  suggestions: z.array(z.string()).optional(),
  max_length: z.number().optional(),
  min: z.number().optional(),
  max: z.number().optional(),
});

export type PromptVariable = z.infer<typeof PromptVariableSchema>;

export const PromptExampleSchema = z.object({
  title: z.string(),
  variables: z.record(z.string(), z.unknown()),
  expected_output: z.string().optional(),
});

export type PromptExample = z.infer<typeof PromptExampleSchema>;

export const PromptMetadataSchema = z.object({
  name: z.string(),
  title: z.string(),
  description: z.string(),
  category: z.string().optional(),
  tags: z.array(z.string()).optional().default([]),
  variables: z.array(PromptVariableSchema).optional().default([]),
  examples: z.array(PromptExampleSchema).optional().default([]),
});

export type PromptMetadata = z.infer<typeof PromptMetadataSchema>;

// Full YAML prompt file schema
export const PromptFileSchema = z.object({
  name: z.string(),
  title: z.string(),
  description: z.string(),
  category: z.string().optional(),
  tags: z.array(z.string()).optional().default([]),
  variables: z.array(PromptVariableSchema).optional().default([]),
  examples: z.array(PromptExampleSchema).optional().default([]),
  template: z.string(),
});

export type PromptFile = z.infer<typeof PromptFileSchema>;

export interface ParsedPrompt {
  metadata: PromptMetadata;
  template: string;
  filePath: string;
}

export interface PromptExecutionContext {
  variables: Record<string, unknown>;
}

export interface PromptExecutionResult {
  rendered: string;
  metadata: PromptMetadata;
}

// Validation error types
export interface PromptValidationError {
  file: string;
  field?: string;
  message: string;
  line?: number;
}

export interface PromptLoadResult {
  success: boolean;
  prompt?: ParsedPrompt;
  errors: PromptValidationError[];
}
