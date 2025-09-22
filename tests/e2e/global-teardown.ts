/**
 * Playwright Global Teardown
 * Cleans up test environment after running E2E tests
 */

import { FullConfig } from '@playwright/test';
import { cleanupTestDatabase } from '../helpers/database';

async function globalTeardown(config: FullConfig) {
  console.log('🧹 Starting E2E test environment cleanup...');

  try {
    // Cleanup test database
    console.log('📊 Cleaning up test database...');
    await cleanupTestDatabase();

    // Additional cleanup tasks
    console.log('🔧 Performing additional cleanup...');
    
    // Clean up any temporary files, logs, etc.
    // You can add any global cleanup logic here

    console.log('✅ E2E test environment cleanup complete');

  } catch (error) {
    console.error('❌ E2E test environment cleanup failed:', error);
    // Don't throw error in teardown to avoid masking test failures
  }
}

export default globalTeardown;
