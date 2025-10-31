import { NodeType, oAddress, oRequest } from '@olane/o-core';
import { START_METHOD } from './methods/start.method.js';
import { oLaneTool } from '@olane/o-lane';
import { oNodeAddress, oNodeToolConfig, oSearchResolver } from '@olane/o-node';
import { RegistryMemoryTool } from './registry/registry-memory.tool.js';
import { oGatewayResolver } from '@olane/o-gateway-olane';
import { Libp2pConfig } from '@olane/o-config';

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

  async configure(): Promise<Libp2pConfig> {
    const config = await super.configure();
    config.connectionGater = {
      ...config.connectionGater,
      denyDialPeer: (peerId) => {
        // as a leader, we can dial anything
        return false;
      },
    };
    return config;
  }

  async initialize(): Promise<void> {
    await super.initialize();
    this.router.addResolver(new oSearchResolver(this.address));
    this.router.addResolver(new oGatewayResolver(this.address));
    const registryTool = new RegistryMemoryTool({
      name: 'registry',
      parent: this.address as any,
      leader: this.address as any,
      network: {
        listeners: [],
      },
      joinToken: this.config.joinToken,
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
}
