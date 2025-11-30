import { oLaneTool } from '@olane/o-lane';
import { oNodeToolConfig } from '@olane/o-node';
import { withLeader } from './leader.mixin.js';

/**
 * oLeaderNode - Lane-based tool with leader node capabilities
 * This class composes the withLeader mixin with oLaneTool to provide
 * a concrete implementation for leader nodes in the network.
 *
 * Leader nodes serve as network routers and provide:
 * - Registry management for network nodes
 * - Search and gateway routing resolution
 * - Network join request handling
 * - Unrestricted peer dialing capabilities
 *
 * All leader-specific functionality is provided by the withLeader mixin,
 * making this implementation backward compatible while enabling
 * future flexibility to apply leader capabilities to other base classes.
 */
export class oLeaderNode extends withLeader(oLaneTool) {
  constructor(config: oNodeToolConfig) {
    // The mixin will add the address field, so we pass the config as-is
    super(config as any);
  }
}
