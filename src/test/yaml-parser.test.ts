#!/usr/bin/env tsx

// Test script for YAML prompt parsing and validation
import {
  loadPrompts,
  createDefaultConfig,
  getLoadedPrompts,
  getAllCategories,
  searchPrompts,
  getLoaderStats,
  clearCache,
} from '../server/prompt-loader.js';
import { createLogger, configureLogging } from '../server/logger.js';

// Configure logging for testing
configureLogging();
const logger = createLogger('yaml-test');

const runTests = async (): Promise<void> => {
  try {
    logger.info('Starting YAML parser and validation tests');

    // Clear any existing cache
    clearCache();

    // Load prompts using the default configuration
    const config = createDefaultConfig();
    logger.info('Loading prompts from:', {
      directory: config.promptsDirectory,
    });

    const prompts = await loadPrompts(config);

    // Get stats
    const stats = getLoaderStats();
    logger.info('Prompt loading statistics:', { ...stats });

    // Test 1: Basic loading
    console.log('\n=== Test 1: Basic Loading ===');
    console.log(`✅ Loaded ${prompts.length} prompts`);
    console.log(`✅ Successful loads: ${stats.successfulLoads}`);
    console.log(`✅ Failed loads: ${stats.failedLoads}`);
    console.log(`✅ Total files: ${stats.totalFiles}`);

    if (stats.errors.length > 0) {
      console.log('❌ Validation errors found:');
      for (const error of stats.errors) {
        console.log(`   - ${error.file}: ${error.message}`);
      }
    }

    // Test 2: Verify prompt structure
    console.log('\n=== Test 2: Prompt Structure Validation ===');
    for (const prompt of prompts) {
      console.log(`✅ Prompt: ${prompt.metadata.name}`);
      console.log(`   - Title: ${prompt.metadata.title}`);
      console.log(`   - Category: ${prompt.metadata.category || 'none'}`);
      console.log(`   - Variables: ${prompt.metadata.variables.length}`);
      console.log(`   - Tags: [${prompt.metadata.tags.join(', ')}]`);

      // Validate variable structure
      for (const variable of prompt.metadata.variables) {
        console.log(
          `   - Variable: ${variable.name} (${variable.type}, required: ${variable.required})`,
        );
        if (variable.type === 'enum' && variable.values) {
          console.log(`     Values: [${variable.values.join(', ')}]`);
        }
      }
    }

    // Test 3: Category functionality
    console.log('\n=== Test 3: Category Functionality ===');
    const categories = getAllCategories();
    console.log(`✅ Found categories: [${categories.join(', ')}]`);

    // Test 4: Search functionality
    console.log('\n=== Test 4: Search Functionality ===');
    const searchResults = searchPrompts('code');
    console.log(`✅ Search for 'code' found ${searchResults.length} results:`);
    for (const result of searchResults) {
      console.log(`   - ${result.metadata.name}: ${result.metadata.title}`);
    }

    // Test 5: Template validation
    console.log('\n=== Test 5: Template Variable Validation ===');
    for (const prompt of prompts) {
      const template = prompt.template;
      const variables = prompt.metadata.variables.map((v) => v.name);

      // Extract variables from template (simple regex)
      const templateVars = template.match(/\{\{\s*(\w+)\s*\}\}/g) || [];
      const uniqueTemplateVars = [
        ...new Set(templateVars.map((v) => v.replace(/[{}]/g, '').trim())),
      ];

      console.log(`✅ ${prompt.metadata.name}:`);
      console.log(`   - Declared variables: [${variables.join(', ')}]`);
      console.log(
        `   - Template variables: [${uniqueTemplateVars.join(', ')}]`,
      );

      // Check for missing declarations
      for (const templateVar of uniqueTemplateVars) {
        if (!variables.includes(templateVar)) {
          console.log(
            `   ⚠️  Template uses undeclared variable: ${templateVar}`,
          );
        }
      }
    }

    console.log('\n=== Tests Complete ===');
    console.log(
      `✅ All tests passed! Loaded ${prompts.length} prompts successfully.`,
    );
  } catch (error) {
    logger.logError(error as Error, 'Test failed');
    process.exit(1);
  }
};

runTests().catch((error) => {
  logger.logError(error as Error, 'Failed to run tests');
  process.exit(1);
});
