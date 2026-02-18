export interface UseDataConfig {
  method: string;
  params?: {
    _auth?: { token: string; claims: { sub?: string; [key: string]: any } };
    [key: string]: any;
  };
  id?: string;
}
