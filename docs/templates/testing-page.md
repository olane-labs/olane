# Testing Page Template

**Purpose**: Show how to test specific functionality with integrated examples  
**Location**: `use-cases/{category}/testing.mdx` or `dev/testing-{area}.mdx`

---

## Template

```mdx
---
title: "Testing Specialist Agents"
description: "Validate agent behavior, tools, and context injection"
---

## Testing strategy

Specialist agents should be tested at three levels:

<CardGroup cols={3}>
  <Card title="Unit Tests" icon="flask">
    Individual tool methods
  </Card>
  <Card title="Integration Tests" icon="puzzle-piece">
    Agent + intent execution
  </Card>
  <Card title="End-to-End Tests" icon="route">
    Full workflows
  </Card>
</CardGroup>

## Unit testing tools

Test individual tool methods in isolation:

<CodeGroup>
```typescript test/tools.test.ts
import { describe, it, expect, beforeAll } from '@jest/globals';
import { FinancialAgent } from '../src/financial-agent';
import { oRequest } from '@olane/o-protocol';

describe('FinancialAgent Tools', () => {
  let agent: FinancialAgent;

  beforeAll(async () => {
    agent = new FinancialAgent();
    await agent.start();
  });

  it('should analyze revenue correctly', async () => {
    const request = new oRequest({
      method: 'analyze_revenue',
      params: {
        quarter: 4,
        year: 2024,
        data: {
          transactions: [{ amount: 100000 }, { amount: 250000 }],
          current: 350000,
          previous: 280000
        }
      }
    });

    const result = await agent._tool_analyze_revenue(request);

    expect(result.revenue).toBe(350000);
    expect(result.growth).toBeCloseTo(25, 1);
    expect(result.forecast).toBeGreaterThan(350000);
  });

  it('should validate parameters', async () => {
    // Check method definitions from oMethod schema
    const methods = agent.methods; // Assuming methods are accessible
    const analyzeMethod = methods['analyze_revenue'];
    
    expect(analyzeMethod).toBeDefined();
    expect(analyzeMethod.parameters).toBeDefined();
    
    const quarterParam = analyzeMethod.parameters.find(p => p.name === 'quarter');
    const yearParam = analyzeMethod.parameters.find(p => p.name === 'year');
    const dataParam = analyzeMethod.parameters.find(p => p.name === 'data');
    
    expect(quarterParam?.required).toBe(true);
    expect(yearParam?.required).toBe(true);
    expect(dataParam?.required).toBe(true);
  });

  it('should handle missing data gracefully', async () => {
    const request = new oRequest({
      method: 'analyze_revenue',
      params: {
        quarter: 4,
        year: 2024
        // Missing data parameter
      }
    });

    await expect(
      agent._tool_analyze_revenue(request)
    ).rejects.toThrow('Missing required parameter: data');
  });
});
```

```javascript test/tools.test.js
const { describe, it, expect, beforeAll } = require('@jest/globals');
const { FinancialAgent } = require('../src/financial-agent');
const { oRequest } = require('@olane/o-protocol');

describe('FinancialAgent Tools', () => {
  let agent;

  beforeAll(async () => {
    agent = new FinancialAgent();
    await agent.start();
  });

  it('should analyze revenue correctly', async () => {
    const request = new oRequest({
      method: 'analyze_revenue',
      params: {
        quarter: 4,
        year: 2024,
        data: {
          transactions: [{ amount: 100000 }, { amount: 250000 }],
          current: 350000,
          previous: 280000
        }
      }
    });

    const result = await agent._tool_analyze_revenue(request);

    expect(result.revenue).toBe(350000);
    expect(result.growth).toBeCloseTo(25, 1);
  });
});
```
</CodeGroup>

**Run tests**:
```bash
npm test
```

**Expected output**:
```
✓ should analyze revenue correctly (45ms)
✓ should validate parameters (12ms)
✓ should handle missing data gracefully (23ms)
```

## Integration testing with intents

Test intent-driven execution:

```typescript test/intents.test.ts
import { describe, it, expect } from '@jest/globals';
import { FinancialAgent } from '../src/financial-agent';

