import { oDependency } from "../dependency/o-dependency";
import { oParameter } from "../parameter/o-parameter";

export interface oApprovalMetadata {
  riskLevel?: 'low' | 'medium' | 'high' | 'critical';
  category?: 'read' | 'write' | 'destructive' | 'network' | 'system';
  description?: string;
}

export interface oMethod {
  name: string;
  description: string;
  parameters: oParameter[];
  dependencies: oDependency[];
  requiresApproval?: boolean;
  approvalMetadata?: oApprovalMetadata;
}
