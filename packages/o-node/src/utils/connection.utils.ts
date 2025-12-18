import { Connection, Libp2p, Multiaddr, Peer } from '@olane/o-config';
import { oError, oErrorCodes, oObject } from '@olane/o-core';
import { oNodeAddress } from '../router/o-node.address.js';
import { oNodeTransport } from '../router/o-node.transport.js';

export class ConnectionUtils extends oObject {
  public static async addressFromConnection(options: {
    currentNode: any;
    connection: Connection;
  }) {
    try {
      console.log('[ConnectionUtils] addressFromConnection');
      const { currentNode, connection } = options;
      const p2pNode: Libp2p = currentNode.p2pNode;

      // Extract the actual olane address from the peer store
      const peers = await p2pNode.peerStore.all();

      const remotePeer: Peer | undefined = peers.find(
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

      const address = oNodeAddress.fromProtocol(oProtocol);
      if (
        remotePeer?.addresses?.length === 0 &&
        address?.value === currentNode?.leader?.value
      ) {
        // leader - use known address
        return currentNode.leader;
      }
      if (
        remotePeer?.addresses?.length === 0 &&
        address?.value === currentNode?.parent?.value
      ) {
        // leader - use known address
        return currentNode.parent;
      }
      address.setTransports(
        remotePeer.addresses.map(({ multiaddr }) => {
          return new oNodeTransport(multiaddr);
        }),
      );
      return address;
    } catch (e) {
      console.error('Failed to get address from connection:', e);
      throw new oError(
        oErrorCodes.UNKNOWN,
        'Failed to get address from connection',
      );
    }
  }
}
