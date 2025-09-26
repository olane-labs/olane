import { oLaneQueryConfig } from './o-lane-query.config.js';
import { oTaskConfig } from './o-lane-task.config.js';
import { oConfigureResult } from './configure.result.js';

export interface oPlanResult {
  intents?: string[];
  queries?: oLaneQueryConfig[];
  tasks?: oTaskConfig[];
  handshake?: oTaskConfig;
  result?: any;
  reasoning?: string;
  error?: any;
  configure?: oConfigureResult;
  type:
    | 'result'
    | 'task'
    | 'search'
    | 'multiple_step'
    | 'error'
    | 'handshake'
    | 'configure';
}
