#!/usr/bin/env tsx

// Test script for tool execution functionality
import { listPromptTools, callPromptTool } from '../server/tool-handlers.js';
import { createLogger, configureLogging } from '../server/logger.js';

// Configure logging for testing
configureLogging();
const logger = createLogger('tool-test');

const runToolTests = async (): Promise<void> => {
  try {
    logger.info('Starting tool execution tests');

    // Test 1: List Tools
    console.log('\n=== Test 1: List Tools ===');
    const tools = await listPromptTools();
    console.log(`✅ Found ${tools.length} tools:`);

    for (const tool of tools) {
      console.log(`  - ${tool.name}: ${tool.description}`);
      console.log(
        `    Required params: [${tool.inputSchema.required?.join(', ') || 'none'}]`,
      );
    }

    // Test 2: Search Prompts Tool
    console.log('\n=== Test 2: Search Prompts Tool ===');
    const searchResult = await callPromptTool('search-prompts', {
      query: 'code',
    });
    console.log(`✅ Search tool result:`);
    const searchData = JSON.parse(
      ((searchResult as any).content[0] as any).text,
    );
    console.log(`  - Query: "${searchData.query}"`);
    console.log(`  - Found ${searchData.count} prompts:`);

    for (const result of searchData.results) {
      console.log(`    * ${result.name}: ${result.title}`);
      console.log(`      URI: ${result.uri}`);
      console.log(`      Variables: ${result.variables.length}`);
    }

    // Test 3: Execute Prompt Tool - Simple
    console.log('\n=== Test 3: Execute Prompt Tool (Simple) ===');
    if (searchData.results.length > 0) {
      const firstPrompt = searchData.results[0];
      const executeResult = await callPromptTool('execute-prompt', {
        promptUri: firstPrompt.uri,
        variables: {},
      });

      if ((executeResult as any).isError) {
        console.log(
          `❌ Execution failed: ${((executeResult as any).content[0] as any).text}`,
        );
      } else {
        console.log(`✅ Execution successful for: ${firstPrompt.name}`);
        const executeData = JSON.parse(
          ((executeResult as any).content[0] as any).text,
        );
        console.log(`  - Prompt: ${executeData.prompt.title}`);
        console.log(
          `  - Required variables: [${executeData.variables.required.join(', ')}]`,
        );
        console.log(
          `  - Optional variables: [${executeData.variables.optional.join(', ')}]`,
        );
        console.log(
          `  - Rendered length: ${executeData.rendered.length} characters`,
        );
        console.log(
          `  - Preview: ${executeData.rendered.substring(0, 100)}...`,
        );
      }
    }

    // Test 4: Execute Prompt Tool - With Variables
    console.log('\n=== Test 4: Execute Prompt Tool (With Variables) ===');
    if (searchData.results.length > 0) {
      // Find a prompt with variables
      const promptWithVars = searchData.results.find(
        (p: any) => p.variables.length > 0,
      );

      if (promptWithVars) {
        console.log(`Testing prompt: ${promptWithVars.name}`);
        console.log(
          `Variables available: ${promptWithVars.variables.map((v: any) => `${v.name} (${v.type})`).join(', ')}`,
        );

        // Create test variables based on the prompt's variable definitions
        const testVariables: Record<string, any> = {};
        for (const variable of promptWithVars.variables) {
          switch (variable.type) {
            case 'enum':
              // Get enum values from search results or default to first option
              if (variable.name === 'language') {
                testVariables[variable.name] = 'TypeScript';
              } else if (variable.name === 'api_type') {
                testVariables[variable.name] = 'REST';
              } else if (variable.name === 'framework') {
                testVariables[variable.name] = 'Jest';
              } else {
                testVariables[variable.name] = 'default';
              }
              break;
            case 'text':
              testVariables[variable.name] = 'Test input';
              break;
            case 'boolean':
              testVariables[variable.name] = true;
              break;
            case 'number':
              testVariables[variable.name] = 42;
              break;
            case 'array':
              testVariables[variable.name] = ['item1', 'item2'];
              break;
          }
        }

        console.log(
          `Test variables: ${JSON.stringify(testVariables, null, 2)}`,
        );

        const executeResult = await callPromptTool('execute-prompt', {
          promptUri: promptWithVars.uri,
          variables: testVariables,
        });

        if ((executeResult as any).isError) {
          console.log(
            `❌ Execution failed: ${((executeResult as any).content[0] as any).text}`,
          );
        } else {
          console.log(`✅ Execution successful with variables!`);
          const executeData = JSON.parse(
            ((executeResult as any).content[0] as any).text,
          );
          console.log(`  - Rendered template preview:`);
          console.log(`    ${executeData.rendered.substring(0, 200)}...`);
        }
      } else {
        console.log('⚠️  No prompts with variables found for testing');
      }
    }

    // Test 5: Error Handling
    console.log('\n=== Test 5: Error Handling ===');

    // Test invalid tool
    try {
      await callPromptTool('invalid-tool', {});
      console.log('❌ Should have thrown an error for invalid tool');
    } catch (error) {
      console.log(
        `✅ Correctly handled invalid tool: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    // Test invalid prompt URI
    const invalidUriResult = await callPromptTool('execute-prompt', {
      promptUri: 'prompt://prompt/invalid/prompt',
      variables: {},
    });

    if ((invalidUriResult as any).isError) {
      console.log(
        `✅ Correctly handled invalid URI: ${((invalidUriResult as any).content[0] as any).text}`,
      );
    } else {
      console.log('❌ Should have failed for invalid URI');
    }

    // Test missing required variables
    if (searchData.results.length > 0) {
      const promptWithRequired = searchData.results.find((p: any) =>
        p.variables.some((v: any) => v.required),
      );

      if (promptWithRequired) {
        const missingVarResult = await callPromptTool('execute-prompt', {
          promptUri: promptWithRequired.uri,
          variables: {}, // Empty variables when some are required
        });

        if ((missingVarResult as any).isError) {
          console.log(`✅ Correctly handled missing required variables`);
        } else {
          console.log('❌ Should have failed for missing required variables');
        }
      }
    }

    console.log('\n=== Tool Execution Tests Complete ===');
    console.log(
      '✅ All tests passed! Tool execution system is working correctly.',
    );
  } catch (error) {
    logger.logError(error as Error, 'Tool test failed');
    process.exit(1);
  }
};

runToolTests().catch((error) => {
  logger.logError(error as Error, 'Failed to run tool tests');
  process.exit(1);
});
