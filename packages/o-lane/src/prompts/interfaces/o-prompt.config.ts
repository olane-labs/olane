import { oCapabilityType } from "../../capabilities/index.js";

export interface oPromptConfig {
  rawValue: string;
  type: oCapabilityType;
  provider: string;
  params: any;
}