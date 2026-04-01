import { spawn } from 'node:child_process';

/**
 * MemoryHarness — stores and retrieves OS memory via the Copass backend.
 *
 * - `remember(key, value)` → `olane ingest text` with key as entity hint
 * - `recall(query)` → `olane copass question` scoped to memory context
 * - Session memory remains in-process (ephemeral Map)
 */
export class MemoryHarness {
  private session: Map<string, unknown> = new Map();

  /**
   * Ingest a memory into the Copass backend via `olane ingest text`.
   */
  async remember(key: string, value: string): Promise<{ success: boolean; error?: string }> {
    try {
      await execCli(
        ['ingest', 'text', '--source-type', 'os-memory', '--entity-hints', key, '--additional-context', `OS memory key: ${key}`],
        `[Memory: ${key}] ${value}`,
      );
      return { success: true };
    } catch (err) {
      return { success: false, error: String(err) };
    }
  }

  /**
   * Recall memory via `olane copass question`.
   */
  async recall(query: string): Promise<{ success: boolean; answer?: string; error?: string }> {
    try {
      const result = await execCli([
        'copass', 'question', query,
        '--detail-level', 'concise',
        '--json',
      ]);
      return { success: true, answer: result };
    } catch (err) {
      return { success: false, error: String(err) };
    }
  }

  /**
   * Search memory via `olane copass context` (fast path search).
   */
  async search(query: string): Promise<{ success: boolean; context?: string; error?: string }> {
    try {
      const result = await execCli([
        'copass', 'context', query,
        '--detail-level', 'concise',
        '--json',
      ]);
      return { success: true, context: result };
    } catch (err) {
      return { success: false, error: String(err) };
    }
  }

  // ── Session memory (ephemeral, in-process) ────────────────────

  sessionSet(key: string, value: unknown): void {
    this.session.set(key, value);
  }

  sessionGet(key: string): unknown | undefined {
    return this.session.get(key);
  }

  sessionDelete(key: string): boolean {
    return this.session.delete(key);
  }

  sessionClear(): void {
    this.session.clear();
  }
}

function execCli(args: string[], stdin?: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn('olane', args, {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: {
        ...process.env,
        FORCE_COLOR: '0',
        NODE_OPTIONS: (process.env.NODE_OPTIONS || '')
          .replace(/--inspect[^ ]*/g, '')
          .trim(),
      },
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (d: Buffer) => { stdout += d; });
    child.stderr.on('data', (d: Buffer) => { stderr += d; });

    child.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(stderr.trim() || `CLI exited with code ${code}`));
      } else {
        resolve(stdout.trim());
      }
    });

    if (stdin !== undefined) {
      child.stdin.write(stdin);
    }
    child.stdin.end();
  });
}
