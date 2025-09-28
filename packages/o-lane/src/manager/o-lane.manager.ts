import { oObject } from '@olane/o-core';

import { oLaneManagerConfig } from './interfaces/o-lane.manager-config.js';
import { oLane } from '../o-lane.js';
import { oLaneConfig } from '../interfaces/o-lane.config.js';
import { oLaneStatus } from '../enum/o-lane.status-enum.js';

export class oLaneManager extends oObject {
  public lanes: oLane[] = [];
  constructor(readonly config?: oLaneManagerConfig) {
    super();
  }

  get maxLanes(): number {
    return this.config?.maxLanes || 100;
  }

  async createLane(config: oLaneConfig): Promise<oLane> {
    const lane = new oLane(config);
    this.lanes.push(lane);
    if (this.activeLanes.length > this.maxLanes) {
      throw new Error('Max lanes reached');
    }
    if (this.staleLanes.length > this.maxLanes) {
      this.cleanLanes();
    }
    return lane;
  }

  cleanLanes(): void {
    this.logger.info(`Cleaning ${this.staleLanes.length} stale lanes`);
    this.lanes = this.lanes.filter((l) => l.status < oLaneStatus.COMPLETED);
  }

  cancelLane(lane: oLane): void {
    this.lanes = this.lanes.filter((l) => {
      if (l.id === lane.id) {
        lane.cancel();
      }
      return l.id !== lane.id;
    });
  }

  getLane(id: string): oLane | undefined {
    return this.lanes.find((l) => l.id === id);
  }

  get activeLanes(): oLane[] {
    return this.lanes.filter((l) => l.status === oLaneStatus.RUNNING);
  }

  get staleLanes(): oLane[] {
    return this.lanes.filter((l) => l.status >= oLaneStatus.COMPLETED);
  }
}
