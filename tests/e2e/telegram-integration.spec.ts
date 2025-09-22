/**
 * End-to-End Tests for Telegram Integration
 * Tests complete Telegram integration setup and messaging flow
 */

import { test, expect, Page } from '@playwright/test';

test.describe('Telegram Integration', () => {
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    
    // Mock API responses
    await page.route('**/api/v1/agents', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: [{
            id: 'test-agent-id',
            name: 'Test Telegram Agent',
            type: 'customer_support',
            base_prompt: 'You are a helpful customer support agent',
            user_id: 'test-user-id'
          }]
        })
      });
    });

    // Mock Telegram API responses
    await page.route('**/api/v1/integrations/telegram/**', async route => {
      const url = route.request().url();
      
      if (url.includes('setupWebhook')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              webhook_url: 'https://example.com/webhook',
              bot_info: {
                id: 123456789,
                username: 'test_bot',
                first_name: 'Test Bot'
              }
            }
          })
        });
      } else if (url.includes('validateToken')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              valid: true,
              bot_info: {
                id: 123456789,
                username: 'test_bot',
                first_name: 'Test Bot'
              }
            }
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

  test('should setup telegram integration with custom token', async () => {
    // Login and navigate to agent
    await page.goto('/login');
    await page.fill('[data-testid=email]', 'test@example.com');
    await page.fill('[data-testid=password]', 'password123');
    await page.click('[data-testid=login-button]');
    
    await page.waitForURL('/dashboard');
    await page.click('[data-testid=agents-nav]');
    await page.click('[data-testid=agent-card]:first-child');
    
    // Navigate to integrations
    await page.click('[data-testid=integrations-tab]');
    
    // Setup Telegram integration
    await page.click('[data-testid=telegram-integration-card]');
    await expect(page.locator('[data-testid=telegram-setup-modal]')).toBeVisible();
    
    // Select custom token option
    await page.click('[data-testid=token-source-custom]');
    await expect(page.locator('[data-testid=bot-token-input]')).toBeVisible();
    
    // Enter bot token
    await page.fill('[data-testid=bot-token-input]', '123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11');
    
    // Validate token
    await page.click('[data-testid=validate-token-button]');
    await expect(page.locator('[data-testid=token-validation-success]')).toBeVisible();
    await expect(page.locator('[data-testid=bot-info]')).toContainText('Test Bot (@test_bot)');
    
    // Setup webhook
    await page.click('[data-testid=setup-webhook-button]');
    await expect(page.locator('[data-testid=webhook-setup-success]')).toBeVisible();
    
    // Complete setup
    await page.click('[data-testid=complete-setup-button]');
    await expect(page.locator('[data-testid=integration-success-message]')).toBeVisible();
    
    // Should show integration as connected
    await expect(page.locator('[data-testid=telegram-status]')).toContainText('Connected');
    await expect(page.locator('[data-testid=telegram-bot-username]')).toContainText('@test_bot');
  });

  test('should setup telegram integration with platform token', async () => {
    await page.goto('/login');
    await page.fill('[data-testid=email]', 'test@example.com');
    await page.fill('[data-testid=password]', 'password123');
    await page.click('[data-testid=login-button]');
    
    await page.waitForURL('/dashboard');
    await page.click('[data-testid=agents-nav]');
    await page.click('[data-testid=agent-card]:first-child');
    await page.click('[data-testid=integrations-tab]');
    
    // Setup Telegram with platform token
    await page.click('[data-testid=telegram-integration-card]');
    
    // Platform token should be selected by default
    await expect(page.locator('[data-testid=token-source-platform]')).toBeChecked();
    await expect(page.locator('[data-testid=bot-token-input]')).not.toBeVisible();
    
    // Should show platform bot info
    await expect(page.locator('[data-testid=platform-bot-info]')).toBeVisible();
    await expect(page.locator('[data-testid=platform-bot-info]')).toContainText('Intaj Platform Bot');
    
    // Setup webhook with platform token
    await page.click('[data-testid=setup-webhook-button]');
    await expect(page.locator('[data-testid=webhook-setup-success]')).toBeVisible();
    
    await page.click('[data-testid=complete-setup-button]');
    await expect(page.locator('[data-testid=integration-success-message]')).toBeVisible();
  });

  test('should validate bot token format', async () => {
    await page.goto('/login');
    await page.fill('[data-testid=email]', 'test@example.com');
    await page.fill('[data-testid=password]', 'password123');
    await page.click('[data-testid=login-button]');
    
    await page.waitForURL('/dashboard');
    await page.click('[data-testid=agents-nav]');
    await page.click('[data-testid=agent-card]:first-child');
    await page.click('[data-testid=integrations-tab]');
    
    await page.click('[data-testid=telegram-integration-card]');
    await page.click('[data-testid=token-source-custom]');
    
    // Test invalid token format
    await page.fill('[data-testid=bot-token-input]', 'invalid-token');
    await page.click('[data-testid=validate-token-button]');
    
    await expect(page.locator('[data-testid=token-format-error]')).toBeVisible();
    await expect(page.locator('[data-testid=token-format-error]')).toContainText('Invalid bot token format');
    
    // Test valid format
    await page.fill('[data-testid=bot-token-input]', '123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11');
    await expect(page.locator('[data-testid=token-format-error]')).not.toBeVisible();
  });

  test('should handle webhook setup errors', async () => {
    // Mock webhook setup failure
    await page.route('**/api/v1/integrations/telegram/setupWebhook', async route => {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: {
            code: 'WEBHOOK_SETUP_FAILED',
            message: 'Failed to set webhook URL'
          }
        })
      });
    });

    await page.goto('/login');
    await page.fill('[data-testid=email]', 'test@example.com');
    await page.fill('[data-testid=password]', 'password123');
    await page.click('[data-testid=login-button]');
    
    await page.waitForURL('/dashboard');
    await page.click('[data-testid=agents-nav]');
    await page.click('[data-testid=agent-card]:first-child');
    await page.click('[data-testid=integrations-tab]');
    
    await page.click('[data-testid=telegram-integration-card]');
    await page.click('[data-testid=token-source-custom]');
    await page.fill('[data-testid=bot-token-input]', '123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11');
    await page.click('[data-testid=validate-token-button]');
    
    // Try to setup webhook
    await page.click('[data-testid=setup-webhook-button]');
    
    // Should show error
    await expect(page.locator('[data-testid=webhook-error]')).toBeVisible();
    await expect(page.locator('[data-testid=webhook-error]')).toContainText('Failed to set webhook URL');
    
    // Should show retry button
    await expect(page.locator('[data-testid=retry-webhook-button]')).toBeVisible();
  });

  test('should test telegram integration', async () => {
    await page.goto('/login');
    await page.fill('[data-testid=email]', 'test@example.com');
    await page.fill('[data-testid=password]', 'password123');
    await page.click('[data-testid=login-button]');
    
    await page.waitForURL('/dashboard');
    await page.click('[data-testid=agents-nav]');
    await page.click('[data-testid=agent-card]:first-child');
    await page.click('[data-testid=integrations-tab]');
    
    // Assume integration is already set up
    await expect(page.locator('[data-testid=telegram-status]')).toContainText('Connected');
    
    // Mock test message API
    await page.route('**/api/v1/integrations/telegram/test', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            message_sent: true,
            message_id: 123,
            response: 'Hello! This is a test message from your Intaj agent.'
          }
        })
      });
    });
    
    // Test integration
    await page.click('[data-testid=test-telegram-button]');
    await expect(page.locator('[data-testid=test-modal]')).toBeVisible();
    
    await page.fill('[data-testid=test-chat-id]', '987654321');
    await page.fill('[data-testid=test-message]', 'Hello, this is a test!');
    await page.click('[data-testid=send-test-message]');
    
    // Should show success
    await expect(page.locator('[data-testid=test-success]')).toBeVisible();
    await expect(page.locator('[data-testid=test-response]')).toContainText('Test message sent successfully');
  });

  test('should show telegram integration analytics', async () => {
    await page.goto('/login');
    await page.fill('[data-testid=email]', 'test@example.com');
    await page.fill('[data-testid=password]', 'password123');
    await page.click('[data-testid=login-button]');
    
    await page.waitForURL('/dashboard');
    await page.click('[data-testid=agents-nav]');
    await page.click('[data-testid=agent-card]:first-child');
    await page.click('[data-testid=integrations-tab]');
    
    // Mock analytics data
    await page.route('**/api/v1/integrations/telegram/analytics', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            total_messages: 1250,
            total_users: 85,
            active_conversations: 12,
            response_time_avg: 1.2,
            success_rate: 0.94,
            daily_stats: [
              { date: '2024-01-01', messages: 45, users: 8 },
              { date: '2024-01-02', messages: 52, users: 12 },
              { date: '2024-01-03', messages: 38, users: 6 }
            ]
          }
        })
      });
    });
    
    // View analytics
    await page.click('[data-testid=telegram-analytics-button]');
    await expect(page.locator('[data-testid=analytics-modal]')).toBeVisible();
    
    // Should show key metrics
    await expect(page.locator('[data-testid=total-messages]')).toContainText('1,250');
    await expect(page.locator('[data-testid=total-users]')).toContainText('85');
    await expect(page.locator('[data-testid=active-conversations]')).toContainText('12');
    await expect(page.locator('[data-testid=response-time]')).toContainText('1.2s');
    await expect(page.locator('[data-testid=success-rate]')).toContainText('94%');
    
    // Should show chart
    await expect(page.locator('[data-testid=analytics-chart]')).toBeVisible();
  });

  test('should disconnect telegram integration', async () => {
    await page.goto('/login');
    await page.fill('[data-testid=email]', 'test@example.com');
    await page.fill('[data-testid=password]', 'password123');
    await page.click('[data-testid=login-button]');
    
    await page.waitForURL('/dashboard');
    await page.click('[data-testid=agents-nav]');
    await page.click('[data-testid=agent-card]:first-child');
    await page.click('[data-testid=integrations-tab]');
    
    // Mock disconnect API
    await page.route('**/api/v1/integrations/telegram/disconnect', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            disconnected: true
          }
        })
      });
    });
    
    // Disconnect integration
    await page.click('[data-testid=telegram-settings-button]');
    await page.click('[data-testid=disconnect-telegram-button]');
    
    // Should show confirmation dialog
    await expect(page.locator('[data-testid=disconnect-confirmation]')).toBeVisible();
    await expect(page.locator('[data-testid=disconnect-warning]')).toContainText('This will stop all Telegram messages');
    
    await page.click('[data-testid=confirm-disconnect]');
    
    // Should show success and update status
    await expect(page.locator('[data-testid=disconnect-success]')).toBeVisible();
    await expect(page.locator('[data-testid=telegram-status]')).toContainText('Not Connected');
    
    // Should show setup button again
    await expect(page.locator('[data-testid=telegram-integration-card]')).toBeVisible();
  });

  test('should handle rate limiting during setup', async () => {
    // Mock rate limit response
    await page.route('**/api/v1/integrations/telegram/setupWebhook', async route => {
      await route.fulfill({
        status: 429,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Too many requests. Please try again later.',
            retryAfter: 60
          }
        })
      });
    });

    await page.goto('/login');
    await page.fill('[data-testid=email]', 'test@example.com');
    await page.fill('[data-testid=password]', 'password123');
    await page.click('[data-testid=login-button]');
    
    await page.waitForURL('/dashboard');
    await page.click('[data-testid=agents-nav]');
    await page.click('[data-testid=agent-card]:first-child');
    await page.click('[data-testid=integrations-tab]');
    
    await page.click('[data-testid=telegram-integration-card]');
    await page.click('[data-testid=token-source-custom]');
    await page.fill('[data-testid=bot-token-input]', '123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11');
    await page.click('[data-testid=validate-token-button]');
    await page.click('[data-testid=setup-webhook-button]');
    
    // Should show rate limit message
    await expect(page.locator('[data-testid=rate-limit-error]')).toBeVisible();
    await expect(page.locator('[data-testid=rate-limit-error]')).toContainText('Too many requests');
    await expect(page.locator('[data-testid=retry-after]')).toContainText('Try again in 60 seconds');
    
    // Should disable setup button temporarily
    await expect(page.locator('[data-testid=setup-webhook-button]')).toBeDisabled();
  });

  test('should show webhook URL and allow copying', async () => {
    await page.goto('/login');
    await page.fill('[data-testid=email]', 'test@example.com');
    await page.fill('[data-testid=password]', 'password123');
    await page.click('[data-testid=login-button]');
    
    await page.waitForURL('/dashboard');
    await page.click('[data-testid=agents-nav]');
    await page.click('[data-testid=agent-card]:first-child');
    await page.click('[data-testid=integrations-tab]');
    
    // Assume integration is set up
    await page.click('[data-testid=telegram-settings-button]');
    await expect(page.locator('[data-testid=telegram-settings-modal]')).toBeVisible();
    
    // Should show webhook URL
    await expect(page.locator('[data-testid=webhook-url]')).toBeVisible();
    await expect(page.locator('[data-testid=webhook-url]')).toContainText('https://');
    
    // Should allow copying
    await page.click('[data-testid=copy-webhook-url]');
    await expect(page.locator('[data-testid=copy-success]')).toBeVisible();
  });

  test('should validate permissions for bot token', async () => {
    // Mock token validation with insufficient permissions
    await page.route('**/api/v1/integrations/telegram/validateToken', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: {
            code: 'INSUFFICIENT_PERMISSIONS',
            message: 'Bot does not have required permissions',
            required_permissions: ['send_messages', 'receive_messages']
          }
        })
      });
    });

    await page.goto('/login');
    await page.fill('[data-testid=email]', 'test@example.com');
    await page.fill('[data-testid=password]', 'password123');
    await page.click('[data-testid=login-button]');
    
    await page.waitForURL('/dashboard');
    await page.click('[data-testid=agents-nav]');
    await page.click('[data-testid=agent-card]:first-child');
    await page.click('[data-testid=integrations-tab]');
    
    await page.click('[data-testid=telegram-integration-card]');
    await page.click('[data-testid=token-source-custom]');
    await page.fill('[data-testid=bot-token-input]', '123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11');
    await page.click('[data-testid=validate-token-button]');
    
    // Should show permission error
    await expect(page.locator('[data-testid=permission-error]')).toBeVisible();
    await expect(page.locator('[data-testid=permission-error]')).toContainText('Bot does not have required permissions');
    
    // Should show required permissions
    await expect(page.locator('[data-testid=required-permissions]')).toBeVisible();
    await expect(page.locator('[data-testid=required-permissions]')).toContainText('send_messages');
    await expect(page.locator('[data-testid=required-permissions]')).toContainText('receive_messages');
  });
});
