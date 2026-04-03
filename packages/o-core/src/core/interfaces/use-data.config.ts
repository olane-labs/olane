export interface UseDataConfig {
  method: string;
  params?: {
    _auth?: { token: string; claims: { sub?: string; [key: string]: any } };
    _trace?: { requestId: string };
    [key: string]: any;
  };
  id?: string;
}
