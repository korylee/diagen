# AGENTS.md - Development Guide for AI Agents

## Project Overview

Diagen is a pnpm monorepo using Turbo for build orchestration. It provides a diagram/flowchart design library built with Solid.js.

## Package Structure

```
packages/
├── core/         # Core diagram model and logic
├── shared/       # Shared utilities and types
├── primitives/   # UI primitives
├── renderer/     # Rendering layer
└── ui/           # UI components
playgrounds/
└── vite/         # Vite development playground
```

## Commands

### Installation

```bash
pnpm install
```

### Build

```bash
pnpm run build:packages      # Build all packages via Turbo
pnpm run watch               # Watch mode with Turbo
```

### Running Tests

```bash
pnpm run test:unit           # Run all unit tests (vitest, jsdom)
```

#### Running a Single Test

```bash
# Run a specific test file
npx vitest run --project unit packages/core/src/utils/router/__tests__/router.test.ts

# Run tests matching a pattern
npx vitest run --project unit -t "should"

# Run tests in watch mode
npx vitest --project unit packages/core/src/utils/router/__tests__/router.test.ts
```

### Local Development

```bash
pnpm --filter playground-vite dev
# or
pnpm -C playgrounds/vite dev
```

## Code Style

### Formatting (Prettier)

- **Semi-colons**: No
- **Single quotes**: Yes
- **Arrow function parens**: Avoid when possible
- **Print width**: 120 characters

### TypeScript

- **Strict mode**: Enabled
- **Always use explicit types** for function parameters and return types
- **Use `import type`** for type-only imports
- **Use `as const`** for literal object types that shouldn't widen

### Naming Conventions

- **Files**: camelCase (e.g., `routerUtils.ts`, `createDiagram.ts`)
- **Types/Interfaces**: PascalCase (e.g., `Diagram`, `ShapeElement`)
- **Functions**: camelCase, use verb prefixes (e.g., `createDiagram`, `serializeDiagram`)
- **Constants**: PascalCase for exported, camelCase for local
- **JSDoc comments**: Chinese (document in the same language as existing code)

### Import Order

1. External libraries (e.g., `solid-js`)
2. Internal packages (e.g., `@diagen/core`, `@diagen/shared`)
3. Relative imports (e.g., `./utils`)

Example:

```typescript
import { createSignal, onMount } from 'solid-js'
import type { Point, Rect } from '@diagen/shared'
import { generateId, DeepPartial } from '@diagen/shared'
import { createDiagram } from './diagram'
import type { Diagram } from './types'
```

### Error Handling

- Use descriptive error messages
- Throw errors with meaningful context
- Consider using Result types for operations that can fail

### Testing

- Use Vitest with describe/it/expect
- Test files: `*.test.ts` or `*.spec.ts` in `__tests__` folders or alongside source
- Use Chinese descriptions in tests (matches existing codebase style)
- Group related tests with nested `describe` blocks

Example:

```typescript
import { describe, expect, it } from 'vitest'

describe('moduleName', () => {
  describe('functionName', () => {
    it('should do something specific', () => {
      expect(result).toBe(expected)
    })
  })
})
```

## Project-Specific Patterns

### Package Exports

- Use `tsdown` for building packages
- Export entry points from `src/index.ts`
- Follow the existing export pattern in each package

### Solid.js Patterns

- Use `createSignal`, `createEffect`, `createMemo` for reactivity
- Use `Show`, `For`, `Switch/Match` for control flow
- Components are typically functions returning JSX

### Data Models

- Use interfaces for type definitions
- Factory functions for creation (e.g., `createDiagram()`, `createPage()`)
- Use `DeepPartial` from `@diagen/shared` for override patterns
