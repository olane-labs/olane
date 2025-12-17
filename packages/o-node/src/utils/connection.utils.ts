import { Connection } from '@olane/o-config';
import { oObject } from '@olane/o-core';
import { oNodeAddress } from '../router/o-node.address.js';

export class ConnectionUtils extends oObject {
  public static async addressFromConnection(options: {
    currentNode: any;
    connection: Connection;
  }) {
    const { currentNode, connection } = options;
    const p2pNode = currentNode.p2pNode;

    // Extract the actual olane address from the peer store
    const peers = await p2pNode.peerStore.all();

    const remotePeer = peers.find(
      (peer: any) => peer.id.toString() === connection.remotePeer.toString(),
    );
    if (!remotePeer) {
      console.log('Failed to find peer:', remotePeer);

      throw new Error(
        `Failed to extract remote address, peer ${connection.remotePeer.toString()} not found in peer store.`,
      );
    }

    // Get origin address for comparison
    const originAddress = currentNode.address?.value;
    if (!originAddress) {
      throw new Error('Origin address is not configured');
    }

    const originProtocol = originAddress.toString();

    const oProtocol = remotePeer.protocols.find(
      (p: string) =>
        p.startsWith('/o/') && p.startsWith(originProtocol) === false, // avoid matching current protocol addresses
    );
    if (!oProtocol) {
      throw new Error(
        'Failed to extract remote address, could not find o-protocol in peer protocols.',
      );
    }

    return oNodeAddress.fromProtocol(oProtocol);
  }
}
