import express, { Request, Response } from 'express';
import { Server } from 'http';
import * as promClient from 'prom-client';
import { MetricsStore } from '../utils/metrics-store.js';
import debug from 'debug';

const logger = debug('olane-os:monitor:http');

export interface MonitorHTTPServerConfig {
  port: number;
  metricsStore: MetricsStore;
  onNodeQuery?: (address: string) => Promise<any>;
  onNetworkQuery?: () => Promise<any>;
}

export class MonitorHTTPServer {
  private app: express.Application;
  private server?: Server;
  private metricsStore: MetricsStore;
  private port: number;
  private onNodeQuery?: (address: string) => Promise<any>;
  private onNetworkQuery?: () => Promise<any>;

  // Prometheus metrics
  private registry: promClient.Registry;
  private olaneNodeSuccessCount: promClient.Gauge;
  private olaneNodeErrorCount: promClient.Gauge;
  private olaneNodeActiveRequests: promClient.Gauge;
  private olaneServiceLastHeartbeat: promClient.Gauge;
  private olaneNetworkNodeCount: promClient.Gauge;

  constructor(config: MonitorHTTPServerConfig) {
    this.app = express();
    this.metricsStore = config.metricsStore;
    this.port = config.port;
    this.onNodeQuery = config.onNodeQuery;
    this.onNetworkQuery = config.onNetworkQuery;

    // Initialize Prometheus registry
    this.registry = new promClient.Registry();

    // Register custom Olane metrics
    this.olaneNodeSuccessCount = new promClient.Gauge({
      name: 'olane_node_success_count',
      help: 'Total number of successful requests per node',
      labelNames: ['node_address'],
      registers: [this.registry],
    });

    this.olaneNodeErrorCount = new promClient.Gauge({
      name: 'olane_node_error_count',
      help: 'Total number of failed requests per node',
      labelNames: ['node_address'],
      registers: [this.registry],
    });

    this.olaneNodeActiveRequests = new promClient.Gauge({
      name: 'olane_node_active_requests',
      help: 'Number of currently active requests per node',
      labelNames: ['node_address'],
      registers: [this.registry],
    });

    this.olaneServiceLastHeartbeat = new promClient.Gauge({
      name: 'olane_service_last_heartbeat_timestamp',
      help: 'Timestamp of last heartbeat from service',
      labelNames: ['node_address'],
      registers: [this.registry],
    });

    this.olaneNetworkNodeCount = new promClient.Gauge({
      name: 'olane_network_node_count',
      help: 'Total number of nodes in the network',
      registers: [this.registry],
    });

    // Merge with default Prometheus metrics (if libp2p metrics are enabled)
    promClient.collectDefaultMetrics({ register: this.registry });

    this.setupRoutes();
  }

