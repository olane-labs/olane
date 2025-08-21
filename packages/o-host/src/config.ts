import { tcp } from '@libp2p/tcp';
import { noise } from '@chainsafe/libp2p-noise';
import { yamux } from '@chainsafe/libp2p-yamux';
import { ping } from '@libp2p/ping';
import { identify } from '@libp2p/identify';
import { Libp2pInit } from 'libp2p';
import { gossipsub } from '@chainsafe/libp2p-gossipsub';
import { kadDHT, removePublicAddressesMapper } from '@libp2p/kad-dht';
import { pubsubPeerDiscovery } from '@libp2p/pubsub-peer-discovery';
import { webTransport } from '@libp2p/webtransport';
import { webSockets } from '@libp2p/websockets';
import { webRTC } from '@libp2p/webrtc';
import {
  circuitRelayServer,
  circuitRelayTransport,
} from '@libp2p/circuit-relay-v2';
import { Libp2pConfig } from '@olane/o-config';

export const hostLibp2pConfig: Libp2pConfig = {
  listeners: [
    '/ip4/0.0.0.0/tcp/0', // Plain TCP
    '/ip4/0.0.0.0/tcp/0/ws', // WebSockets over TCP
    '/ip6/::/tcp/0', // IPv6 TCP
    '/ip6/::/tcp/0/ws', // IPv6 WebSockets
  ],
  transports: [tcp(), webTransport(), webSockets(), webRTC()],
  connectionEncrypters: [noise()],
  streamMuxers: [yamux()],
  services: {
    ping: ping(),
    identify: identify(),
    pubsub: gossipsub({
      // Enable message signing for security
      globalSignaturePolicy: 'StrictSign',
    }),
    dht: kadDHT({
      peerInfoMapper: removePublicAddressesMapper,
      clientMode: false, // DO NOT CHANGE THIS, it will break the network
      kBucketSize: 20, // peer size
    }),
  },
  peerDiscovery: [pubsubPeerDiscovery()],
};

export const hostRelayLibp2pConfig: Libp2pConfig = {
  listeners: [
    '/ip4/0.0.0.0/tcp/0', // Plain TCP
    '/ip4/0.0.0.0/tcp/0/ws', // WebSockets over TCP
    '/ip6/::/tcp/0', // IPv6 TCP
    '/ip6/::/tcp/0/ws', // IPv6 WebSockets
  ],
  transports: [
    tcp(),
    webTransport(),
    webSockets(),
    webRTC(),
    circuitRelayServer(),
  ],
  connectionEncrypters: [noise()],
  streamMuxers: [yamux()],
  services: {
    ping: ping(),
    identify: identify(),
    pubsub: gossipsub({
      // Enable message signing for security
      globalSignaturePolicy: 'StrictSign',
    }),
    dht: kadDHT({
      peerInfoMapper: removePublicAddressesMapper,
      clientMode: false, // DO NOT CHANGE THIS, it will break the network
      kBucketSize: 20, // peer size
    }),
  },
  peerDiscovery: [pubsubPeerDiscovery()],
};
