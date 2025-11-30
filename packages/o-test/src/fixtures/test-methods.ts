/**
 * Test method definitions for testing
 *
 * Provides sample oMethod definitions for testing tools
 */

import type { oMethod } from '@olane/o-protocol';

/**
 * Simple test method definition
 */
export const TEST_METHOD_SIMPLE: oMethod = {
  name: 'test_method',
  description: 'Simple test method for unit testing',
  parameters: [
    {
      name: 'param1',
      type: 'string',
      description: 'First parameter',
      required: true,
      exampleValues: ['test-value'],
    },
  ],
  examples: [
    {
      description: 'Basic usage',
      params: { param1: 'test' },
      expectedResult: {
        success: true,
        result: { data: { param1: 'test' } },
      },
    },
  ],
};

/**
 * Method with multiple parameters and types
 */
export const TEST_METHOD_COMPLEX: oMethod = {
  name: 'test_complex',
  description: 'Complex test method with multiple parameter types',
  parameters: [
    {
      name: 'stringParam',
      type: 'string',
      description: 'String parameter',
      required: true,
    },
    {
      name: 'numberParam',
      type: 'number',
      description: 'Number parameter',
      required: true,
    },
    {
      name: 'booleanParam',
      type: 'boolean',
      description: 'Boolean parameter',
      required: false,
      defaultValue: false,
    },
    {
      name: 'arrayParam',
      type: 'array',
      description: 'Array of strings',
      required: false,
      structure: {
        itemType: 'string',
      },
    },
  ],
};

/**
 * Method with validation and errors
 */
export const TEST_METHOD_VALIDATION: oMethod = {
  name: 'test_validation',
  description: 'Test method with strict validation',
  parameters: [
    {
      name: 'email',
      type: 'string',
      description: 'Valid email address',
      required: true,
      exampleValues: ['test@example.com'],
    },
    {
      name: 'age',
      type: 'number',
      description: 'Age must be >= 0',
      required: true,
    },
  ],
  commonErrors: [
    {
      errorCode: 'INVALID_EMAIL',
      message: 'Email format is invalid',
      remediation: 'Provide a valid email address',
      retryable: false,
    },
    {
      errorCode: 'INVALID_AGE',
      message: 'Age must be >= 0',
      remediation: 'Provide a non-negative age',
      retryable: false,
    },
  ],
};

/**
 * Collection of test methods
 */
export const TEST_METHODS: { [key: string]: oMethod } = {
  test_echo: {
    name: 'test_echo',
    description: 'Echo back the input parameters',
    parameters: [
      {
        name: 'message',
        type: 'string',
        description: 'Message to echo',
        required: true,
      },
    ],
  },
  test_add: {
    name: 'test_add',
    description: 'Add two numbers',
    parameters: [
      {
        name: 'a',
        type: 'number',
        description: 'First number',
        required: true,
      },
      {
        name: 'b',
        type: 'number',
        description: 'Second number',
        required: true,
      },
    ],
  },
  test_error: {
    name: 'test_error',
    description: 'Always throws an error (for testing error handling)',
    parameters: [],
  },
  test_timeout: {
    name: 'test_timeout',
    description: 'Simulates a timeout',
    parameters: [
      {
        name: 'delay',
        type: 'number',
        description: 'Delay in milliseconds',
        required: false,
        defaultValue: 5000,
      },
    ],
  },
};

/**
 * Get a test method definition by name
 */
export function getTestMethod(name: string): oMethod | undefined {
  return TEST_METHODS[name];
}

/**
 * Create a custom test method
 */
export function createTestMethod(
  name: string,
  description: string,
  parameters: any[] = []
): oMethod {
  return {
    name,
    description,
    parameters,
  };
}
