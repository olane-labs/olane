import { oAddress } from './o-address';

import { oObject } from '../core/o-object.js';

export abstract class oRouter extends oObject {
  abstract translate(addressWithLeaderTransports: oAddress): Promise<{
    nextHopAddress: oAddress;
    targetAddress: oAddress;
  }>;

  abstract isInternal(addressWithLeaderTransports: oAddress): boolean;
}
