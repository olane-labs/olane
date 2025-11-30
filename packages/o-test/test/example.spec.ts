// import { expect } from 'chai';
// import { ExampleTool } from '../src/example-tool.tool.js';
// import { oRequest } from '@olane/o-core';
// import { NodeState } from '@olane/o-node';
// import { mockData } from './fixtures/mock-data.js';

// /**
//  * Example tests for the ExampleTool
//  *
//  * These tests demonstrate:
//  * - Tool initialization and lifecycle
//  * - Method testing
//  * - Success and error cases
//  * - Using test fixtures
//  *
//  * Run with: npm test
//  */
// describe('ExampleTool', () => {
//   let tool: ExampleTool;

//   beforeEach(() => {
//     // Initialize a new tool instance before each test
//     tool = new ExampleTool({
//       debugMode: false,
//       timeout: 5000,
//     });
//   });

//   afterEach(async () => {
//     // Clean up after each test
//     if (tool && tool.state === NodeState.RUNNING) {
//       await tool.stop();
//     }
//   });

//   describe('Initialization', () => {
//     it('should initialize the tool successfully', async () => {
//       await tool.start();
//       expect(tool.state).to.equal(NodeState.RUNNING);
//     });

//     it('should initialize with custom configuration', () => {
//       const customTool = new ExampleTool({
//         debugMode: true,
//         timeout: 10000,
//         customOption: 'test-value',
//       });

//       expect(customTool).to.exist;
//     });

//     it('should stop the tool successfully', async () => {
//       await tool.start();
//       expect(tool.state).to.equal(NodeState.RUNNING);

//       await tool.stop();
//       expect(tool.state).to.equal(NodeState.STOPPED);
//     });
//   });

//   describe('example_method', () => {
//     beforeEach(async () => {
//       await tool.start();
//     });

//     it('should process a message successfully', async () => {
//       const request = new oRequest({
//         method: 'example_method',
//         params: { message: 'Hello, oLane!' },
//       });

//       const result = await tool.callMyTool(request);

//       expect(result.success).to.be.true;
//       expect(result.result).to.include('Hello, oLane!');
//       expect(result.result).to.include('Processed:');
//       expect(result.timestamp).to.be.a('number');
//     });

//     it('should process a message with metadata', async () => {
//       const request = new oRequest({
//         method: 'example_method',
//         params: {
//           message: 'Test message',
//           metadata: { userId: '123', source: 'test' },
//         },
//       });

//       const result = await tool.callMyTool(request);

//       expect(result.success).to.be.true;
//       expect(result.result).to.include('Test message');
//     });

//     it('should return error when message parameter is missing', async () => {
//       const request = new oRequest({
//         method: 'example_method',
//         params: {},
//       });

//       const result = await tool.callMyTool(request);

//       expect(result.success).to.be.false;
//       expect(result.error).to.include('required');
//     });

//     it('should use mock data from fixtures', async () => {
//       const request = new oRequest({
//         method: 'example_method',
//         params: { message: mockData.sampleMessage },
//       });

//       const result = await tool.callMyTool(request);

//       expect(result.success).to.be.true;
//       expect(result.result).to.include(mockData.sampleMessage);
//     });
//   });

//   describe('process_data', () => {
//     beforeEach(async () => {
//       await tool.start();
//     });

//     it('should process data in JSON format', async () => {
//       const testData = { name: 'John', age: 30 };
//       const request = new oRequest({
//         method: 'process_data',
//         params: {
//           data: testData,
//           options: { format: 'json' },
//         },
//       });

//       const result = await tool.callMyTool(request);

//       expect(result.success).to.be.true;
//       expect(result.data).to.deep.equal(testData);
//     });

//     it('should process data in text format', async () => {
//       const testData = { name: 'John', age: 30 };
//       const request = new oRequest({
//         method: 'process_data',
//         params: {
//           data: testData,
//           options: { format: 'text' },
//         },
//       });

//       const result = await tool.callMyTool(request);

//       expect(result.success).to.be.true;
//       expect(result.data).to.be.a('string');
//       expect(result.data).to.include('John');
//     });

//     it('should process data in HTML format', async () => {
//       const testData = { name: 'John', age: 30 };
//       const request = new oRequest({
//         method: 'process_data',
//         params: {
//           data: testData,
//           options: { format: 'html' },
//         },
//       });

//       const result = await tool.callMyTool(request);

//       expect(result.success).to.be.true;
//       expect(result.data).to.include('<pre>');
//       expect(result.data).to.include('John');
//     });

//     it('should return error when data parameter is missing', async () => {
//       const request = new oRequest({
//         method: 'process_data',
//         params: {},
//       });

//       const result = await tool.callMyTool(request);

//       expect(result.success).to.be.false;
//       expect(result.error).to.include('required');
//     });

//     it('should return error for unsupported format', async () => {
//       const request = new oRequest({
//         method: 'process_data',
//         params: {
//           data: { test: 'data' },
//           options: { format: 'invalid' as any },
//         },
//       });

//       const result = await tool.callMyTool(request);

//       expect(result.success).to.be.false;
//       expect(result.error).to.include('Unsupported format');
//     });

//     it('should validate data when requested', async () => {
//       const invalidData = { value: 'test' }; // No name or id field
//       const request = new oRequest({
//         method: 'process_data',
//         params: {
//           data: invalidData,
//           options: { validate: true },
//         },
//       });

//       const result = await tool.callMyTool(request);

//       expect(result.success).to.be.false;
//       expect(result.error).to.include('Validation failed');
//       expect(result.validationErrors).to.be.an('array');
//     });

//     it('should pass validation with valid data', async () => {
//       const validData = { name: 'John', age: 30 };
//       const request = new oRequest({
//         method: 'process_data',
//         params: {
//           data: validData,
//           options: { validate: true },
//         },
//       });

//       const result = await tool.callMyTool(request);

//       expect(result.success).to.be.true;
//       expect(result.data).to.deep.equal(validData);
//     });
//   });

//   describe('get_status', () => {
//     beforeEach(async () => {
//       await tool.start();
//     });

//     it('should return tool status', async () => {
//       const request = new oRequest({
//         method: 'get_status',
//         params: {},
//       });

//       const result = await tool.callMyTool(request);

//       expect(result.success).to.be.true;
//       expect(result.status).to.exist;
//       expect(result.status.state).to.equal(NodeState.RUNNING);
//       expect(result.status.address).to.include('o://example');
//       expect(result.status.methods).to.be.an('array');
//       expect(result.status.methods).to.include('example_method');
//       expect(result.status.methods).to.include('process_data');
//       expect(result.status.methods).to.include('get_status');
//     });

//     it('should include configuration in status', async () => {
//       const request = new oRequest({
//         method: 'get_status',
//         params: {},
//       });

//       const result = await tool.callMyTool(request);

//       expect(result.success).to.be.true;
//       expect(result.status.debugMode).to.be.a('boolean');
//       expect(result.status.timeout).to.be.a('number');
//     });
//   });

//   describe('Error Handling', () => {
//     beforeEach(async () => {
//       await tool.start();
//     });

//     it('should handle invalid method gracefully', async () => {
//       const request = new oRequest({
//         method: 'invalid_method',
//         params: {},
//       });

//       try {
//         await tool.callMyTool(request);
//         // Should throw or return error
//       } catch (error) {
//         expect(error).to.exist;
//       }
//     });
//   });
// });
