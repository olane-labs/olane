import { oTokenManager } from '@olane/o-core';

/**
 * Auth guard for OS operations.
 * Verifies a valid token exists before allowing network-facing operations.
 */
export class OSAuthGuard {
  private tokenManager: oTokenManager | null;

  constructor(tokenManager?: oTokenManager) {
    this.tokenManager = tokenManager ?? null;
  }

  /**
   * Verify that a valid auth token exists.
   * Throws if no token manager is configured or no valid token is found.
   */
  async ensureAuth(): Promise<void> {
    if (!this.tokenManager) {
      throw new Error(
        'Authentication required: no token manager configured for this OS instance.',
      );
    }

    const token = await this.tokenManager.getToken();
    if (!token) {
      throw new Error(
        'Authentication required: no valid token found. Please log in first.',
      );
    }
  }

  /**
   * Check whether auth is available (non-throwing).
   */
  async isAuthenticated(): Promise<boolean> {
    if (!this.tokenManager) return false;
    try {
      const token = await this.tokenManager.getToken();
      return !!token;
    } catch {
      return false;
    }
  }

  setTokenManager(tokenManager: oTokenManager): void {
    this.tokenManager = tokenManager;
  }
}
