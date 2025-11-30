# Contributing to oLane Node Template

Thank you for your interest in contributing to the oLane Node Template! This document provides guidelines and instructions for contributing.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Process](#development-process)
- [Pull Request Process](#pull-request-process)
- [Coding Standards](#coding-standards)
- [Testing Guidelines](#testing-guidelines)
- [Documentation](#documentation)

## Code of Conduct

By participating in this project, you agree to maintain a respectful and inclusive environment for all contributors.

## Getting Started

1. **Fork the repository**
   ```bash
   git clone https://github.com/olane-labs/o-node-template.git
   cd o-node-template
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Create a branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

4. **Set up your environment**
   ```bash
   cp .env.example .env
   ```

## Development Process

### Running the Project

- **Development mode**: `npm run dev`
- **Build**: `npm run build`
- **Tests**: `npm test`
- **Lint**: `npm run lint`

### Making Changes

1. Write your code following our [coding standards](#coding-standards)
2. Add or update tests as needed
3. Update documentation if you're changing functionality
4. Ensure all tests pass: `npm test`
5. Ensure code passes linting: `npm run lint`
6. Build successfully: `npm run build`

## Pull Request Process

1. **Update documentation**: Ensure README.md and inline comments reflect your changes
2. **Update CHANGELOG.md**: Add your changes under `[Unreleased]`
3. **Write clear commit messages**: Use conventional commit format
   ```
   feat: add new method for data processing
   fix: correct error handling in example method
   docs: update API reference
   test: add tests for new feature
   ```
4. **Create a pull request**: Provide a clear description of changes
5. **Address review feedback**: Make requested changes promptly
6. **Ensure CI passes**: All automated checks must pass

### Pull Request Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Tests added/updated
- [ ] All tests passing
- [ ] Manual testing completed

## Checklist
- [ ] Code follows project style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] CHANGELOG.md updated
```

## Coding Standards

### TypeScript

- Use TypeScript for all code
- Provide proper type annotations
- Avoid `any` type when possible
- Use interfaces for object shapes

### File Organization

```
src/
├── index.ts              # Main exports only
├── tool-name.tool.ts     # Tool implementation
├── methods/              # Method definitions
│   └── *.methods.ts
└── interfaces/           # TypeScript interfaces
    └── *.ts
```

### Naming Conventions

- **Files**: kebab-case (`example-tool.tool.ts`)
- **Classes**: PascalCase (`ExampleTool`)
- **Functions/Methods**: camelCase (`exampleMethod`)
- **Constants**: UPPER_SNAKE_CASE (`DEFAULT_TIMEOUT`)
- **Interfaces**: PascalCase with descriptive names (`ExampleConfig`)

### Code Style

- Use 2 spaces for indentation
- Use single quotes for strings
- Add trailing commas in objects/arrays
- Maximum line length: 100 characters
- Use async/await over promises

### Example Code

```typescript
import { oLaneTool } from '@olane/o-lane';
import { oAddress, oRequest } from '@olane/o-core';
import { ToolResult } from '@olane/o-tool';

/**
 * ExampleTool demonstrates best practices for oLane tools.
 */
export class ExampleTool extends oLaneTool {
  private config: ExampleConfig;

  constructor(config: ExampleConfig) {
    super({
      ...config,
      address: new oAddress('o://example'),
      description: 'Example tool for demonstration',
      methods: EXAMPLE_METHODS,
    });
    this.config = config;
  }

  /**
   * Example method implementation.
   * @param request - The oRequest containing method parameters
   * @returns ToolResult with success status and data/error
   */
  async _tool_example_method(request: oRequest): Promise<ToolResult> {
    try {
      const { message } = request.params;

      // Implementation logic here
      const result = `Processed: ${message}`;

      return {
        success: true,
        result,
      };
    } catch (error: any) {
      this.logger.error('Error in example_method:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }
}
```

## Testing Guidelines

### Test Structure

- Place tests in `test/` directory
- Name test files: `*.spec.ts`
- Use descriptive test names
- Test both success and error cases

### Example Test

```typescript
import { expect } from 'chai';
import { ExampleTool } from '../src/example-tool.tool.js';
import { oRequest } from '@olane/o-core';

describe('ExampleTool', () => {
  let tool: ExampleTool;

  beforeEach(() => {
    tool = new ExampleTool({
      // configuration
    });
  });

  afterEach(async () => {
    if (tool) {
      await tool.stop();
    }
  });

  describe('example_method', () => {
    it('should process message successfully', async () => {
      await tool.start();

      const request = new oRequest({
        method: 'example_method',
        params: { message: 'test' },
      });

      const result = await tool.callMyTool(request);

      expect(result.success).to.be.true;
      expect(result.result).to.include('test');
    });

    it('should handle errors gracefully', async () => {
      await tool.start();

      const request = new oRequest({
        method: 'example_method',
        params: {},
      });

      const result = await tool.callMyTool(request);

      expect(result.success).to.be.false;
      expect(result.error).to.exist;
    });
  });
});
```

### Test Coverage

- Aim for >80% code coverage
- Test all public methods
- Test error handling
- Test edge cases

## Documentation

### Inline Documentation

Use JSDoc comments for all public APIs:

```typescript
/**
 * Processes a message and returns the result.
 *
 * @param request - The oRequest containing the message parameter
 * @returns Promise resolving to ToolResult with processed message
 * @throws Error if message parameter is missing
 *
 * @example
 * ```typescript
 * const result = await tool._tool_example_method(request);
 * console.log(result.result);
 * ```
 */
async _tool_example_method(request: oRequest): Promise<ToolResult>
```

### README Updates

When adding features:
1. Update the Features section
2. Add to API Reference
3. Include usage examples
4. Update configuration section if needed

### CHANGELOG

Always update CHANGELOG.md:
- Add changes under `[Unreleased]`
- Use appropriate category (Added, Changed, Fixed, etc.)
- Include brief description of change

## Questions?

If you have questions or need help:
- Open an issue on GitHub
- Check existing documentation
- Review other oLane tools for examples

## License

By contributing, you agree that your contributions will be licensed under the same dual license (MIT OR Apache-2.0) as the project.

---

Thank you for contributing to oLane Node Template!
