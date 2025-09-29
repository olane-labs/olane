import { NetworkStatus } from './interfaces/network-status.enum.js';
import { NetworkConfigInterface } from './interfaces/network.interface.js';
import touch from 'touch';
import { readFile } from 'fs/promises';
import { oLeaderNode } from '@olane/o-leader';
import { Logger, oAddress, oTransport } from '@olane/o-core';
import { NodeType } from '@olane/o-core';
import { initCommonTools } from '@olane/o-tools-common';
import { initRegistryTools } from '@olane/o-tool-registry';
import { ConfigManager } from '../utils/config.js';
import { oLaneTool } from '@olane/o-lane';
import { oNodeAddress } from '@olane/o-node';
import { oNodeConfig } from '@olane/o-node';

type oNetworkNode = oLaneTool | oLeaderNode;
export class oNetwork {
  private leaders: oLeaderNode[] = []; // clones of leader for scale
  private nodes: oNetworkNode[] = []; // clones of node for scale
  public rootLeader: oLeaderNode | null = null; // the root leader node
  private logger: Logger;
  public status!: NetworkStatus;
  private config: NetworkConfigInterface;
  private roundRobinIndex: number = 0;
  private inFlightRequests: any[] = [];

  constructor(config: NetworkConfigInterface) {
    this.logger = new Logger('oNetwork');
    this.config = config;
  }

  entryNode(): oLaneTool | oLeaderNode {
    const node = this.nodes[this.roundRobinIndex];
    this.roundRobinIndex = (this.roundRobinIndex + 1) % this.nodes.length;
    return node;
  }

  addLeader(leader: oLeaderNode) {
    this.leaders.push(leader);
    if (!this.rootLeader) {
      this.rootLeader = leader;
    }
  }

  async addNode(node: oNetworkNode) {
    if (this.status !== NetworkStatus.RUNNING) {
      throw new Error('Network is not running, cannot add node');
    }
    // TODO: how do we handle multiple leaders?
    // TODO: how do we handle multiple nodes?
    if (this.nodes.length === 0) {
      throw new Error('No non-leader nodes found, cannot add node');
    }
    const selection = this.entryNode();
    selection.addChildNode(node);
    await selection.start();

    const parent = this.entryNode();
    parent.addChildNode(node);
  }

  private async loadConfig() {
    // TODO make this a promise based function
    if (this.config.configFilePath) {
      try {
        await touch(this.config.configFilePath);

        this.logger.debug('Config file path: ' + this.config.configFilePath);

        // let's load the config
        const config = await readFile(this.config.configFilePath, 'utf8');
        this.logger.debug('Config file contents: ' + config);
        if (config?.length === 0) {
          // no contents, let's create a new config
          throw new Error('No config file found, cannot start network');
        }

        const json = JSON.parse(config) as any;
        this.logger.debug('Config file parsed: ' + json);
        const networkConfig = json.oNetworkConfig as NetworkConfigInterface;
        this.config = {
          ...networkConfig,
          nodes: (networkConfig.nodes || []).map((node) => ({
            ...node,
            address: new oNodeAddress(node.address.value),
          })),
          network: {
            ...networkConfig.network,
            port: networkConfig.network?.port || 4999,
          },
          configFilePath: this.config.configFilePath, // persist the config file path
        };
      } catch (error) {
        this.logger.error('Failed to initialize config folder', error);
        throw new Error('Failed to initialize config folder');
      }
    } else {
      this.logger.warn('No config file path provided, using default config');
    }
  }

  async getNetworkName() {
    if (this.config.configFilePath) {
      const networkConfig = await ConfigManager.getNetworkConfigFromPath(
        this.config.configFilePath,
      );
      return networkConfig?.name;
    }
  }

  async startNodes(type: NodeType) {
    this.logger.debug('Starting nodes');

    if (!this.config.nodes || this.config.nodes?.length === 0) {
      throw new Error('No nodes found in config, cannot start network');
    }

    const filtered = this.config.nodes.filter((node) => node.type === type);
    const networkName: string | undefined = await this.getNetworkName();

    // check the config for any leaders
    for (const node of filtered) {
      if (node.type === NodeType.LEADER) {
        this.logger.debug('Starting leader: ' + node.address.toString());
        const leaderNode = new oLeaderNode({
          ...node,
          networkName: networkName,
        } as oNodeConfig);
        if (!this.rootLeader) {
          this.rootLeader = leaderNode;
        }
        await leaderNode.start();
        await initCommonTools(leaderNode);
        this.leaders.push(leaderNode);
      } else {
        this.logger.debug(
          'Starting non-leader node: ' + node.address.toString(),
        );
        const commonNode = new oLaneTool({
          ...node,
          address: node.address,
          leader: this.rootLeader?.address || null,
          parent: this.rootLeader?.address || null,
        });
        await commonNode.start();
        await initCommonTools(commonNode);
        await initRegistryTools(commonNode);
        this.nodes.push(commonNode);
      }
    }
  }

