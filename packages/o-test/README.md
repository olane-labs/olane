# oLane Node Template

A comprehensive template for creating new oLane tools and nodes. This template provides a complete starting point with best practices, example implementations, and development infrastructure.

## Overview

The oLane Node Template is designed to help developers quickly create new tools within the oLane ecosystem. It includes:

- Complete example tool implementation
- TypeScript configuration optimized for oLane development
- Testing infrastructure with Jest
- Linting and formatting with ESLint and Prettier
- Example method definitions and interfaces
- Development scripts and tooling

## Features

- **Complete Tool Example**: Fully functional example tool showing best practices
- **Type-Safe**: Full TypeScript support with proper type definitions
- **Well Structured**: Organized directory structure following oLane conventions
- **Testing Ready**: Jest configuration with example tests
- **Development Tools**: ESLint, Prettier, and debugging configurations
- **Documentation**: Comprehensive inline comments and documentation
- **Modern Tooling**: Uses latest oLane packages and development tools

## Installation

1. Clone this template:
```bash
git clone https://github.com/olane-labs/o-node-template.git my-new-tool
cd my-new-tool
```

2. Install dependencies:
```bash
npm install
```

3. Set up your environment:
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. Customize the template:
   - Update `package.json` with your tool name and description
   - Rename `src/example-tool.tool.ts` to match your tool name
   - Update method definitions in `src/methods/`
   - Modify interfaces in `src/interfaces/`
   - Update tests in `test/`

## Quick Start

### 1. Build the project:
```bash
npm run build
```

### 2. Run tests:
```bash
npm test
```

### 3. Start in development mode:
```bash
npm run dev
```

### 4. Run linting:
```bash
npm run lint
```

## How It Works

This template provides a complete example of an oLane tool that demonstrates:

### Tool Structure
```
src/
├── index.ts                          # Main exports
├── example-tool.tool.ts             # Tool class implementation
├── methods/
│   └── example.methods.ts           # Method definitions
└── interfaces/
    ├── index.ts                     # Interface exports
    ├── example-config.ts            # Configuration interfaces
    ├── example-request.ts           # Request interfaces
    └── example-response.ts          # Response interfaces
```

### Key Components

**Tool Class**: The main tool class extends `oLaneTool` and implements your tool's functionality.

**Methods**: Defined using the `oMethod` interface, methods describe what your tool can do and are discoverable by AI agents.

**Interfaces**: TypeScript interfaces provide type safety for configuration, requests, and responses.

**Tests**: Example tests show how to test your tool methods and functionality.

## API Reference

The example tool includes the following methods:

### `example_method`

Demonstrates a basic tool method implementation.

**Parameters:**
- `message` (string, required): A message to process

**Returns:**
```typescript
{
  success: boolean;
  result?: string;
  error?: string;
}
```

**Example:**
```typescript
import { ExampleTool } from '@olane/o-node-template';

const tool = new ExampleTool({
  // configuration
});

await tool.start();

const result = await tool.callMyTool({
  method: 'example_method',
  params: { message: 'Hello, oLane!' }
});

console.log(result);
```

## Configuration

### Environment Variables

Create a `.env` file based on `.env.example`:

```bash
# GitHub Token (if needed)
GITHUB_TOKEN=your_token_here

# Node environment
NODE_ENV=development

# Debug settings
DEBUG=olane:*
```

### Programmatic Configuration

```typescript
import { ExampleTool } from '@olane/o-node-template';

const tool = new ExampleTool({
  // Add your configuration here
  customOption: 'value'
});
```

## Common Use Cases

### Creating a Simple Tool

1. Rename the example tool class
2. Define your methods in `src/methods/`
3. Implement tool methods with the `_tool_` prefix
4. Export from `src/index.ts`

### Adding Multiple Methods

1. Add method definitions to `src/methods/example.methods.ts`
2. Implement corresponding `_tool_methodname` methods in your tool class
3. Update interfaces for request/response types

### Testing Your Tool

1. Create test files in `test/`
2. Use the example test as a template
3. Run tests with `npm test`

## Scripts

- `npm run build` - Compile TypeScript to JavaScript
- `npm run dev` - Run in development mode with auto-reload
- `npm test` - Run tests
- `npm run lint` - Check code style
- `npm run clean` - Remove build artifacts
- `npm run deep:clean` - Remove node_modules and package-lock.json

## Development

### Directory Structure

```
o-node-template/
├── .github/              # GitHub templates and workflows
├── .vscode/              # VS Code debug configuration
├── src/                  # Source code
│   ├── index.ts         # Main exports
│   ├── example-tool.tool.ts
│   ├── methods/         # Method definitions
│   └── interfaces/      # TypeScript interfaces
├── test/                # Tests
│   ├── example.spec.ts
│   └── fixtures/        # Test fixtures
├── dist/                # Compiled output
├── .env.example         # Example environment variables
├── .gitignore
├── .prettierrc
├── CHANGELOG.md         # Version history
├── CONTRIBUTING.md      # Contribution guidelines
├── LICENSE              # Dual license
├── README.md
├── eslint.config.js
├── jest.config.js
├── package.json
└── tsconfig.json
```

### Adding New Methods

1. Define the method in `src/methods/example.methods.ts`:
```typescript
export const EXAMPLE_METHODS: { [key: string]: oMethod } = {
  new_method: {
    name: 'new_method',
    description: 'Description of what this method does',
    parameters: [
      {
        name: 'param1',
        type: 'string',
        description: 'Parameter description',
        required: true,
      }
    ],
    dependencies: [],
  }
};
```

2. Implement the method in your tool class:
```typescript
async _tool_new_method(request: oRequest): Promise<ToolResult> {
  try {
    const { param1 } = request.params;
    // Implementation
    return { success: true, result: 'result' };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
```

3. Add tests for the new method

### Customizing for Your Tool

1. **Update package.json**: Change name, description, repository
2. **Rename files**: Replace "example" with your tool name
3. **Update methods**: Define your tool's specific methods
4. **Modify interfaces**: Update types to match your use case
5. **Update README**: Replace this documentation with your tool's docs
6. **Add tests**: Write tests for your specific functionality

## Troubleshooting

### Build Errors

If you encounter build errors:
```bash
npm run clean
npm run build
```

### Test Failures

Ensure all dependencies are installed:
```bash
npm install
```

Check that peer dependencies are compatible:
```bash
npm ls
```

### Type Errors

Make sure TypeScript is properly configured:
```bash
npx tsc --noEmit
```

## Dependencies

### Peer Dependencies
- `@olane/o-config` - Configuration management
- `@olane/o-core` - Core oLane functionality
- `@olane/o-protocol` - Protocol definitions
- `@olane/o-tool` - Tool base classes
- `@olane/o-tool-registry` - Tool registration
- `@olane/o-tools-common` - Common tool utilities

### Runtime Dependencies
- `chalk` - Terminal styling
- `debug` - Debug logging
- `dotenv` - Environment variable management

## Related Packages

- [o-approval](../o-approval) - Approval workflow tool
- [o-intelligence](../o-intelligence) - AI intelligence provider
- [o-monitor](../o-monitor) - System monitoring tool

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines on contributing to this template.

## License

Dual licensed under your choice of:
- MIT License (LICENSE-MIT or https://opensource.org/licenses/MIT)
- Apache License, Version 2.0 (LICENSE-APACHE or https://www.apache.org/licenses/LICENSE-2.0)

See [LICENSE](LICENSE) for details.

---

Built with the oLane ecosystem. For more information, visit the [oLane documentation](https://docs.olane.ai).
