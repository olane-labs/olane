import { oAddress, oParameter } from '@olane/o-core';
import type { oToolBase } from '../o-tool.base';
import { oProtocolMethods } from '@olane/o-protocol';

export class MethodUtils {
  static getMethod(address: oAddress): string {
    return address.protocol.split('/').pop() || '';
  }

  static findMissingParams(
    tool: oToolBase,
    methodName: string,
    params: any,
  ): oParameter[] {
    const method = tool.methods[methodName];
    const protectedMethods = Object.values(oProtocolMethods);
    if (protectedMethods.includes(methodName as oProtocolMethods)) {
      return [];
    }
    if (!method) {
      tool.logger.warn(
        'No parameter configuration found for method. This is expected for some methods, but may impact AI performance around improvisation.',
        methodName,
      );
      return [];
    }
    const requiredParams: oParameter[] = method.parameters as oParameter[];
    if (!requiredParams || !requiredParams.filter) {
      tool.logger.error(
        '[Provider] No handshake parameters found for method: ',
        methodName,
      );
      return [];
    }
    const missingParams: oParameter[] = requiredParams
      .filter((p) => !params[p.name])
      .filter((p) => p.required === undefined || p.required === true);
    return missingParams;
  }
}
