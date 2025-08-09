import { oParameter } from "../parameter";

export interface oDependency {
  address: string;
  version?: string;
  method?: string;
  parameters?: oParameter[];
}
