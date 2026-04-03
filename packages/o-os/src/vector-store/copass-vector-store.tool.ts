import { oAddress, oRequest } from '@olane/o-core';
import { oLaneTool } from '@olane/o-lane';
import { oNodeConfig } from '@olane/o-node';
import type { ToolResult } from '@olane/o-tool';
import { spawn } from 'node:child_process';

const INGEST_CONCURRENCY = 5;

/**
 * Vector store implementation backed by the Copass backend via the CLI.
 *
 * Sits at o://vector-store so that `index_network` and any tool that
 * calls `use(oAddress('o://vector-store'), ...)` routes through here.
 *
 * - add_documents  → `olane ingest text` for each document (parallelized)
 * - search_similar → `olane copass context` (fast path search)
 * - delete/update  → no-ops (Copass is append-only)
 */
export class CopassVectorStoreTool extends oLaneTool {
  constructor(config: oNodeConfig) {
    super({
      ...config,
      address: new oAddress('o://vector-store'),
      description: 'Vector store backed by the Copass knowledge graph',
      methods: {
        add_documents: {
          name: 'add_documents',
          description: 'Add documents to the store',
          dependencies: [],
          parameters: [
            {
              name: 'documents',
              type: 'array',
              description: 'The documents to add',
            },
          ],
        },
        search_similar: {
          name: 'search_similar',
          description: 'Search for similar documents in the store',
          dependencies: [],
          parameters: [
            { name: 'query', type: 'string', description: 'The query to search for' },
            { name: 'limit', type: 'number', description: 'Max results' },
          ],
        },
        delete_documents: {
          name: 'delete_documents',
          description: 'Delete documents from the store (no-op)',
          dependencies: [],
          parameters: [],
        },
        update_documents: {
          name: 'update_documents',
          description: 'Update documents in the store (no-op)',
          dependencies: [],
          parameters: [],
        },
      },
    });
  }

  /**
   * Ingest documents into the Copass backend via `olane ingest text`.
   * Runs up to INGEST_CONCURRENCY CLI calls in parallel.
   */
  async _tool_add_documents(request: oRequest): Promise<ToolResult> {
    const { documents } = request.params as any;
    if (!Array.isArray(documents)) {
      return { success: false, error: 'documents must be an array' };
    }

    // Build work items
    const work: Array<{ content: string; address: string }> = [];
    for (const doc of documents) {
      const content = doc.pageContent || doc.page_content || '';
      if (!content) continue;
      work.push({ content, address: doc.metadata?.address || '' });
    }

    // Process in parallel batches
    let ingested = 0;
    for (let i = 0; i < work.length; i += INGEST_CONCURRENCY) {
      const batch = work.slice(i, i + INGEST_CONCURRENCY);
      const results = await Promise.allSettled(
        batch.map(({ content, address }) => {
          const hints = address ? [address] : [];
          return execCli(
            [
              'ingest', 'text',
              '--source-type', 'vector-store',
              ...(hints.length ? ['--entity-hints', ...hints] : []),
              ...(address ? ['--additional-context', `Address: ${address}`] : []),
            ],
            content,
          );
        }),
      );
      ingested += results.filter((r) => r.status === 'fulfilled').length;
    }

    return { success: true, ingested, total: documents.length };
  }

  /**
   * Search via `olane copass context` (fast path).
   */
  async _tool_search_similar(request: oRequest): Promise<ToolResult> {
    const { query, limit } = request.params as any;

    try {
      const result = await execCli([
        'copass', 'context', query as string,
        '--detail-level', 'concise',
        ...(limit ? ['--max-tokens', String(Math.min(limit * 500, 8000))] : []),
        '--json',
      ]);

      try {
        return JSON.parse(result);
      } catch {
        return { success: true, results: result };
      }
    } catch (err) {
      this.logger.warn(`Vector search failed: ${err}`);
      return { success: true, results: [] };
    }
  }

  async _tool_delete_documents(_request: oRequest): Promise<ToolResult> {
    return { success: true };
  }

  async _tool_update_documents(_request: oRequest): Promise<ToolResult> {
    return { success: true };
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
