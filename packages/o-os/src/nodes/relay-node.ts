import { oNodeConfig } from '@olane/o-node';
import { oLaneTool } from '@olane/o-lane';
import { oAddress, oRequest } from '@olane/o-core';
import type { ToolResult } from '@olane/o-tool';

export interface RelayNodeConfig extends oNodeConfig {
  /** The remote leader this relay connects to. */
  remoteLeaderAddress: string;
}

/**
 * Relay node — forwards traffic between local and remote leaders.
 * Uses NodeType.NODE with relay behavior: connects to both local leader
 * and a remote leader, routing requests between them.
 */
export class RelayNode extends oLaneTool {
  private remoteLeaderAddress: string;

  constructor(config: RelayNodeConfig) {
    super({
      ...config,
      description: `Relay node bridging to ${config.remoteLeaderAddress}`,
      methods: {
        get_relay_info: {
          name: 'get_relay_info',
          description: 'Get relay connection info',
          parameters: [],
          dependencies: [],
        },
        relay_request: {
          name: 'relay_request',
          description: 'Forward a request to the remote leader network',
          parameters: [
            { name: 'address', type: 'string', required: true, description: 'Target address' },
            { name: 'method', type: 'string', required: true, description: 'Method name' },
            { name: 'params', type: 'object', required: false, description: 'Method parameters' },
          ],
          dependencies: [],
        },
      },
    });
    this.remoteLeaderAddress = config.remoteLeaderAddress;
  }

  async start(): Promise<void> {
    await super.start();
    this.logger.debug(
      `Relay node started: local=${this.leader?.toString()} remote=${this.remoteLeaderAddress}`,
    );
  }

  async _tool_get_relay_info(_request: oRequest): Promise<ToolResult> {
    return {
      success: true,
      localLeader: this.leader?.toString() || null,
      remoteLeader: this.remoteLeaderAddress,
    };
  }

  async _tool_relay_request(request: oRequest): Promise<ToolResult> {
    const { address, method, params } = request.params as any;
    const remoteAddr = new oAddress(this.remoteLeaderAddress);

    const result = await this.use(remoteAddr, {
      method: 'route',
      params: {
        target: address,
        method,
        params: params || {},
      },
    });

    return result.result || { success: true, data: result };
  }

  getRemoteLeaderAddress(): string {
    return this.remoteLeaderAddress;
  }
}
