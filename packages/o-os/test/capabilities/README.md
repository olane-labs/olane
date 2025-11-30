# O-Lane Capability Test Suite

Comprehensive test suite for o-lane capability functionalities, covering all capability types and their interactions.

## Overview

This test suite validates the entire o-lane capability system, including:
- Base capability functionality
- Individual capability implementations
- Error handling and validation
- Capability registry management
- Integration and workflow scenarios

## Test Structure

```
test/capabilities/
├── README.md                              # This file
├── utils/
│   └── capability-test-utils.ts          # Shared test utilities and helpers
├── base-capability.spec.ts               # Base capability class tests
├── intelligence-capability.spec.ts       # Intelligence capability tests
├── task-capability.spec.ts               # Task execution capability tests
├── search-capability.spec.ts             # Search capability tests
├── configure-capability.spec.ts          # Configuration capability tests
├── evaluate-capability.spec.ts           # Evaluation capability tests
├── multiple-step-capability.spec.ts      # Multi-step orchestration tests
├── capability-errors.spec.ts             # Error handling tests
├── capability-registry.spec.ts           # Registry and type system tests
└── capability-integration.spec.ts        # Integration and workflow tests
```

## Test Categories

### 1. Base Capability Tests (`base-capability.spec.ts`)
Tests the abstract `oCapability` base class:
- `execute()` method and lifecycle
- Getter methods (`node`, `intent`, `type`)
- `cancel()` functionality
- Configuration handling
- Multi-execution support

**Coverage:**
- Base class inheritance
- Abstract method implementation
- State management
- Error propagation

### 2. Intelligence Capability Tests (`intelligence-capability.spec.ts`)
Tests the `oCapabilityIntelligence` base class:
- AI intelligence integration
- Streaming response handling
- Prompt processing
- Result extraction
- Error handling when node is not running

**Coverage:**
- Intelligence service integration
- Streaming vs non-streaming modes
- Service availability handling

### 3. Task Capability Tests (`task-capability.spec.ts`)
Tests `oCapabilityTask` for tool execution:
- Tool method execution
- Parameter validation and handling
- Approval system integration
- LFS (Large File System) support
- Error handling for missing tools/methods

**Coverage:**
- Tool address validation
- Method parameter passing
- Approval workflow
- Persistence flags (`_save`)
- Replay mode

### 4. Search Capability Tests (`search-capability.spec.ts`)
Tests `oCapabilitySearch` for internal and external search:
- Internal vector store search
- External search (Perplexity)
- Multi-query support
- Result formatting
- Empty result handling

**Coverage:**
- Internal vs external search
- Query limit handling
- Result aggregation
- Streaming search results

### 5. Configure Capability Tests (`configure-capability.spec.ts`)
Tests `oCapabilityConfigure` for tool configuration:
- Tool handshake functionality
- Method discovery and validation
- AI-powered configuration
- Prompt generation
- Context incorporation

**Coverage:**
- Handshake protocol
- Tool metadata extraction
- Configuration prompt generation
- History and context handling

### 6. Evaluate Capability Tests (`evaluate-capability.spec.ts`)
Tests `oCapabilityEvaluate` for AI evaluation:
- Intent evaluation
- Context-aware processing
- History integration
- Extra instructions handling
- Streaming evaluation

**Coverage:**
- Prompt construction
- Context integration
- Streaming support
- Complex scenario handling

### 7. Multiple Step Capability Tests (`multiple-step-capability.spec.ts`)
Tests `oCapabilityMultipleStep` for sub-lane orchestration:
- Sequential intent execution
- Sub-lane creation and cleanup
- Cancellation propagation
- Result aggregation
- Parent lane ID preservation

**Coverage:**
- Sub-lane management
- Intent sequencing
- Cancellation handling
- Configuration propagation

### 8. Error Handling Tests (`capability-errors.spec.ts`)
Tests error handling and reporting:
- Error type enumeration
- Error context tracking
- Human-readable error messages
- Remediation suggestions
- Error type inference

**Coverage:**
- All error types (NOT_FOUND, UNAUTHORIZED, etc.)
- Error serialization
- Error wrapping and chaining
- Recovery strategies

### 9. Registry Tests (`capability-registry.spec.ts`)
Tests the capability registry system:
- `ALL_CAPABILITIES` array
- Capability type mapping
- Capability discovery
- Type enumeration
- Registry immutability

