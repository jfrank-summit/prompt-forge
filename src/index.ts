#!/usr/bin/env node

console.log("PromptForge MCP Server starting...");

// TODO: Initialize MCP server here
const main = async (): Promise<void> => {
  console.log("Server initialized");
};

main().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});
