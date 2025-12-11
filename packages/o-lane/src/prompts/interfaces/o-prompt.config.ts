import { oCapabilityType } from "../../capabilities";

export interface oPromptConfig {
  rawValue: string;
  type: oCapabilityType;
  provider: string;
  params: any;
}