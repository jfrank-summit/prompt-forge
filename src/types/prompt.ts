// Prompt types for PromptForge

export interface PromptVariable {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array';
  required?: boolean;
  description?: string;
  default?: unknown;
  values?: string[]; // For enum-like variables
  suggestions?: string[];
  max_length?: number;
  min?: number;
  max?: number;
}

export interface PromptMetadata {
  name: string;
  title: string;
  description: string;
  category?: string;
  tags?: string[];
  variables?: PromptVariable[];
  examples?: Array<{
    title: string;
    variables: Record<string, unknown>;
    expected_output?: string;
  }>;
}

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