describe('Intent Execution', () => {
  let agent: FinancialAgent;

  beforeAll(async () => {
    agent = new FinancialAgent();
    await agent.start();
  });

  it('should resolve simple revenue analysis intent', async () => {
    const result = await agent.use({
      method: 'intent',
      params: {
        intent: 'Analyze Q4 2024 revenue',
        context: 'Use test data: revenue $350K, previous $280K'
      }
    });

    expect(result.success).toBe(true);
    expect(result.data).toContain('$350');
    expect(result.data).toContain('25%'); // Growth rate
  });

  it('should use domain context in responses', async () => {
    const result = await agent.use({
      method: 'intent',
      params: {
        intent: 'Forecast next quarter revenue'
      }
    });

    // Should follow guidelines from laneContext
    expect(result.data).toContain('confidence'); // Guideline: provide confidence intervals
    expect(result.data).toMatch(/\d+%.*\d+%/); // Should have range
  });

  it('should handle multi-step intents', async () => {
    const result = await agent.use({
      method: 'intent',
      params: {
        intent: 'Compare Q3 and Q4 revenue, then forecast Q1 2025'
      }
    });

    expect(result.success).toBe(true);
    // Check that multiple capabilities were executed
    expect(result.sequence.length).toBeGreaterThan(2);
  });
});
```

## Testing with mock data

Create reusable test fixtures:

```typescript test/fixtures.ts
export const mockRevenueData = {
  q3_2024: {
    quarter: 3,
    year: 2024,
    data: {
      transactions: [
        { amount: 80000, date: '2024-07-15' },
        { amount: 120000, date: '2024-08-20' },
        { amount: 80000, date: '2024-09-10' }
      ],
      current: 280000,
      previous: 240000
    }
  },
  q4_2024: {
    quarter: 4,
    year: 2024,
    data: {
      transactions: [
        { amount: 100000, date: '2024-10-15' },
        { amount: 150000, date: '2024-11-20' },
        { amount: 100000, date: '2024-12-10' }
      ],
      current: 350000,
      previous: 280000
    }
  }
};

export const expectedResults = {
  q4_growth: 25, // (350-280)/280 * 100
  q1_forecast: 402500, // 350000 * 1.15
};
```

Use in tests:

```typescript test/tools.test.ts
import { mockRevenueData, expectedResults } from './fixtures';

