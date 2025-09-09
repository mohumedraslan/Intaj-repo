# Intaj Code Style Guidelines

## Overview

This document outlines the coding standards and style guidelines for the Intaj project. Following these guidelines ensures consistency across the codebase and makes collaboration easier.

## General Guidelines

### Formatting

- We use Prettier for automatic code formatting
- 2 spaces for indentation
- 100 character line length limit
- Single quotes for strings
- Semicolons are required
- Trailing commas in multi-line objects and arrays

### Naming Conventions

- **Files and Directories**: Use kebab-case for file names (e.g., `user-profile.tsx`)
- **React Components**: Use PascalCase (e.g., `UserProfile.tsx`)
- **Functions**: Use camelCase (e.g., `getUserData()`)
- **Variables**: Use camelCase (e.g., `userData`)
- **Constants**: Use UPPER_SNAKE_CASE for true constants (e.g., `MAX_RETRY_COUNT`)
- **Interfaces/Types**: Use PascalCase with a descriptive name (e.g., `UserProfileProps`)

### TypeScript Best Practices

- Always define types for function parameters and return values
- Use interfaces for object shapes that will be used in multiple places
- Avoid using `any` type when possible
- Use type inference when the type is obvious
- Use optional chaining (`?.`) and nullish coalescing (`??`) operators

### React Best Practices

- Use functional components with hooks instead of class components
- Keep components small and focused on a single responsibility
- Use destructuring for props
- Use the React Fragment shorthand (`<>...</>`) when possible
- Avoid inline styles; use Tailwind CSS classes or styled components

### Import Order

1. External libraries
2. Internal modules
3. Component imports
4. Type imports
5. Asset imports (CSS, images, etc.)

### Comments

- Use JSDoc style comments for functions and components
- Add comments for complex logic that isn't immediately obvious
- Keep comments up-to-date with code changes

## ESLint Rules

We use ESLint to enforce code quality and style rules. The configuration can be found in `eslint.config.mjs`.

Key rules include:

- No unused variables
- No explicit `any` types
- Always use strict equality (`===`)
- Prefer `const` over `let` when possible
- No `var` declarations
- No console logs in production code (except warnings and errors)

## Pre-commit Hooks

We use husky and lint-staged to run linting and formatting on staged files before commits. This ensures that all committed code follows our style guidelines.

## Continuous Integration

Our CI pipeline runs linting and type checking on all pull requests. PRs cannot be merged if these checks fail.

## Additional Resources

- [TypeScript Documentation](https://www.typescriptlang.org/docs/)
- [React Documentation](https://reactjs.org/docs/getting-started.html)
- [Next.js Documentation](https://nextjs.org/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
