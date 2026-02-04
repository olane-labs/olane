import {
  Connection,
  Libp2p,
  Multiaddr,
  Peer,
  PeerStore,
} from '@olane/o-config';
import { oError, oErrorCodes, oObject } from '@olane/o-core';
import { oNodeAddress } from '../router/o-node.address.js';
import { oNodeTransport } from '../router/o-node.transport.js';

export class ConnectionUtils extends oObject {
  /**
   * Waits for a peer to be identified via the identify protocol.
   * Uses event-driven approach listening to peer store protocol updates.
   */
  private static async waitForPeerIdentify(
    p2pNode: Libp2p,
    remotePeerId: any,
    nodeProtocol: string,
  ): Promise<Peer> {
    const TIMEOUT_MS = 5000; // 5 seconds timeout

    // Helper to check if peer has sufficient protocols
    const checkPeerProtocols = async (): Promise<Peer | null> => {
      const peers = await p2pNode.peerStore.all();
      const remotePeer = peers.find((peer: any) => {
        return peer.id.toString() === remotePeerId.toString();
      });

      if (remotePeer) {
        const oProtocols =
          remotePeer.protocols.filter(
            (p: string) =>
              p.startsWith('/o/') && p.startsWith(nodeProtocol) === false,
          ) || [];
        console.log(
          'Found o-protocols for peer:',
          oProtocols,
          'with node address:',
          nodeProtocol,
        );
        if (oProtocols.length > 0) {
          return remotePeer;
        }
      }
      return null;
    };

    // Check if peer already has sufficient protocols
    const existingPeer = await checkPeerProtocols();
    if (existingPeer) {
      return existingPeer;
    }

    // Wait for peer store protocol update event
    return new Promise<Peer>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        // TypeScript doesn't have types for peerStore events, but they exist at runtime
        p2pNode.removeEventListener('peer:identify', protocolChangeHandler);
        reject(
          new Error(
            `Timeout waiting for peer ${remotePeerId.toString()} to be identified (waited ${TIMEOUT_MS}ms)`,
          ),
        );
      }, TIMEOUT_MS);

      const protocolChangeHandler = async (evt: any) => {
        const { peerId } = evt.detail;
        console.log('evt.detail:', evt.detail);

        // Check if this is the peer we're waiting for
        if (peerId?.toString() === remotePeerId.toString()) {
          const peer = await checkPeerProtocols();
          if (peer) {
            clearTimeout(timeoutId);
            // TypeScript doesn't have types for peerStore events, but they exist at runtime
            p2pNode.removeEventListener('peer:identify', protocolChangeHandler);
            resolve(peer);
          }
        }
      };

      // TypeScript doesn't have types for peerStore events, but they exist at runtime

      p2pNode.addEventListener('peer:identify', protocolChangeHandler);
    });
  }

  // TODO: improve this logic (poor implementation for now)
  public static async addressFromConnection(options: {
    currentNode: any;
    connection: Connection;
  }) {
    try {
      const { currentNode, connection } = options;
      const p2pNode: Libp2p = currentNode.p2pNode;

      // Wait for peer to be identified via the identify protocol
      // This uses an event-driven approach to detect when the peer store is updated
      const remotePeer: Peer = await this.waitForPeerIdentify(
        p2pNode,
        connection.remotePeer,
        currentNode.address.protocol,
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
        console.log('Remote peer protocols:', remotePeer.protocols);
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
