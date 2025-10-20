export type ApprovalDecision = 'approve' | 'deny' | 'always' | 'never';

export interface ApprovalResponse {
  decision: ApprovalDecision;
  reason?: string;
  timestamp: number;
}
