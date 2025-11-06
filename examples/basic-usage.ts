/**
 * Basic Usage Example
 * Demonstrates core functionality of the security service
 */

import { SecretService, ApiKeyService } from '../index';

async function basicExample() {
  // Initialize services
  const secretService = new SecretService();
  const apiKeyService = new ApiKeyService();

  // Store a secret
  console.log('Storing secret...');
  await secretService.storeSecret('DATABASE_URL', 'postgresql://localhost:5432/mydb');

  // Retrieve a secret
  console.log('Retrieving secret...');
  const dbUrl = await secretService.getSecret('DATABASE_URL');
  console.log('Database URL:', dbUrl);

  // Create an API key
  console.log('Creating API key...');
  const apiKey = await apiKeyService.createApiKey({
    name: 'Test API Key',
    value: 'sk_test_123456789',
    keyType: 'api_key',
    environment: 'development',
    projectId: 'project-uuid',
    tags: ['test'],
    rotationFrequency: 90
  }, 'user-uuid');

  console.log('API Key created:', apiKey.id);

  // List API keys
  console.log('Listing API keys...');
  const keys = await apiKeyService.getApiKeys('org-uuid');
  console.log(`Found ${keys.length} API keys`);
}

// Run example
basicExample().catch(console.error);
