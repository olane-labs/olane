import { oMethod } from '@olane/o-protocol';
import { oCapabilityType } from '../capabilities';
import { oCapabilityResult } from '../capabilities/o-capability.result';

export class oHandshakeResult extends oCapabilityResult {
  result?: {
    tools: string[];
    methods: { [key: string]: oMethod };
  };
  type: oCapabilityType = oCapabilityType.HANDSHAKE;
}
