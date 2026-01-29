import { expect } from 'chai';
import {
  TestEnvironment,
  createConnectionSpy,
} from '@olane/o-node/test/helpers';
import { oNodeAddress } from '@olane/o-node';
import { LimitedTestTool, ReceiverTestTool } from './helpers/index.js';

describe('Limited Connection Lifecycle', () => {
  const env = new TestEnvironment();
  let caller: LimitedTestTool;
  let receiver: ReceiverTestTool;

  afterEach(async () => {
    await env.cleanup();
  });

  describe('Connection Creation', () => {
    it('should create limited connection with reuse policy', async () => {
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
      expect(callerConn).to.exist;
      expect(callerConn.reusePolicy).to.equal('reuse');
    });

    it('should initialize stream manager on first use', async () => {
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

      // Before first use, no connections
      const connectionsBefore = Array.from(
        (caller.connectionManager as any).connections.values(),
      );
      expect(connectionsBefore).to.have.lengthOf(0);

      // Make first request
      await caller.use(receiverAddr, {
        method: 'echo',
        params: { message: 'test' },
      });

      // After first use, connection and stream manager should exist
      const callerConn = caller.getFirstConnection();
      expect(callerConn).to.exist;
      expect(callerConn.streamManager).to.exist;
    });
  });

  describe('Connection Reuse', () => {
    it('should maintain single connection across multiple requests', async () => {
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
      for (let i = 0; i < 5; i++) {
        await caller.use(receiverAddr, {
          method: 'echo',
          params: { message: `request-${i}` },
        });
      }

      // Should only have 1 connection
      const summary = spy.getSummary();
      expect(summary.currentConnections).to.equal(1);

      spy.stop();
    });

    it('should properly initialize when using ConnectionSpy', async () => {
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

      // Make requests
      await caller.use(receiverAddr, {
        method: 'echo',
        params: { message: 'test1' },
      });

      await caller.use(receiverAddr, {
        method: 'echo',
        params: { message: 'test2' },
      });

      const stats = spy.getConnectionStats();
      expect(stats).to.have.lengthOf(1);
      expect(stats[0].status).to.equal('open');

      spy.stop();
    });
  });

  describe('Cleanup', () => {
    it('should cleanup all streams on close', async () => {
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

      // Create connection
      await caller.use(receiverAddr, {
        method: 'echo',
        params: { message: 'test' },
      });

      const callerConn = caller.getFirstConnection();
      expect(callerConn).to.exist;

      // Close connection
      await callerConn.close();

      // Connection should be closed
      expect(callerConn.p2pConnection.status).to.equal('closed');
    });

    it('should handle cleanup during node stop', async () => {
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

      // Create connection
      await caller.use(receiverAddr, {
        method: 'echo',
        params: { message: 'test' },
      });

      const callerConn = caller.getFirstConnection();
      const connectionId = callerConn.p2pConnection.id;

      // Stop caller (should cleanup all connections)
      await caller.stop();

      // Connection should be closed
      expect(callerConn.p2pConnection.status).to.equal('closed');
    });
  });

  describe('Multiple Concurrent Connections', () => {
    it('should handle multiple concurrent connections to different receivers', async () => {
      caller = await env.createNode<any>(LimitedTestTool, {
        address: new oNodeAddress('o://caller'),
      });

      const receiver1 = await env.createNode<any>(ReceiverTestTool, {
        address: new oNodeAddress('o://receiver1'),
      });

      const receiver2 = await env.createNode<any>(ReceiverTestTool, {
        address: new oNodeAddress('o://receiver2'),
      });

      const receiver1Addr = new oNodeAddress(
        receiver1.address.toString(),
        receiver1.address.libp2pTransports,
      );

      const receiver2Addr = new oNodeAddress(
        receiver2.address.toString(),
        receiver2.address.libp2pTransports,
      );

      const spy = createConnectionSpy(caller as any);
      spy.start();

      // Make concurrent requests to both receivers
      const promises = [];

      for (let i = 0; i < 3; i++) {
        promises.push(
          caller.use(receiver1Addr, {
            method: 'echo',
            params: { message: `r1-${i}` },
          }),
        );

        promises.push(
          caller.use(receiver2Addr, {
            method: 'echo',
            params: { message: `r2-${i}` },
          }),
        );
      }

      const responses = await Promise.all(promises);

      responses.forEach((response) => {
        expect(response.result.success).to.be.true;
      });

      // Should have 2 connections (one to each receiver)
      const summary = spy.getSummary();
      expect(summary.currentConnections).to.equal(2);

      // Each receiver should have received 3 requests
      expect(receiver1.receivedRequests).to.have.lengthOf(3);
      expect(receiver2.receivedRequests).to.have.lengthOf(3);

      spy.stop();
    });
  });

  describe('Connection State', () => {
    it('should maintain connection state across requests', async () => {
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

      // Make first request
      await caller.use(receiverAddr, {
        method: 'echo',
        params: { message: 'first' },
      });

      const callerConnFirst = caller.getFirstConnection();
      const connectionIdFirst = callerConnFirst.p2pConnection.id;

      // Make second request
      await caller.use(receiverAddr, {
        method: 'echo',
        params: { message: 'second' },
      });

      const callerConnSecond = caller.getFirstConnection();
      const connectionIdSecond = callerConnSecond.p2pConnection.id;

      // Should be the same connection
      expect(connectionIdFirst).to.equal(connectionIdSecond);
      expect(callerConnFirst).to.equal(callerConnSecond);
    });
  });
});
