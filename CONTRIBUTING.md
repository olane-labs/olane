# Contributing to Olane OS

Thank you for your interest in contributing to Olane OS! This document provides guidelines and instructions for contributing to the project.

**TL;DR**: We welcome all contributions - from bug fixes to new features to documentation improvements. Read this guide, follow our conventions, and submit a PR. We aim to respond within 48 hours.

---

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [License and Contributions](#license-and-contributions)
- [Quick Start](#quick-start)
- [Ways to Contribute](#ways-to-contribute)
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Coding Standards](#coding-standards)
- [Testing Guidelines](#testing-guidelines)
- [Pull Request Process](#pull-request-process)
- [Commit Message Guidelines](#commit-message-guidelines)
- [Documentation](#documentation)
- [Community](#community)

---

## Code of Conduct {#code-of-conduct}

This project adheres to a [Code of Conduct](./CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code. Please report unacceptable behavior to conduct@olane.io.

---

## License and Contributions {#license-and-contributions}

Olane OS is dual-licensed under **MIT OR Apache-2.0**. This provides flexibility for projects with different licensing requirements.

### Your Contributions

**By submitting a contribution to this project, you agree that your contributions will be licensed under the same dual license (MIT OR Apache-2.0) as the project.**

Unless you explicitly state otherwise, any contribution intentionally submitted for inclusion in the work by you shall be dual-licensed as above, without any additional terms or conditions.

### Why Dual Licensing?

- **MIT**: Simple, permissive license without patent provisions
- **Apache 2.0**: Permissive license with explicit patent grants and protections

Users of Olane OS can choose which license best fits their needs. For more details, see:
- [LICENSE-MIT](./LICENSE-MIT)
- [LICENSE-APACHE](./LICENSE-APACHE)
- [Main LICENSE file](./LICENSE)

---

## Quick Start {#quick-start}

**Ready to contribute in 5 minutes?**

```bash
# 1. Fork and clone the repository
git clone https://github.com/YOUR_USERNAME/olane.git
cd olane

# 2. Install dependencies
npm install

# 3. Build all packages
npm run build

# 4. Run tests
npm run test

# 5. Make your changes and create a branch
git checkout -b feature/your-feature-name

# 6. Push and create a pull request
git push origin feature/your-feature-name
```

---

## Ways to Contribute {#ways-to-contribute}

### 🐛 Bug Reports

Found a bug? [Create an issue](https://github.com/olane-labs/olane/issues/new?template=bug_report.md) with:
- Clear description of the bug
- Steps to reproduce
- Expected vs actual behavior
- Environment details (OS, Node version, package versions)

### ✨ Feature Requests

Have an idea? [Create a feature request](https://github.com/olane-labs/olane/issues/new?template=feature_request.md) with:
- Problem statement
- Proposed solution
- Alternative solutions considered
- Use cases and examples

### 📝 Documentation

- Fix typos, improve clarity, or add examples
- Write tutorials or guides
- Improve API documentation
- Add code comments

### 🔧 Code Contributions

- Fix bugs
- Implement new features
- Improve performance
- Add tests
- Refactor code

### 🎨 Tool Nodes

- Build specialized tool nodes
- Share example implementations
- Create integration packages
- Document patterns and best practices

---

## Development Setup {#development-setup}

### Prerequisites

- **Node.js**: v20 or higher
- **npm**: v10 or higher
- **TypeScript**: v5.8 or higher
- **Git**: Latest version

### Installation

```bash
# Clone the repository
git clone https://github.com/olane-labs/olane.git
cd olane

# Install dependencies for all workspaces
npm install

# Build all packages
npm run build

# Run tests
npm run test
```

### Development Scripts

```bash
# Run tests for all packages
npm run test

# Run tests for a specific package
npm run test --workspace=packages/o-core

# Run linter
npm run lint

# Clean build artifacts
npm run clean

# Deep clean (removes node_modules)
npm run deep:clean

# Build all packages
npm run build

# Start development docs server
npm run docs:dev
```

### Working with Packages

Olane is a **monorepo** with multiple packages. Each package is independently versioned and published.

```bash
# Install dependency in specific package
npm install <dependency> --workspace=packages/o-core

# Run script in specific package
npm run test --workspace=packages/o-node

# Add dependency to all packages
npm install <dependency> --workspaces
```

---

## Project Structure {#project-structure}

```
olane/
├── packages/              # Core packages (monorepo)
│   ├── o-core/           # Kernel layer
│   ├── o-node/           # P2P networking
│   ├── o-tool/           # Tool system
│   ├── o-lane/           # Intent-driven execution
│   ├── o-leader/         # Network coordination
│   ├── o-os/             # Runtime system
│   ├── o-mcp/            # MCP integration
│   ├── o-protocol/       # Type definitions
│   └── ...
├── examples/             # Example implementations
│   ├── 01-add-mcp-server/
│   ├── 02-vector-db/
│   └── ...
├── docs/                 # Documentation (Mintlify)
│   ├── concepts/
│   ├── guides/
│   ├── packages/
│   └── ...
├── scripts/              # Build and release scripts
├── .github/              # GitHub templates and workflows
├── CONTRIBUTING.md       # This file
├── CODE_OF_CONDUCT.md    # Community guidelines
├── SECURITY.md           # Security policy
└── README.md             # Main README
```

### Package Architecture

Each package follows this structure:

```
packages/o-core/
├── src/                  # TypeScript source files
│   ├── index.ts         # Main entry point
│   ├── core/            # Core functionality
│   ├── error/           # Error handling
│   └── utils/           # Utility functions
├── test/                # Test files
├── dist/                # Compiled JavaScript (generated)
├── README.md            # Package documentation
├── package.json         # Package configuration
└── tsconfig.json        # TypeScript configuration
```

---

## Coding Standards {#coding-standards}

### TypeScript

- Use **TypeScript** for all new code
- Enable `strict` mode in `tsconfig.json`
- Add type annotations for public APIs
- Use `interface` for object types
- Use `type` for unions, intersections, and primitives

**Example:**

```typescript
// ✅ Good
interface ToolNodeConfig {
  address: oAddress;
  leader?: oAddress;
  laneContext?: Record<string, unknown>;
}

async function createToolNode(config: ToolNodeConfig): Promise<oNodeTool> {
  // Implementation
}

// ❌ Avoid
function createToolNode(config: any) {
  // Implementation
}
```

### Naming Conventions

- **Classes**: `PascalCase` (e.g., `oNodeTool`, `OlaneOS`)
- **Functions/Methods**: `camelCase` (e.g., `calculateRevenue`)
- **Constants**: `UPPER_SNAKE_CASE` (e.g., `DEFAULT_PORT`)
- **Files**: `kebab-case.ts` (e.g., `o-node-tool.ts`)
- **Tool Methods**: `_tool_` prefix (e.g., `_tool_analyze_data`)
- **Param Methods**: `_params_` prefix (e.g., `_params_analyze_data`)

### Code Style

We use **ESLint** and **Prettier** for code formatting.

```bash
# Run linter
npm run lint

# Format code (if configured)
npx prettier --write "packages/*/src/**/*.ts"
```

**Key Guidelines:**

- Use **2 spaces** for indentation
- **Single quotes** for strings
- **Semicolons** required
- **Trailing commas** in objects and arrays
- **Max line length**: 100 characters
- Use `async/await` over Promises when possible
- Prefer `const` over `let`, avoid `var`

**Example:**

```typescript
// ✅ Good
const config: NodeConfig = {
  address: new oAddress('o://example'),
  port: 4999,
  features: ['networking', 'discovery'],
};

async function startNode(config: NodeConfig): Promise<void> {
  const node = new oNodeTool(config);
  await node.start();
  console.log('Node started');
}

// ❌ Avoid
var config = {
  address: new oAddress("o://example"),
  port: 4999,
  features: ["networking", "discovery"]
}

function startNode(config) {
  return new Promise((resolve) => {
    const node = new oNodeTool(config)
    node.start().then(() => {
      console.log("Node started")
      resolve()
    })
  })
}
```

### Error Handling

- Use custom error classes from `@olane/o-core`
- Provide descriptive error messages
- Include context in error objects
- Don't swallow errors

**Example:**

```typescript
import { oError } from '@olane/o-core';

// ✅ Good
async function fetchData(id: string): Promise<Data> {
  if (!id) {
    throw new oError('ID is required', { context: { id } });
  }

  try {
    return await api.fetch(id);
  } catch (error) {
    throw new oError('Failed to fetch data', {
      context: { id },
      cause: error,
    });
  }
}

// ❌ Avoid
async function fetchData(id) {
  try {
    return await api.fetch(id);
  } catch (error) {
    console.error(error);
    return null;
  }
}
```

### Comments

- Use **JSDoc** for public APIs
- Inline comments for complex logic
- Explain **why**, not **what**

**Example:**

```typescript
/**
 * Calculates revenue for a given date range
 * 
 * @param startDate - Start of date range (ISO 8601)
 * @param endDate - End of date range (ISO 8601)
 * @returns Revenue data with breakdown by category
 * @throws {oError} If date range is invalid or data unavailable
 */
async function calculateRevenue(
  startDate: string,
  endDate: string
): Promise<RevenueData> {
  // Use cache if available to reduce API calls
  const cached = await this.cache.get(startDate, endDate);
  if (cached) return cached;

  // Implementation
}
```

---

## Testing Guidelines {#testing-guidelines}

### Testing Philosophy

- **Unit tests** for individual functions and classes
- **Integration tests** for package interactions
- **End-to-end tests** for complete workflows
- Aim for **>80% code coverage**

### Writing Tests

We use **Jest** for testing.

```bash
# Run all tests
npm run test

# Run tests for specific package
npm run test --workspace=packages/o-core

# Run tests in watch mode
npm run test -- --watch

# Run tests with coverage
npm run test -- --coverage
```

**Example Test:**

```typescript
import { oAddress } from '@olane/o-core';

describe('oAddress', () => {
  describe('constructor', () => {
    it('should create valid address from string', () => {
      const address = new oAddress('o://finance/analyst');
      expect(address.toString()).toBe('o://finance/analyst');
    });

    it('should throw error for invalid address', () => {
      expect(() => new oAddress('invalid')).toThrow(oError);
    });
  });

  describe('hierarchy', () => {
    it('should extract parent from hierarchical address', () => {
      const address = new oAddress('o://company/finance/analyst');
      expect(address.parent()?.toString()).toBe('o://company/finance');
    });

    it('should return null for root address', () => {
      const address = new oAddress('o://leader');
      expect(address.parent()).toBeNull();
    });
  });
});
```

### Test Organization

```
packages/o-core/
├── src/
│   ├── core/
│   │   └── address.ts
│   └── index.ts
└── test/
    ├── core/
    │   └── address.test.ts
    └── index.test.ts
```

### Testing Tool Nodes

```typescript
import { oNodeTool } from '@olane/o-node';

describe('FinancialAnalystNode', () => {
  let node: FinancialAnalystNode;

  beforeEach(async () => {
    node = new FinancialAnalystNode();
    await node.start();
  });

  afterEach(async () => {
    await node.stop();
  });

  it('should calculate revenue correctly', async () => {
    const result = await node.use({
      method: 'calculate_revenue',
      params: {
        startDate: '2024-01-01',
        endDate: '2024-03-31',
      },
    });

    expect(result).toHaveProperty('revenue');
    expect(result.revenue).toBeGreaterThan(0);
  });
});
```

---

## Pull Request Process {#pull-request-process}

### Before Submitting

1. **Create an issue** for discussion (for non-trivial changes)
2. **Fork the repository** and create a branch
3. **Make your changes** following our coding standards
4. **Write tests** for new functionality
5. **Update documentation** if needed
6. **Run tests and linter** locally
7. **Commit with descriptive messages**

### PR Checklist

- [ ] Code follows project style guidelines
- [ ] Tests added/updated and passing
- [ ] Documentation updated (if needed)
- [ ] Commit messages follow convention
- [ ] PR description clearly explains changes
- [ ] Linked to related issue (if applicable)
- [ ] No merge conflicts with main branch
- [ ] CI/CD checks passing

### PR Template

When creating a PR, our template will guide you. Include:

- **Description**: What changes were made and why
- **Type of Change**: Bug fix, feature, documentation, etc.
- **Testing**: How was this tested?
- **Related Issues**: Link to issues this addresses
- **Screenshots**: For UI changes (if applicable)
- **Breaking Changes**: Any backward compatibility concerns

### Review Process

1. **Automated checks** run (linting, tests, build)
2. **Maintainer review** within 48 hours
3. **Discussion and iteration** as needed
4. **Approval and merge** by maintainer

**Tips for faster review:**

- Keep PRs focused and small
- Write clear descriptions
- Respond to feedback promptly
- Be patient and respectful

---

## Commit Message Guidelines {#commit-message-guidelines}

We follow the **Conventional Commits** specification.

### Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- **feat**: New feature
- **fix**: Bug fix
- **docs**: Documentation only
- **style**: Code style changes (formatting, etc.)
- **refactor**: Code change that neither fixes bug nor adds feature
- **perf**: Performance improvement
- **test**: Adding or updating tests
- **chore**: Maintenance tasks (build, CI, dependencies)

### Examples

```bash
# Feature
feat(o-lane): add support for streaming responses

# Bug fix
fix(o-node): resolve connection timeout issue

# Documentation
docs(contributing): add testing guidelines

# Refactor
refactor(o-core): simplify address parsing logic

# Breaking change
feat(o-protocol)!: change request format for v2

BREAKING CHANGE: Request format now requires 'version' field
```

### Scope

Use package name or area of change:

- `o-core`, `o-node`, `o-lane`, `o-leader`, `o-os`
- `docs`, `examples`, `scripts`
- `ci`, `deps`, `config`

---

## Documentation {#documentation}

### Where to Document

- **README.md**: Package-level quick start and overview
- **docs/**: Comprehensive guides and API reference (Mintlify)
- **Code comments**: JSDoc for public APIs
- **Examples**: Working code samples in `examples/`

### Documentation Standards

Follow our [documentation guidelines](./docs/templates/README.md):

- **Be concise**: Remove unnecessary words
- **Use examples**: Include copy-pasteable code
- **Progressive disclosure**: Start simple, add complexity
- **Optimize for skimming**: Use headings, bold, and lists
- **Add anchor links**: For easy navigation

### Documentation Structure

```markdown
# Feature Name

Brief one-sentence description.

## Quick Start {#quick-start}

```typescript
// Minimal working example
```

## How It Works {#how-it-works}

Explanation...

## API Reference {#api-reference}

### `methodName(params)`

**Parameters:**
- `param1` (type, required): Description

**Returns:** Description

**Example:**
```typescript
// Usage example
```

## Common Use Cases {#common-use-cases}

### Use Case 1: Description

Step-by-step...

## Troubleshooting {#troubleshooting}

### Error: Message
**Solution:** Fix...

## Related {#related}
- [Link to related docs]
```

---

## Community {#community}

### Getting Help

- **Documentation**: [olane.com/docs](https://olane.com/docs)
- **GitHub Discussions**: [Ask questions](https://github.com/olane-labs/olane/discussions)
- **Discord**: [Join our community](https://discord.gg/olane)
- **Email**: support@olane.io

### Communication Channels

- **GitHub Issues**: Bug reports and feature requests
- **GitHub Discussions**: Questions and ideas
- **Discord**: Real-time chat and community
- **Email**: Security issues and private concerns

### Community Guidelines

- Be respectful and inclusive
- Help others learn and grow
- Share knowledge and experiences
- Give constructive feedback
- Follow our Code of Conduct

---

## Release Process {#release-process}

**Note**: This section is for maintainers.

### Version Numbers

We use **Semantic Versioning** (SemVer):

- **Major** (1.0.0): Breaking changes
- **Minor** (0.1.0): New features (backward compatible)
- **Patch** (0.0.1): Bug fixes

### Release Commands

```bash
# Dry run
npm run release:dry-run

# Patch release (0.7.0 → 0.7.1)
npm run release

# Minor release (0.7.0 → 0.8.0)
npm run release:minor

# Major release (0.7.0 → 1.0.0)
npm run release:major

# Parallel release (all packages)
npm run release:parallel
```

---

## Recognition {#recognition}

Contributors are recognized in:

- **GitHub contributors graph**
- **Release notes** for significant contributions
- **Community showcases** for outstanding work

---

## Questions?

**Need help?** Ask in:
- [GitHub Discussions](https://github.com/olane-labs/olane/discussions)
- [Discord](https://discord.gg/olane)
- Email: support@olane.io

**Found an issue with this guide?** [Open an issue](https://github.com/olane-labs/olane/issues/new) or submit a PR.

---

Thank you for contributing to Olane OS! 🚀

