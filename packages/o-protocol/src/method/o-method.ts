import { oDependency } from "../dependency/o-dependency";
import { oParameter } from "../parameter/o-parameter";

export interface oMethod {
  name: string;
  description: string;
  parameters: oParameter[];
  dependencies: oDependency[];
}
