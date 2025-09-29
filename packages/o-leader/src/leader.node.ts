import { NodeType, oAddress, oRequest, oResponse } from '@olane/o-core';
import { oToolConfig } from '@olane/o-tool';
import { START_METHOD } from './methods/start.method.js';
import { oLaneTool } from '@olane/o-lane';

export class oLeaderNode extends oLaneTool {
  constructor(config: oToolConfig) {
    super({
      ...config,
      address: oAddress.leader(),
      type: NodeType.LEADER,
      methods: {
        start: START_METHOD,
      },
    });
  }

  async validateJoinRequest(request: oRequest): Promise<any> {
    return true;
  }

  async _tool_join_network(request: oRequest): Promise<any> {
    const { caller, parent, transports }: any = request.params;
    this.logger.debug('Joining network: ' + caller);

    if (!caller || !parent || !transports) {
      throw new Error('Invalid parameters provided, cannot join network');
    }

    await this.validateJoinRequest(request);

    await this.use(new oAddress(parent), {
      method: 'add_child',
      params: {
        address: caller,
        transports: transports,
      },
    });

    return {
      message: 'Network joined!',
    };
  }

  async _tool_save_plan(request: oRequest): Promise<any> {
    const { plan } = request.params;
    this.logger.debug('Adding plan to network: ' + plan);

    if (!this.config.networkName) {
      this.logger.warn('No network name provided, cannot update config');
      return;
    }
  }

  async _tool_index_network(request: oRequest): Promise<any> {
    // paginate through all the registered nodes and index them
    const nodes: oResponse = await this.use(
      new oAddress('o://leader/register'),
      {
        method: 'find_all',
        params: {},
      },
    );

    const nodesArray = nodes.result.data as any[];
    for (let i = 0; i < nodesArray.length; i++) {
      // first let's get the node's tools
      const node = nodesArray[i];
      const { result } = await this.use(new oAddress(node.address), {
        method: 'index_network',
        params: {},
      });
    }
    return {
      message: 'Network indexed!',
    };
  }

  // _tool_elect_root(params: RunToolParams): Promise<void> {
  //   return Promise.resolve();
  // }
}
