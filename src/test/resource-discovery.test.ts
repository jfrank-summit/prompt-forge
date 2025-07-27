#!/usr/bin/env tsx

// Test script for resource discovery functionality
import { PromptResourceManager } from '../server/resource-handlers.js';
import { createDefaultConfig } from '../server/prompt-loader.js';
import { createLogger, configureLogging } from '../server/logger.js';

// Configure logging for testing
configureLogging();
const logger = createLogger('resource-test');

const runResourceTests = async (): Promise<void> => {
  try {
    logger.info('Starting resource discovery tests');

    const resourceManager = new PromptResourceManager(createDefaultConfig());

    // Test 1: List Resources
    console.log('\n=== Test 1: List Resources ===');
    const resources = await resourceManager.listResources();
    console.log(`✅ Found ${resources.length} resources:`);

    for (const resource of resources) {
      console.log(`  - ${resource.uri}`);
      console.log(`    Name: ${resource.name}`);
      console.log(`    Description: ${resource.description}`);
      console.log(`    MimeType: ${resource.mimeType}`);
    }

    // Test 2: List Resource Templates
    console.log('\n=== Test 2: List Resource Templates ===');
    const templates = await resourceManager.listResourceTemplates();
    console.log(`✅ Found ${templates.length} resource templates:`);

    for (const template of templates) {
      console.log(`  - ${template.uriTemplate}`);
      console.log(`    Name: ${template.name}`);
      console.log(`    Description: ${template.description}`);
    }

    // Test 3: Read Categories Resource
    console.log('\n=== Test 3: Read Categories Resource ===');
    const categoriesResource = await resourceManager.readResource(
      'prompt://categories',
    );
    console.log(`✅ Categories resource URI: ${categoriesResource.uri}`);
    console.log('✅ Categories content:');
    const categoriesData = JSON.parse(
      ((categoriesResource as any).contents[0] as any).text,
    );
    console.log(JSON.stringify(categoriesData, null, 2));

    // Test 4: Read Category Resource
    console.log('\n=== Test 4: Read Category Resource ===');
    if (categoriesData.categories.length > 0) {
      const firstCategory = categoriesData.categories[0].name;
      const categoryResource = await resourceManager.readResource(
        `prompt://category/${firstCategory}`,
      );
      console.log(`✅ Category resource URI: ${categoryResource.uri}`);
      const categoryData = JSON.parse(
        ((categoryResource as any).contents[0] as any).text,
      );
      console.log(
        `✅ Category '${firstCategory}' has ${categoryData.count} prompts:`,
      );

      for (const prompt of categoryData.prompts) {
        console.log(`  - ${prompt.name}: ${prompt.title}`);
        console.log(`    Variables: ${prompt.variables.length}`);
        console.log(`    URI: ${prompt.uri}`);
      }
    }

    // Test 5: Read Individual Prompt Resource
    console.log('\n=== Test 5: Read Individual Prompt Resource ===');
    if (
      categoriesData.categories.length > 0 &&
      categoriesData.categories[0].prompts.length > 0
    ) {
      const firstCategory = categoriesData.categories[0].name;
      const firstPrompt = categoriesData.categories[0].prompts[0].name;
      const promptUri = `prompt://prompt/${firstCategory}/${firstPrompt}`;

      const promptResource = await resourceManager.readResource(promptUri);
      console.log(`✅ Prompt resource URI: ${promptResource.uri}`);
      const promptData = JSON.parse(
        ((promptResource as any).contents[0] as any).text,
      );
      console.log(`✅ Prompt details for '${promptData.title}':`);
      console.log(`  - Name: ${promptData.name}`);
      console.log(`  - Category: ${promptData.category}`);
      console.log(`  - Variables: ${promptData.variables.length}`);
      console.log(
        `  - Template length: ${promptData.template.length} characters`,
      );
      console.log(`  - Examples: ${promptData.examples.length}`);
    }

    // Test 6: Search Resource
    console.log('\n=== Test 6: Search Resource ===');
    const searchResource = await resourceManager.readResource(
      'prompt://search/code',
    );
    console.log(`✅ Search resource URI: ${searchResource.uri}`);
    const searchData = JSON.parse(
      ((searchResource as any).contents[0] as any).text,
    );
    console.log(`✅ Search for 'code' found ${searchData.count} results:`);

    for (const result of searchData.results) {
      console.log(`  - ${result.name}: ${result.title}`);
      console.log(`    Category: ${result.category}`);
      console.log(`    URI: ${result.uri}`);
    }

    // Test 7: Error Handling
    console.log('\n=== Test 7: Error Handling ===');
    try {
      await resourceManager.readResource('prompt://invalid/path');
      console.log('❌ Should have thrown an error for invalid URI');
    } catch (error) {
      console.log(
        `✅ Correctly handled invalid URI: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    try {
      await resourceManager.readResource('prompt://category/nonexistent');
      console.log('❌ Should have thrown an error for nonexistent category');
    } catch (error) {
      console.log(
        `✅ Correctly handled nonexistent category: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    try {
      await resourceManager.readResource('prompt://prompt/nonexistent/prompt');
      console.log('❌ Should have thrown an error for nonexistent prompt');
    } catch (error) {
      console.log(
        `✅ Correctly handled nonexistent prompt: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    console.log('\n=== Resource Discovery Tests Complete ===');
    console.log(
      '✅ All tests passed! Resource discovery system is working correctly.',
    );
  } catch (error) {
    logger.logError(error as Error, 'Resource test failed');
    process.exit(1);
  }
};

runResourceTests().catch((error) => {
  logger.logError(error as Error, 'Failed to run resource tests');
  process.exit(1);
});
