import { oParameter } from "../parameter/index.js";

export interface oDependency {
  address: string;
  version?: string;
  method?: string;
  parameters?: oParameter[];
}
