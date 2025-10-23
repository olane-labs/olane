import { oAddress } from '../../../router/o-address.js';
import { oNotificationEvent } from '../events/o-notification-event.js';
import {
  ChildJoinedEvent,
  ChildLeftEvent,
} from '../events/hierarchy-events.js';
import {
  NodeConnectedEvent,
  NodeDisconnectedEvent,
} from '../events/node-events.js';

/**
 * Utility functions for filtering notification events
 */
export class EventFilters {
  /**
   * Check if an address matches a pattern
   * Supports:
   *   - Regex patterns: any string starting with '/' or containing regex special chars
   *   - Wildcards: * for single segment, ** for multiple segments
   *
   * Examples:
   *   Wildcards:
   *     - "o://leader/*" matches "o://leader/child1" but not "o://leader/child1/grandchild"
   *     - "o://leader/**" matches "o://leader/child1" and "o://leader/child1/grandchild"
   *     - "o://leader/tools/*" matches "o://leader/tools/calculator"
   *
   *   Regex (use standard regex patterns with / delimiters):
   *     - /^o:\/\/leader\/.*\/ matches any path starting with o://leader/
   *     - /tool-\d+/ matches paths with tool-1, tool-99, etc.
   *     - /o:\/\/leader\/(analytics|reporting)\// matches analytics or reporting paths
   */
  static addressMatches(address: oAddress, pattern: string): boolean {
    const addressStr = address.toString();

    // Check if pattern is a regex (starts with / or contains regex special chars like ^, $, [], (), |)
    const isRegex = pattern.startsWith('/') || /[\^\$\[\]\(\)\|]/.test(pattern);

    if (isRegex) {
      try {
        // Extract regex pattern and flags if format is /pattern/flags
        let regexPattern = pattern;
        let flags = '';

        if (pattern.startsWith('/')) {
          const lastSlash = pattern.lastIndexOf('/');
          if (lastSlash > 0) {
            regexPattern = pattern.slice(1, lastSlash);
            flags = pattern.slice(lastSlash + 1);
          }
        }

        const regex = new RegExp(regexPattern, flags);
        return regex.test(addressStr);
      } catch (e) {
        // If regex compilation fails, fall back to exact match
        console.warn(`Invalid regex pattern: ${pattern}`, e);
        return addressStr === pattern;
      }
    }

    // Handle wildcard patterns (backward compatibility)
    const addressPaths = address.paths;
    const patternPaths = pattern.replace('o://', '').split('/').filter(Boolean);

    // Handle exact match
    if (addressStr === pattern) {
      return true;
    }

    // Handle wildcard patterns
    for (let i = 0; i < patternPaths.length; i++) {
      const patternSegment = patternPaths[i];

      // ** matches rest of path
      if (patternSegment === '**') {
        return true;
      }

      // * matches single segment
      if (patternSegment === '*') {
        if (i >= addressPaths.length) {
          return false;
        }
        continue;
      }

      // Exact segment match
      if (addressPaths[i] !== patternSegment) {
        return false;
      }
    }

    // Pattern must match full address length (unless ended with **)
    return addressPaths.length === patternPaths.length;
  }

  /**
   * Filter events to only include direct children of a parent address
   */
  static childrenOnly(
    event: oNotificationEvent,
    parentAddress: oAddress,
  ): boolean {
    // Check if event is a hierarchy event
    if (event instanceof ChildJoinedEvent || event instanceof ChildLeftEvent) {
      return event.parentAddress.toString() === parentAddress.toString();
    }

    // For node events, check if the node is a direct child
    if (
      event instanceof NodeConnectedEvent ||
      event instanceof NodeDisconnectedEvent
    ) {
      const nodeAddr = event.nodeAddress;
      const parentPaths = parentAddress.paths;
      const nodePaths = nodeAddr.paths;

      // Direct child has exactly one more path segment
      if (nodePaths.length !== parentPaths.length + 1) {
        return false;
      }

      // Check all parent segments match
      for (let i = 0; i < parentPaths.length; i++) {
        if (parentPaths[i] !== nodePaths[i]) {
          return false;
        }
      }

      return true;
    }

    return false;
  }

  /**
   * Filter events to only include descendants (children, grandchildren, etc.) of an ancestor address
   */
  static descendantsOnly(
    event: oNotificationEvent,
    ancestorAddress: oAddress,
  ): boolean {
    // Check if event is a hierarchy event
    if (event instanceof ChildJoinedEvent || event instanceof ChildLeftEvent) {
      // Check if parent is a descendant of or equal to ancestor
      const parentPaths = event.parentAddress.paths;
      const ancestorPaths = ancestorAddress.paths;

      if (parentPaths.length < ancestorPaths.length) {
        return false;
      }

      // Check all ancestor segments match
      for (let i = 0; i < ancestorPaths.length; i++) {
        if (ancestorPaths[i] !== parentPaths[i]) {
          return false;
        }
      }

      return true;
    }

    // For node events, check if the node is a descendant
    if (
      event instanceof NodeConnectedEvent ||
      event instanceof NodeDisconnectedEvent
    ) {
      const nodeAddr = event.nodeAddress;
      const nodePaths = nodeAddr.paths;
      const ancestorPaths = ancestorAddress.paths;

      // Descendant must have more path segments
      if (nodePaths.length <= ancestorPaths.length) {
        return false;
      }

      // Check all ancestor segments match
      for (let i = 0; i < ancestorPaths.length; i++) {
        if (ancestorPaths[i] !== nodePaths[i]) {
          return false;
        }
      }

      return true;
    }

    return false;
  }

  /**
   * Get the address from an event based on its type
   */
  static getEventAddress(event: oNotificationEvent): oAddress | null {
    if (
      event instanceof NodeConnectedEvent ||
      event instanceof NodeDisconnectedEvent
    ) {
      return event.nodeAddress;
    }

    if (event instanceof ChildJoinedEvent || event instanceof ChildLeftEvent) {
      return event.childAddress;
    }

    return null;
  }
}