  async runSavedPlans() {
    const plans = Array.from(new Set(this.config?.lanes || []));
    for (const plan of plans) {
      this.logger.debug('Running saved plan: ' + plan);
      await this.use(new oAddress(plan), {
        method: 'use',
      });
    }
  }

  async use(oAddress: oAddress, params: any) {
    const entryNode = this.entryNode();
    if (!entryNode) {
      throw new Error('Entry node not found');
    }
    this.logger.debug('Using address: ' + oAddress.toString());
    return entryNode.use(oAddress, params);
    // TODO: experiment with this (the wrong way to enter the network)
    // const leader = this.leaders.find(
    //   (leader) => leader.type === NodeType.LEADER,
    // );
    // if (!leader) {
    //   throw new Error('Leader not found');
    // }
    // return leader.use(oAddress, params);
  }

  async start(): Promise<{ peerId: string; transports: oTransport[] }> {
    this.logger.debug('Starting o-network');
    this.status = NetworkStatus.STARTING;

    // initialize config folder
    await this.loadConfig();
    this.logger.debug('o-network config loaded');

    // start leaders (and consequentially, the rest of the network)
    await this.startNodes(NodeType.LEADER);
    this.logger.debug('Leaders started...');
    await this.startNodes(NodeType.NODE);
    this.logger.debug('Nodes started...');
    await this.runSavedPlans();
    this.logger.debug('Saved plans run...');
    this.logger.debug('o-network started...');

    // index the network
    if (!this.config.noIndexNetwork) {
      await this.use(oAddress.leader(), {
        method: 'index_network',
        params: {},
      });
    }

    this.status = NetworkStatus.RUNNING;
    return {
      peerId: this.rootLeader?.peerId.toString() || '',
      transports: this.rootLeader?.transports || [],
    };
  }

  async stop() {
    this.logger.debug('Stopping o-network');
    this.status = NetworkStatus.STOPPING;

    const stopPromises: Promise<void>[] = [];

    try {
      // Stop all common nodes first
      if (this.nodes.length > 0) {
        stopPromises.push(
          Promise.allSettled(
            this.nodes.map(async (node) => {
              try {
                await node.stop();
                this.logger.debug(`Stopped node: ${node.address.toString()}`);
              } catch (error) {
                this.logger.error(
                  `Error stopping node ${node.address.toString()}:`,
                  error,
                );
              }
            }),
          ).then(() => {
            this.nodes = [];
            this.logger.debug('All common nodes stopped');
          }),
        );
      }

      // Stop all leader nodes
      if (this.leaders.length > 0) {
        stopPromises.push(
          Promise.allSettled(
            this.leaders.map(async (leader) => {
              try {
                await leader.stop();
                this.logger.debug(
                  `Stopped leader: ${leader.address.toString()}`,
                );
              } catch (error) {
                this.logger.error(
                  `Error stopping leader ${leader.address.toString()}:`,
                  error,
                );
              }
            }),
          ).then(() => {
            this.leaders = [];
            this.logger.debug('All leader nodes stopped');
          }),
        );
      }

      // Stop root leader last
      if (this.rootLeader) {
        this.logger.debug('Stopping root leader...');
        stopPromises.push(
          this.rootLeader
            .stop()
            .then(() => {
              this.logger.debug('Root leader stopped');
              this.rootLeader = null;
            })
            .catch((error: any) => {
              this.logger.error('Error stopping root leader:', error);
            }),
        );
      }

      // Wait for all stop operations to complete
      await Promise.all(stopPromises);

      this.logger.debug('o-network stopped successfully');
    } catch (error) {
      this.logger.error('Error while stopping o-network:', error);
    } finally {
      this.status = NetworkStatus.STOPPED;
      this.roundRobinIndex = 0;
    }
  }

  async restart() {
    this.logger.debug('Restarting o-network');
    await this.stop();
    await this.start();
  }
}
