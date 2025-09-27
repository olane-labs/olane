import { oObject } from '@olane/o-core';

import { oLaneManagerConfig } from './interfaces/o-lane.manager-config.js';
import { oLane } from '../o-lane.js';

export class oLaneManager extends oObject {
  public lanes: oLane[] = [];
  constructor(readonly config: oLaneManagerConfig) {
    super();
  }
}
