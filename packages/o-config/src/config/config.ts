import { noise } from '@chainsafe/libp2p-noise';
import { yamux } from '@chainsafe/libp2p-yamux';
import { ping } from '@libp2p/ping';
import { identify } from '@libp2p/identify';
import { Libp2pInit } from 'libp2p';
import { gossipsub } from '@chainsafe/libp2p-gossipsub';
import { pubsubPeerDiscovery } from '@libp2p/pubsub-peer-discovery';
import { webTransport } from '@libp2p/webtransport';
import { webSockets } from '@libp2p/websockets';
import { webRTC } from '@libp2p/webrtc';
import { circuitRelayTransport } from '@libp2p/circuit-relay-v2';

export interface Libp2pConfig extends Libp2pInit {
  listeners?: string[];
  transports?: any[];
  connectionEncrypters?: any[];
  streamMuxers?: any[];
  services?: Record<string, any>;
}

export const defaultLibp2pConfig: Libp2pConfig = {
  listeners: ['/ip4/0.0.0.0/tcp/0/ws'],
  transports: [webTransport(), webSockets(), webRTC(), circuitRelayTransport()],
  connectionEncrypters: [noise()],
  streamMuxers: [yamux()],
  services: {
    ping: ping(),
    identify: identify(),
    pubsub: gossipsub({
      // Enable message signing for security
      globalSignaturePolicy: 'StrictSign',
    }),
  },
  peerDiscovery: [pubsubPeerDiscovery()],
};
