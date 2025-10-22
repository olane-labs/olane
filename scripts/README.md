# Olane Scripts

This directory contains utility scripts for the Olane monorepo.

## Lerna-Based Release Management

The Olane monorepo now uses [Lerna](https://lerna.js.org/) for version management and publishing. All release operations should be run from the root of the repository using the Lerna commands defined in the root [package.json](../package.json).

### Available Release Commands

Run these commands from the **root** of the repository:

```bash
# Check which packages have changed
npm run lerna:changed

# View diff of changed packages
npm run lerna:diff

# Version bumping (creates git tags and updates versions)
npm run lerna:version:patch    # 0.1.0 -> 0.1.1
npm run lerna:version:minor    # 0.1.0 -> 0.2.0
npm run lerna:version:major    # 0.1.0 -> 1.0.0

# Prerelease versions
npm run lerna:version:alpha    # 0.1.0 -> 0.1.1-alpha.0
npm run lerna:version:beta     # 0.1.0 -> 0.1.1-beta.0
npm run lerna:version:rc       # 0.1.0 -> 0.1.1-rc.0

# Publishing to npm
npm run lerna:publish          # Publish packages at current versions
npm run lerna:publish:dry      # Dry run (no push/tag)
```

### Typical Release Workflow

1. **Make your changes** across packages as needed
2. **Test everything**: `npm run test`
3. **Build all packages**: `npm run build`
4. **Check what changed**: `npm run lerna:changed`
5. **Version the packages**:
   - For production: `npm run lerna:version:patch` (or minor/major)
   - For prerelease: `npm run lerna:version:alpha` (or beta/rc)
6. **Publish to npm**: `npm run lerna:publish`

### How Lerna Works

- **Conventional Commits**: Lerna uses conventional commit messages to determine version bumps
- **Dependency Management**: Automatically updates inter-package dependencies
- **Git Integration**: Creates tags and GitHub releases automatically
- **Selective Publishing**: Only publishes packages that have changed

### Configuration

Lerna is configured in [lerna.json](../lerna.json) with:
- Conventional commits enabled
- Exact version matching for inter-package dependencies
- GitHub release creation
- Ignoring changes to docs and tests

## Development Commands

Standard workspace commands (run from root):

```bash
# Install all dependencies
npm install

# Build all packages
npm run build

# Run tests across all packages
npm run test

# Lint all packages
npm run lint

# Clean build artifacts
npm run clean

# Deep clean (removes node_modules)
npm run deep:clean
```

## Legacy Scripts Removed

The following custom scripts have been removed in favor of Lerna:

- `scripts/release/` - Custom release management (replaced by Lerna)
- `scripts/local/` - Local workspace dependency management (npm workspaces handles this)
- `scripts/shared/` - Shared utilities for removed scripts

## Documentation

For more information about Lerna:
- [Lerna Documentation](https://lerna.js.org/)
- [Conventional Commits](https://www.conventionalcommits.org/)
