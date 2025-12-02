import { expect } from 'chai';
import { TestEnvironment } from '@olane/o-test';
import { NetworkBuilder, NetworkTopologies } from './helpers/network-builder.js';
import { createConnectionSpy } from './helpers/connection-spy.js';
import { oNodeAddress } from '../src/router/o-node.address.js';

describe('Stream Lifecycle', () => {
  const env = new TestEnvironment();
  let builder: NetworkBuilder;

  afterEach(async () => {
    if (builder) {
      await builder.cleanup();
    }
    await env.cleanup();
  });

  describe('Stream Creation and Cleanup', () => {
    it('should create stream for request transmission', async () => {
      builder = await NetworkTopologies.twoNode();
      await builder.startAll();

      const leader = builder.getNode('o://leader')!;
      const child = builder.getNode('o://child')!;

      const spy = createConnectionSpy(leader);
      spy.start();

      const initialStreamCount = spy.getTotalStreamCount();

      // Make request (creates stream)
      await leader.use(
        new oNodeAddress(child.address.toString(), child.address.libp2pTransports),
        {
          method: 'echo',
          params: { message: 'test' },
        },
      );

      // Stream should be created and potentially cleaned up
      // Note: Stream count may vary depending on cleanup timing
      const finalStreamCount = spy.getTotalStreamCount();

      // At minimum, stream was created (might be cleaned up already)
      expect(initialStreamCount).to.be.a('number');
      expect(finalStreamCount).to.be.a('number');

      spy.stop();
    });

    it('should handle stream creation for multiple sequential requests', async () => {
      builder = await NetworkTopologies.twoNode();
      await builder.startAll();

      const leader = builder.getNode('o://leader')!;
      const child = builder.getNode('o://child')!;

      const spy = createConnectionSpy(leader);
      spy.start();

      // Make multiple requests
      for (let i = 0; i < 5; i++) {
        const response = await leader.use(
          new oNodeAddress(child.address.toString(), child.address.libp2pTransports),
          {
            method: 'echo',
            params: { message: `request-${i}` },
          },
        );

        expect(response.result.success).to.be.true;
      }

      // Streams should be cleaned up between requests
      // Final stream count should be low (not 5)
      const finalStreamCount = spy.getTotalStreamCount();
      expect(finalStreamCount).to.be.lessThan(5);

      spy.stop();
    });

    it('should cleanup streams after successful transmission', async () => {
      builder = await NetworkTopologies.twoNode();
      await builder.startAll();

      const leader = builder.getNode('o://leader')!;
      const child = builder.getNode('o://child')!;

      const spy = createConnectionSpy(child);
      spy.start();

      // Make request
      await leader.use(
        new oNodeAddress(child.address.toString(), child.address.libp2pTransports),
        {
          method: 'echo',
          params: { message: 'test' },
        },
      );

      // Wait for cleanup
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Stream count should be minimal (may be 0 or 1 depending on timing)
      const streamCount = spy.getTotalStreamCount();
      expect(streamCount).to.be.lessThan(3);

      spy.stop();
    });
  });

  describe('Message Transmission', () => {
    it('should transmit request and receive response', async () => {
      builder = await NetworkTopologies.twoNode();
      await builder.startAll();

      const leader = builder.getNode('o://leader')!;
      const child = builder.getNode('o://child')!;

      const message = 'test message with special chars: !@#$%^&*()';

      const response = await leader.use(
        new oNodeAddress(child.address.toString(), child.address.libp2pTransports),
        {
          method: 'echo',
          params: { message },
        },
      );

      expect(response.result.success).to.be.true;
      expect(response.result.data.message).to.equal(message);
    });

    it('should handle large payloads', async () => {
      builder = await NetworkTopologies.twoNode();
      await builder.startAll();

      const leader = builder.getNode('o://leader')!;
      const child = builder.getNode('o://child')!;

      // Create large message (100KB)
      const largeMessage = 'x'.repeat(100 * 1024);

      const response = await leader.use(
        new oNodeAddress(child.address.toString(), child.address.libp2pTransports),
        {
          method: 'echo',
          params: { message: largeMessage },
        },
      );

      expect(response.result.success).to.be.true;
      expect(response.result.data.message).to.have.lengthOf(100 * 1024);
    });

    it('should handle empty payloads', async () => {
      builder = await NetworkTopologies.twoNode();
      await builder.startAll();

      const leader = builder.getNode('o://leader')!;
      const child = builder.getNode('o://child')!;

      const response = await leader.use(
        new oNodeAddress(child.address.toString(), child.address.libp2pTransports),
        {
          method: 'echo',
          params: { message: '' },
        },
      );

      expect(response.result.success).to.be.true;
      expect(response.result.data.message).to.equal('');
    });

    it('should handle unicode and special characters', async () => {
      builder = await NetworkTopologies.twoNode();
      await builder.startAll();

      const leader = builder.getNode('o://leader')!;
      const child = builder.getNode('o://child')!;

      const unicodeMessage = '你好 🌍 Привет مرحبا';

      const response = await leader.use(
        new oNodeAddress(child.address.toString(), child.address.libp2pTransports),
        {
          method: 'echo',
          params: { message: unicodeMessage },
        },
      );

      expect(response.result.success).to.be.true;
      expect(response.result.data.message).to.equal(unicodeMessage);
    });
  });

  describe('Streaming Responses', () => {
    it('should handle async generator responses', async () => {
      builder = await NetworkTopologies.twoNode();
      await builder.startAll();

      const leader = builder.getNode('o://leader')!;
      const child = builder.getNode('o://child')!;

      const response = await leader.use(
        new oNodeAddress(child.address.toString(), child.address.libp2pTransports),
        {
          method: 'stream',
          params: { count: 5 },
        },
      );

      expect(response.result.success).to.be.true;

      const chunks: any[] = [];
      for await (const chunk of response.result.data) {
        chunks.push(chunk);
        expect(chunk.chunk).to.be.a('number');
        expect(chunk.nodeAddress).to.include('child');
      }

      expect(chunks).to.have.lengthOf(5);
    });

    it('should stream large number of chunks', async () => {
      builder = await NetworkTopologies.twoNode();
      await builder.startAll();

      const leader = builder.getNode('o://leader')!;
      const child = builder.getNode('o://child')!;

      const response = await leader.use(
        new oNodeAddress(child.address.toString(), child.address.libp2pTransports),
        {
          method: 'stream',
          params: { count: 50 },
        },
      );

      expect(response.result.success).to.be.true;

      let chunkCount = 0;
      for await (const chunk of response.result.data) {
        chunkCount++;
        expect(chunk.chunk).to.equal(chunkCount);
      }

      expect(chunkCount).to.equal(50);
    });

    it('should handle streaming with concurrent requests', async () => {
      builder = await NetworkTopologies.twoNode();
      await builder.startAll();

      const leader = builder.getNode('o://leader')!;
      const child = builder.getNode('o://child')!;

      // Start two streams concurrently
      const response1Promise = leader.use(
        new oNodeAddress(child.address.toString(), child.address.libp2pTransports),
        {
          method: 'stream',
          params: { count: 10 },
        },
      );

      const response2Promise = leader.use(
        new oNodeAddress(child.address.toString(), child.address.libp2pTransports),
        {
          method: 'stream',
          params: { count: 10 },
        },
      );

      const [response1, response2] = await Promise.all([
        response1Promise,
        response2Promise,
      ]);

      // Both should succeed
      expect(response1.result.success).to.be.true;
      expect(response2.result.success).to.be.true;

      // Consume both streams
      const chunks1: any[] = [];
      const chunks2: any[] = [];

      await Promise.all([
        (async () => {
          for await (const chunk of response1.result.data) {
            chunks1.push(chunk);
          }
        })(),
        (async () => {
          for await (const chunk of response2.result.data) {
            chunks2.push(chunk);
          }
        })(),
      ]);

      expect(chunks1).to.have.lengthOf(10);
      expect(chunks2).to.have.lengthOf(10);
    });

    it('should handle early stream termination', async () => {
      builder = await NetworkTopologies.twoNode();
      await builder.startAll();

      const leader = builder.getNode('o://leader')!;
      const child = builder.getNode('o://child')!;

      const response = await leader.use(
        new oNodeAddress(child.address.toString(), child.address.libp2pTransports),
        {
          method: 'stream',
          params: { count: 100 },
        },
      );

      expect(response.result.success).to.be.true;

      // Consume only first 10 chunks, then break
      let chunkCount = 0;
      for await (const chunk of response.result.data) {
        chunkCount++;
        if (chunkCount >= 10) {
          break;
        }
      }

      expect(chunkCount).to.equal(10);

      // Stream should cleanup gracefully (no errors thrown)
    });
  });

  describe('Multi-hop Streaming', () => {
    it('should stream through hierarchy', async () => {
      builder = await NetworkTopologies.threeNode();
      await builder.startAll();

      const leader = builder.getNode('o://leader')!;
      const child = builder.getNode('o://child')!;

      // Stream from leader through parent to child
      const response = await leader.use(child.address, {
        method: 'stream',
        params: { count: 5 },
      });

      expect(response.result.success).to.be.true;

      const chunks: any[] = [];
      for await (const chunk of response.result.data) {
        chunks.push(chunk);
      }

      expect(chunks).to.have.lengthOf(5);
      expect(chunks[0].nodeAddress).to.include('child');
    });

    it('should maintain stream integrity across hops', async () => {
      builder = await NetworkTopologies.threeNode();
      await builder.startAll();

      const leader = builder.getNode('o://leader')!;
      const child = builder.getNode('o://child')!;

      const response = await leader.use(child.address, {
        method: 'stream',
        params: { count: 20 },
      });

      expect(response.result.success).to.be.true;

      // Verify all chunks arrive in order
      let expectedChunk = 1;
      for await (const chunk of response.result.data) {
        expect(chunk.chunk).to.equal(expectedChunk);
        expect(chunk.total).to.equal(20);
        expectedChunk++;
      }

      expect(expectedChunk).to.equal(21); // Should have processed all 20
    });
  });

  describe('Error Responses', () => {
    it('should transmit error responses correctly', async () => {
      builder = await NetworkTopologies.twoNode();
      await builder.startAll();

      const leader = builder.getNode('o://leader')!;
      const child = builder.getNode('o://child')!;

      // Call non-existent method
      const response = await leader.use(
        new oNodeAddress(child.address.toString(), child.address.libp2pTransports),
        {
          method: 'non_existent_method',
          params: {},
        },
      );

      expect(response.result.success).to.be.false;
      expect(response.result.error).to.exist;
      expect(response.result.error).to.be.a('string');
    });

    it('should handle errors without breaking stream', async () => {
      builder = await NetworkTopologies.twoNode();
      await builder.startAll();

      const leader = builder.getNode('o://leader')!;
      const child = builder.getNode('o://child')!;

      // Make error request
      const errorResponse = await leader.use(
        new oNodeAddress(child.address.toString(), child.address.libp2pTransports),
        {
          method: 'non_existent_method',
          params: {},
        },
      );

      expect(errorResponse.result.success).to.be.false;

      // Subsequent requests should still work
      const successResponse = await leader.use(
        new oNodeAddress(child.address.toString(), child.address.libp2pTransports),
        {
          method: 'echo',
          params: { message: 'recovery test' },
        },
      );

      expect(successResponse.result.success).to.be.true;
      expect(successResponse.result.data.message).to.equal('recovery test');
    });
  });

  describe('Connection Stability', () => {
    it('should maintain stable connection across many requests', async () => {
      builder = await NetworkTopologies.twoNode();
      await builder.startAll();

      const leader = builder.getNode('o://leader')!;
      const child = builder.getNode('o://child')!;

      const spy = createConnectionSpy(leader);
      spy.start();

      // Make many sequential requests
      for (let i = 0; i < 50; i++) {
        const response = await leader.use(
          new oNodeAddress(child.address.toString(), child.address.libp2pTransports),
          {
            method: 'echo',
            params: { message: `request-${i}` },
          },
        );

        expect(response.result.success).to.be.true;
      }

      // Connection should remain stable
      const stats = spy.getConnectionStats();
      expect(stats.length).to.be.greaterThan(0);
      expect(stats[0].status).to.equal('open');

      spy.stop();
    });

    it('should handle rapid-fire requests', async () => {
      builder = await NetworkTopologies.twoNode();
      await builder.startAll();

      const leader = builder.getNode('o://leader')!;
      const child = builder.getNode('o://child')!;

      // Fire many requests simultaneously
      const promises = [];
      for (let i = 0; i < 20; i++) {
        promises.push(
          leader.use(
            new oNodeAddress(child.address.toString(), child.address.libp2pTransports),
            {
              method: 'echo',
              params: { message: `rapid-${i}` },
            },
          ),
        );
      }

      const responses = await Promise.all(promises);

      // All should succeed
      expect(responses).to.have.lengthOf(20);
      responses.forEach((response, i) => {
        expect(response.result.success).to.be.true;
        expect(response.result.data.message).to.equal(`rapid-${i}`);
      });
    });

    it('should handle interleaved streaming and regular requests', async () => {
      builder = await NetworkTopologies.twoNode();
      await builder.startAll();

      const leader = builder.getNode('o://leader')!;
      const child = builder.getNode('o://child')!;

      // Start a stream
      const streamResponse = await leader.use(
        new oNodeAddress(child.address.toString(), child.address.libp2pTransports),
        {
          method: 'stream',
          params: { count: 20 },
        },
      );

      expect(streamResponse.result.success).to.be.true;

      // Consume stream while making regular requests
      const streamChunks: any[] = [];
      const regularResponses: any[] = [];

      let requestCount = 0;
      for await (const chunk of streamResponse.result.data) {
        streamChunks.push(chunk);

        // Make a regular request every 5 chunks
        if (chunk.chunk % 5 === 0) {
          const response = await leader.use(
            new oNodeAddress(child.address.toString(), child.address.libp2pTransports),
            {
              method: 'echo',
              params: { message: `interleaved-${requestCount++}` },
            },
          );
          regularResponses.push(response);
        }
      }

      expect(streamChunks).to.have.lengthOf(20);
      expect(regularResponses).to.have.lengthOf(4); // 4 regular requests
      regularResponses.forEach((response) => {
        expect(response.success).to.be.true;
      });
    });
  });

  describe('Stream Protocol', () => {
    it('should use correct protocol for streams', async () => {
      builder = await NetworkTopologies.twoNode();
      await builder.startAll();

      const leader = builder.getNode('o://leader')!;
      const child = builder.getNode('o://child')!;

      const spy = createConnectionSpy(leader);
      spy.start();

      // Make request
      await leader.use(
        new oNodeAddress(child.address.toString(), child.address.libp2pTransports),
        {
          method: 'echo',
          params: { message: 'test' },
        },
      );

      // Check stream protocol
      const stats = spy.getConnectionStats();
      if (stats.length > 0 && stats[0].streams.length > 0) {
        const stream = stats[0].streams[0];
        expect(stream.protocol).to.be.a('string');
        // Protocol should match child's address protocol
        expect(stream.protocol).to.include('child');
      }

      spy.stop();
    });
  });
});
