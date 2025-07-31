// Test script for Vortex MCP SDK
const { VortexMCPClient } = require('./packages/vortex-mcp-sdk/dist/index.js');

console.log('Vortex MCP SDK Test');
console.log('===================');

// Test that we can import the SDK
console.log('✓ SDK imported successfully');

// Test creating a client instance (without actually connecting)
try {
  const client = new VortexMCPClient({
    vortexEndpoint: 'https://api.vortex-secure.com',
    mcpToken: 'test-token',
    toolId: 'test-tool',
    toolName: 'Test Tool'
  });
  console.log('✓ VortexMCPClient instantiated successfully');
  console.log('✓ SDK test completed successfully');
} catch (error) {
  console.error('✗ Error testing SDK:', error.message);
}
