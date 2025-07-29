---
description: 'TypeScript standards for Audry project'
applyTo: '**/*.ts, **/*.js, **/*.json'
---

## Guidance for Code Generation

- Generate modern TypeScript code for Node.js, using arrow functions and ES6+ features.
- Use `async/await` for asynchronous code
- Whenever possible, use Node.js v20 built-in modules instead of external packages
- Do not use `axios`
- Always use Node.js async functions, like `node:fs/promises` instead of `fs` to avoid blocking the event loop
- Ask before adding any extra dependencies to the project
- The API is built using `express` package and Microsoft Teams AI SDK `@microsoft/teams-ai` package.
- Never use `null`, always use `undefined` for optional values
- Keep the code simple and maintainable
- Prefer functions over classes
- Prefer imports using `src/` prefix instead of relative paths. eg. `../internal/logger.ts` should be `src/internal/logger.ts`

## Testing

- Use Vitest for testing
- Write tests for all new features and bug fixes
- Ensure tests cover edge cases and error handling
- NEVER change the original code to make it easier to test, instead, write tests that cover the original code as it is

## User interactions

- Ask questions if you are unsure about the implementation details, design choices, or need clarification on the requirements
- Always answer in the same language as the question, but use English for the generated content like code, comments or docs
