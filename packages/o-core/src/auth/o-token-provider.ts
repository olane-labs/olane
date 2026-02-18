export interface oTokenResult {
  token: string;
  expiresAt?: number; // unix seconds
  claims?: { sub?: string; iss?: string; [key: string]: any };
  refreshToken?: string; // rotated refresh token if provider returns one
}

export interface oTokenProvider {
  acquireToken(): Promise<oTokenResult>;
  destroy?(): Promise<void>;
  updateRefreshToken?(token: string): void;
}
