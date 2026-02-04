import { RegistryTool } from './registry.tool.js';
import { oRegistrationParams } from '@olane/o-protocol';
import { oRequest } from '@olane/o-core';
import { oRegistrySearchParams } from './interfaces/search.interface.js';
import { oNodeAddress } from '@olane/o-node';

export class RegistryMemoryTool extends RegistryTool {
  async _tool_commit(request: oRequest): Promise<any> {
    const params = request.params as oRegistrationParams;
    this.logger.debug(
      'Committing registration. Address: ',
      params?.address,
      'Static Address: ',
      params?.staticAddress,
      'With num protocols: ',
      params?.protocols?.length,
    );
    // TODO: Implement TTL
    this.registry.set(params.peerId, {
      ...params,
      registeredAt: params.registeredAt || Date.now(),
    });
    if (params.protocols) {
      params.protocols.forEach((protocol) => {
        this.protocolMapping.set(protocol, [
          ...(this.protocolMapping.get(protocol) || []),
          params.peerId,
        ]);
      });
    }
    return {
      success: true,
    };
  }

  async _tool_find_all(request: oRequest): Promise<any> {
    return Array.from(this.registry.values());
  }

  async _tool_search(request: oRequest): Promise<any> {
    const params = request.params as oRegistrySearchParams;
    // iterate over the registry and find all the nodes that match the protocols
    let result: oRegistrationParams[] = [];
    if (params.protocols) {
      result = result.concat(
        Array.from(this.registry.values()).filter((node) => {
          return params.protocols?.every((protocol) =>
            node.protocols.includes(protocol),
          );
        }),
      );
    }
    if (params.address) {
      result = result.concat(
        Array.from(this.registry.values()).filter((node) => {
          return node.address === params.address;
        }),
      );
    }
    if (params.staticAddress) {
      result = result.concat(
        Array.from(this.registry.values()).filter((node) => {
          return node.staticAddress === params.staticAddress;
        }),
      );
    }

    return result.sort(
      (a, b) => (Number(b.registeredAt) || 0) - (Number(a.registeredAt) || 0),
    );
  }

  async _tool_remove(request: oRequest): Promise<any> {
    const params = request.params as oRegistrationParams;
    this.registry.delete(params.peerId);
    return {
      success: true,
    };
  }

  async _tool_find_available_parent(request: oRequest): Promise<any> {
    const parentAddress = request.params?.parentAddress as string;

    // Search registry for a node with matching static address
    const parentNode = Array.from(this.registry.values()).find((node) => {
      return (
        node.staticAddress === parentAddress || node.address === parentAddress
      );
    });

    if (!parentNode) {
      this.logger.debug(`Parent not found in registry: ${parentAddress}`);
      return {
        parentAddress: null,
        parentTransports: null,
      };
    }

    // let's run a ping using the o-protocol
    this.logger.debug(`Pinging parent node at address: ${parentAddress}`);
    await this.use(new oNodeAddress(parentNode.address), {
      method: 'ping',
      params: {},
    });

    this.logger.debug(
      `Found parent in registry: ${parentAddress} with ${parentNode.transports?.length || 0} transports`,
    );

    return {
      parentAddress: parentNode.address,
      parentTransports: parentNode.transports || [],
    };
  }
}
