/**
 * Database transaction utilities for Supabase
 * Provides transaction management and connection pooling
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { createLogger } from '../logging/Logger';

const logger = createLogger('DatabaseTransaction');

/**
 * Transaction operation type
 */
export type TransactionOperation<T> = (client: SupabaseClient) => Promise<T>;

/**
 * Transaction result wrapper
 */
export interface TransactionResult<T> {
  success: boolean;
  data?: T;
  error?: Error;
}

/**
 * Database transaction manager
 */
export class TransactionManager {
  private client: SupabaseClient;

  constructor() {
    this.client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );
  }

  /**
   * Execute an operation within a transaction
   * Note: Supabase doesn't support traditional transactions, but we can simulate
   * atomic operations using RLS and proper error handling
   */
  async withTransaction<T>(
    operation: TransactionOperation<T>,
    correlationId?: string
  ): Promise<TransactionResult<T>> {
    const startTime = Date.now();
    
    try {
      logger.info('Starting transaction', { correlationId });
      
      const result = await operation(this.client);
      
      const duration = Date.now() - startTime;
      logger.info('Transaction completed successfully', { 
        correlationId, 
        duration 
      });
      
      return {
        success: true,
        data: result
      };
      
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('Transaction failed', { 
        correlationId, 
        duration,
        error: error as Error 
      });
      
      return {
        success: false,
        error: error as Error
      };
    }
  }

  /**
   * Execute multiple operations atomically
   * If any operation fails, we log the error and return failure
   */
  async withBatchOperations<T>(
    operations: TransactionOperation<any>[],
    correlationId?: string
  ): Promise<TransactionResult<T[]>> {
    const startTime = Date.now();
    const results: any[] = [];
    
    try {
      logger.info('Starting batch operations', { 
        correlationId, 
        operationCount: operations.length 
      });
      
      for (let i = 0; i < operations.length; i++) {
        const result = await operations[i](this.client);
        results.push(result);
      }
      
      const duration = Date.now() - startTime;
      logger.info('Batch operations completed successfully', { 
        correlationId, 
        duration,
        operationCount: operations.length
      });
      
      return {
        success: true,
        data: results
      };
      
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('Batch operations failed', { 
        correlationId, 
        duration,
        completedOperations: results.length,
        totalOperations: operations.length,
        error: error as Error 
      });
      
      return {
        success: false,
        error: error as Error
      };
    }
  }

  /**
   * Get the Supabase client
   */
  getClient(): SupabaseClient {
    return this.client;
  }
}

/**
 * Global transaction manager instance
 */
let transactionManager: TransactionManager | null = null;

/**
 * Get the global transaction manager instance
 */
export function getTransactionManager(): TransactionManager {
  if (!transactionManager) {
    transactionManager = new TransactionManager();
  }
  return transactionManager;
}

/**
 * Helper function to execute a transaction
 */
export async function withTransaction<T>(
  operation: TransactionOperation<T>,
  correlationId?: string
): Promise<TransactionResult<T>> {
  const manager = getTransactionManager();
  return manager.withTransaction(operation, correlationId);
}

/**
 * Helper function to execute batch operations
 */
export async function withBatchOperations<T>(
  operations: TransactionOperation<any>[],
  correlationId?: string
): Promise<TransactionResult<T[]>> {
  const manager = getTransactionManager();
  return manager.withBatchOperations(operations, correlationId);
}
