import { oToolConfig } from '@olane/o-tool';
import { oAddress } from '@olane/o-core';
import { oVirtualTool } from '@olane/o-tool';
import { PlanResolver } from './resolvers/index.js';

export function oPlanStorageTool<
  T extends new (...args: any[]) => oVirtualTool,
>(Base: T): T & (new (...args: any[]) => any) {
  return class extends Base {
    constructor(...args: any[]) {
      super(...args);
      const config = args[0] as oToolConfig & { address: oAddress };
    }

    // async _tool_use(request: oRequest): Promise<ToolResult> {
    //   this.logger.debug('Re-running plan...', request.params?.key);
    //   const { key } = request.params as any;
    //   // let's get the plan
    //   const { receiver, inputs, method } = (await this._tool_next_step(
    //     new oRequest({
    //       ...request,
    //       params: {
    //         ...request.params,
    //         key: key,
    //       },
    //     }),
    //   )) as PlanResultInterface;

    //   if (!receiver) {
    //     throw new Error('Plan is not valid');
    //   }

    //   this.logger.debug('Using resulting nextup plan...', receiver);

    //   const { result } = await this.use(new oAddress(receiver), {
    //     method: method,
    //     params: inputs,
    //   });

    //   return result;
    // }

    async initialize(): Promise<void> {
      await super.initialize();
      const resolver = new PlanResolver(this.address, this.p2pNode);
      this.addressResolution.addResolver(resolver);
    }
  };
}
