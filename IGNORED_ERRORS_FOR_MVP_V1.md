# Ignored Errors for MVP Version 1

This document tracks all errors, warnings, and issues that have been temporarily disabled, commented out, or ignored to facilitate the release of MVP Version 1. These items should be revisited and properly addressed in future versions.

## ESLint and TypeScript Errors

- **TypeScript Type Checking**: Build-time type checking has been disabled using `typescript.ignoreBuildErrors: true` in `next.config.ts` to allow builds to complete despite type errors.

- **ESLint Validation**: ESLint checking during builds has been disabled using `eslint.ignoreDuringBuilds: true` in `next.config.ts`.

- **TypeScript `any` Type**: The `@typescript-eslint/no-explicit-any` rule has been set to `off` to allow the use of `any` type in the codebase.

- **Unused Variables**: The severity of `@typescript-eslint/no-unused-vars` has been reduced to `warn` instead of `error` to prevent build failures.

- **Non-null Assertions**: The `@typescript-eslint/no-non-null-assertion` rule is set to `warn` instead of `error`.

## Build Errors

- **Prerendering Error**: There's an unresolved prerendering error on the `/auth/2fa` page that needs investigation.

- **Type Error in Page Props**: There's a type error in `.next/types/app/chat/[chatbotId]/page.ts` where the params object lacks Promise properties required by PageProps.

## Features Marked as "Coming Soon"

- **Two-Factor Authentication (2FA)**: The 2FA feature has been temporarily disabled and replaced with a "Coming Soon" page that automatically redirects users to the dashboard. The original implementation had prerendering errors that were preventing successful builds.

## Performance Optimizations Deferred

- [List any performance optimizations that have been deferred]

## Security Considerations for Future Versions

- [List any security enhancements that should be prioritized in future versions]

## Technical Debt

- [List any technical debt or code quality issues that should be addressed]

---

**Note**: This document should be reviewed regularly as part of the development process for post-MVP versions. Items should be moved from this list to the main project backlog as they are addressed.
