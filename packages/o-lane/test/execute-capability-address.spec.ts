import { expect } from 'chai';
import { oCapabilityResult } from '../src/capabilities/o-capability.result.js';
import { oCapabilityConfig } from '../src/capabilities/o-capability.config.js';
import { oCapabilityType } from '../src/capabilities/enums/o-capability.type-enum.js';
import { oCapabilityExecute } from '../src/capabilities-execute/execute.capability.js';
import { oIntent } from '../src/intent/o-intent.js';

/**
 * Tests the interface contract between EVALUATE results and the EXECUTE capability.
 *
 * When EVALUATE's AI returns type:"execute", the response may place the address
 * either at the root level or nested inside a `task` object. resultToConfig()
 * passes the AI result as `params`, so the execute capability must handle both shapes.
 */
describe('EVALUATE → EXECUTE handoff: address resolution', () => {
  // Minimal stub that satisfies oToolBase enough for oCapabilityConfig
  const stubNode = {} as any;
  const stubPromptLoader = {} as any;
  const intent = new oIntent({ intent: 'test intent' });

  /**
   * Simulates what resultToConfig() does: it takes the AI result object
   * and sets it as `params` on the next capability's config.
   */
  function simulateResultToConfig(aiResult: any): oCapabilityConfig {
    const obj = aiResult;
    return oCapabilityConfig.fromJSON({
      params: typeof obj === 'object' ? obj : {},
      intent,
      node: stubNode,
    });
  }

  /**
   * Creates an oCapabilityExecute instance and sets its config,
   * then calls the private resolveAddress() via the prototype.
   */
  function resolveAddressFrom(config: oCapabilityConfig): string {
    const capability = new oCapabilityExecute({
      promptLoader: stubPromptLoader,
      node: stubNode,
    });
    // Set config as execute() would
    (capability as any).config = config;
    // Call private method
    return (capability as any).resolveAddress();
  }

  describe('resolveAddress()', () => {
    it('should resolve address from params.address (flat AI response)', () => {
      const aiResult = {
        type: 'execute',
        address: 'o://search',
        summary: 'Searching for something',
        reasoning: 'User wants to search',
      };

      const config = simulateResultToConfig(aiResult);
      const address = resolveAddressFrom(config);

      expect(address).to.equal('o://search');
    });

    it('should resolve address from params.task.address (nested AI response)', () => {
      const aiResult = {
        type: 'execute',
        task: {
          address: 'o://search',
          intent: 'Search for card feed refresh functionality',
        },
        summary: 'Searching for card feed refresh functionality',
        reasoning: 'The intent mentions refreshing',
      };

      const config = simulateResultToConfig(aiResult);
      const address = resolveAddressFrom(config);

      expect(address).to.equal('o://search');
    });

    it('should prefer params.address over params.task.address when both exist', () => {
      const aiResult = {
        type: 'execute',
        address: 'o://primary',
        task: {
          address: 'o://fallback',
        },
      };

      const config = simulateResultToConfig(aiResult);
      const address = resolveAddressFrom(config);

      expect(address).to.equal('o://primary');
    });

    it('should throw when neither address location is present', () => {
      const aiResult = {
        type: 'execute',
        summary: 'Missing address entirely',
        reasoning: 'Bad AI response',
      };

      const config = simulateResultToConfig(aiResult);

      expect(() => resolveAddressFrom(config)).to.throw(
        'Execute capability requires a valid address',
      );
    });

    it('should throw when address is not a string', () => {
      const aiResult = {
        type: 'execute',
        address: 123,
      };

      const config = simulateResultToConfig(aiResult);

      expect(() => resolveAddressFrom(config)).to.throw(
        'Execute capability requires a valid address',
      );
    });
  });

  describe('resultToConfig() params shape', () => {
    it('should pass AI result object as params', () => {
      const aiResult = {
        type: 'execute',
        address: 'o://search',
        task: { address: 'o://search', intent: 'find things' },
        summary: 'test',
      };

      const config = simulateResultToConfig(aiResult);

      expect(config.params).to.deep.equal(aiResult);
    });

    it('should set params to empty object for non-object results', () => {
      const config = simulateResultToConfig('not an object');

      expect(config.params).to.deep.equal({});
    });
  });
});
