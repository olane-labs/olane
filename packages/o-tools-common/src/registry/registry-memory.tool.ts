import { RegistryTool } from './registry.tool.js';
import { oRegistrationParams } from '@olane/o-protocol';
import { oRequest } from '@olane/o-core';
import { oRegistrySearchParams } from './interfaces/search.interface.js';

export class RegistryMemoryTool extends RegistryTool {
  async _tool_commit(request: oRequest): Promise<any> {
    const params = request.params as oRegistrationParams;
    this.logger.debug(
      'Committing registration: ',
      params?.address,
      'With num protocols: ',
      params?.protocols?.length,
    );
    // TODO: Implement TTL
    this.registry.set(params.peerId, params);
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
    return result;
  }
}
