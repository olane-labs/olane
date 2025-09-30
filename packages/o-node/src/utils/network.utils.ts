import { Libp2p, Multiaddr } from '@olane/o-config';
import { oObject } from '@olane/o-core';
import { CID } from 'multiformats';
import { oNodeAddress } from '../router/o-node.address.js';

export class NetworkUtils extends oObject {
  public static async findProviders(
    p2pNode: Libp2p,
    cid: CID,
  ): Promise<{
    transports: Multiaddr[];
    staticAddress: string;
    absoluteAddress: string;
  }> {
    let peer = null;
    let multiaddrs = [];
    for await (const event of (p2pNode.services as any).dht.findProviders(
      cid,
    )) {
      // Look for events that contain actual provider information
      if (event.name === 'PEER_RESPONSE') {
        if (event.providers?.length === 0) {
          NetworkUtils.log('No providers found');
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
    address: oNodeAddress,
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

  public static async advertiseValueToNetwork(value: CID, p2pNode: Libp2p) {
    NetworkUtils.log('Advertising value to network: ', value.toString());

    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(
        () => reject(new Error('Advertise Content routing provide timeout')),
        5000,
      ),
    );
    await Promise.race([
      NetworkUtils.dhtProvide(value, p2pNode),
      timeoutPromise,
    ]);
    NetworkUtils.log('Advertise complete!');
  }

  public static async dhtProvide(value: CID, p2pNode: Libp2p) {
    for await (const event of (p2pNode.services as any).dht.provide(value)) {
      if (
        event.name === 'PATH_ENDED' ||
        event.name === 'QUERY_ERROR' ||
        event.name === 'PEER_RESPONSE'
      ) {
        break;
      }
    }
  }

  public static async advertiseToNetwork(
    address: oNodeAddress,
    staticAddress: oNodeAddress,
    p2pNode: Libp2p,
  ) {
    NetworkUtils.log(
      'Advertising to network our static and absolute addresses...',
    );
    // advertise the absolute address to the network with timeout
    const add = new oNodeAddress(address.toString());
    const absoluteAddressCid = await add.toCID();
    // Add timeout to prevent hanging
    NetworkUtils.advertiseValueToNetwork(absoluteAddressCid, p2pNode)
      .then((d) => {
        NetworkUtils.log(
          `${address.toString()} - Successfully advertised absolute address`,
        );
      })
      .catch((error: any) => {
        NetworkUtils.log(
          `${address.toString()} - Failed to advertise absolute address (this is normal for isolated nodes):`,
          error.message,
        );
      });

    // advertise the static address to the network with timeout
    const staticAdd = new oNodeAddress(staticAddress.toString());
    const staticAddressCid = await staticAdd.toCID();

    // Add timeout to prevent hanging
    NetworkUtils.advertiseValueToNetwork(staticAddressCid, p2pNode).catch(
      (error: any) => {
        NetworkUtils.log(
          'Failed to advertise absolute address (this is normal for isolated nodes):',
          error.message,
        );
      },
    );
  }
}
