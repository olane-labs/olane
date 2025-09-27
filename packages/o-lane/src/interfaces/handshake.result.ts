import { oMethod } from '@olane/o-protocol';
import { oCapabilityResult, oCapabilityType } from '../capabilities';

export interface oHandshakeResult extends oCapabilityResult {
  result: {
    tools: string[];
    methods: { [key: string]: oMethod };
  };
  type: oCapabilityType.HANDSHAKE;
}
