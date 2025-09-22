/**
 * End-to-End Tests for Agent Creation Flow
 * Tests complete user journey from login to agent deployment
 */

import { test, expect, Page } from '@playwright/test';

test.describe('Agent Creation Flow', () => {
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    
    // Set up test environment
    await page.goto('/');
    
    // Mock API responses for consistent testing
    await page.route('**/api/v1/agents', async route => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              id: 'test-agent-id',
              name: 'Test Support Agent',
              type: 'customer_support',
              base_prompt: 'You are a helpful customer support agent',
              model: 'gpt-4o',
              user_id: 'test-user-id',
              created_at: new Date().toISOString()
            }
          })
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: [],
            pagination: { page: 1, limit: 10, total: 0 }
          })
        });
      }
    });

    // Mock authentication
    await page.route('**/api/auth/**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: {
            id: 'test-user-id',
            email: 'test@example.com',
            role: 'user'
          }
        })
      });
    });
  });

  test.afterEach(async () => {
    await page.close();
  });

  test('should complete full agent creation flow', async () => {
    // Step 1: Login
    await page.goto('/login');
    await page.fill('[data-testid=email]', 'test@example.com');
    await page.fill('[data-testid=password]', 'password123');
    await page.click('[data-testid=login-button]');
    
    // Wait for redirect to dashboard
    await page.waitForURL('/dashboard');
    await expect(page.locator('[data-testid=dashboard-title]')).toBeVisible();

    // Step 2: Navigate to agents page
    await page.click('[data-testid=agents-nav]');
    await page.waitForURL('/dashboard/agents');
    
    // Step 3: Start agent creation
    await page.click('[data-testid=create-agent-button]');
    await page.waitForURL('/dashboard/agents/create');

    // Step 4: Fill agent form
    await page.fill('[data-testid=agent-name]', 'Test Support Agent');
    await page.selectOption('[data-testid=agent-type]', 'customer_support');
    await page.fill('[data-testid=base-prompt]', 'You are a helpful customer support agent');
    await page.selectOption('[data-testid=model-select]', 'gpt-4o');
    
    // Advanced settings
    await page.click('[data-testid=advanced-settings-toggle]');
    await page.fill('[data-testid=temperature-input]', '0.7');
    await page.fill('[data-testid=max-tokens-input]', '1000');

    // Step 5: Save agent
    await page.click('[data-testid=save-agent]');
    
    // Step 6: Verify creation success
    await expect(page.locator('[data-testid=success-message]')).toBeVisible();
    await expect(page.locator('[data-testid=success-message]')).toContainText('Agent created successfully');
    
    // Should redirect to agent details page
    await page.waitForURL('/dashboard/agents/test-agent-id');
    await expect(page.locator('[data-testid=agent-name]')).toContainText('Test Support Agent');
    await expect(page.locator('[data-testid=agent-type]')).toContainText('Customer Support');
  });

  test('should validate required fields', async () => {
    await page.goto('/login');
    await page.fill('[data-testid=email]', 'test@example.com');
    await page.fill('[data-testid=password]', 'password123');
    await page.click('[data-testid=login-button]');
    
    await page.waitForURL('/dashboard');
    await page.click('[data-testid=agents-nav]');
    await page.click('[data-testid=create-agent-button]');

    // Try to save without filling required fields
    await page.click('[data-testid=save-agent]');

    // Should show validation errors
    await expect(page.locator('[data-testid=name-error]')).toBeVisible();
    await expect(page.locator('[data-testid=name-error]')).toContainText('Agent name is required');
    
    await expect(page.locator('[data-testid=type-error]')).toBeVisible();
    await expect(page.locator('[data-testid=type-error]')).toContainText('Agent type is required');
    
    await expect(page.locator('[data-testid=prompt-error]')).toBeVisible();
    await expect(page.locator('[data-testid=prompt-error]')).toContainText('Base prompt is required');
  });

  test('should test agent before saving', async () => {
    await page.goto('/login');
    await page.fill('[data-testid=email]', 'test@example.com');
    await page.fill('[data-testid=password]', 'password123');
    await page.click('[data-testid=login-button]');
    
    await page.waitForURL('/dashboard');
    await page.click('[data-testid=agents-nav]');
    await page.click('[data-testid=create-agent-button]');

    // Fill form
    await page.fill('[data-testid=agent-name]', 'Test Agent');
    await page.selectOption('[data-testid=agent-type]', 'customer_support');
    await page.fill('[data-testid=base-prompt]', 'You are a helpful assistant');

    // Mock test response
    await page.route('**/api/v1/agents/*/test', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            response: 'Hello! How can I help you today?',
            tokens: { input: 10, output: 15 },
            model: 'gpt-4o'
          }
        })
      });
    });

    // Test the agent
    await page.click('[data-testid=test-agent-button]');
    await page.fill('[data-testid=test-message-input]', 'Hello, how can you help me?');
    await page.click('[data-testid=send-test-message]');

    // Should show test response
    await expect(page.locator('[data-testid=test-response]')).toBeVisible();
    await expect(page.locator('[data-testid=test-response]')).toContainText('Hello! How can I help you today?');
    
    // Should show token usage
    await expect(page.locator('[data-testid=token-usage]')).toBeVisible();
    await expect(page.locator('[data-testid=token-usage]')).toContainText('Input: 10, Output: 15');
  });

  test('should handle agent creation errors', async () => {
    await page.goto('/login');
    await page.fill('[data-testid=email]', 'test@example.com');
    await page.fill('[data-testid=password]', 'password123');
    await page.click('[data-testid=login-button]');
    
    await page.waitForURL('/dashboard');
    await page.click('[data-testid=agents-nav]');
    await page.click('[data-testid=create-agent-button]');

    // Mock API error
    await page.route('**/api/v1/agents', async route => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            error: {
              code: 'CREATION_FAILED',
              message: 'Failed to create agent due to server error'
            }
          })
        });
      }
    });

    // Fill form and submit
    await page.fill('[data-testid=agent-name]', 'Test Agent');
    await page.selectOption('[data-testid=agent-type]', 'customer_support');
    await page.fill('[data-testid=base-prompt]', 'You are a helpful assistant');
    await page.click('[data-testid=save-agent]');

    // Should show error message
    await expect(page.locator('[data-testid=error-message]')).toBeVisible();
    await expect(page.locator('[data-testid=error-message]')).toContainText('Failed to create agent');
  });

  test('should save draft and restore', async () => {
    await page.goto('/login');
    await page.fill('[data-testid=email]', 'test@example.com');
    await page.fill('[data-testid=password]', 'password123');
    await page.click('[data-testid=login-button]');
    
    await page.waitForURL('/dashboard');
    await page.click('[data-testid=agents-nav]');
    await page.click('[data-testid=create-agent-button]');

    // Fill partial form
    await page.fill('[data-testid=agent-name]', 'Draft Agent');
    await page.selectOption('[data-testid=agent-type]', 'sales');
    await page.fill('[data-testid=base-prompt]', 'You are a sales assistant');

    // Save as draft
    await page.click('[data-testid=save-draft-button]');
    await expect(page.locator('[data-testid=draft-saved-message]')).toBeVisible();

    // Navigate away and back
    await page.click('[data-testid=dashboard-nav]');
    await page.click('[data-testid=agents-nav]');
    await page.click('[data-testid=create-agent-button]');

    // Should restore draft
    await expect(page.locator('[data-testid=restore-draft-banner]')).toBeVisible();
    await page.click('[data-testid=restore-draft-button]');

    // Form should be populated
    await expect(page.locator('[data-testid=agent-name]')).toHaveValue('Draft Agent');
    await expect(page.locator('[data-testid=agent-type]')).toHaveValue('sales');
    await expect(page.locator('[data-testid=base-prompt]')).toHaveValue('You are a sales assistant');
  });

  test('should show character count for prompts', async () => {
    await page.goto('/login');
    await page.fill('[data-testid=email]', 'test@example.com');
    await page.fill('[data-testid=password]', 'password123');
    await page.click('[data-testid=login-button]');
    
    await page.waitForURL('/dashboard');
    await page.click('[data-testid=agents-nav]');
    await page.click('[data-testid=create-agent-button]');

    // Type in prompt field
    const promptText = 'You are a helpful customer support agent for our company.';
    await page.fill('[data-testid=base-prompt]', promptText);

    // Should show character count
    await expect(page.locator('[data-testid=prompt-char-count]')).toBeVisible();
    await expect(page.locator('[data-testid=prompt-char-count]')).toContainText(`${promptText.length} characters`);

    // Should warn when approaching limit
    const longPrompt = 'A'.repeat(4000);
    await page.fill('[data-testid=base-prompt]', longPrompt);
    await expect(page.locator('[data-testid=prompt-char-count]')).toHaveClass(/warning/);
  });

  test('should preview agent configuration', async () => {
    await page.goto('/login');
    await page.fill('[data-testid=email]', 'test@example.com');
    await page.fill('[data-testid=password]', 'password123');
    await page.click('[data-testid=login-button]');
    
    await page.waitForURL('/dashboard');
    await page.click('[data-testid=agents-nav]');
    await page.click('[data-testid=create-agent-button]');

    // Fill form
    await page.fill('[data-testid=agent-name]', 'Preview Agent');
    await page.selectOption('[data-testid=agent-type]', 'customer_support');
    await page.fill('[data-testid=base-prompt]', 'You are a helpful assistant');
    await page.selectOption('[data-testid=model-select]', 'gpt-4o');

    // Open preview
    await page.click('[data-testid=preview-button]');
    await expect(page.locator('[data-testid=preview-modal]')).toBeVisible();

    // Should show configuration summary
    await expect(page.locator('[data-testid=preview-name]')).toContainText('Preview Agent');
    await expect(page.locator('[data-testid=preview-type]')).toContainText('Customer Support');
    await expect(page.locator('[data-testid=preview-model]')).toContainText('gpt-4o');
    await expect(page.locator('[data-testid=preview-prompt]')).toContainText('You are a helpful assistant');

    // Should estimate costs
    await expect(page.locator('[data-testid=cost-estimate]')).toBeVisible();
    await expect(page.locator('[data-testid=cost-estimate]')).toContainText('Estimated cost per 1K messages');
  });

  test('should handle keyboard shortcuts', async () => {
    await page.goto('/login');
    await page.fill('[data-testid=email]', 'test@example.com');
    await page.fill('[data-testid=password]', 'password123');
    await page.click('[data-testid=login-button]');
    
    await page.waitForURL('/dashboard');
    await page.click('[data-testid=agents-nav]');
    await page.click('[data-testid=create-agent-button]');

    // Fill form
    await page.fill('[data-testid=agent-name]', 'Keyboard Test Agent');
    await page.selectOption('[data-testid=agent-type]', 'customer_support');
    await page.fill('[data-testid=base-prompt]', 'You are a helpful assistant');

    // Test Ctrl+S to save
    await page.keyboard.press('Control+s');
    await expect(page.locator('[data-testid=success-message]')).toBeVisible();

    // Test Ctrl+T to test (after creation)
    await page.keyboard.press('Control+t');
    await expect(page.locator('[data-testid=test-modal]')).toBeVisible();
  });

  test('should validate model compatibility', async () => {
    await page.goto('/login');
    await page.fill('[data-testid=email]', 'test@example.com');
    await page.fill('[data-testid=password]', 'password123');
    await page.click('[data-testid=login-button]');
    
    await page.waitForURL('/dashboard');
    await page.click('[data-testid=agents-nav]');
    await page.click('[data-testid=create-agent-button]');

    // Select agent type first
    await page.selectOption('[data-testid=agent-type]', 'code_assistant');

    // Model dropdown should show only compatible models
    const modelOptions = await page.locator('[data-testid=model-select] option').allTextContents();
    expect(modelOptions).toContain('GPT-4o');
    expect(modelOptions).toContain('Claude-3 Sonnet');
    
    // Should not contain models not suitable for code
    expect(modelOptions).not.toContain('GPT-3.5 Turbo');
  });

  test('should handle concurrent agent creation', async () => {
    // This test simulates multiple users creating agents simultaneously
    const page1 = await page.context().newPage();
    const page2 = await page.context().newPage();

    // Both users login and navigate to create agent
    for (const testPage of [page1, page2]) {
      await testPage.goto('/login');
      await testPage.fill('[data-testid=email]', 'test@example.com');
      await testPage.fill('[data-testid=password]', 'password123');
      await testPage.click('[data-testid=login-button]');
      await testPage.waitForURL('/dashboard');
      await testPage.click('[data-testid=agents-nav]');
      await testPage.click('[data-testid=create-agent-button]');
    }

    // Both fill forms with same name
    await page1.fill('[data-testid=agent-name]', 'Concurrent Agent');
    await page2.fill('[data-testid=agent-name]', 'Concurrent Agent');

    await page1.selectOption('[data-testid=agent-type]', 'customer_support');
    await page2.selectOption('[data-testid=agent-type]', 'customer_support');

    await page1.fill('[data-testid=base-prompt]', 'Assistant 1');
    await page2.fill('[data-testid=base-prompt]', 'Assistant 2');

    // Both try to save simultaneously
    await Promise.all([
      page1.click('[data-testid=save-agent]'),
      page2.click('[data-testid=save-agent]')
    ]);

    // One should succeed, one should get name conflict error
    const page1Success = await page1.locator('[data-testid=success-message]').isVisible();
    const page2Success = await page2.locator('[data-testid=success-message]').isVisible();
    const page1Error = await page1.locator('[data-testid=error-message]').isVisible();
    const page2Error = await page2.locator('[data-testid=error-message]').isVisible();

    // Exactly one should succeed and one should fail
    expect(page1Success !== page2Success).toBe(true);
    expect(page1Error !== page2Error).toBe(true);

    await page1.close();
    await page2.close();
  });
});
