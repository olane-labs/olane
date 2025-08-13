import { memory } from '@olane/o-config';
import { oNode } from '../node/node.js';

export class oVirtualNode extends oNode {
  /**
   * Virtual nodes are only used for local communication, so we need to configure
   * the transports to be in-memory.
   * @returns The transports for the virtual node
   */
  configureTransports(): any[] {
    return [memory()];
  }
}
