import { ToolResult } from './tool-result.interface.js';

export type RunResult = { [key: string]: unknown } | AsyncGenerator<ToolResult>;
