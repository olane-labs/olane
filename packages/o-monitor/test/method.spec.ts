import { oAddress, NodeState } from '@olane/o-core';
import { MonitorTool } from '../src/monitor.tool.js';
import { MetricsStore } from '../src/utils/metrics-store.js';
import { expect } from 'chai';
import { oLeaderNode } from '@olane/o-leader';

describe('o-monitor functionality', () => {
  let monitor: MonitorTool;
  let leader: oLeaderNode;

  before(async () => {
    // Disable HTTP server for tests
    process.env.MONITOR_HTTP_ENABLED = 'false';
    process.env.MONITOR_AUTO_POLL = 'false';
  });

  afterEach(async () => {
    if (leader && leader.state === NodeState.RUNNING) {
      await leader.stop();
    }
    if (monitor && monitor.state === NodeState.RUNNING) {
      await monitor.stop();
    }
  });

  describe('MonitorTool initialization', () => {
    it('should create and start monitor tool', async () => {
      leader = new oLeaderNode({
        leader: null,
        parent: null,
      });
      await leader.start();

      monitor = new MonitorTool({
        leader: leader.address,
        parent: leader.address,
        address: new oAddress('o://monitor'),
        enableHTTP: false,
      });

      await monitor.start();
      expect(monitor.state).to.equal(NodeState.RUNNING);
    });

    it('should have child providers', async () => {
      leader = new oLeaderNode({
        leader: null,
        parent: null,
      });
      await leader.start();

      monitor = new MonitorTool({
        leader: leader.address,
        parent: leader.address,
        address: new oAddress('o://monitor'),
        enableHTTP: false,
      });

      await monitor.start();
      expect(monitor.state).to.equal(NodeState.RUNNING);

      const children = monitor.hierarchyManager.getChildren();
      expect(children.length).to.equal(3); // Heartbeat, Health, LibP2P providers

      const childAddresses = children.map((c) => c.toString());
      console.log(childAddresses);
      expect(childAddresses).to.include('o://leader/monitor/heartbeat');
      expect(childAddresses).to.include('o://leader/monitor/health');
      expect(childAddresses).to.include('o://leader/monitor/libp2p');
    });
  });

  describe('Heartbeat functionality', () => {
    it('should record heartbeat', async () => {
      leader = new oLeaderNode({
        leader: null,
        parent: null,
      });
      await leader.start();

      monitor = new MonitorTool({
        leader: leader.address,
        parent: leader.address,
        address: new oAddress('o://monitor'),
        enableHTTP: false,
      });

      await monitor.start();
      expect(monitor.state).to.equal(NodeState.RUNNING);

      const result = await monitor.use(new oAddress('o://heartbeat'), {
        method: 'record_heartbeat',
        params: {
          address: 'o://test-node',
          timestamp: Date.now(),
          metrics: {
            successCount: 10,
            errorCount: 0,
          },
        },
      });

      expect(result.result.message).to.equal('Heartbeat recorded');
      expect(result.result.address).to.equal('o://test-node');
    });

    it('should check service status', async () => {
      leader = new oLeaderNode({
        leader: null,
        parent: null,
      });
      await leader.start();

      monitor = new MonitorTool({
        leader: leader.address,
        parent: leader.address,
        address: new oAddress('o://monitor'),
        enableHTTP: false,
      });

      await monitor.start();
      expect(monitor.state).to.equal(NodeState.RUNNING);

      // Record a heartbeat first
      await monitor.use(new oAddress('o://leader/monitor/heartbeat'), {
        method: 'record_heartbeat',
        params: {
          address: 'o://leader',
          timestamp: Date.now(),
        },
      });

      // Check status
      const status = await monitor.use(
        new oAddress('o://leader/monitor/heartbeat'),
        {
          method: 'get_service_status',
          params: {
            address: 'o://leader',
          },
        },
      );

      expect(status.result.address).to.equal('o://leader');
      expect(status.result.isAlive).to.be.true;
      expect(status.result.lastHeartbeat).to.be.a('number');
    });
  });

  describe('Metrics storage', () => {
    it('should store and retrieve metrics', () => {
      const store = new MetricsStore();

      store.storeMetrics('o://test', {
        successCount: 100,
        errorCount: 5,
        activeRequests: 2,
      });

      const metrics = store.getLatestMetrics('o://test');
      expect(metrics).to.not.be.null;
      expect(metrics!.successCount).to.equal(100);
      expect(metrics!.errorCount).to.equal(5);
      expect(metrics!.activeRequests).to.equal(2);
      expect(metrics!.timestamp).to.be.a('number');
    });

    it('should track heartbeats', () => {
      const store = new MetricsStore();

      store.recordHeartbeat('o://service1', { uptime: 1000 });
      store.recordHeartbeat('o://service2', { uptime: 2000 });

      const heartbeats = store.getAllHeartbeats();
      expect(heartbeats.length).to.equal(2);

      const isAlive = store.isNodeAlive('o://service1');
      expect(isAlive).to.be.true;
    });

    it('should detect stale services', (done) => {
      const store = new MetricsStore();

      // Record a heartbeat
      store.recordHeartbeat('o://fresh-service');

      // Manually set an old heartbeat (simulate time passing)
      const staleTimestamp = Date.now() - 120000; // 2 minutes ago
      (store as any).heartbeats.set('o://stale-service', {
        address: 'o://stale-service',
        timestamp: staleTimestamp,
      });

      const staleServices = store.getStaleServices();
      expect(staleServices).to.include('o://stale-service');
      expect(staleServices).to.not.include('o://fresh-service');

      done();
    });

    it('should get metrics summary', () => {
      const store = new MetricsStore();

      store.storeMetrics('o://node1', {
        successCount: 10,
        errorCount: 0,
        activeRequests: 1,
      });
      store.storeMetrics('o://node2', {
        successCount: 20,
        errorCount: 1,
        activeRequests: 0,
      });

      store.recordHeartbeat('o://node1');
      store.recordHeartbeat('o://node2');

      const summary = store.getSummary();
      expect(summary.totalNodes).to.be.at.least(2);
      expect(summary.aliveNodes).to.equal(2);
      expect(summary.totalMetricEntries).to.equal(2);
    });
  });

  describe('Network monitoring', () => {
    it('should get metrics summary', async () => {
      leader = new oLeaderNode({
        leader: null,
        parent: null,
      });
      await leader.start();

      monitor = new MonitorTool({
        leader: leader.address,
        parent: leader.address,
        address: new oAddress('o://monitor'),
        enableHTTP: false,
      });

      await monitor.start();
      expect(monitor.state).to.equal(NodeState.RUNNING);

      const summary = await monitor.useSelf({
        method: 'get_metrics_summary',
        params: {},
      });

      expect(summary.result).to.have.property('timestamp');
      expect(summary.result).to.have.property('totalNodes');
      expect(summary.result).to.have.property('aggregateMetrics');
    });

    it('should get stale services', async () => {
      leader = new oLeaderNode({
        leader: null,
        parent: null,
      });
      await leader.start();

      monitor = new MonitorTool({
        leader: leader.address,
        parent: leader.address,
        address: new oAddress('o://monitor'),
        enableHTTP: false,
      });

      await monitor.start();
      expect(monitor.state).to.equal(NodeState.RUNNING);

      const stale = await monitor.useChild(new oAddress('o://health'), {
        method: 'get_stale_services',
        params: {},
      });

      expect(stale.result).to.have.property('count');
      expect(stale.result).to.have.property('staleServices');
      expect(stale.result.staleServices).to.be.an('array');
    });
  });
});
