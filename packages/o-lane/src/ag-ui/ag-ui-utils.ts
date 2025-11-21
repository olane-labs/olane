import { v4 as uuidv4 } from 'uuid';
import { JSONPatchOperation } from './types/ag-ui-event.types.js';

/**
 * Utility functions for AG-UI event handling
 */

/**
 * Generate a unique run ID
 */
export function generateRunId(): string {
  return `run-${uuidv4()}`;
}

/**
 * Generate a unique message ID
 */
export function generateMessageId(): string {
  return `msg-${uuidv4()}`;
}

/**
 * Generate a unique tool call ID
 */
export function generateToolCallId(): string {
  return `tool-${uuidv4()}`;
}

/**
 * Generate a thread ID from context or create a new one
 */
export function generateThreadId(context?: string): string {
  if (context) {
    // Create a deterministic ID from context
    const hash = simpleHash(context);
    return `thread-${hash}`;
  }
  return `thread-${uuidv4()}`;
}

/**
 * Simple hash function for creating deterministic IDs
 */
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36);
}

/**
 * Generate ISO 8601 timestamp for events
 */
export function generateTimestamp(): string {
  return new Date().toISOString();
}

/**
 * Generate JSON Patch operations (RFC 6902) for state deltas
 * Compares old and new state to create minimal patch
 */
export function generateJSONPatch(
  oldState: any,
  newState: any,
  basePath: string = '',
): JSONPatchOperation[] {
  const patches: JSONPatchOperation[] = [];

  // Handle null/undefined cases
  if (oldState === undefined || oldState === null) {
    if (newState !== undefined && newState !== null) {
      patches.push({
        op: 'add',
        path: basePath || '/',
        value: newState,
      });
    }
    return patches;
  }

  if (newState === undefined || newState === null) {
    patches.push({
      op: 'remove',
      path: basePath || '/',
    });
    return patches;
  }

  // Handle primitive types
  if (typeof oldState !== 'object' || typeof newState !== 'object') {
    if (oldState !== newState) {
      patches.push({
        op: 'replace',
        path: basePath || '/',
        value: newState,
      });
    }
    return patches;
  }

  // Handle arrays
  if (Array.isArray(oldState) && Array.isArray(newState)) {
    return generateArrayPatch(oldState, newState, basePath);
  }

  // Handle objects
  if (Array.isArray(oldState) !== Array.isArray(newState)) {
    patches.push({
      op: 'replace',
      path: basePath || '/',
      value: newState,
    });
    return patches;
  }

  // Compare object keys
  const oldKeys = Object.keys(oldState);
  const newKeys = Object.keys(newState);
  const allKeys = new Set([...oldKeys, ...newKeys]);

  for (const key of allKeys) {
    const path = basePath ? `${basePath}/${escapeJsonPointer(key)}` : `/${escapeJsonPointer(key)}`;

    if (!(key in oldState)) {
      // Key added
      patches.push({
        op: 'add',
        path,
        value: newState[key],
      });
    } else if (!(key in newState)) {
      // Key removed
      patches.push({
        op: 'remove',
        path,
      });
    } else {
      // Key exists in both - recurse
      const nestedPatches = generateJSONPatch(oldState[key], newState[key], path);
      patches.push(...nestedPatches);
    }
  }

  return patches;
}

/**
 * Generate patches for array differences
 */
function generateArrayPatch(
  oldArray: any[],
  newArray: any[],
  basePath: string,
): JSONPatchOperation[] {
  const patches: JSONPatchOperation[] = [];

  // Simple strategy: if arrays differ significantly, replace entire array
  if (Math.abs(oldArray.length - newArray.length) > oldArray.length / 2) {
    patches.push({
      op: 'replace',
      path: basePath || '/',
      value: newArray,
    });
    return patches;
  }

  // For similar-length arrays, compare element by element
  const maxLen = Math.max(oldArray.length, newArray.length);
  for (let i = 0; i < maxLen; i++) {
    const path = `${basePath}/${i}`;

    if (i >= oldArray.length) {
      // New element added
      patches.push({
        op: 'add',
        path: `${basePath}/-`, // Use '-' to append
        value: newArray[i],
      });
    } else if (i >= newArray.length) {
      // Element removed (always remove from end)
      patches.push({
        op: 'remove',
        path: `${basePath}/${oldArray.length - 1}`,
      });
    } else {
      // Element potentially changed
      const nestedPatches = generateJSONPatch(oldArray[i], newArray[i], path);
      patches.push(...nestedPatches);
    }
  }

  return patches;
}

/**
 * Escape special characters in JSON Pointer (RFC 6901)
 */
function escapeJsonPointer(str: string): string {
  return str.replace(/~/g, '~0').replace(/\//g, '~1');
}

/**
 * Apply JSON Patch operations to an object
 */
export function applyJSONPatch(obj: any, patches: JSONPatchOperation[]): any {
  let result = JSON.parse(JSON.stringify(obj)); // Deep clone

  for (const patch of patches) {
    const path = patch.path.split('/').filter((p) => p);

    switch (patch.op) {
      case 'add':
        result = applyAdd(result, path, patch.value);
        break;
      case 'remove':
        result = applyRemove(result, path);
        break;
      case 'replace':
        result = applyReplace(result, path, patch.value);
        break;
    }
  }

  return result;
}

function applyAdd(obj: any, path: string[], value: any): any {
  if (path.length === 0) return value;

  const key = path[0];
  const rest = path.slice(1);

  if (rest.length === 0) {
    if (Array.isArray(obj)) {
      if (key === '-') {
        obj.push(value);
      } else {
        obj.splice(parseInt(key), 0, value);
      }
    } else {
      obj[key] = value;
    }
    return obj;
  }

  obj[key] = applyAdd(obj[key] || {}, rest, value);
  return obj;
}

function applyRemove(obj: any, path: string[]): any {
  if (path.length === 0) return undefined;

  const key = path[0];
  const rest = path.slice(1);

  if (rest.length === 0) {
    if (Array.isArray(obj)) {
      obj.splice(parseInt(key), 1);
    } else {
      delete obj[key];
    }
    return obj;
  }

  obj[key] = applyRemove(obj[key], rest);
  return obj;
}

function applyReplace(obj: any, path: string[], value: any): any {
  if (path.length === 0) return value;

  const key = path[0];
  const rest = path.slice(1);

  if (rest.length === 0) {
    obj[key] = value;
    return obj;
  }

  obj[key] = applyReplace(obj[key], rest, value);
  return obj;
}

/**
 * Chunk a string into smaller pieces for streaming
 */
export function chunkString(str: string, chunkSize: number): string[] {
  const chunks: string[] = [];
  for (let i = 0; i < str.length; i += chunkSize) {
    chunks.push(str.slice(i, i + chunkSize));
  }
  return chunks;
}

/**
 * Validate an AG-UI event has required fields
 */
export function validateEvent(event: any): boolean {
  if (!event || typeof event !== 'object') {
    return false;
  }

  if (!event.type || typeof event.type !== 'string') {
    return false;
  }

  // Basic validation passed
  return true;
}

/**
 * Extract capability type from step name
 */
export function capabilityTypeToStepName(capabilityType: string): string {
  return capabilityType.toLowerCase();
}

/**
 * Create a safe JSON string from any value
 */
export function safeJSONStringify(value: any): string {
  try {
    return JSON.stringify(value, null, 2);
  } catch (error) {
    return String(value);
  }
}