  private setupRoutes(): void {
    this.app.use(express.json());

    // Health check endpoint
    this.app.get('/health', (req: Request, res: Response) => {
      res.status(200).json({ status: 'ok', timestamp: Date.now() });
    });

    // Prometheus metrics endpoint
    this.app.get('/metrics', async (req: Request, res: Response) => {
      try {
        // Update Olane metrics before scraping
        this.updatePrometheusMetrics();

        res.set('Content-Type', this.registry.contentType);
        const metrics = await this.registry.metrics();
        res.send(metrics);
      } catch (err: any) {
        logger('Error generating metrics:', err);
        res.status(500).json({ error: err.message });
      }
    });

    // Network status summary
    this.app.get('/api/network/status', async (req: Request, res: Response) => {
      try {
        const summary = this.metricsStore.getSummary();
        const staleServices = this.metricsStore.getStaleServices();

        // If callback provided, get additional network info
        let networkData = null;
        if (this.onNetworkQuery) {
          try {
            networkData = await this.onNetworkQuery();
          } catch (err) {
            logger('Error querying network:', err);
          }
        }

        res.json({
          timestamp: Date.now(),
          summary,
          staleServices,
          networkData,
        });
      } catch (err: any) {
        logger('Error getting network status:', err);
        res.status(500).json({ error: err.message });
      }
    });

    // Get all nodes
    this.app.get('/api/nodes', (req: Request, res: Response) => {
      try {
        const nodes = this.metricsStore.getAllTrackedNodes();
        const nodeData = nodes.map((address) => {
          const latestMetrics = this.metricsStore.getLatestMetrics(address);
          const heartbeat = this.metricsStore.getLastHeartbeat(address);
          const isAlive = this.metricsStore.isNodeAlive(address);

          return {
            address,
            latestMetrics,
            lastHeartbeat: heartbeat?.timestamp || null,
            isAlive,
          };
        });

        res.json({
          timestamp: Date.now(),
          count: nodes.length,
          nodes: nodeData,
        });
      } catch (err: any) {
        logger('Error getting nodes:', err);
        res.status(500).json({ error: err.message });
      }
    });

    // Get specific node metrics
    this.app.get('/api/nodes/:address', async (req: Request, res: Response) => {
      try {
        const address = decodeURIComponent(req.params.address);
        const latestMetrics = this.metricsStore.getLatestMetrics(address);
        const allMetrics = this.metricsStore.getAllMetrics(address);
        const heartbeat = this.metricsStore.getLastHeartbeat(address);
        const isAlive = this.metricsStore.isNodeAlive(address);

        // If callback provided, query live node data
        let liveData = null;
        if (this.onNodeQuery) {
          try {
            liveData = await this.onNodeQuery(address);
          } catch (err) {
            logger(`Error querying node ${address}:`, err);
          }
        }

        res.json({
          timestamp: Date.now(),
          address,
          latestMetrics,
          historicalMetrics: allMetrics,
          lastHeartbeat: heartbeat?.timestamp || null,
          isAlive,
          liveData,
        });
      } catch (err: any) {
        logger('Error getting node metrics:', err);
        res.status(500).json({ error: err.message });
      }
    });

    // Get stale services
    this.app.get('/api/services/stale', (req: Request, res: Response) => {
      try {
        const staleServices = this.metricsStore.getStaleServices();
        const details = staleServices.map((address) => {
          const heartbeat = this.metricsStore.getLastHeartbeat(address);
          return {
            address,
            lastHeartbeat: heartbeat?.timestamp || null,
            timeSinceHeartbeat: heartbeat
              ? Date.now() - heartbeat.timestamp
              : null,
          };
        });

        res.json({
          timestamp: Date.now(),
          count: staleServices.length,
          staleServices: details,
        });
      } catch (err: any) {
        logger('Error getting stale services:', err);
        res.status(500).json({ error: err.message });
      }
    });

    // Get metrics summary
    this.app.get('/api/summary', (req: Request, res: Response) => {
      try {
        const summary = this.metricsStore.getSummary();
        res.json({
          timestamp: Date.now(),
          ...summary,
        });
      } catch (err: any) {
        logger('Error getting summary:', err);
        res.status(500).json({ error: err.message });
      }
    });
  }

  /**
   * Update Prometheus metrics from metrics store
   */
  private updatePrometheusMetrics(): void {
    const nodes = this.metricsStore.getAllTrackedNodes();

    // Update node metrics
    for (const address of nodes) {
      const metrics = this.metricsStore.getLatestMetrics(address);
      if (metrics) {
        this.olaneNodeSuccessCount.set({ node_address: address }, metrics.successCount);
        this.olaneNodeErrorCount.set({ node_address: address }, metrics.errorCount);
        this.olaneNodeActiveRequests.set({ node_address: address }, metrics.activeRequests);
      }

      const heartbeat = this.metricsStore.getLastHeartbeat(address);
      if (heartbeat) {
        this.olaneServiceLastHeartbeat.set(
          { node_address: address },
          heartbeat.timestamp,
        );
      }
    }

    // Update network-wide metrics
    const summary = this.metricsStore.getSummary();
    this.olaneNetworkNodeCount.set(summary.totalNodes);
  }

  /**
   * Start the HTTP server
   */
  async start(): Promise<void> {
    return new Promise((resolve) => {
      this.server = this.app.listen(this.port, () => {
        logger(`Monitor HTTP server listening on port ${this.port}`);
        logger(`Prometheus metrics: http://localhost:${this.port}/metrics`);
        logger(`API docs: http://localhost:${this.port}/api/`);
        resolve();
      });
    });
  }

  /**
   * Stop the HTTP server
   */
  async stop(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.server) {
        resolve();
        return;
      }

      this.server.close((err) => {
        if (err) {
          reject(err);
        } else {
          logger('Monitor HTTP server stopped');
          resolve();
        }
      });
    });
  }

  /**
   * Get the Express app instance
   */
  getApp(): express.Application {
    return this.app;
  }

  /**
   * Get the Prometheus registry
   */
  getRegistry(): promClient.Registry {
    return this.registry;
  }
}
