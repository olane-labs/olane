import { OlaneOSSystemStatus } from './enum/o-os.status-enum.js';
import { OlaneOSConfig } from './interfaces/o-os.config.js';
import * as touch from 'touch';
import { readFile } from 'fs/promises';
import { oLeaderNode } from '@olane/o-leader';
import { Logger, oAddress, oObject, oTransport } from '@olane/o-core';
import { NodeType } from '@olane/o-core';
import { initCommonTools } from '@olane/o-tools-common';
import { initRegistryTools } from '@olane/o-tool-registry';
import { ConfigManager } from '../utils/config.js';
import { AGUIoLaneTool, oLaneTool } from '@olane/o-lane';
import { oLaneStorage } from '@olane/o-storage';
import { oNodeAddress } from '@olane/o-node';
import { oNodeConfig } from '@olane/o-node';

type OlaneOSNode = oLaneTool | oLeaderNode;
export class OlaneOS extends oObject {
  private leaders: oLeaderNode[] = []; // clones of leader for scale
  private nodes: OlaneOSNode[] = []; // clones of node for scale
  public rootLeader: oLeaderNode | null = null; // the root leader node
  public status!: OlaneOSSystemStatus;
  private config: OlaneOSConfig;
  private roundRobinIndex: number = 0;

  constructor(config: OlaneOSConfig) {
    super();
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

  async addNode(node: OlaneOSNode) {
    if (this.status !== OlaneOSSystemStatus.RUNNING) {
      throw new Error('OS instance is not running, cannot add node');
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
          throw new Error('No config file found, cannot start OS instance');
        }

        const json = JSON.parse(config) as any;
        this.logger.debug('Config file parsed: ' + json);
        const osConfig = json.oNetworkConfig as OlaneOSConfig;
        this.config = {
          ...osConfig,
          nodes: (osConfig.nodes || []).map((node) => ({
            ...node,
            address: new oNodeAddress(node.address.value),
          })),
          network: {
            ...osConfig.network,
            port: osConfig.network?.port || 4999,
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

  async getOSInstanceName() {
    if (this.config.configFilePath) {
      const osConfig = await ConfigManager.getOSConfigFromPath(
        this.config.configFilePath,
      );
      return osConfig?.name;
    }
  }

  async startNodes(type: NodeType) {
    this.logger.debug('Starting nodes');

    if (!this.config.nodes || this.config.nodes?.length === 0) {
      throw new Error('No nodes found in config, cannot start OS instance');
    }

    const filtered = this.config.nodes.filter((node) => node.type === type);
    const osInstanceName: string | undefined = await this.getOSInstanceName();

    // check the config for any leaders
    for (const node of filtered) {
      if (node.type === NodeType.LEADER) {
        this.logger.debug('Starting leader: ' + node.address.toString());
        const leaderNode = new oLeaderNode({
          ...node,
          systemName: osInstanceName,
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
        const commonNode = new AGUIoLaneTool({
          ...node,
          address: node.address,
          leader: this.rootLeader?.address || null,
          parent: this.rootLeader?.address || null,
        });
        (commonNode as any).hookInitializeFinished = () => {
          this.rootLeader?.addChildNode(commonNode as any);
        };
        await commonNode.start();
        const olaneStorage = new oLaneStorage({
          name: 'lane-storage',
          parent: commonNode.address,
          leader: this.rootLeader?.address || null,
        });
        (olaneStorage as any).hookInitializeFinished = () => {
          commonNode.addChildNode(olaneStorage as any);
        };
        await olaneStorage.start();
        await initRegistryTools(commonNode);
        this.nodes.push(commonNode);
      }
    }
  }

  async runSavedPlans() {
    const laneCIDs = Array.from(new Set(this.config?.lanes || []));
    if (laneCIDs.length === 0) {
      this.logger.debug('No saved lanes to replay');
      return;
    }

    this.logger.info(
      `Replaying ${laneCIDs.length} saved lane(s) to restore network state...`,
    );

    for (const cid of laneCIDs) {
      this.logger.debug('Replaying lane with CID: ' + cid);
      try {
        // Use the entry node's lane tool to replay the lane
        const result = await this.use(this.entryNode().address, {
          method: 'replay',
          params: { cid },
        });
        this.logger.info('Lane replay completed successfully: ' + cid, result);
      } catch (error) {
        this.logger.error('Failed to replay lane: ' + cid, error);
        // Continue with other lanes even if one fails
      }
    }

    this.logger.info('All saved lanes replayed');
  }

  async use(oAddress: oAddress, params: any) {
    const entryNode = this.entryNode();
    if (!entryNode) {
      throw new Error('Entry node not found');
    }
    const result = await entryNode.use(oAddress, params);
    return result;
  }

  async start(): Promise<{ peerId: string; transports: oTransport[] }> {
    this.logger.debug('Starting OS instance');
    this.status = OlaneOSSystemStatus.STARTING;

    // initialize config folder
    await this.loadConfig();
    this.logger.debug('OS instance config loaded');

    // start leaders (and consequentially, the rest of the OS instance)
    await this.startNodes(NodeType.LEADER);
    this.logger.debug('Leaders started...');
    await this.startNodes(NodeType.NODE);
    this.logger.debug('Nodes started...');

    await this.runSavedPlans();
    this.logger.debug('Saved plans run...');
    this.logger.debug('OS instance started...');

    // index the OS instance
    if (!this.config.noIndexNetwork) {
      await this.use(oAddress.leader(), {
        method: 'index_network',
        params: {},
      });
    }

    this.status = OlaneOSSystemStatus.RUNNING;
    return {
      peerId: this.rootLeader?.peerId.toString() || '',
      transports: this.rootLeader?.transports || [],
    };
  }

  async stop() {
    this.logger.debug('Stopping OS instance');
    this.status = OlaneOSSystemStatus.STOPPING;

    const stopPromises: Promise<void>[] = [];

    try {
      if (!this.rootLeader) {
        throw new Error('Root leader not found');
      }
      stopPromises.push(this.rootLeader.stop());

      // Wait for all stop operations to complete
      await Promise.all(stopPromises);

      this.logger.debug('OS instance stopped successfully');
    } catch (error) {
      this.logger.error('Error while stopping OS instance:', error);
    } finally {
      this.status = OlaneOSSystemStatus.STOPPED;
      this.roundRobinIndex = 0;
    }
  }

  async restart() {
    this.logger.debug('Restarting OS instance');
    await this.stop();
    await this.start();
  }
}
