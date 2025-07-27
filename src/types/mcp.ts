// Server configuration for PromptForge
export interface MCPServerConfig {
  name: string;
  version: string;
}

// Re-export types from SDK for convenience
export type {
  Tool,
  Resource,
  ResourceTemplate,
  TextContent,
  CallToolResult,
} from '@modelcontextprotocol/sdk/types.js';
