import { noise } from '@chainsafe/libp2p-noise';
import { yamux } from '@chainsafe/libp2p-yamux';
import { ping } from '@libp2p/ping';
import { identify } from '@libp2p/identify';
import { Libp2pInit } from 'libp2p';
import { webTransport } from '@libp2p/webtransport';
import { webSockets } from '@libp2p/websockets';
import { tcp } from '@libp2p/tcp';
import { kadDHT, removePublicAddressesMapper } from '@libp2p/kad-dht';
import { memory } from '@libp2p/memory';

export interface Libp2pConfig extends Libp2pInit {
  listeners?: string[];
  transports?: any[];
  connectionEncrypters?: any[];
  streamMuxers?: any[];
  services?: Record<string, any>;
}

export const defaultLibp2pConfig: Libp2pConfig = {
  listeners: ['/ip4/0.0.0.0/tcp/0', '/ip6/::/tcp/0'],
  transports: [webTransport(), webSockets(), tcp(), memory()],
  connectionEncrypters: [noise()],
  streamMuxers: [yamux()],
  services: {
    ping: ping({
      maxInboundStreams: 1_000,
      maxOutboundStreams: 1_000,
    }),
    identify: identify(),
    dht: kadDHT({
      peerInfoMapper: removePublicAddressesMapper,
      clientMode: false, // DO NOT CHANGE THIS, it will break the network
      kBucketSize: 20, // peer size
    }),
  },
  connectionManager: {
    // UPDATED: Changed from Infinity to sensible limits to prevent resource exhaustion
    // These limits help prevent CONNECTION_FAILED errors when many tools start simultaneously
    // or when operating through circuit relays with their own connection limits
    maxConnections: 200, // Allow up to 200 concurrent connections (was Infinity)
    maxParallelDials: 10, // Limit concurrent dial attempts to prevent flooding (was Infinity)
    maxDialQueueLength: 100, // Queue up to 100 pending dials (was Infinity)
    maxPeerAddrsToDial: 25, // Try up to 25 different addresses per peer (was Infinity)
    inboundConnectionThreshold: Infinity, // Keep unlimited inbound (typically less of an issue)
  },
};
