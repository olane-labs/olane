import { Connection, Libp2p, Multiaddr, Peer } from '@olane/o-config';
import { oError, oErrorCodes, oObject } from '@olane/o-core';
import { oNodeAddress } from '../router/o-node.address.js';
import { oNodeTransport } from '../router/o-node.transport.js';

export class ConnectionUtils extends oObject {
  /**
   * Waits for a peer to appear in the peer store with sufficient protocol information.
   * Implements retry logic to handle race conditions where peer store is not immediately populated.
   */
  private static async waitForPeerInStore(
    p2pNode: Libp2p,
    remotePeerId: any,
  ): Promise<Peer> {
    const MAX_RETRIES = 100; // 5 seconds total (100 * 50ms)
    const RETRY_DELAY_MS = 50;
    const MIN_PROTOCOLS = 2;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      const peers = await p2pNode.peerStore.all();
      const remotePeer = peers.find((peer: any) => {
        return peer.id.toString() === remotePeerId.toString();
      });

      // Check if peer exists and has sufficient protocol information
      if (remotePeer && remotePeer.protocols.length > MIN_PROTOCOLS) {
        return remotePeer;
      }

      // Wait before next retry
      if (attempt < MAX_RETRIES - 1) {
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
      }
    }

    // Timeout exceeded
    throw new Error(
      `Timeout waiting for peer ${remotePeerId.toString()} to appear in peer store with sufficient protocols (waited ${MAX_RETRIES * RETRY_DELAY_MS}ms)`,
    );
  }

  // TODO: improve this logic (poor implementation for now)
  public static async addressFromConnection(options: {
    currentNode: any;
    connection: Connection;
  }) {
    try {
      const { currentNode, connection } = options;
      const p2pNode: Libp2p = currentNode.p2pNode;

      // Wait for peer to appear in peer store with sufficient protocol information
      // This handles race conditions where peer store is not immediately populated
      const remotePeer: Peer = await this.waitForPeerInStore(
        p2pNode,
        connection.remotePeer,
      );

      // Get origin address for comparison
      const originAddress = currentNode.address?.value;
      if (!originAddress) {
        throw new Error('Origin address is not configured');
      }

      const oProtocol = remotePeer.protocols.find(
        (p: string) =>
          p.startsWith('/o/') &&
          p.includes(currentNode?.address?.protocol) === false, // avoid matching current protocol addresses
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
