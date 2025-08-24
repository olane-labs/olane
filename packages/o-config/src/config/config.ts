import { noise } from '@chainsafe/libp2p-noise';
import { yamux } from '@chainsafe/libp2p-yamux';
import { ping } from '@libp2p/ping';
import { identify } from '@libp2p/identify';
import { Libp2pInit } from 'libp2p';
import { webSockets } from '@libp2p/websockets';
import { kadDHT } from '@libp2p/kad-dht';

export interface Libp2pConfig extends Libp2pInit {
  listeners?: string[];
  transports?: any[];
  connectionEncrypters?: any[];
  streamMuxers?: any[];
  services?: Record<string, any>;
}

export const defaultLibp2pConfig: Libp2pConfig = {
  listeners: ['/ip4/0.0.0.0/tcp/0/ws'],
  transports: [webSockets()],
  connectionEncrypters: [noise()],
  streamMuxers: [yamux()],
  services: {
    ping: ping(),
    identify: identify(),
    dht: kadDHT(),
  },
};
