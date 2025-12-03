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

### Automated Release Script (Recommended)

The `release.sh` script handles the complete release workflow including pnpm lock file management.

**Using npm scripts (easiest):**

```bash
# Production releases
pnpm run release:patch          # 0.1.0 -> 0.1.1
pnpm run release:minor          # 0.1.0 -> 0.2.0
pnpm run release:major          # 0.1.0 -> 1.0.0

# Prerelease versions
pnpm run release:alpha          # 0.1.0 -> 0.1.1-alpha.0
pnpm run release:beta           # 0.1.0 -> 0.1.1-beta.0
pnpm run release:rc             # 0.1.0 -> 0.1.1-rc.0

# Testing
pnpm run release:dry            # Dry run (no changes made)
```

**Using the script directly (more options):**

```bash
# Production releases
./scripts/release.sh patch          # 0.1.0 -> 0.1.1
./scripts/release.sh minor          # 0.1.0 -> 0.2.0
./scripts/release.sh major          # 0.1.0 -> 1.0.0

# Prerelease versions
./scripts/release.sh alpha          # 0.1.0 -> 0.1.1-alpha.0
./scripts/release.sh beta           # 0.1.0 -> 0.1.1-beta.0
./scripts/release.sh rc             # 0.1.0 -> 0.1.1-rc.0

# Advanced options
./scripts/release.sh patch --dry-run       # Test without making changes
./scripts/release.sh minor --no-publish    # Skip npm publish
./scripts/release.sh alpha --no-push       # Skip git push
./scripts/release.sh --help                # Show all options
```

**What it does:**
1. ✅ Validates git working directory is clean
2. ✅ Runs `lerna version` with the specified type
3. ✅ Updates `pnpm-lock.yaml` to match new versions
4. ✅ Commits the lock file changes
5. ✅ Pushes changes and tags to git
6. ✅ Publishes packages to npm

### Manual Release Workflow

If you need more control, follow these steps:

1. **Make your changes** across packages as needed
2. **Test everything**: `pnpm test`
3. **Build all packages**: `pnpm run build`
4. **Check what changed**: `pnpm run lerna:changed`
5. **Version the packages**:
   - For production: `pnpm run lerna:version:patch` (or minor/major)
   - For prerelease: `pnpm run lerna:version:alpha` (or beta/rc)
6. **Update lock file**: `pnpm install`
7. **Commit lock file**: `git add pnpm-lock.yaml && git commit -m "chore: update pnpm-lock.yaml"`
8. **Push changes**: `git push && git push --tags`
9. **Publish to npm**: `pnpm run lerna:publish`

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
pnpm install

# Build all packages
pnpm run build

# Run tests across all packages
pnpm test

# Lint all packages
pnpm run lint

# Clean build artifacts
pnpm run clean

# Deep clean (removes node_modules)
pnpm run deep:clean
```

## pnpm Lock File Management

**Important**: When using Lerna commands directly, always update the lock file:

```bash
# After any lerna version command
pnpm install

# Example full workflow
pnpm lerna version patch --yes
pnpm install
git add pnpm-lock.yaml
git commit -m "chore: update pnpm-lock.yaml"
git push && git push --tags
pnpm lerna publish from-package --yes
```

The automated `release.sh` script handles this automatically.

## Legacy Scripts Removed

The following custom scripts have been removed in favor of Lerna:

- `scripts/release/` - Custom release management (replaced by Lerna)
- `scripts/local/` - Local workspace dependency management (npm workspaces handles this)
- `scripts/shared/` - Shared utilities for removed scripts

## Documentation

For more information about Lerna:
- [Lerna Documentation](https://lerna.js.org/)
- [Conventional Commits](https://www.conventionalcommits.org/)