it('should match expected growth rate', async () => {
  const result = await agent._tool_analyze_revenue(
    new oRequest({
      method: 'analyze_revenue',
      params: mockRevenueData.q4_2024
    })
  );

  expect(result.growth).toBeCloseTo(expectedResults.q4_growth, 1);
});
```

## End-to-end testing

Test complete workflows:

```typescript test/e2e.test.ts
describe('End-to-End: Annual Analysis', () => {
  it('should perform full year analysis', async () => {
    const agent = new FinancialAgent();
    await agent.start();

    // Step 1: Analyze each quarter
    const quarters = [];
    for (let q = 1; q <= 4; q++) {
      const result = await agent.use({
        method: 'analyze_revenue',
        params: mockRevenueData[`q${q}_2024`]
      });
      quarters.push(result);
    }

    // Step 2: Generate annual summary
    const summary = await agent.use({
      method: 'intent',
      params: {
        intent: 'Summarize 2024 performance and forecast 2025',
        context: JSON.stringify(quarters)
      }
    });

    // Validate complete workflow
    expect(summary.success).toBe(true);
    expect(summary.data).toContain('2024');
    expect(summary.data).toContain('2025');
    expect(quarters).toHaveLength(4);
  });
});
```

## Performance testing

Monitor agent response times:

```typescript test/performance.test.ts
describe('Performance', () => {
  it('should respond to tool calls within 2 seconds', async () => {
    const start = Date.now();
    
    await agent.use({
      method: 'analyze_revenue',
      params: mockRevenueData.q4_2024
    });
    
    const duration = Date.now() - start;
    expect(duration).toBeLessThan(2000);
  });

  it('should handle concurrent requests', async () => {
    const requests = Array(10).fill(null).map((_, i) =>
      agent.use({
        method: 'analyze_revenue',
        params: mockRevenueData.q4_2024
      })
    );

    const results = await Promise.all(requests);
    
    expect(results).toHaveLength(10);
    results.forEach(r => expect(r.success).toBe(true));
  });
});
```

## Testing best practices

<AccordionGroup>
  <Accordion title="Use realistic test data">
    ```typescript
    // ✅ Good: Realistic data
    const testData = {
      revenue: 350000,
      transactions: [/* real transaction structure */]
    };

    // ❌ Bad: Unrealistic data
    const testData = {
      revenue: 1,
      transactions: []
    };
    ```
  </Accordion>

  <Accordion title="Test error conditions">
    ```typescript
    it('should handle invalid quarter', async () => {
      await expect(
        agent._tool_analyze_revenue(new oRequest({
          method: 'analyze_revenue',
          params: { quarter: 5 } // Invalid
        }))
      ).rejects.toThrow('Quarter must be 1-4');
    });
    ```
  </Accordion>

  <Accordion title="Test context application">
    ```typescript
    it('should apply domain guidelines', async () => {
      const result = await agent.use({
        method: 'intent',
        params: { intent: 'Analyze revenue' }
      });

      // Check that guidelines from laneContext are followed
      expect(result.data).toContain('confidence interval');
      expect(result.data).toMatch(/\d+%.*to.*\d+%/);
    });
    ```
  </Accordion>
</AccordionGroup>

## Continuous testing

Add to your CI/CD pipeline:

```yaml .github/workflows/test.yml
name: Test Agents

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - run: npm ci
      - run: npm test
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
```

## Next steps

<CardGroup cols={2}>
  <Card title="Debugging" icon="bug" href="/dev/debugging">
    Debug agent issues
  </Card>
  <Card title="Error Handling" icon="triangle-exclamation" href="/dev/error-handling">
    Handle errors gracefully
  </Card>
  <Card title="Production Testing" icon="server" href="/use-cases/specialist-agents/production">
    Test in production
  </Card>
  <Card title="Performance Profiling" icon="gauge" href="/dev/performance-profiling">
    Optimize performance
  </Card>
</CardGroup>

## Related resources

- **Guide**: [Testing Strategies Overview](/dev/testing-overview)
- **Guide**: [Testing Workflows](/dev/testing-workflows)
- **API**: [Error Codes](/api/error-codes)
```

---

## Section Breakdown

### Testing strategy
- **3 cards** showing test levels (unit, integration, e2e)
- Set clear expectations for comprehensive testing
- Visual hierarchy of test types

### Test examples
Each testing section should include:
- **Complete, runnable test code**
- Both TypeScript and JavaScript versions
- Expected output
- Common assertions

### Test fixtures
- Reusable mock data in separate file
- Realistic test data
- Expected results for validation

### Performance testing
- Response time tests
- Concurrency tests
- Resource usage validation

### Best practices
- **3-5 accordions** with testing patterns
- Show good vs bad examples
- Include code snippets

### CI/CD integration
- Example GitHub Actions workflow
- Coverage reporting
- Automated test execution

---

## Best Practices

### Test All Levels
```typescript
// Unit: Individual tools
test('_tool_method', ...)

// Integration: Intent execution
test('intent resolution', ...)

// E2E: Full workflows
test('complete workflow', ...)
```

### Realistic Data
Use real-world data structures and values:
```typescript
// ✅ Good
transactions: [
  { amount: 100000, date: '2024-10-15', category: 'sales' }
]

// ❌ Bad
transactions: [{ x: 1 }]
```

### Test Error Cases
Don't just test happy paths:
```typescript
it('should handle missing required params', async () => {
  await expect(agent.use(...)).rejects.toThrow();
});
```

### Validate Context
Ensure agents apply their domain knowledge:
```typescript
expect(result.data).toContain('confidence interval');
// From laneContext guidelines
```

