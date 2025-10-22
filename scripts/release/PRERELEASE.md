# Pre-Release Version Management Guide

This guide explains how to use the Olane pre-release version system for alpha, beta, and release candidate (rc) versions.

## Table of Contents

- [Quick Start](#quick-start)
- [Version Progression](#version-progression)
- [npm Commands](#npm-commands)
- [GitHub Integration](#github-integration)
- [Workflows](#workflows)
- [npm Tags Explained](#npm-tags-explained)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

---

## Quick Start

### Create an Alpha Release
```bash
npm run release:alpha
```

This single command will:
1. Bump all 19 packages to next alpha version (e.g., `0.7.11` → `0.7.12-alpha.0`)
2. Build all packages
3. Publish to npm with `--tag alpha`
4. Create git branch and commit
5. Push to GitHub
6. Create GitHub pre-release
7. Open draft PR for version changes

### Test Before Publishing (Dry Run)
```bash
npm run release:alpha:dry
```

Shows exactly what would happen without making any changes.

---

## Version Progression

### Typical Release Flow

```
Production:  0.7.11
    ↓ npm run release:alpha
Alpha:       0.7.12-alpha.0
    ↓ npm run release:alpha (iterate)
Alpha:       0.7.12-alpha.1
Alpha:       0.7.12-alpha.2
    ↓ npm run release:promote:beta
Beta:        0.7.12-beta.0
    ↓ npm run release:beta (iterate)
Beta:        0.7.12-beta.1
    ↓ npm run release:promote:rc
RC:          0.7.12-rc.0
    ↓ npm run release:rc (iterate)
RC:          0.7.12-rc.1
    ↓ npm run release:promote:prod
Production:  0.7.12
```

### Stage Meanings

- **Alpha**: Early testing, unstable features, breaking changes allowed
- **Beta**: Feature-complete, focusing on bug fixes, API stabilizing
- **RC (Release Candidate)**: Production-ready candidate, final testing
- **Production**: Stable release

---

## npm Commands

### Pre-Release Commands

#### Alpha Releases
```bash
# Create or iterate alpha version
npm run release:alpha

# Dry run (preview only)
npm run release:alpha:dry
```

#### Beta Releases
```bash
# Create or iterate beta version
npm run release:beta

# Dry run
npm run release:beta:dry
```

#### Release Candidates
```bash
# Create or iterate RC version
npm run release:rc

# Dry run
npm run release:rc:dry
```

### Promotion Commands

```bash
# Auto-promote to next stage (alpha → beta → rc → production)
npm run release:promote

# Explicitly promote to beta
npm run release:promote:beta

# Explicitly promote to RC
npm run release:promote:rc

# Promote to production
npm run release:promote:prod
```

### Standard Releases

```bash
# Patch release (0.7.11 → 0.7.12)
npm run release

# Minor release (0.7.11 → 0.8.0)
npm run release:minor

# Major release (0.7.11 → 1.0.0)
npm run release:major
```

---

## GitHub Integration

### Manual Pre-Release via GitHub UI

1. Go to GitHub Releases page
2. Click "Draft a new release"
3. Create a tag:
   - Alpha: `v0.7.12-alpha.0`
   - Beta: `v0.7.12-beta.0`
   - RC: `v0.7.12-rc.0`
4. Check "This is a pre-release" ✓
5. Add release notes
6. Click "Publish release"

The GitHub workflow will automatically:
- Detect the pre-release type from the tag
- Run the appropriate release command
- Publish to npm with correct tag
- Create a draft PR

### Manual Release via GitHub Actions

1. Go to "Actions" tab
2. Select "oLane Version Release"
3. Click "Run workflow"
4. Select release type from dropdown:
   - alpha
   - beta
   - rc
   - patch
   - minor
   - major
5. Click "Run workflow"

---

## Workflows

### Workflow 1: New Feature Development (Alpha → Production)

```bash
# Step 1: Create alpha for new feature
npm run release:alpha
# Version: 0.7.12-alpha.0
# npm tag: alpha

# Step 2: Test, fix bugs, iterate
npm run release:alpha
# Version: 0.7.12-alpha.1

npm run release:alpha
# Version: 0.7.12-alpha.2

# Step 3: Feature ready for wider testing
npm run release:promote:beta
# Version: 0.7.12-beta.0
# npm tag: beta

# Step 4: Final testing phase
npm run release:promote:rc
# Version: 0.7.12-rc.0
# npm tag: next

# Step 5: Release to production
npm run release:promote:prod
# Version: 0.7.12
# npm tag: latest
```

### Workflow 2: Quick Hotfix (Skip Stages)

```bash
# Create RC directly for urgent fix
npm run release:rc
# Version: 0.7.12-rc.0

# Test and release to production
npm run release:promote:prod
# Version: 0.7.12
```

### Workflow 3: Extended Beta Testing

```bash
# Promote alpha to beta
npm run release:promote:beta
# Version: 0.7.12-beta.0

# Iterate on beta
npm run release:beta
# Version: 0.7.12-beta.1

npm run release:beta
# Version: 0.7.12-beta.2

npm run release:beta
# Version: 0.7.12-beta.3

# When ready, promote to RC
npm run release:promote:rc
```

---

## npm Tags Explained

### What are npm Tags?

npm tags are labels that point to specific versions of your package. When users run `npm install @olane/o-core`, they get the version labeled with the `latest` tag by default.

### Olane's Tag Strategy

| Tag | Version Example | Usage | Install Command |
|-----|----------------|-------|-----------------|
| `alpha` | 0.7.12-alpha.0 | Early testing | `npm install @olane/o-core@alpha` |
| `beta` | 0.7.12-beta.0 | Feature-complete testing | `npm install @olane/o-core@beta` |
| `next` | 0.7.12-rc.0 | Release candidate | `npm install @olane/o-core@next` |
| `latest` | 0.7.12 | Production (default) | `npm install @olane/o-core` |

### Why This Matters

✅ **Clean Production**: Users get stable versions by default
✅ **Safe Testing**: Pre-releases won't accidentally be installed
✅ **Clear Intent**: Tag names indicate stability level
✅ **No Version Clutter**: Test versions don't pollute version history

### Checking Current Tags

```bash
# See all available tags for a package
npm view @olane/o-core dist-tags

# Output:
# {
#   latest: '0.7.11',
#   alpha: '0.7.12-alpha.2',
#   beta: '0.7.12-beta.0',
#   next: '0.7.11-rc.0'
# }
```

---

## Best Practices

### When to Use Each Stage

#### Use Alpha When:
- Implementing new experimental features
- Making breaking API changes
- Rapid iteration needed
- Only internal testing required

#### Use Beta When:
- Feature is complete and API is stable
- Need external testers/early adopters
- Collecting feedback before release
- Focusing on bug fixes

#### Use RC When:
- Feature is production-ready
- Final validation before release
- Need confidence before going live
- Documentation is complete

#### Skip to Production When:
- Urgent hotfixes
- Documentation-only changes
- Very minor updates
- High confidence in changes

### Testing Strategies

#### For Development/Local Testing
**Don't publish!** Use these instead:

```bash
# Option 1: npm link (recommended)
cd packages/o-core
npm link

cd ~/your-test-project
npm link @olane/o-core

# Option 2: File dependencies
# In your test project's package.json:
{
  "dependencies": {
    "@olane/o-core": "file:../../olane/packages/o-core"
  }
}
```

#### For Team Testing
Use alpha releases:
```bash
npm run release:alpha
# Team installs with: npm install @olane/o-core@alpha
```

#### For External/Beta Testers
Use beta releases:
```bash
npm run release:promote:beta
# Users install with: npm install @olane/o-core@beta
```

### Version Naming Conventions

✅ **Good**:
- `0.7.12-alpha.0` - Initial alpha
- `0.7.12-alpha.1` - Second iteration
- `0.7.12-beta.0` - First beta
- `0.7.12-rc.0` - First release candidate

❌ **Avoid**:
- Skipping numbers (creates confusion)
- Manual version edits (breaks automation)
- Mixing formats

---

## Troubleshooting

### Problem: "Cannot promote version"

**Cause**: Current version doesn't have pre-release identifier

**Solution**:
```bash
# Check current version
npm view @olane/o-core version

# If it's a production version (e.g., 0.7.11), create alpha first
npm run release:alpha

# Then promote
npm run release:promote:beta
```

### Problem: "gh command not found"

**Cause**: GitHub CLI not installed

**Solution**:
```bash
# macOS
brew install gh

# Ubuntu/Debian
sudo apt install gh

# Or disable GitHub release creation
npm run release:alpha -- --no-github-release
```

### Problem: npm publish fails with authentication error

**Cause**: Not logged in to npm or invalid token

**Solution**:
```bash
# Login to npm
npm login

# Or set token
npm config set //registry.npmjs.org/:_authToken YOUR_TOKEN
```

### Problem: Version already published

**Cause**: Trying to republish existing version

**Solution**:
```bash
# Check what's published
npm view @olane/o-core versions

# Create next iteration
npm run release:alpha  # Will bump to next alpha number
```

### Problem: Want to test without publishing

**Solution**: Always use dry-run first!
```bash
npm run release:alpha:dry
npm run release:beta:dry
npm run release:rc:dry
```

---

## Advanced Usage

### Custom Promotion Paths

```bash
# Skip beta, go straight from alpha to RC
npm run release:promote:rc

# Explicitly specify target
cd scripts/release && npm run release:promote -- --to production
```

### Parallel Processing

```bash
# Build and publish packages in parallel (faster)
cd scripts/release && npm run release:alpha -- --parallel
```

### Skip Steps

```bash
# Skip tests
cd scripts/release && npm run release:alpha -- --skip-tests

# Skip build
cd scripts/release && npm run release:alpha -- --skip-build
```

---

## Installation Instructions for Users

### Installing Pre-Releases

Share these commands with users who want to test pre-releases:

```bash
# Install specific alpha version
npm install @olane/o-core@0.7.12-alpha.0

# Install latest alpha (automatically gets newest alpha)
npm install @olane/o-core@alpha

# Install latest beta
npm install @olane/o-core@beta

# Install latest RC
npm install @olane/o-core@next

# Install production version (default)
npm install @olane/o-core
```

### Checking Available Versions

```bash
# List all published versions
npm view @olane/o-core versions

# Check current tags
npm view @olane/o-core dist-tags

# See package info
npm view @olane/o-core
```

---

## Summary

### Key Takeaways

1. ✅ Use `npm run release:alpha` for one-command pre-releases
2. ✅ Use `npm run release:promote:beta` for stage transitions
3. ✅ Use dry-run commands to test first
4. ✅ npm tags keep production clean
5. ✅ GitHub integration works automatically
6. ✅ Skip stages when appropriate
7. ✅ Use npm link for local testing (don't publish!)

### Command Cheat Sheet

```bash
# Pre-releases
npm run release:alpha        # Create/iterate alpha
npm run release:beta         # Create/iterate beta
npm run release:rc           # Create/iterate RC

# Promotions
npm run release:promote:beta # Alpha → Beta
npm run release:promote:rc   # Beta → RC
npm run release:promote:prod # RC → Production

# Dry runs (test first!)
npm run release:alpha:dry
npm run release:beta:dry
npm run release:rc:dry

# Production releases
npm run release              # Patch (0.7.11 → 0.7.12)
npm run release:minor        # Minor (0.7.11 → 0.8.0)
npm run release:major        # Major (0.7.11 → 1.0.0)
```

---

For questions or issues, please open an issue on GitHub or reach out to the team.
