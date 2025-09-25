// import { Libp2p, multiaddr, Multiaddr } from '@olane/o-config';
// import { oAddress } from '../o-address.js';
// import { oAddressResolver } from '../o-address-resolver.js';
// import { NetworkUtils } from '../../utils/network.utils.js';
// import { TransportType } from '../../transports/interfaces/transport-type.enum.js';
// import { oTransport } from '../../transports/o-transport.js';
// import { oNodeTransport } from '../../node/router/o-node.transport.js';

// export class SearchResolver extends oAddressResolver {
//   constructor(
//     protected readonly address: oAddress,
//     protected readonly p2pNode: Libp2p,
//   ) {
//     super(address);
//   }

//   get supportedTransports(): TransportType[] {
//     return [TransportType.LIBP2P];
//   }

//   async searchPeerStore(address: oAddress): Promise<oNodeTransport[]> {
//     const peers = await this.p2pNode.peerStore.all();
//     const peer = peers.find((p) =>
//       p.protocols.some((p) => p === address.protocol),
//     );
//     return (
//       peer?.addresses.map(
//         (a: any) =>
//           new oNodeTransport(
//             multiaddr(a.multiaddr + '/p2p/' + peer.id.toString()),
//           ),
//       ) || []
//     );
//   }

//   // when we use the network to find the next hop, we need to make sure we are just searching for child addresses
//   async searchNetwork(address: oAddress): Promise<oNodeTransport[]> {
//     try {
//       this.logger.debug('Finding node for address: ', address.toString());
//       const { transports } = await NetworkUtils.findNode(this.p2pNode, address);
//       this.logger.debug('Found node for address: ', transports);
//       return transports.map((t) => new oNodeTransport(t));
//     } catch (e) {
//       this.logger.warn('No providers found', e);
//       return [];
//     }
//   }

//   async resolve(address: oAddress): Promise<oAddress> {
//     // return this.findNextHop(address);
//     throw new Error('Not implemented');
//   }
// }
