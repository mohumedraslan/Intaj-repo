/**
 * Playwright Global Setup
 * Prepares test environment before running E2E tests
 */

import { chromium, FullConfig } from '@playwright/test';
import { setupTestDatabase } from '../helpers/database';

async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting E2E test environment setup...');

  try {
    // Setup test database
    console.log('📊 Setting up test database...');
    await setupTestDatabase();

    // Start browser for authentication setup if needed
    const browser = await chromium.launch();
    const context = await browser.newContext();
    const page = await context.newPage();

    // Pre-authenticate test users if needed
    const baseURL = config.projects[0].use.baseURL || 'http://localhost:3000';
    
    try {
      // Check if the application is running
      await page.goto(baseURL, { timeout: 10000 });
      console.log('✅ Application is accessible');
    } catch (error) {
      console.warn('⚠️  Application might not be running:', error.message);
    }

    // Setup test data
    console.log('🔧 Setting up test data...');
    
    // You can add any global test data setup here
    // For example, creating test users, agents, etc.
    
    await browser.close();

    console.log('✅ E2E test environment setup complete');

  } catch (error) {
    console.error('❌ E2E test environment setup failed:', error);
    throw error;
  }
}

export default globalSetup;
