import { NodeType, oAddress, oRequest } from '@olane/o-core';
import { oToolBase } from '@olane/o-tool';
import { oSearchResolver } from '@olane/o-node';
import { oGatewayResolver } from '@olane/o-gateway-olane';
import { Libp2pConfig, PeerId } from '@olane/o-config';
import { START_METHOD } from './methods/start.method.js';
import { RegistryMemoryTool } from './registry/registry-memory.tool.js';

/**
 * withLeader mixin - adds leader node capabilities to any tool base class
 * This mixin pattern allows leader functionality to be composed with different
 * base classes (e.g., lane-based tools, or other tool implementations)
 *
 * Leader nodes serve as network routers and provide:
 * - Registry management for network nodes
 * - Search and gateway routing resolution
 * - Network join request handling
 * - Unrestricted peer dialing capabilities
 *
 * @example
 * ```typescript
 * // Apply to lane tool
 * export class oLeaderNode extends withLeader(oLaneTool) {}
 *
 * // Future: Apply to other tool bases
 * export class CustomLeaderNode extends withLeader(CustomTool) {}
 * ```
 */
export function withLeader<T extends new (...args: any[]) => oToolBase>(
  Base: T,
): T {
  return class extends Base {
    constructor(...args: any[]) {
      const config = args[0] || {};
      // Override config with leader-specific settings
      const leaderConfig = {
        ...config,
        address: oAddress.leader(),
        type: NodeType.LEADER,
        description:
          config.description ||
          'Leader node of the graph network which serves as the router for requests',
        methods: {
          ...config.methods,
          start: START_METHOD,
        },
      };
      super(leaderConfig, ...args.slice(1));
    }

    async configure(): Promise<Libp2pConfig> {
      // @ts-ignore
      const config = await super.configure();
      config.connectionGater = {
        ...config.connectionGater,
        denyDialPeer: (peerId: PeerId) => {
          // as a leader, we can dial anything
          return false;
        },
      };
      return config;
    }

    async initialize(): Promise<void> {
      await super.initialize();
      (this as any).router.addResolver(new oSearchResolver(this.address));
      (this as any).router.addResolver(new oGatewayResolver(this.address));
      const registryTool = new RegistryMemoryTool({
        name: 'registry',
        parent: this.address as any,
        leader: this.address as any,
        network: {
          listeners: [],
        },
        joinToken: (this as any).config.joinToken,
      });
      (registryTool as any).onInitFinished(() => {
        this.addChildNode(registryTool);
      });
      await registryTool.start();
    }

    /**
     * Hook for validating network join requests
     * Override this method to implement custom validation logic
     * @param request - The join request to validate
     * @returns Promise resolving to validation result
     */
    async validateJoinRequest(request: oRequest): Promise<any> {
      return true;
    }

    /**
     * Handles network join requests from other nodes
     * @param request - Request containing caller, parent, and transports
     * @returns Success message
     */
    async _tool_join_network(request: oRequest): Promise<any> {
      const { caller, parent, transports }: any = request.params;
      this.logger.debug('Joining network: ' + caller);

      if (!caller || !parent || !transports) {
        throw new Error('Invalid parameters provided, cannot join network');
      }

      await this.validateJoinRequest(request);

      await (this as any).use(new oAddress(parent), {
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

    /**
     * Placeholder for saving network execution plans
     * @param request - Request containing plan to save
     */
    async _tool_save_plan(request: oRequest): Promise<any> {
      const { plan } = request.params;
      this.logger.debug('Adding plan to network: ' + plan);

      if (!(this as any).config.systemName) {
        this.logger.warn('No network name provided, cannot update config');
        return;
      }
    }
  } as T;
}
