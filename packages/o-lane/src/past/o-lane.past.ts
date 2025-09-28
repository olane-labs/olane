import { oAddress, RestrictedAddresses } from '@olane/o-core';
import { oLane } from '../o-lane.js';
import { oLaneResult } from '../interfaces/o-lane.result.js';

export class oLanePast extends oLane {
  async pastLanes(): Promise<any> {
    this.logger.debug('Searching for plans...');
    const cid = await this.toCID();
    const response = await this.node.use(
      new oAddress(RestrictedAddresses.LANE),
      {
        method: 'get',
        params: {
          key: cid.toString(),
        },
      },
    );
    this.logger.debug('Past lanes response: ', response);

    const result = response.result;
    const json =
      typeof (result as any).data === 'string'
        ? JSON.parse((result as any).data)
        : (result as any).data;
    return json;
  }

  async run(): Promise<oLaneResult> {
    return await this.pastLanes();
  }
}
