import { Libp2p, Multiaddr } from '@olane/o-config';
import { oAddress } from '../o-address.js';

export class NetworkUtils {
  public static async findNode(
    p2pNode: Libp2p,
    address: oAddress,
  ): Promise<{
    transports: Multiaddr[];
    staticAddress: string;
    absoluteAddress: string;
  }> {
    const cid = await address.toCID();
    const providers = await (p2pNode.services as any).dht.findProviders(cid);
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(
        () => reject(new Error('Content routing provide timeout')),
        5_000,
      ),
    );

    try {
      const { value, done } = await Promise.race([
        providers.next(),
        timeoutPromise,
      ]);
      /*
        value: {
          peer: PeerId(12D3KooWB8Jm24WQmRQgggUUfxVKRGULxYMjSuy1aqV3DYKrEbod),
          path: { index: 0, queued: 0, running: 1, total: 1 },
          name: 'DIAL_PEER',
          type: 7
        }
        */

      if (!value) {
        return { transports: [], staticAddress: '', absoluteAddress: '' };
      }
      // let's translate the peerId to a multiaddr
      const result = await p2pNode.peerRouting.findPeer(value.peer);
      return {
        transports: result.multiaddrs,
        staticAddress: '',
        absoluteAddress: '',
      };
    } catch (timeoutError: any) {
      if (timeoutError.message === 'Content routing provide timeout') {
        return { transports: [], staticAddress: '', absoluteAddress: '' };
      }
      throw timeoutError;
    }
  }
}
