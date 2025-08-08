import { RequestParams } from '@olane/o-protocol';

export interface RunTool extends RequestParams {
  tool: string;
  [key: string]: unknown;
}
