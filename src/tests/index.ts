import { oAddress } from '../core/o-address';
import { oHostNode } from '../node-host/host.node';

(async () => {
  // setup the root leader node

  // setup the host node
  const node = new oHostNode({
    address: new oAddress('o://node'),
    parent: null,
    leader: null,
  });

  await node.start();
  console.log('Node started', node.p2pNode.getMultiaddrs());

  await new Promise((resolve) => setTimeout(resolve, 5_000));

  await node.stop();
})();
