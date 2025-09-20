import { oMethod } from '@olane/o-protocol';
import { oPlanResult } from './plan.result';
import { oTaskConfig } from './task.config';

export interface oHandshakeResult {
  tools: string[];
  methods: { [key: string]: oMethod };
  successes: oPlanResult[];
  failures: oPlanResult[];
  task?: oTaskConfig;
  type: 'handshake';
}
