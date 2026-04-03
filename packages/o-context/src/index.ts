// Main entry point — tsc compiles this for the `node` condition.
// The `default` (browser/RN) condition points directly at o-context.browser.js
// via conditional exports in package.json, so this file is never loaded there.
export { createOContext } from './o-context.node.js';
export type { OContext } from './o-context.node.js';
