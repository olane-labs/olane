/**
 * OS-level MCP tool definitions.
 *
 * These are meant to be registered on an MCP server by the CLI layer.
 * Each handler receives an OlaneOS instance and returns structured results.
 */

import type { OlaneOS } from '../o-olane-os/o-os.js';
import type { AddressBook } from '../address-book/address-book.js';
import type { MemoryHarness } from '../memory/memory-harness.js';
import type { WorldManagerTool } from '../worlds/world-manager.tool.js';
import { listOS } from '../lifecycle/os-lifecycle.js';
import { AddressFactory } from '../address/address-factory.js';
import { oAddress } from '@olane/o-core';

export interface OSMcpContext {
  os?: OlaneOS;
  addressBook?: AddressBook;
  memory?: MemoryHarness;
  worldManager?: WorldManagerTool;
}

export interface McpToolDefinition {
  name: string;
  description: string;
  inputSchema: Record<string, any>;
  handler: (
    params: any,
    ctx: OSMcpContext,
  ) => Promise<{ content: Array<{ type: string; text: string }> }>;
}

function textResult(text: string) {
  return { content: [{ type: 'text', text }] };
}

export const OS_MCP_TOOLS: McpToolDefinition[] = [
  // ── Lifecycle ──────────────────────────────────────────────
  {
    name: 'os_status',
    description: 'List all OS instances and their status',
    inputSchema: { type: 'object', properties: {} },
    handler: async () => {
      const instances = await listOS();
      return textResult(JSON.stringify(instances, null, 2));
    },
  },

  // ── Address ────────────────────────────────────────────────
  {
    name: 'address_create',
    description: 'Create a new o:// address',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Address name' },
      },
      required: ['name'],
    },
    handler: async (params) => {
      const address = AddressFactory.createAddress(params.name);
      return textResult(
        JSON.stringify({ address: address.value, created: true }),
      );
    },
  },
  {
    name: 'address_list',
    description: 'List all addresses in the address book',
    inputSchema: {
      type: 'object',
      properties: {
        type: {
          type: 'string',
          enum: ['internal', 'external'],
          description: 'Filter by type',
        },
      },
    },
    handler: async (params, ctx) => {
      if (!ctx.addressBook) return textResult('Address book not initialized');
      const entries = ctx.addressBook.list(params.type);
      return textResult(JSON.stringify(entries, null, 2));
    },
  },

  // ── Contacts ───────────────────────────────────────────────
  {
    name: 'contacts_add',
    description: 'Add an address to the address book',
    inputSchema: {
      type: 'object',
      properties: {
        address: { type: 'string', description: 'o:// address' },
        alias: { type: 'string', description: 'Human-friendly alias' },
        type: {
          type: 'string',
          enum: ['internal', 'external'],
          default: 'external',
        },
      },
      required: ['address'],
    },
    handler: async (params, ctx) => {
      if (!ctx.addressBook) return textResult('Address book not initialized');
      await ctx.addressBook.add({
        address: params.address,
        type: params.type || 'external',
        alias: params.alias,
      });
      return textResult(JSON.stringify({ added: true, address: params.address }));
    },
  },
  {
    name: 'contacts_list',
    description: 'List all contacts in the address book',
    inputSchema: { type: 'object', properties: {} },
    handler: async (_params, ctx) => {
      if (!ctx.addressBook) return textResult('Address book not initialized');
      return textResult(JSON.stringify(ctx.addressBook.list(), null, 2));
    },
  },
  {
    name: 'contacts_remove',
    description: 'Remove an address from the address book',
    inputSchema: {
      type: 'object',
      properties: {
        address: { type: 'string', description: 'o:// address to remove' },
      },
      required: ['address'],
    },
    handler: async (params, ctx) => {
      if (!ctx.addressBook) return textResult('Address book not initialized');
      const removed = await ctx.addressBook.remove(params.address);
      return textResult(JSON.stringify({ removed }));
    },
  },

  // ── Worlds ─────────────────────────────────────────────────
  {
    name: 'world_create',
    description: 'Create a new world (branded network)',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'World name' },
        description: { type: 'string' },
        icon: { type: 'string' },
        supportedTypes: {
          type: 'array',
          items: { type: 'string' },
          description: 'Supported types (default: filepath)',
        },
      },
      required: ['name'],
    },
    handler: async (params, ctx) => {
      if (!ctx.worldManager) return textResult('World manager not initialized');
      const result = await ctx.worldManager.createWorld(params);
      return textResult(JSON.stringify(result, null, 2));
    },
  },
  {
    name: 'world_list',
    description: 'List all worlds',
    inputSchema: { type: 'object', properties: {} },
    handler: async (_params, ctx) => {
      if (!ctx.worldManager) return textResult('World manager not initialized');
      return textResult(JSON.stringify(ctx.worldManager.listWorlds(), null, 2));
    },
  },
  {
    name: 'world_join',
    description: 'Join a world by adding your Copass ID',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'World ID' },
        copassId: { type: 'string', description: 'Your Copass ID' },
      },
      required: ['id', 'copassId'],
    },
    handler: async (params, ctx) => {
      if (!ctx.worldManager) return textResult('World manager not initialized');
      const result = await ctx.worldManager.joinWorld(
        params.id,
        params.copassId,
      );
      return textResult(JSON.stringify(result));
    },
  },

  // ── Memory ─────────────────────────────────────────────────
  {
    name: 'memory_remember',
    description: 'Ingest a memory into the Copass backend for later retrieval',
    inputSchema: {
      type: 'object',
      properties: {
        key: { type: 'string', description: 'Memory key / entity hint' },
        value: { type: 'string', description: 'Text value to remember' },
      },
      required: ['key', 'value'],
    },
    handler: async (params, ctx) => {
      if (!ctx.memory) return textResult('Memory harness not initialized');
      const result = await ctx.memory.remember(params.key, params.value);
      return textResult(JSON.stringify(result));
    },
  },
  {
    name: 'memory_recall',
    description: 'Query the Copass backend to recall memories',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Question or topic to recall' },
      },
      required: ['query'],
    },
    handler: async (params, ctx) => {
      if (!ctx.memory) return textResult('Memory harness not initialized');
      const result = await ctx.memory.recall(params.query);
      return textResult(JSON.stringify(result));
    },
  },
  {
    name: 'memory_search',
    description: 'Fast context search across OS memories via Copass',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query' },
      },
      required: ['query'],
    },
    handler: async (params, ctx) => {
      if (!ctx.memory) return textResult('Memory harness not initialized');
      const result = await ctx.memory.search(params.query);
      return textResult(JSON.stringify(result));
    },
  },

  // ── Generic use ────────────────────────────────────────────
  {
    name: 'os_use',
    description: 'Invoke a method on any o:// address in the OS',
    inputSchema: {
      type: 'object',
      properties: {
        address: { type: 'string', description: 'o:// address' },
        method: { type: 'string', description: 'Method name' },
        params: { type: 'object', description: 'Method parameters' },
      },
      required: ['address', 'method'],
    },
    handler: async (params, ctx) => {
      if (!ctx.os) return textResult('OS not running');
      const result = await ctx.os.use(new oAddress(params.address), {
        method: params.method,
        params: params.params || {},
      });
      return textResult(JSON.stringify(result, null, 2));
    },
  },
];
