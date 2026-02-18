export interface oTokenStoreEntry {
  token: string;
  expiresAt?: number; // unix seconds (same semantics as oTokenResult)
  claims?: { sub?: string; iss?: string; [key: string]: any };
  refreshToken?: string;
  acquiredAt: number; // unix ms — needed to compute defaultLifetime fallback on restore
}

export interface oTokenStore {
  get(key: string): Promise<oTokenStoreEntry | null>;
  set(key: string, entry: oTokenStoreEntry): Promise<void>;
  delete(key: string): Promise<void>;
}
