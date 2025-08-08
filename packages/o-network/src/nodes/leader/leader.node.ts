import {
  LEADER_ADRESS,
  NodeType,
  oAddress,
  oRequest,
  oResponse,
} from '@olane/o-core';
import { oToolConfig } from '@olane/o-tool';
import { oCommonNode } from '../common';
import { START_METHOD } from './methods/start.method';
import { ConfigManager } from '../../utils/config';

export class oLeaderNode extends oCommonNode {
  constructor(config: oToolConfig) {
    super({
      ...config,
      address: new oAddress(LEADER_ADRESS),
      type: NodeType.LEADER,
      methods: {
        start: START_METHOD,
      },
    });
  }

  async _tool_save_plan(request: oRequest): Promise<any> {
    const { plan } = request.params;
    this.logger.debug('Adding plan to network: ' + plan);

    if (!this.config.networkName) {
      this.logger.warn('No network name provided, cannot update config');
      return;
    }

    const networkConfig = await ConfigManager.getNetworkConfig(
      this.config.networkName,
    );

    if (!networkConfig) {
      this.logger.warn('No network config found, cannot update config');
      return;
    }

    const plans = [
      ...(networkConfig.oNetworkConfig?.plans || []),
      plan,
    ] as string[];

    await ConfigManager.saveNetworkConfig({
      ...networkConfig,
      oNetworkConfig: {
        ...networkConfig.oNetworkConfig,
        plans: Array.from(new Set(plans)),
      },
    });

    return {
      result: {
        data: {
          success: true,
        },
      },
    };
  }

  async _tool_save_in_progress(request: oRequest): Promise<any> {
    const { plan } = request.params;
    this.logger.debug('Adding plan to in progress: ' + plan);

    if (!this.config.networkName) {
      this.logger.warn('No network name provided, cannot update config');
      return;
    }

    const networkConfig = await ConfigManager.getNetworkConfig(
      this.config.networkName,
    );

    if (!networkConfig) {
      this.logger.warn('No network config found, cannot update config');
      return;
    }

    const inProgress = [
      ...(networkConfig.oNetworkConfig?.inProgress || []),
      plan,
    ] as string[];

    await ConfigManager.saveNetworkConfig({
      ...networkConfig,
      oNetworkConfig: {
        ...networkConfig.oNetworkConfig,
        inProgress: Array.from(new Set(inProgress)),
      },
    });

    return {
      result: {
        data: {
          success: true,
        },
      },
    };
  }

  async _tool_plan_complete(request: oRequest): Promise<any> {
    const { plan } = request.params;
    this.logger.debug('Plan was completed: ' + plan);

    if (!this.config.networkName) {
      this.logger.warn('No network name provided, cannot update config');
      return;
    }

    const networkConfig = await ConfigManager.getNetworkConfig(
      this.config.networkName,
    );

    if (!networkConfig) {
      this.logger.warn('No network config found, cannot update config');
      return;
    }

    const inProgress = networkConfig.oNetworkConfig?.inProgress?.filter(
      (p) => p !== plan,
    ) as string[];

    await ConfigManager.saveNetworkConfig({
      ...networkConfig,
      oNetworkConfig: {
        ...networkConfig.oNetworkConfig,
        inProgress: Array.from(new Set(inProgress)),
      },
    });

    return {
      result: {
        data: {
          success: true,
        },
      },
    };
  }

  async _tool_remove_plan(request: oRequest): Promise<any> {
    const { plan } = request.params;
    this.logger.debug('Removing plan from network: ' + plan);

    if (!this.config.networkName) {
      this.logger.warn('No network name provided, cannot update config');
      return;
    }

    const networkConfig = await ConfigManager.getNetworkConfig(
      this.config.networkName,
    );

    if (!networkConfig) {
      this.logger.warn('No network config found, cannot update config');
      return;
    }

    const plans = networkConfig.oNetworkConfig?.plans?.filter(
      (p) => p !== plan,
    ) as string[];

    await ConfigManager.saveNetworkConfig({
      ...networkConfig,
      oNetworkConfig: {
        ...networkConfig.oNetworkConfig,
        plans: Array.from(new Set(plans)),
      },
    });

    return {
      result: {
        data: {
          success: true,
        },
      },
    };
  }

  async _tool_index_network(request: oRequest): Promise<any> {
    // paginate through all the registered nodes and index them
    const nodes: oResponse = await this.use(
      new oAddress('o://leader/register'),
      {
        method: 'find_all',
        params: {},
      },
      {
        noIndex: true,
      },
    );

    const nodesArray = nodes.result.data as any[];
    for (let i = 0; i < nodesArray.length; i++) {
      // first let's get the node's tools
      const node = nodesArray[i];
      const { result } = await this.use(
        new oAddress(node.address),
        {
          method: 'index_network',
          params: {},
        },
        {
          noIndex: true,
        },
      );
    }
  }

  // _tool_elect_root(params: RunToolParams): Promise<void> {
  //   return Promise.resolve();
  // }
}
