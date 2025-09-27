import type { oLane } from '../o-lane';

export class oLaneEncoderUtils {
  static encode(data: oLane): string {
    return JSON.stringify(data);
  }

  static decode(data: string): any {
    return JSON.parse(data);
  }
}
