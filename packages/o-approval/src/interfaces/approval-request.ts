export interface ApprovalRequest {
  toolAddress: string;
  method: string;
  params: any;
  intent?: string;
  timestamp: number;
}
