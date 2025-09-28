import { oMethod } from '@olane/o-protocol';
import { oCapabilityType } from '../capabilities/enums/o-capability.type-enum.js';
import { oCapabilityResult } from '../capabilities/o-capability.result.js';

export class oHandshakeResult extends oCapabilityResult {
  result?: {
    tools: string[];
    methods: { [key: string]: oMethod };
  };
  type: oCapabilityType = oCapabilityType.HANDSHAKE;
}
