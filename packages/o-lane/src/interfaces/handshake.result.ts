import { oMethod } from '@olane/o-protocol';
import { oPlanResult } from './o-lane.result';
import { oTaskConfig } from './o-lane-task.config';

export interface oHandshakeResult {
  tools: string[];
  methods: { [key: string]: oMethod };
  successes: oPlanResult[];
  failures: oPlanResult[];
  task?: oTaskConfig;
  type: 'handshake';
}
