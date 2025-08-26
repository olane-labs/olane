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
    ping: ping(),
    identify: identify(),
    dht: kadDHT({
      peerInfoMapper: removePublicAddressesMapper,
      clientMode: false, // DO NOT CHANGE THIS, it will break the network
      kBucketSize: 20, // peer size
    }),
  },
};
