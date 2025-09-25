import { Libp2p, Multiaddr } from '@olane/o-config';
import { oAddress } from '../o-address.js';
import { Logger } from '../index.js';
import { CID } from 'multiformats';

export class NetworkUtils {
  public static async findProviders(
    p2pNode: Libp2p,
    cid: CID,
  ): Promise<{
    transports: Multiaddr[];
    staticAddress: string;
    absoluteAddress: string;
  }> {
    const logger = new Logger('NetworkUtils');
    let peer = null;
    let multiaddrs = [];
    for await (const event of (p2pNode.services as any).dht.findProviders(
      cid,
    )) {
      // Look for events that contain actual provider information
      if (event.name === 'PEER_RESPONSE') {
        if (event.providers?.length === 0) {
          logger.debug('No providers found');
          break;
        }
        peer = event.providers[0].id;
        multiaddrs = event.providers[0].multiaddrs;
        break;
      }
      if (event.name === 'PATH_ENDED' || event.name === 'QUERY_ERROR') {
        break;
      }
    }
    return {
      transports: multiaddrs,
      staticAddress: '',
      absoluteAddress: '',
    };
  }

  public static async findNode(
    p2pNode: Libp2p,
    address: oAddress,
  ): Promise<{
    transports: Multiaddr[];
    staticAddress: string;
    absoluteAddress: string;
  }> {
    const cid = await address.toCID();
    return await Promise.race([
      new Promise<{
        transports: Multiaddr[];
        staticAddress: string;
        absoluteAddress: string;
      }>((_, reject) =>
        setTimeout(
          () => reject(new Error('Content routing provide timeout')),
          5_000,
        ),
      ),
      this.findProviders(p2pNode, cid),
    ]);
  }
}
