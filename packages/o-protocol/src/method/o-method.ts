import { oDependency } from "../dependency/o-dependency";
import { oParameter } from "../parameter/o-parameter";

export interface oApprovalMetadata {
  riskLevel?: 'low' | 'medium' | 'high' | 'critical';
  category?: 'read' | 'write' | 'destructive' | 'network' | 'system';
  description?: string;
  autoApproveConditions?: {
    parameterConstraints?: Record<string, any>;
    contextRequirements?: string[];
    userRoles?: string[];
  };
  denialReasons?: string[];
  alternativeMethods?: string[];
}

export interface oMethodExample {
  description: string;
  intent: string;
  params: Record<string, any>;
  expectedResult?: any;
  notes?: string;
}

export interface oCommonError {
  errorCode: string;
  message: string;
  causes: string[];
  remediation: string;
  relatedMethods?: string[];
}

export interface oPerformanceMetadata {
  estimatedDuration?: number;
  maxDuration?: number;
  cacheable?: boolean;
  cacheKey?: string[];
  idempotent?: boolean;
  supportsBatching?: boolean;
  batchSizeLimit?: number;
  supportsStreaming?: boolean;
}

export interface oMethod {
  name: string;
  description: string;
  parameters: oParameter[];
  dependencies: oDependency[];
  requiresApproval?: boolean;
  approvalMetadata?: oApprovalMetadata;
  examples?: oMethodExample[];
  commonErrors?: oCommonError[];
  performance?: oPerformanceMetadata;
  successCriteria?: string;
  suggestedContext?: string[];
  similarMethods?: string[];
}
