import { expect } from 'chai';
import { TestEnvironment } from './helpers/index.js';
import { oNodeTool } from '../src/o-node.tool.js';
import { oNodeAddress, oNodeTransport } from '../src/index.js';

describe('Leader Transport Validation', () => {
  const env = new TestEnvironment();

  afterEach(async () => {
    await env.cleanup();
  });

  describe('Node with leader configuration', () => {
    it('should fail to start when leader has no transports', async () => {
      const leaderAddress = new oNodeAddress('o://leader', []); // Empty transports
      const node = new oNodeTool({
        address: new oNodeAddress('o://child'),
        leader: leaderAddress,
        parent: null,
      });

      try {
        await node.start();
        expect.fail('Expected node.start() to throw an error');
      } catch (error: any) {
        expect(error.message).to.include('Leader address is defined');
        expect(error.message).to.include('but has no transports');
        expect(error.message).to.include('o://leader');
      }
    });

    it('should fail to start when leader has undefined transports', async () => {
      const leaderAddress = new oNodeAddress('o://leader');
      // Explicitly set transports to undefined
      leaderAddress.transports = undefined as any;

      const node = new oNodeTool({
        address: new oNodeAddress('o://child'),
        leader: leaderAddress,
        parent: null,
      });

      try {
        await node.start();
        expect.fail('Expected node.start() to throw an error');
      } catch (error: any) {
        expect(error.message).to.include('Leader address is defined');
        expect(error.message).to.include('but has no transports');
        expect(error.message).to.include('o://leader');
      }
    });

    it('should fail to start when leader has null transports', async () => {
      const leaderAddress = new oNodeAddress('o://leader');
      // Explicitly set transports to null
      leaderAddress.transports = null as any;

      const node = new oNodeTool({
        address: new oNodeAddress('o://child'),
        leader: leaderAddress,
        parent: null,
      });

      try {
        await node.start();
        expect.fail('Expected node.start() to throw an error');
      } catch (error: any) {
        expect(error.message).to.include('Leader address is defined');
        expect(error.message).to.include('but has no transports');
        expect(error.message).to.include('o://leader');
      }
    });

    it('should start successfully when leader has valid transports', async () => {
      const leaderAddress = new oNodeAddress('o://leader', [
        new oNodeTransport('/ip4/127.0.0.1/tcp/4001/p2p/12D3KooWTest123'),
      ]);

      const node = new oNodeTool({
        address: new oNodeAddress('o://child'),
        leader: leaderAddress,
        parent: null,
      });

      // Should not throw
      await node.start();
      expect(node.state).to.not.equal('STOPPED');

      await node.stop();
    });

    it('should start successfully when leader has multiple transports', async () => {
      const leaderAddress = new oNodeAddress('o://leader', [
        new oNodeTransport('/ip4/127.0.0.1/tcp/4001/p2p/12D3KooWTest123'),
        new oNodeTransport('/ip4/192.168.1.1/tcp/4001/p2p/12D3KooWTest123'),
      ]);

      const node = new oNodeTool({
        address: new oNodeAddress('o://child'),
        leader: leaderAddress,
        parent: null,
      });

      // Should not throw
      await node.start();
      expect(node.state).to.not.equal('STOPPED');

      await node.stop();
    });
  });

  describe('Node without leader configuration', () => {
    it('should start successfully when leader is null', async () => {
      const node = new oNodeTool({
        address: new oNodeAddress('o://standalone'),
        leader: null,
        parent: null,
      });

      // Should not throw
      await node.start();
      expect(node.state).to.not.equal('STOPPED');

      await node.stop();
    });

    it('should start successfully when leader is undefined', async () => {
      const node = new oNodeTool({
        address: new oNodeAddress('o://standalone'),
        leader: undefined as any, // Explicitly undefined
        parent: null,
      });

      // Should not throw
      await node.start();
      expect(node.state).to.not.equal('STOPPED');

      await node.stop();
    });
  });

  describe('Leader node (self-referential)', () => {
    it('should start successfully as a leader without transports validation', async () => {
      const node = new oNodeTool({
        address: new oNodeAddress('o://leader'),
        leader: null, // Leader nodes don't need a leader reference
        parent: null,
        type: 'LEADER' as any, // Set as leader node
      });

      // Should not throw - leader nodes don't need leader transports
      await node.start();
      expect(node.state).to.not.equal('STOPPED');

      await node.stop();
    });
  });

  describe('Error message content', () => {
    it('should provide helpful error message with leader address', async () => {
      const leaderAddress = new oNodeAddress('o://my-custom-leader', []);
      const node = new oNodeTool({
        address: new oNodeAddress('o://child'),
        leader: leaderAddress,
        parent: null,
      });

      try {
        await node.start();
        expect.fail('Expected node.start() to throw an error');
      } catch (error: any) {
        expect(error.message).to.include('o://my-custom-leader');
        expect(error.message).to.include('Non-leader nodes require leader transports');
        expect(error.message).to.include('Please provide transports');
      }
    });
  });

  describe('Validation timing', () => {
    it('should fail before p2pNode creation (fast fail)', async () => {
      const leaderAddress = new oNodeAddress('o://leader', []);
      const node = new oNodeTool({
        address: new oNodeAddress('o://child'),
        leader: leaderAddress,
        parent: null,
      });

      const startTime = Date.now();

      try {
        await node.start();
        expect.fail('Expected node.start() to throw an error');
      } catch (error: any) {
        const duration = Date.now() - startTime;

        // Validation should happen very quickly (< 100ms)
        // If it takes longer, it means we're doing expensive operations before validation
        expect(duration).to.be.lessThan(100);
        expect(error.message).to.include('Leader address is defined');

        // Verify p2pNode was never created
        expect((node as any).p2pNode).to.be.undefined;
      }
    });
  });
});
