# Prompt Templates - Handlebars Helper Reference

This document describes the available Handlebars helpers you can use in your prompt templates for variable manipulation and formatting.

## String Transformation Helpers

### `{{capitalize value}}`

Capitalizes the first letter of a string.

```handlebars
{{capitalize language}} → TypeScript
```

### `{{upper value}}`

Converts a string to uppercase.

```handlebars
{{upper language}} → TYPESCRIPT
```

### `{{lower value}}`

Converts a string to lowercase.

```handlebars
{{lower language}} → typescript
```

### `{{titleCase value}}`

Converts a string to title case (each word capitalized).

```handlebars
{{titleCase 'api documentation generator'}} → Api Documentation Generator
```

### `{{kebabCase value}}`

Converts camelCase or PascalCase to kebab-case.

```handlebars
{{kebabCase 'apiDocumentation'}} → api-documentation
```

## Array Manipulation Helpers

### `{{join array separator}}`

Joins array elements with a separator (default: ", ").

```handlebars
{{join tags}}
→ review, quality, security
{{join tags ' | '}}
→ review | quality | security
```

### `{{first array}}`

Gets the first element of an array.

```handlebars
{{first tags}} → review
```

### `{{last array}}`

Gets the last element of an array.

```handlebars
{{last tags}} → security
```

### `{{length array}}`

Gets the length of an array.

```handlebars
Found {{length tags}} tags
```

## Utility Helpers

### `{{default value fallback}}`

Provides a fallback value if the variable is falsy.

```handlebars
{{default context 'No context provided'}}
```

### `{{eq value comparison}}`

Checks if two values are equal (for conditional logic).

```handlebars
{{#if (eq language 'TypeScript')}}
  // TypeScript-specific instructions
{{/if}}
```

### `{{neq value comparison}}`

Checks if two values are not equal.

```handlebars
{{#if (neq language 'TypeScript')}}
  // Non-TypeScript instructions
{{/if}}
```

### `{{gt value comparison}}`

Checks if a number is greater than another.

```handlebars
{{#if (gt maxLength 100)}}
  This is a long prompt.
{{/if}}
```

### `{{lt value comparison}}`

Checks if a number is less than another.

```handlebars
{{#if (lt maxLength 50)}}
  This is a short prompt.
{{/if}}
```

### `{{formatNumber value}}`

Formats a number with commas.

```handlebars
{{formatNumber 1000}} → 1,000
```

## Example Prompt Using Helpers

```yaml
name: 'advanced-example'
title: 'Advanced Helper Example'
description: 'Demonstrates various Handlebars helpers'
category: 'examples'
tags: ['demo', 'helpers', 'advanced']

variables:
  - name: 'technologies'
    type: 'array'
    required: true
    description: 'List of technologies'

  - name: 'priority'
    type: 'enum'
    required: true
    values: ['low', 'medium', 'high']
    description: 'Task priority'

  - name: 'complexity'
    type: 'number'
    required: false
    description: 'Complexity score (1-10)'

template: |
  # {{titleCase (join technologies " and ")}} Development Task

  **Priority**: {{upper priority}}

  {{#if technologies}}
  **Technologies**: {{join technologies ", "}}
  - Primary: {{first technologies}}
  - Secondary: {{#if (gt (length technologies) 1)}}{{last technologies}}{{else}}None{{/if}}
  {{/if}}

  {{#if complexity}}
  **Complexity**: {{formatNumber complexity}}/10
  {{#if (gt complexity 7)}}
  ⚠️ This is a high-complexity task.
  {{else}}
  ✅ This is a manageable task.
  {{/if}}
  {{/if}}

  **Instructions**: 
  {{#each technologies}}
  - Set up {{titleCase this}} environment ({{kebabCase this}}-config)
  {{/each}}

  {{default context "No additional context provided."}}
```

This example would render as:

```
# React And TypeScript Development Task

**Priority**: HIGH

**Technologies**: React, TypeScript
- Primary: React
- Secondary: TypeScript

**Complexity**: 8/10
⚠️ This is a high-complexity task.

**Instructions**:
- Set up React environment (react-config)
- Set up TypeScript environment (type-script-config)

No additional context provided.
```
