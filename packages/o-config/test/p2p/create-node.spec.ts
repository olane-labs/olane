import { expect } from 'chai';
import { KadDHT } from '@libp2p/kad-dht';
import { defaultLibp2pConfig } from '../../src/config/config.js';
import { createNode } from '../../src/node/node.js';
import { tcp } from '@libp2p/tcp';
import { Libp2p } from 'libp2p';
import { CID } from 'multiformats';
import * as json from 'multiformats/codecs/json';
import { sha256 } from 'multiformats/hashes/sha2';

describe('createNode @TCP', () => {
  it('should create a node', async () => {
    const node = await createNode({
      ...defaultLibp2pConfig,
      listeners: ['/ip4/0.0.0.0/tcp/0'],
      transports: [tcp()],
    });
    expect(node).to.exist;
    await node.start();
    const transports = node.getMultiaddrs();
    expect(transports).to.exist;
    expect(transports.length).to.be.greaterThan(0);
    const hasTcp = transports.some((addr) => addr.toString().includes('tcp'));
    expect(hasTcp).to.be.true;
    await node.stop();
  });
});

describe('createNode @Websockets', () => {});

describe('P2P networking', () => {
  let node1: Libp2p;
  let node2: Libp2p;
  it('should start 2 nodes', async () => {
    node1 = await createNode({
      ...defaultLibp2pConfig,
      listeners: ['/ip4/0.0.0.0/tcp/0'],
      transports: [tcp()],
    });
    await node1.start();
    node2 = await createNode({
      ...defaultLibp2pConfig,
      listeners: ['/ip4/0.0.0.0/tcp/0'],
      transports: [tcp()],
    });
    await node2.start();
  });

  it('should dial a node', async () => {
    const dialer = await node1.dial(node2.getMultiaddrs());
    expect(dialer).to.exist;
  });

  it('should have 1 peer', async () => {
    const peers = await node1.getPeers();
    expect(peers.length).to.equal(1);
  });

  it('should advertise data on the network', async () => {
    const dht: KadDHT = node1.services.dht as KadDHT;
    const data = {
      address: 'o://1234567890',
    };
    const bytes = json.encode(data);
    const hash = await sha256.digest(bytes);
    const cid = CID.create(1, json.code, hash);
    await dht.provide(cid);
    const dht2: KadDHT = node2.services.dht as KadDHT;
    const providers: any = dht2.findProviders(cid);
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(
        () => reject(new Error('Content routing provide timeout')),
        5_000,
      ),
    );
    const { value, done } = await Promise.race([
      providers.next(),
      timeoutPromise,
    ]);
    expect(value).to.exist;
    expect(value.peer.toString()).to.equal(node1.peerId.toString());
  });

  it('should stop the nodes', async () => {
    await node1.stop();
    await node2.stop();
    expect(node1.status).to.equal('stopped');
    expect(node2.status).to.equal('stopped');
  });
});
