// jest.config.js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node', // Default environment
  testTimeout: 30000, // Increase test timeout for Puppeteer tests
};