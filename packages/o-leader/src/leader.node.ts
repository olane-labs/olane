import { NodeType, oAddress, oRequest } from '@olane/o-core';
import { START_METHOD } from './methods/start.method.js';
import { oLaneTool } from '@olane/o-lane';
import { oNodeAddress, oNodeToolConfig, oSearchResolver } from '@olane/o-node';
import { RegistryMemoryTool } from './registry/registry-memory.tool.js';
import { oGatewayResolver } from '@olane/o-gateway-olane';

export class oLeaderNode extends oLaneTool {
  constructor(config: oNodeToolConfig) {
    super({
      ...config,
      address: oAddress.leader(),
      type: NodeType.LEADER,
      methods: {
        start: START_METHOD,
      },
    });
  }

  async initialize(): Promise<void> {
    await super.initialize();
    this.router.addResolver(new oSearchResolver(this.address));
    this.router.addResolver(new oGatewayResolver(this.address));
    const registryTool = new RegistryMemoryTool({
      name: 'registry',
      parent: this.address,
      leader: this.address,
      network: {
        listeners: [],
      },
    });
    await registryTool.start();
    this.addChildNode(registryTool);
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
      method: 'child_register',
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

    if (!this.config.systemName) {
      this.logger.warn('No network name provided, cannot update config');
      return;
    }
  }

  // async _tool_index_network(request: oRequest): Promise<any> {
  //   // paginate through all the registered nodes and index them
  //   const nodes: oResponse = await this.use(
  //     new oAddress(RestrictedAddresses.REGISTRY),
  //     {
  //       method: 'find_all',
  //       params: {},
  //     },
  //   );

  //   const hashMap: any = {};
  //   const nodesArray = nodes.result.data as any[];
  //   for (let i = 0; i < nodesArray.length; i++) {
  //     // first let's get the node's tools
  //     const node = nodesArray[i];
  //     if (hashMap[node.address]) {
  //       continue;
  //     }
  //     hashMap[node.address] = true;
  //     await this.use(new oAddress(node.address), {
  //       method: 'index_network',
  //       params: {},
  //     });
  //   }
  //   return {
  //     message: 'Network indexed!',
  //   };
  // }

  // _tool_elect_root(params: RunToolParams): Promise<void> {
  //   return Promise.resolve();
  // }
}
