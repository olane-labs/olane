import { oParameter } from "../parameter";

export interface oDependency {
  address: string;
  version?: string;
  parameters?: oParameter[];
}
