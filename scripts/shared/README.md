# Shared Package Manager Utilities

This directory contains consolidated package management functionality that was previously duplicated across local and release scripts.

## PackageManager Class

The `PackageManager` class provides a centralized way to:

- Discover packages in the workspace
- Parse package.json files and extract dependency information
- Build dependency graphs and determine build order
- Execute commands across packages (with support for parallel execution)
- Manage package.json backups and restoration
- Convert dependencies to workspace references

## Key Features

### Package Discovery
- Automatically finds packages in `packages/` directory
- Includes CLI package from `../o-network-cli` if present
- Handles root package

### Dependency Management
- Extracts Olane-specific dependencies (`@olane/*` packages)
- Builds dependency graphs for proper build ordering
- Supports topological sorting to avoid circular dependencies

### Command Execution
- Execute commands in package directories
- Support for parallel execution at dependency levels
- Dry-run mode for testing
- Proper error handling and logging

### Workspace Integration
- Convert peer dependencies to workspace references
- Create and restore package.json backups
- Handle workspace-specific dependency management

## Usage

```typescript
import { createPackageManager } from './package-manager.ts';

const packageManager = createPackageManager(__dirname);
packageManager.discoverPackages();
packageManager.buildDependencyGraph();

// Execute commands across all packages
await packageManager.executeInBatches(
  packageManager.getBuildOrder(),
  (pkg) => 'npm run build',
  { parallel: true }
);
```

## Migration Benefits

The consolidation provides:

1. **Reduced Code Duplication**: Common functionality is now shared
2. **Consistency**: All scripts use the same package discovery and execution logic
3. **Maintainability**: Updates only need to be made in one place
4. **Enhanced Features**: Better error handling, parallel execution, and logging
5. **Type Safety**: Proper TypeScript interfaces and type checking

## Files Updated

- `../local/restore-original-deps.ts` - Now uses PackageManager for restoration
- `../local/setup-workspace-deps.ts` - Now uses PackageManager for workspace setup
- `../release/dev-release.ts` - Now uses PackageManager for development commands
- `../release/release.ts` - Now uses PackageManager for release process

All scripts maintain their original functionality while benefiting from the shared, improved implementation.
