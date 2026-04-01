import { oNodeConfig } from '@olane/o-node';
import { oLaneTool } from '@olane/o-lane';
import { oAddress, oRequest } from '@olane/o-core';
import type { ToolResult } from '@olane/o-tool';
import { circuitRelayServer } from '@libp2p/circuit-relay-v2';
import {
  ping,
  identify,
  Libp2pConfig,
} from '@olane/o-config';

export interface RelayNodeConfig extends oNodeConfig {
  /** Override relay reservation limits. */
  relay?: {
    maxReservations?: number;
    reservationClearInterval?: number;
    defaultDurationLimit?: number;
    defaultDataLimit?: bigint;
  };
}

/**
 * Local relay node — mirrors the private network relay tool
 * (`o-private-network/nodes/relay/src/relay.tool.ts`) but runs
 * on the local oLaneTool base instead of oPrivateNodeTool.
 *
 * Configures libp2p with circuit-relay-v2 server so other nodes
 * can relay connections through this node.
 */
export class RelayNode extends oLaneTool {
  private relayConfig: RelayNodeConfig['relay'];

  constructor(config: RelayNodeConfig) {
    super({
      ...config,
      address: config.address || new oAddress('o://relay'),
      description: 'Local relay node for the Olane OS',
      methods: {
        identify: {
          name: 'identify',
          description: 'Get relay identity and transport info',
          parameters: [],
          dependencies: [],
        },
      },
    });
    this.relayConfig = config.relay;
  }

  async handleProtocol(address: oAddress) {
    this.logger.debug(
      'Handling protocol with limited connection: ' + address.protocol,
    );
    await this.p2pNode.handle(address.protocol, this.handleStream.bind(this), {
      maxInboundStreams: Infinity,
      maxOutboundStreams: Infinity,
    });
  }

  async configure(): Promise<Libp2pConfig> {
    const config = await super.configure();
    config.services = {
      identify: identify({
        maxOutboundStreams: Infinity,
        maxInboundStreams: Infinity,
        runOnLimitedConnection: true,
      }),
      ping: ping({
        maxOutboundStreams: Infinity,
        maxInboundStreams: Infinity,
        runOnLimitedConnection: true,
      }),
      relay: circuitRelayServer({
        reservations: {
          maxReservations: this.relayConfig?.maxReservations ?? Infinity,
          reservationClearInterval:
            this.relayConfig?.reservationClearInterval ?? 60_000 * 5,
          defaultDurationLimit:
            this.relayConfig?.defaultDurationLimit ?? 60_000 * 15,
          defaultDataLimit:
            this.relayConfig?.defaultDataLimit ??
            BigInt(1024 * 1024 * 100_000),
        },
      }),
    };
    // Filter out in-memory listeners
    config.listeners = config.listeners?.filter(
      (l) => l.indexOf('/memory/') === -1,
    );
    config.connectionManager = {
      ...(config?.connectionManager || {}),
      maxConnections: 500,
      maxParallelDials: 100,
      maxDialQueueLength: 100,
      maxPeerAddrsToDial: 25,
    };
    return config;
  }

  async initialize() {
    await super.initialize();
    this.logger.debug(
      `Relay node initialized ${this.address.toString()}`,
    );
    this.logger.debug('Multiaddrs:', this.p2pNode.getMultiaddrs());
    this.logger.debug('Protocols:', this.p2pNode.getProtocols());
  }

  async _tool_identify(): Promise<ToolResult> {
    return {
      success: true,
      address: this.address.toString(),
      staticAddress: this.staticAddress?.toString(),
      transports: this.transports.map((t) => t.toMultiaddr().toString()),
    };
  }
}
