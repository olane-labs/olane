// /**
//  * Mock data for testing
//  *
//  * This file contains sample data used in tests.
//  * Organize your test fixtures here to keep tests clean and maintainable.
//  */

// export const mockData = {
//   /**
//    * Sample message for testing example_method
//    */
//   sampleMessage: 'This is a test message from mock data',

//   /**
//    * Sample data object for testing process_data
//    */
//   sampleData: {
//     id: 'test-123',
//     name: 'Test User',
//     email: 'test@example.com',
//     metadata: {
//       created: '2025-01-01T00:00:00Z',
//       source: 'test-fixture',
//     },
//   },

//   /**
//    * Sample data for validation testing
//    */
//   validData: {
//     name: 'Valid User',
//     id: 'valid-123',
//     email: 'valid@example.com',
//   },

//   /**
//    * Invalid data for testing validation errors
//    */
//   invalidData: {
//     value: 'missing required fields',
//     // Missing name and id
//   },

//   /**
//    * Sample metadata for testing
//    */
//   sampleMetadata: {
//     userId: 'user-123',
//     sessionId: 'session-456',
//     timestamp: 1704067200000,
//     source: 'test',
//   },

//   /**
//    * Sample complex nested data
//    */
//   complexData: {
//     users: [
//       { id: 1, name: 'Alice', role: 'admin' },
//       { id: 2, name: 'Bob', role: 'user' },
//       { id: 3, name: 'Charlie', role: 'user' },
//     ],
//     settings: {
//       theme: 'dark',
//       notifications: true,
//       language: 'en',
//     },
//     stats: {
//       totalUsers: 3,
//       activeUsers: 2,
//       lastUpdate: '2025-01-01T12:00:00Z',
//     },
//   },
// };

// /**
//  * Helper function to create mock requests
//  */
// export function createMockRequest(method: string, params: any = {}) {
//   return {
//     method,
//     params,
//     timestamp: Date.now(),
//   };
// }

// /**
//  * Helper function to create mock configuration
//  */
// export function createMockConfig(overrides: any = {}) {
//   return {
//     debugMode: false,
//     timeout: 5000,
//     customOption: 'test-value',
//     ...overrides,
//   };
// }