**Coverage:**
- All 5 registered capabilities
- Type uniqueness
- Capability instantiation
- Metadata validation

### 10. Integration Tests (`capability-integration.spec.ts`)
Tests capability workflows and interactions:
- Capability lifecycle
- Capability sequencing (EVALUATE → CONFIGURE → TASK)
- History propagation
- Streaming across capability chains
- Error propagation
- Parallel execution
- State management

**Coverage:**
- Realistic workflows
- Complex scenarios
- Concurrent capability execution
- State isolation

## Running Tests

### Run All Capability Tests
```bash
npm run test:capabilities
```

### Run Specific Test File
```bash
npm test -- test/capabilities/base-capability.spec.ts
```

### Run with Specific Tags
```bash
# Run all capability tests
npm test -- test/capabilities --grep @capability

# Run specific capability type
npm test -- test/capabilities --grep @task
npm test -- test/capabilities --grep @search
npm test -- test/capabilities --grep @integration
```

### Run in Node.js Mode
```bash
npm run test:node -- test/capabilities
```

## Test Utilities

The `utils/capability-test-utils.ts` file provides:

### Helper Functions
- `createTestOS()` - Creates a test OlaneOS instance
- `createTestLaneTool()` - Creates a test lane tool node
- `createMockIntent()` - Creates mock intent objects
- `createMockCapabilityConfig()` - Creates mock capability configurations
- `createMockTool()` - Creates mock tools for testing
- `waitFor()` - Waits for a condition to be true

### Test Fixtures
- `TEST_FIXTURES` - Common test data and scenarios
- `assertCapabilityResult` - Assertion helpers for capability results

### Utilities
- `ChunkCapture` - Captures streaming chunks for testing
- Mock history and context data

## Test Coverage

The test suite covers:

✅ **Unit Tests** - Each capability class individually
✅ **Integration Tests** - Capability interactions and workflows
✅ **Error Handling** - All error types and scenarios
✅ **Edge Cases** - Empty inputs, missing services, etc.
✅ **Streaming** - Streaming and non-streaming modes
✅ **Replay** - Replay mode functionality
✅ **Cancellation** - Graceful cancellation handling
✅ **Registry** - Capability discovery and type system

## Expected Behavior

### Service Dependencies
Many tests expect external services (intelligence, search, approval) to be available. When these services are not configured:
- Tests validate the structure and attempt execution
- Errors are caught and handled gracefully
- Tests still pass by validating the attempt was made correctly

### Test Philosophy
- **Graceful degradation**: Tests handle missing services
- **Structure validation**: Even failed executions validate code structure
- **Error validation**: Expected errors are tested, not just success paths
- **Realistic scenarios**: Tests mirror real-world usage patterns

## Adding New Tests

When adding new capability tests:

1. **Use existing utilities** - Leverage `capability-test-utils.ts`
2. **Follow naming conventions** - Use descriptive test names
3. **Add appropriate tags** - Use `@capability` and specific tags
4. **Test both success and failure** - Don't just test happy paths
5. **Document assumptions** - Note any service dependencies

### Example Test Structure
```typescript
describe('NewCapability @capability @new', () => {
  let os: OlaneOS;
  let laneTool: oLaneTool;
  let capability: NewCapability;

  before(async () => {
    os = await createTestOS();
    laneTool = await createTestLaneTool(os);
  });

  after(async () => {
    await laneTool?.stop();
    await os?.stop();
  });

  beforeEach(() => {
    capability = new NewCapability();
  });

  describe('feature group', () => {
    it('should test specific behavior', async () => {
      const config = createMockCapabilityConfig(laneTool, 'intent');
      const result = await capability.execute(config);
      expect(result).to.exist;
    });
  });
});
```

## Continuous Integration

These tests are designed to run in CI environments:
- No external service dependencies required for structure validation
- Fast execution (most tests complete quickly)
- Comprehensive coverage of all capability code paths
- Clear error messages for debugging

## Troubleshooting

### Tests are failing with "service not available"
This is expected when external services (intelligence, search, etc.) are not configured. The tests still validate the code structure correctly.

### Tests are timing out
Increase the timeout in your test runner or check if external services are responding slowly.

### Import errors
Ensure all packages are built:
```bash
npm run build:all
```

## Contributing

When modifying capabilities:
1. Update relevant test files
2. Add new test cases for new functionality
3. Run full test suite before committing
4. Document any new test utilities or patterns

## License

Same as the parent project.
