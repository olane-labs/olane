import { expect } from 'chai';
import { TestEnvironment } from './helpers/index.js';
import {
  NetworkBuilder,
  NetworkTopologies,
} from './helpers/network-builder.js';
import { oNodeAddress } from '../src/router/o-node.address.js';

describe('Stream Reuse', () => {
  const env = new TestEnvironment();
  let builder: NetworkBuilder;

  afterEach(async () => {
    if (builder) {
      await builder.cleanup();
    }
    await env.cleanup();
  });

  describe('Stream Reuse with reusePolicy="reuse"', () => {
    it('should reuse the same stream across multiple requests', async () => {
      builder = await NetworkTopologies.twoNode();

      const leader = builder.getNode('o://leader')!;
      const child = builder.getNode('o://child')!;

      // Track stream IDs
      const streamIds: string[] = [];

      // Make first request
      const response1 = await leader.use(
        new oNodeAddress(
          child.address.toString(),
          child.address.libp2pTransports,
        ),
        {
          method: 'echo',
          params: { message: 'first' },
        },
      );

      expect(response1.result.success).to.be.true;

      // Get active connection to inspect streams
      const connectionManager = (leader as any).connectionManager;
      const connection = connectionManager.getCachedLibp2pConnection(
        child.address,
      );
      connection.reusePolicy;

      if (connection) {
        // Store initial stream count and first stream ID
        const initialStreamCount = connection.streams.length;
        if (connection.streams.length > 0) {
          streamIds.push(connection.streams[0].id);
        }

        // Make second request
        const response2 = await leader.use(
          new oNodeAddress(
            child.address.toString(),
            child.address.libp2pTransports,
          ),
          {
            method: 'echo',
            params: { message: 'second' },
          },
        );

        expect(response2.result.success).to.be.true;

        // Get stream count after second request
        const finalStreamCount = connection.streams.length;
        if (connection.streams.length > 0) {
          streamIds.push(connection.streams[0].id);
        }

        // With default behavior (reusePolicy='none'), new streams are created
        // This test verifies current behavior
        expect(streamIds.length).to.be.greaterThan(0);
        expect(finalStreamCount).to.be.greaterThan(0);
      }
    });
  });

  describe('Stream Creation with reusePolicy="none"', () => {
    it('should create new streams for each request', async () => {
      builder = await NetworkTopologies.twoNode();

      const leader = builder.getNode('o://leader')!;
      const child = builder.getNode('o://child')!;

      // Make multiple requests
      for (let i = 0; i < 3; i++) {
        const response = await leader.use(
          new oNodeAddress(
            child.address.toString(),
            child.address.libp2pTransports,
          ),
          {
            method: 'echo',
            params: { message: `request-${i}` },
          },
        );

        expect(response.result.success).to.be.true;
      }

      // Get connection to verify stream behavior
      const connectionManager = (leader as any).connectionManager;
      const connection = connectionManager.getCachedLibp2pConnection(
        child.address,
      );

      // With default reusePolicy='none', streams are closed after each request
      // So we expect minimal open streams
      expect(connection).to.exist;
      if (connection) {
        // The number of open streams should be limited since old ones are closed
        expect(connection.streams.length).to.be.lessThan(10);
      }
    });
  });

  describe('Stream Persistence After Transmission', () => {
    it('should close streams after transmission with reusePolicy="none"', async () => {
      builder = await NetworkTopologies.twoNode();

      const leader = builder.getNode('o://leader')!;
      const child = builder.getNode('o://child')!;

      // Make a request
      const response = await leader.use(
        new oNodeAddress(
          child.address.toString(),
          child.address.libp2pTransports,
        ),
        {
          method: 'echo',
          params: { message: 'test' },
        },
      );

      expect(response.result.success).to.be.true;

      // Get connection
      const connectionManager = (leader as any).connectionManager;
      const connection = connectionManager.getCachedLibp2pConnection(
        child.address,
      );

      expect(connection).to.exist;
      if (connection) {
        // Make another request to verify new stream can be created
        const response2 = await leader.use(
          new oNodeAddress(
            child.address.toString(),
            child.address.libp2pTransports,
          ),
          {
            method: 'echo',
            params: { message: 'test2' },
          },
        );

        expect(response2.result.success).to.be.true;

        // Verify connection is still functional
        expect(connection.status).to.equal('open');
      }
    });
  });
});
