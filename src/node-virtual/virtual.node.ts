import { memory } from '@olane/o-config';
import { CoreConfig } from '../core';
import { oNode } from '../node';

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
