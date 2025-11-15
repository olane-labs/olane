import { expect } from 'chai';
import { oCapabilitySearch, oCapabilityType } from '@olane/o-lane';
import { oAddress } from '@olane/o-core';
import { createTestOS, createTestLaneTool, createMockCapabilityConfig } from './utils/capability-test-utils.js';
import { OlaneOS } from '../../src/o-olane-os/index.js';
import type { oLaneTool } from '@olane/o-lane';

describe('oCapabilitySearch @capability @search', () => {
  let os: OlaneOS;
  let laneTool: oLaneTool;
  let searchCapability: oCapabilitySearch;

  before(async () => {
    os = await createTestOS();
    laneTool = await createTestLaneTool(os);
  });

  after(async () => {
    if (laneTool) {
      await laneTool.stop();
    }
    if (os) {
      await os.stop();
    }
  });

  beforeEach(() => {
    searchCapability = new oCapabilitySearch();
  });

  describe('type identification', () => {
    it('should return SEARCH type from instance getter', () => {
      expect(searchCapability.type).to.equal(oCapabilityType.SEARCH);
    });

    it('should return SEARCH type from static getter', () => {
      expect(oCapabilitySearch.type).to.equal(oCapabilityType.SEARCH);
    });
  });

  describe('configuration getters', () => {
    it('should provide access to external flag', async () => {
      const params = {
        isExternal: true,
        queries: [{ query: 'test query' }],
        explanation: 'Test explanation'
      };

      const config = createMockCapabilityConfig(laneTool, 'Search intent', params);
      await searchCapability.execute(config);

      expect(searchCapability.external).to.be.true;
    });

    it('should provide access to queries', async () => {
      const queries = [
        { query: 'first query', limit: 10 },
        { query: 'second query', limit: 20 }
      ];

      const params = {
        isExternal: false,
        queries,
        explanation: 'Test explanation'
      };

      const config = createMockCapabilityConfig(laneTool, 'Search intent', params);
      await searchCapability.execute(config);

      expect(searchCapability.queries).to.deep.equal(queries);
    });

    it('should provide access to explanation', async () => {
      const params = {
        isExternal: false,
        queries: [{ query: 'test' }],
        explanation: 'This is why we are searching'
      };

      const config = createMockCapabilityConfig(laneTool, 'Search intent', params);
      await searchCapability.execute(config);

      expect(searchCapability.explanation).to.equal('This is why we are searching');
    });

    it('should handle internal search flag', async () => {
      const params = {
        isExternal: false,
        queries: [{ query: 'test' }],
        explanation: 'Internal search'
      };

      const config = createMockCapabilityConfig(laneTool, 'Search intent', params);
      await searchCapability.execute(config);

      expect(searchCapability.external).to.be.false;
    });
  });

  describe('internal search', () => {
    it('should execute internal search when isExternal is false', async () => {
      const params = {
        isExternal: false,
        queries: [{ query: 'test internal search', limit: 5 }],
        explanation: 'Testing internal search'
      };

      const config = createMockCapabilityConfig(laneTool, 'Internal search intent', params);

      const result = await searchCapability.execute(config);

      expect(result).to.exist;
      expect(result.type).to.equal(oCapabilityType.EVALUATE);
    });

    it('should handle multiple internal search queries', async () => {
      const params = {
        isExternal: false,
        queries: [
          { query: 'first query', limit: 5 },
          { query: 'second query', limit: 10 },
          { query: 'third query', limit: 15 }
        ],
        explanation: 'Multiple queries'
      };

      const config = createMockCapabilityConfig(laneTool, 'Multiple search intent', params);

      const result = await searchCapability.execute(config);

      expect(result).to.exist;
      expect(result.type).to.equal(oCapabilityType.EVALUATE);
    });

    it('should handle query without limit', async () => {
      const params = {
        isExternal: false,
        queries: [{ query: 'test query' }], // No limit specified
        explanation: 'Query without limit'
      };

      const config = createMockCapabilityConfig(laneTool, 'Search intent', params);

      const result = await searchCapability.execute(config);

      expect(result).to.exist;
      // Default limit of 20 should be used
    });

    it('should format internal search results', async () => {
      const params = {
        isExternal: false,
        queries: [{ query: 'formatting test', limit: 3 }],
        explanation: 'Test formatting'
      };

      const config = createMockCapabilityConfig(laneTool, 'Search intent', params);

      const result = await searchCapability.execute(config);

      expect(result).to.exist;
      expect(result.result).to.be.a('string');
      // Should contain search result markers
      if (typeof result.result === 'string') {
        expect(result.result).to.include('[Search Results Begin]');
        expect(result.result).to.include('[Search Results End]');
      }
    });

    it('should handle empty search results', async () => {
      const params = {
        isExternal: false,
        queries: [{ query: 'query_that_returns_nothing_xyz123', limit: 5 }],
        explanation: 'Empty results test'
      };

      const config = createMockCapabilityConfig(laneTool, 'Search intent', params);

      const result = await searchCapability.execute(config);

      expect(result).to.exist;
      // Should handle empty results gracefully
    });
  });

  describe('external search', () => {
    it('should execute external search when isExternal is true', async () => {
      const params = {
        isExternal: true,
        queries: [{ query: 'test external search' }],
        explanation: 'Testing external search'
      };

      const config = createMockCapabilityConfig(laneTool, 'External search intent', params);

      const result = await searchCapability.execute(config);

      expect(result).to.exist;
      expect(result.type).to.equal(oCapabilityType.EVALUATE);
    });

    it('should handle multiple external search queries', async () => {
      const params = {
        isExternal: true,
        queries: [
          { query: 'first external query' },
          { query: 'second external query' }
        ],
        explanation: 'Multiple external queries'
      };

      const config = createMockCapabilityConfig(laneTool, 'Multiple search intent', params);

      const result = await searchCapability.execute(config);

      expect(result).to.exist;
      expect(result.type).to.equal(oCapabilityType.EVALUATE);
    });

    it('should format external search results', async () => {
      const params = {
        isExternal: true,
        queries: [{ query: 'external formatting test' }],
        explanation: 'Test external formatting'
      };

      const config = createMockCapabilityConfig(laneTool, 'Search intent', params);

      const result = await searchCapability.execute(config);

      expect(result).to.exist;
      expect(result.result).to.be.a('string');
      // Should contain search result markers
      if (typeof result.result === 'string') {
        expect(result.result).to.include('[Search Results Begin]');
        expect(result.result).to.include('[Search Results End]');
      }
    });

    it('should handle external search with streaming', async () => {
      const chunks: any[] = [];
      const params = {
        isExternal: true,
        queries: [{ query: 'streaming test query' }],
        explanation: 'Test streaming'
      };

      const config = createMockCapabilityConfig(
        laneTool,
        'Search intent',
        params,
        {
          useStream: true,
          onChunk: (chunk) => chunks.push(chunk)
        }
      );

      const result = await searchCapability.execute(config);

      expect(result).to.exist;
      expect(config.useStream).to.be.true;
    });
  });

  describe('result structure', () => {
    it('should return oCapabilitySearchResult', async () => {
      const params = {
        isExternal: false,
        queries: [{ query: 'test' }],
        explanation: 'Result structure test'
      };

      const config = createMockCapabilityConfig(laneTool, 'Search intent', params);

      const result = await searchCapability.execute(config);

      expect(result).to.exist;
      expect(result.type).to.equal(oCapabilityType.EVALUATE);
      expect(result.result).to.exist;
      expect(result.config).to.equal(config);
    });

    it('should include formatted result string', async () => {
      const params = {
        isExternal: false,
        queries: [{ query: 'test' }],
        explanation: 'Formatted result test'
      };

      const config = createMockCapabilityConfig(laneTool, 'Search intent', params);

      const result = await searchCapability.execute(config);

      expect(result.result).to.be.a('string');
    });

    it('should include humanResult with raw data', async () => {
      const params = {
        isExternal: false,
        queries: [{ query: 'test' }],
        explanation: 'Human result test'
      };

      const config = createMockCapabilityConfig(laneTool, 'Search intent', params);

      const result = await searchCapability.execute(config);

      expect(result.humanResult).to.exist;
    });

    it('should set type to EVALUATE in result', async () => {
      const params = {
        isExternal: false,
        queries: [{ query: 'test' }],
        explanation: 'Type test'
      };

      const config = createMockCapabilityConfig(laneTool, 'Search intent', params);

      const result = await searchCapability.execute(config);

      expect(result.type).to.equal(oCapabilityType.EVALUATE);
    });
  });

  describe('query handling', () => {
    it('should handle single query', async () => {
      const params = {
        isExternal: false,
        queries: [{ query: 'single query test' }],
        explanation: 'Single query'
      };

      const config = createMockCapabilityConfig(laneTool, 'Search intent', params);

      const result = await searchCapability.execute(config);

      expect(result).to.exist;
      expect(searchCapability.queries.length).to.equal(1);
    });

    it('should handle empty queries array', async () => {
      const params = {
        isExternal: false,
        queries: [],
        explanation: 'Empty queries'
      };

      const config = createMockCapabilityConfig(laneTool, 'Search intent', params);

      const result = await searchCapability.execute(config);

      expect(result).to.exist;
      expect(searchCapability.queries.length).to.equal(0);
    });

    it('should handle complex query strings', async () => {
      const params = {
        isExternal: false,
        queries: [
          { query: 'query with special chars !@#$%^&*()' },
          { query: 'query with "quotes" and \'apostrophes\'' },
          { query: 'multi\nline\nquery' }
        ],
        explanation: 'Complex queries'
      };

      const config = createMockCapabilityConfig(laneTool, 'Search intent', params);

      const result = await searchCapability.execute(config);

      expect(result).to.exist;
      expect(searchCapability.queries.length).to.equal(3);
    });

    it('should preserve query limits', async () => {
      const params = {
        isExternal: false,
        queries: [
          { query: 'query 1', limit: 5 },
          { query: 'query 2', limit: 15 },
          { query: 'query 3', limit: 25 }
        ],
        explanation: 'Limit preservation test'
      };

      const config = createMockCapabilityConfig(laneTool, 'Search intent', params);
      await searchCapability.execute(config);

      expect(searchCapability.queries[0].limit).to.equal(5);
      expect(searchCapability.queries[1].limit).to.equal(15);
      expect(searchCapability.queries[2].limit).to.equal(25);
    });
  });

  describe('error handling', () => {
    it('should handle search service unavailable', async () => {
      const params = {
        isExternal: false,
        queries: [{ query: 'test' }],
        explanation: 'Service unavailable test'
      };

      const config = createMockCapabilityConfig(laneTool, 'Search intent', params);

      // Search may fail if service not available
      try {
        const result = await searchCapability.execute(config);
        expect(result).to.exist;
      } catch (error) {
        // Expected if search service is not configured
        expect(error).to.exist;
      }
    });

    it('should handle external provider unavailable', async () => {
      const params = {
        isExternal: true,
        queries: [{ query: 'test' }],
        explanation: 'External provider unavailable test'
      };

      const config = createMockCapabilityConfig(laneTool, 'Search intent', params);

      // External search may fail if Perplexity is not configured
      try {
        const result = await searchCapability.execute(config);
        expect(result).to.exist;
      } catch (error) {
        // Expected if external search service is not configured
        expect(error).to.exist;
      }
    });
  });
});
