import { expect } from 'chai';
import {
  TestEnvironment,
  createConnectionSpy,
} from '@olane/o-node/test/helpers';
import { oNodeAddress } from '@olane/o-node';
import { LimitedTestTool, ReceiverTestTool } from './helpers/index.js';

describe('Bidirectional Communication', () => {
  const env = new TestEnvironment();
  let caller: LimitedTestTool;
  let receiver: ReceiverTestTool;

  afterEach(async () => {
    await env.cleanup();
  });

  describe('Caller → Receiver', () => {
    it('should send request and receive response', async () => {
      caller = await env.createNode<any>(LimitedTestTool, {
        address: new oNodeAddress('o://caller'),
      });

      receiver = await env.createNode<any>(ReceiverTestTool, {
        address: new oNodeAddress('o://receiver'),
      });

      const response = await caller.use(
        new oNodeAddress(
          receiver.address.toString(),
          receiver.address.libp2pTransports,
        ),
        {
          method: 'echo',
          params: { message: 'hello-receiver' },
        },
      );

      expect(response.result.success).to.be.true;
      expect(response.result.data.message).to.equal('hello-receiver');
      expect(receiver.receivedRequests).to.have.lengthOf(1);
    });

    it('should handle multiple sequential requests', async () => {
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

      for (let i = 0; i < 5; i++) {
        const response = await caller.use(receiverAddr, {
          method: 'echo',
          params: { message: `request-${i}` },
        });

        expect(response.result.success).to.be.true;
        expect(response.result.data.message).to.equal(`request-${i}`);
      }

      expect(receiver.receivedRequests).to.have.lengthOf(5);
    });
  });

  describe('Receiver → Caller', () => {
    it('should send request via reader stream and receive response', async () => {
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

      // First: Caller establishes connection (creates reader stream)
      const initialResponse = await caller.use(receiverAddr, {
        method: 'echo',
        params: { message: 'initial' },
      });

      expect(initialResponse.result.success).to.be.true;

      // Set up event listeners on both sides
      const callerConn = caller.getFirstConnection();
      const receiverConn = receiver.getFirstConnection();

      await new Promise((resolve) => setTimeout(resolve, 5_000));

      // if (callerConn) {
      //   caller.setupEventListeners(callerConn);
      // }

      // if (receiverConn) {
      //   receiver.setupStreamListeners(receiverConn);
      // }

      // // Wait for receiver to identify reader stream
      // await env.waitFor(() => receiver.identifiedStreams.length > 0, 5000, 100);

      // expect(receiver.identifiedStreams).to.have.lengthOf(1);
      // expect(receiver.identifiedStreams[0].role).to.equal('reader');

      // Now: Receiver calls back to caller
      const callerAddr = new oNodeAddress(
        caller.address.toString(),
        caller.address.libp2pTransports,
      );

      const response = await receiver.use(callerAddr, {
        method: 'echo',
        params: { message: 'hello-caller' },
      });

      console.log('Response from caller:', response);
      expect(response.result.success).to.be.true;
      expect(response.result.data.message).to.equal('hello-caller');
      expect(caller.callCount).to.equal(1); // Only the reverse call
    });

    it('should handle request via tool method that calls caller', async () => {
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

      // Set up event listeners
      // const callerConn = caller.getFirstConnection();
      // const receiverConn = receiver.getFirstConnection();

      // if (callerConn) {
      //   caller.setupEventListeners(callerConn);
      // }

      // if (receiverConn) {
      //   receiver.setupStreamListeners(receiverConn);
      // }

      // // Wait for reader stream identification
      // await env.waitFor(() => receiver.identifiedStreams.length > 0, 5000, 100);

      // Caller calls receiver method that will call back to caller
      const callerAddr = new oNodeAddress(
        caller.address.toString(),
        caller.address.libp2pTransports,
      );

      const response = await receiver.use(receiverAddr, {
        method: 'call_caller',
        params: { callerAddress: callerAddr },
      });

      expect(response.result.success).to.be.true;
      expect(response.result.data.callerResponse.data.message).to.equal(
        'from-receiver',
      );
    });
  });

  describe('Concurrent Bidirectional', () => {
    it('should handle multiple concurrent bidirectional requests', async () => {
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

      // Set up event listeners
      // const callerConn = caller.getFirstConnection();
      // const receiverConn = receiver.getFirstConnection();

      // if (callerConn) {
      //   caller.setupEventListeners(callerConn);
      // }

      // if (receiverConn) {
      //   receiver.setupStreamListeners(receiverConn);
      // }

      // // Wait for reader stream identification
      // await env.waitFor(() => receiver.identifiedStreams.length > 0, 5000, 100);

      // Concurrent bidirectional requests
      const promises = [];

      // Caller → Receiver
      for (let i = 0; i < 5; i++) {
        promises.push(
          caller.use(receiverAddr, {
            method: 'echo',
            params: { message: `c2r-${i}` },
          }),
        );
      }

      // Receiver → Caller
      for (let i = 0; i < 5; i++) {
        promises.push(
          receiver.use(callerAddr, {
            method: 'echo',
            params: { message: `r2c-${i}` },
          }),
        );
      }

      const responses = await Promise.all(promises);

      responses.forEach((response) => {
        expect(response.result.success).to.be.true;
      });

      // Verify request counts
      expect(caller.callCount).to.equal(5); // 5 from receiver
      expect(receiver.receivedRequests).to.have.lengthOf(6); // 5 from caller + 1 initial
    });
  });

  describe('Stream Reuse Verification', () => {
    it('should reuse outbound streams for multiple requests', async () => {
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

      const spy = createConnectionSpy(caller as any);
      spy.start();

      // Multiple requests should use same stream
      for (let i = 0; i < 10; i++) {
        await caller.use(receiverAddr, {
          method: 'echo',
          params: { message: `test-${i}` },
        });
      }

      const stats = spy.getConnectionStats();

      // Should have created connection
      expect(stats.length).to.be.greaterThan(0);

      // Should have limited number of streams (reader + outbound, reused)
      const streamCount = stats.reduce(
        (sum, conn) => sum + (conn.streams?.length || 0),
        0,
      );

      // With reuse, stream count should be much less than request count
      expect(streamCount).to.be.lessThan(10);
      expect(receiver.receivedRequests).to.have.lengthOf(10);

      spy.stop();
    });

    it('should maintain single connection across many requests', async () => {
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

      const spy = createConnectionSpy(caller as any);
      spy.start();

      // Make multiple requests
      for (let i = 0; i < 20; i++) {
        await caller.use(receiverAddr, {
          method: 'echo',
          params: { message: `request-${i}` },
        });
      }

      // Should only have 1 connection
      const summary = spy.getSummary();
      expect(summary.currentConnections).to.equal(1);
      expect(receiver.receivedRequests).to.have.lengthOf(20);

      spy.stop();
    });
  });

  describe('Reader Stream Identification', () => {
    it('should create and identify reader stream', async () => {
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

      // Make initial connection
      await caller.use(receiverAddr, {
        method: 'echo',
        params: { message: 'test' },
      });

      // Set up event listeners
      const callerConn = caller.getFirstConnection();
      const receiverConn = receiver.getFirstConnection();

      if (callerConn) {
        caller.setupEventListeners(callerConn);
      }

      if (receiverConn) {
        receiver.setupStreamListeners(receiverConn);
      }

      // Wait a bit for events to propagate
      await new Promise((resolve) => setTimeout(resolve, 200));

      // Verify reader stream was created on caller side
      const readerEvents = caller.getReaderEvents();
      expect(readerEvents.length).to.be.greaterThan(0);

      const readerStarted = readerEvents.find(
        (e) => e.type === 'reader-started',
      );
      expect(readerStarted).to.exist;

      // Verify receiver identified the reader stream
      expect(receiver.identifiedStreams.length).to.be.greaterThan(0);
      expect(receiver.identifiedStreams[0].role).to.equal('reader');
    });
  });
});
