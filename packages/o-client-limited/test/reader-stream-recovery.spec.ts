import { expect } from 'chai';
import { TestEnvironment } from '@olane/o-node/test/helpers';
import { oNodeAddress } from '@olane/o-node';
import { LimitedTestTool, ReceiverTestTool } from './helpers/index.js';

describe('Reader Stream Recovery', () => {
  const env = new TestEnvironment();
  let caller: LimitedTestTool;
  let receiver: ReceiverTestTool;

  afterEach(async () => {
    await env.cleanup();
  });

  describe('Recovery Events', () => {
    it('should emit ReaderStarted on initial creation', async () => {
      caller = await env.createNode<any>(LimitedTestTool, {
        address: new oNodeAddress('o://caller'),
      });

      receiver = await env.createNode<any>(ReceiverTestTool, {
        address: new oNodeAddress('o://receiver'),
      });

      const receiverAddr = new oNodeAddress(
        receiver.address.toString(),
        receiver.address.libp2pTransports,
      );

      await caller.use(receiverAddr, {
        method: 'echo',
        params: { message: 'test' },
      });

      const callerConn = caller.getFirstConnection();
      if (callerConn) {
        caller.setupEventListeners(callerConn);
      }

      await new Promise((resolve) => setTimeout(resolve, 200));

      const readerEvents = caller.getReaderEvents();
      const startedEvent = readerEvents.find(
        (e) => e.type === 'reader-started',
      );

      expect(startedEvent).to.exist;
      expect(startedEvent?.data).to.have.property('streamId');
    });
  });

  describe('Graceful Degradation', () => {
    it('should continue processing caller->receiver requests even if reader fails', async () => {
      caller = await env.createNode<any>(LimitedTestTool, {
        address: new oNodeAddress('o://caller'),
      });

      receiver = await env.createNode<any>(ReceiverTestTool, {
        address: new oNodeAddress('o://receiver'),
      });

      const receiverAddr = new oNodeAddress(
        receiver.address.toString(),
        receiver.address.libp2pTransports,
      );

      // Establish connection
      await caller.use(receiverAddr, {
        method: 'echo',
        params: { message: 'initial' },
      });

      const callerConn = caller.getFirstConnection();
      if (callerConn) {
        caller.setupEventListeners(callerConn);
      }

      // Even if reader stream has issues, outbound requests should still work
      const response = await caller.use(receiverAddr, {
        method: 'echo',
        params: { message: 'after-setup' },
      });

      expect(response.result.success).to.be.true;
      expect(response.result.data.message).to.equal('after-setup');
    });
  });

  describe('Reader Stream Lifecycle', () => {
    it('should create reader stream only once per connection', async () => {
      caller = await env.createNode<any>(LimitedTestTool, {
        address: new oNodeAddress('o://caller'),
      });

      receiver = await env.createNode<any>(ReceiverTestTool, {
        address: new oNodeAddress('o://receiver'),
      });

      const receiverAddr = new oNodeAddress(
        receiver.address.toString(),
        receiver.address.libp2pTransports,
      );

      // Make multiple requests
      for (let i = 0; i < 5; i++) {
        await caller.use(receiverAddr, {
          method: 'echo',
          params: { message: `request-${i}` },
        });
      }

      const callerConn = caller.getFirstConnection();
      if (callerConn) {
        caller.setupEventListeners(callerConn);
      }

      await new Promise((resolve) => setTimeout(resolve, 200));

      // Should only have one reader-started event
      const readerStartedEvents = caller
        .getReaderEvents()
        .filter((e) => e.type === 'reader-started');

      expect(readerStartedEvents.length).to.be.lessThanOrEqual(1);
    });

    it('should maintain reader stream across many requests', async () => {
      caller = await env.createNode<any>(LimitedTestTool, {
        address: new oNodeAddress('o://caller'),
      });

      receiver = await env.createNode<any>(ReceiverTestTool, {
        address: new oNodeAddress('o://receiver'),
      });

      const receiverAddr = new oNodeAddress(
        receiver.address.toString(),
        receiver.address.libp2pTransports,
      );

      const callerAddr = new oNodeAddress(
        caller.address.toString(),
        caller.address.libp2pTransports,
      );

      // Establish connection
      await caller.use(receiverAddr, {
        method: 'echo',
        params: { message: 'initial' },
      });

      const callerConn = caller.getFirstConnection();
      const receiverConn = receiver.getFirstConnection();

      if (callerConn) {
        caller.setupEventListeners(callerConn);
      }

      if (receiverConn) {
        receiver.setupStreamListeners(receiverConn);
      }

      // Wait for reader stream identification
      await env.waitFor(() => receiver.identifiedStreams.length > 0, 5000, 100);

      // Make many bidirectional requests
      for (let i = 0; i < 10; i++) {
        await caller.use(receiverAddr, {
          method: 'echo',
          params: { message: `c2r-${i}` },
        });

        await receiver.use(callerAddr, {
          method: 'echo',
          params: { message: `r2c-${i}` },
        });
      }

      // Reader stream should still be identified
      expect(receiver.identifiedStreams.length).to.be.greaterThan(0);
      expect(receiver.identifiedStreams[0].role).to.equal('reader');
    });
  });

  describe('Error Handling', () => {
    it('should not crash if receiver closes connection during communication', async () => {
      caller = await env.createNode<any>(LimitedTestTool, {
        address: new oNodeAddress('o://caller'),
      });

      receiver = await env.createNode<any>(ReceiverTestTool, {
        address: new oNodeAddress('o://receiver'),
      });

      const receiverAddr = new oNodeAddress(
        receiver.address.toString(),
        receiver.address.libp2pTransports,
      );

      // Establish connection
      await caller.use(receiverAddr, {
        method: 'echo',
        params: { message: 'initial' },
      });

      // Close receiver connection
      const receiverConn = receiver.getFirstConnection();
      if (receiverConn) {
        await receiverConn.close();
      }

      // Caller should handle the error gracefully
      try {
        await caller.use(receiverAddr, {
          method: 'echo',
          params: { message: 'after-close' },
        });
      } catch (error) {
        // Error is expected, but should not crash
        expect(error).to.exist;
      }

      // Caller should still be running
      expect(caller.state).to.equal('started');
    });

    it('should handle concurrent requests during reader stream setup', async () => {
      caller = await env.createNode<any>(LimitedTestTool, {
        address: new oNodeAddress('o://caller'),
      });

      receiver = await env.createNode<any>(ReceiverTestTool, {
        address: new oNodeAddress('o://receiver'),
      });

      const receiverAddr = new oNodeAddress(
        receiver.address.toString(),
        receiver.address.libp2pTransports,
      );

      // Make concurrent requests immediately (reader stream might still be setting up)
      const promises = [];
      for (let i = 0; i < 5; i++) {
        promises.push(
          caller.use(receiverAddr, {
            method: 'echo',
            params: { message: `concurrent-${i}` },
          }),
        );
      }

      const responses = await Promise.all(promises);

      // All should succeed
      responses.forEach((response, i) => {
        expect(response.result.success).to.be.true;
        expect(response.result.data.message).to.equal(`concurrent-${i}`);
      });

      expect(receiver.receivedRequests).to.have.lengthOf(5);
    });
  });
});
