import { oNodeConfig, oNodeTool } from '@olane/o-node';
import { withLane } from './o-lane.mixin.js';

/**
 * oLaneTool - Node-based tool with lane execution capabilities
 * This class composes the withLane mixin with oNodeTool to provide
 * a concrete implementation for node-based lane execution.
 *
 * All lane-specific functionality is provided by the withLane mixin,
 * making this implementation backward compatible while enabling
 * future flexibility to apply lane capabilities to other base classes.
 */
export class oLaneTool extends withLane(oNodeTool) {
  constructor(config: oNodeConfig) {
    super(config);
  }
}
