/**
 * Mock Service Worker Server Setup
 * Provides API mocking for tests
 */

import { setupServer } from 'msw/node';
import { handlers } from './msw-handlers';

// Setup server with handlers
export const server = setupServer(...handlers);

// Export for use in tests
export { handlers };
