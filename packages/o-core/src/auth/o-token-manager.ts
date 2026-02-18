import type { oTokenProvider, oTokenResult } from './o-token-provider.js';
import type { oTokenStore, oTokenStoreEntry } from './o-token-store.js';
import type { ORequestAuthContext } from '../context/o-request-context.js';

export interface oTokenManagerConfig {
  provider: oTokenProvider;
  autoRefresh?: boolean; // default: true
  refreshBufferMs?: number; // default: 60_000 (refresh 60s before expiry)
  defaultLifetimeMs?: number; // default: 3_600_000 (1h fallback if no expiresAt)
  maxRefreshRetries?: number; // default: 3
  onRefreshFailure?: (error: Error) => void;
  store?: oTokenStore;
  storeKey?: string; // default: 'default'
}

export class oTokenManager {
  private provider: oTokenProvider;
  private autoRefresh: boolean;
  private refreshBufferMs: number;
  private defaultLifetimeMs: number;
  private maxRefreshRetries: number;
  private onRefreshFailure?: (error: Error) => void;

  private store: oTokenStore | null;
  private storeKey: string;
  private storeLoaded = false;

  private currentResult: oTokenResult | null = null;
  private acquiredAt: number | null = null;
  private refreshPromise: Promise<oTokenResult> | null = null;
  private refreshTimer: ReturnType<typeof setTimeout> | null = null;
  private destroyed = false;

  constructor(config: oTokenManagerConfig) {
    this.provider = config.provider;
    this.autoRefresh = config.autoRefresh ?? true;
    this.refreshBufferMs = config.refreshBufferMs ?? 60_000;
    this.defaultLifetimeMs = config.defaultLifetimeMs ?? 3_600_000;
    this.maxRefreshRetries = config.maxRefreshRetries ?? 3;
    this.onRefreshFailure = config.onRefreshFailure;
    this.store = config.store ?? null;
    this.storeKey = config.storeKey ?? 'default';
  }

  async getToken(forceRefresh = false): Promise<string> {
    const result = await this.getTokenResult(forceRefresh);
    return result.token;
  }

  async getTokenResult(forceRefresh = false): Promise<oTokenResult> {
    if (this.destroyed) {
      throw new Error('oTokenManager has been destroyed');
    }

    if (!forceRefresh && this.currentResult && !this.isExpired()) {
      return this.currentResult;
    }

    // On first call, try to restore from persistent store
    if (!forceRefresh && !this.currentResult && this.store && !this.storeLoaded) {
      const restored = await this.loadFromStore();
      if (restored && !this.isExpired()) {
        return this.currentResult!;
      }
    }

    return this.refresh();
  }

  async refresh(): Promise<oTokenResult> {
    if (this.destroyed) {
      throw new Error('oTokenManager has been destroyed');
    }

    // Concurrent deduplication: share a single in-flight refresh
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = this.executeRefreshWithRetry();

    try {
      const result = await this.refreshPromise;
      return result;
    } finally {
      this.refreshPromise = null;
    }
  }

  isExpired(): boolean {
    if (!this.currentResult) return true;
    const expiresAt = this.getExpiresAtMs();
    if (expiresAt === null) return false;
    return Date.now() >= expiresAt;
  }

  isCloseToExpiration(): boolean {
    if (!this.currentResult) return true;
    const expiresAt = this.getExpiresAtMs();
    if (expiresAt === null) return false;
    return Date.now() >= expiresAt - this.refreshBufferMs;
  }

  getTimeUntilExpiration(): number | null {
    if (!this.currentResult) return null;
    const expiresAt = this.getExpiresAtMs();
    if (expiresAt === null) return null;
    return Math.max(0, expiresAt - Date.now());
  }

  toAuthContext(): ORequestAuthContext | null {
    if (!this.currentResult) return null;

    return {
      token: this.currentResult.token,
      claims: {
        sub: this.currentResult.claims?.sub,
        iss: this.currentResult.claims?.iss,
        ...this.currentResult.claims,
      },
    };
  }

  async destroy(): Promise<void> {
    this.destroyed = true;
    this.clearRefreshTimer();

    // Persist latest state before clearing memory
    await this.saveToStore();

    this.currentResult = null;
    this.acquiredAt = null;
    this.refreshPromise = null;

    if (this.provider.destroy) {
      await this.provider.destroy();
    }
  }

  private async loadFromStore(): Promise<boolean> {
    this.storeLoaded = true;

    try {
      const entry = await this.store!.get(this.storeKey);
      if (!entry) return false;

      this.currentResult = {
        token: entry.token,
        expiresAt: entry.expiresAt,
        claims: entry.claims,
        refreshToken: entry.refreshToken,
      };
      this.acquiredAt = entry.acquiredAt;

      // Feed persisted refresh token back to provider
      if (entry.refreshToken && this.provider.updateRefreshToken) {
        this.provider.updateRefreshToken(entry.refreshToken);
      }

      this.scheduleAutoRefresh();
      return true;
    } catch {
      // Store failures are non-fatal — degrade to in-memory
      return false;
    }
  }

  private async saveToStore(): Promise<void> {
    if (!this.store || !this.currentResult || this.acquiredAt === null) return;

    try {
      const entry: oTokenStoreEntry = {
        token: this.currentResult.token,
        expiresAt: this.currentResult.expiresAt,
        claims: this.currentResult.claims,
        refreshToken: this.currentResult.refreshToken,
        acquiredAt: this.acquiredAt,
      };
      await this.store.set(this.storeKey, entry);
    } catch {
      // Store failures are non-fatal
    }
  }

  private async executeRefreshWithRetry(): Promise<oTokenResult> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.maxRefreshRetries; attempt++) {
      try {
        const result = await this.provider.acquireToken();
        this.currentResult = result;
        this.acquiredAt = Date.now();
        this.scheduleAutoRefresh();
        await this.saveToStore();
        return result;
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));

        if (attempt < this.maxRefreshRetries) {
          // Exponential backoff: 1s, 2s, 4s, ...
          const delayMs = Math.min(1000 * Math.pow(2, attempt), 30_000);
          await this.sleep(delayMs);
        }
      }
    }

    const error = lastError ?? new Error('Token refresh failed');
    this.onRefreshFailure?.(error);
    throw error;
  }

  private scheduleAutoRefresh(): void {
    this.clearRefreshTimer();

    if (!this.autoRefresh || this.destroyed) return;

    const expiresAt = this.getExpiresAtMs();
    if (expiresAt === null) return;

    const refreshAt = expiresAt - this.refreshBufferMs;
    const delay = Math.max(0, refreshAt - Date.now());

    this.refreshTimer = setTimeout(() => {
      if (this.destroyed) return;
      this.refresh().catch((err) => {
        // onRefreshFailure already called in executeRefreshWithRetry
      });
    }, delay);

    // Don't block process exit
    if (this.refreshTimer && typeof this.refreshTimer === 'object' && 'unref' in this.refreshTimer) {
      this.refreshTimer.unref();
    }
  }

  private clearRefreshTimer(): void {
    if (this.refreshTimer !== null) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }
  }

  private getExpiresAtMs(): number | null {
    if (!this.currentResult) return null;

    if (this.currentResult.expiresAt != null) {
      return this.currentResult.expiresAt * 1000; // convert unix seconds to ms
    }

    // No expiry info — fall back to defaultLifetimeMs from acquisition time
    if (this.acquiredAt != null) {
      return this.acquiredAt + this.defaultLifetimeMs;
    }

    return null;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
