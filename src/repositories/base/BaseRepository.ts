/**
 * Base repository class providing common CRUD operations
 * All repositories should extend this class for consistency
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { createLogger, Logger, LogContext } from '../../lib/logging/Logger';
import { getTransactionManager } from '../../lib/database/transaction';

/**
 * Base entity interface
 */
export interface BaseEntity {
  id: string;
  created_at?: string;
  updated_at?: string;
}

/**
 * Query options for filtering and pagination
 */
export interface QueryOptions {
  limit?: number;
  offset?: number;
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
  filters?: Record<string, any>;
}

/**
 * Repository result wrapper
 */
export interface RepositoryResult<T> {
  data: T | null;
  error: Error | null;
}

/**
 * Repository list result wrapper
 */
export interface RepositoryListResult<T> {
  data: T[];
  count: number;
  error: Error | null;
}

/**
 * Abstract base repository class
 */
export abstract class BaseRepository<T extends BaseEntity> {
  protected client: SupabaseClient;
  protected logger: Logger;
  protected tableName: string;

  constructor(tableName: string) {
    this.tableName = tableName;
    this.client = getTransactionManager().getClient();
    this.logger = createLogger(`${tableName}Repository`);
  }

  /**
   * Find a record by ID
   */
  async findById(
    id: string, 
    correlationId?: string
  ): Promise<RepositoryResult<T>> {
    try {
      this.logger.debug(`Finding ${this.tableName} by ID`, { 
        correlationId, 
        id, 
        tableName: this.tableName 
      });

      const { data, error } = await this.client
        .from(this.tableName)
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        this.logger.error(`Error finding ${this.tableName} by ID`, {
          correlationId,
          id,
          error
        });
        return { data: null, error };
      }

      this.logger.debug(`Found ${this.tableName} by ID`, { 
        correlationId, 
        id,
        found: !!data 
      });

      return { data: data as T, error: null };

    } catch (error) {
      this.logger.error(`Exception finding ${this.tableName} by ID`, {
        correlationId,
        id,
        error: error as Error
      });
      return { data: null, error: error as Error };
    }
  }

  /**
   * Find records with optional filtering and pagination
   */
  async findMany(
    options: QueryOptions = {},
    correlationId?: string
  ): Promise<RepositoryListResult<T>> {
    try {
      this.logger.debug(`Finding ${this.tableName} records`, { 
        correlationId, 
        options: this.sanitizeOptions(options),
        tableName: this.tableName 
      });

      let query = this.client.from(this.tableName).select('*', { count: 'exact' });

      // Apply filters
      if (options.filters) {
        Object.entries(options.filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            query = query.eq(key, value);
          }
        });
      }

      // Apply ordering
      if (options.orderBy) {
        query = query.order(options.orderBy, { 
          ascending: options.orderDirection !== 'desc' 
        });
      } else {
        query = query.order('created_at', { ascending: false });
      }

      // Apply pagination
      if (options.limit) {
        query = query.limit(options.limit);
      }
      if (options.offset) {
        query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
      }

      const { data, error, count } = await query;

      if (error) {
        this.logger.error(`Error finding ${this.tableName} records`, {
          correlationId,
          options: this.sanitizeOptions(options),
          error
        });
        return { data: [], count: 0, error };
      }

      this.logger.debug(`Found ${this.tableName} records`, { 
        correlationId, 
        count: data?.length || 0,
        totalCount: count || 0
      });

      return { 
        data: (data as T[]) || [], 
        count: count || 0, 
        error: null 
      };

    } catch (error) {
      this.logger.error(`Exception finding ${this.tableName} records`, {
        correlationId,
        options: this.sanitizeOptions(options),
        error: error as Error
      });
      return { data: [], count: 0, error: error as Error };
    }
  }

  /**
   * Create a new record
   */
  async create(
    data: Omit<T, 'id' | 'created_at' | 'updated_at'>, 
    correlationId?: string
  ): Promise<RepositoryResult<T>> {
    try {
      this.logger.debug(`Creating ${this.tableName} record`, { 
        correlationId,
        tableName: this.tableName
      });

      const { data: result, error } = await this.client
        .from(this.tableName)
        .insert(data)
        .select()
        .single();

      if (error) {
        this.logger.error(`Error creating ${this.tableName} record`, {
          correlationId,
          error
        });
        return { data: null, error };
      }

      this.logger.info(`Created ${this.tableName} record`, { 
        correlationId, 
        id: result.id 
      });

      return { data: result as T, error: null };

    } catch (error) {
      this.logger.error(`Exception creating ${this.tableName} record`, {
        correlationId,
        error: error as Error
      });
      return { data: null, error: error as Error };
    }
  }

  /**
   * Update a record by ID
   */
  async update(
    id: string, 
    data: Partial<Omit<T, 'id' | 'created_at'>>, 
    correlationId?: string
  ): Promise<RepositoryResult<T>> {
    try {
      this.logger.debug(`Updating ${this.tableName} record`, { 
        correlationId, 
        id,
        tableName: this.tableName
      });

      const updateData = {
        ...data,
        updated_at: new Date().toISOString()
      };

      const { data: result, error } = await this.client
        .from(this.tableName)
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        this.logger.error(`Error updating ${this.tableName} record`, {
          correlationId,
          id,
          error
        });
        return { data: null, error };
      }

      this.logger.info(`Updated ${this.tableName} record`, { 
        correlationId, 
        id 
      });

      return { data: result as T, error: null };

    } catch (error) {
      this.logger.error(`Exception updating ${this.tableName} record`, {
        correlationId,
        id,
        error: error as Error
      });
      return { data: null, error: error as Error };
    }
  }

  /**
   * Delete a record by ID
   */
  async delete(
    id: string, 
    correlationId?: string
  ): Promise<RepositoryResult<boolean>> {
    try {
      this.logger.debug(`Deleting ${this.tableName} record`, { 
        correlationId, 
        id,
        tableName: this.tableName
      });

      const { error } = await this.client
        .from(this.tableName)
        .delete()
        .eq('id', id);

      if (error) {
        this.logger.error(`Error deleting ${this.tableName} record`, {
          correlationId,
          id,
          error
        });
        return { data: null, error };
      }

      this.logger.info(`Deleted ${this.tableName} record`, { 
        correlationId, 
        id 
      });

      return { data: true, error: null };

    } catch (error) {
      this.logger.error(`Exception deleting ${this.tableName} record`, {
        correlationId,
        id,
        error: error as Error
      });
      return { data: null, error: error as Error };
    }
  }

  /**
   * Check if a record exists by ID
   */
  async exists(
    id: string, 
    correlationId?: string
  ): Promise<RepositoryResult<boolean>> {
    try {
      const { data, error } = await this.client
        .from(this.tableName)
        .select('id')
        .eq('id', id)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
        return { data: null, error };
      }

      return { data: !!data, error: null };

    } catch (error) {
      return { data: null, error: error as Error };
    }
  }

  /**
   * Count records with optional filters
   */
  async count(
    filters?: Record<string, any>, 
    correlationId?: string
  ): Promise<RepositoryResult<number>> {
    try {
      let query = this.client
        .from(this.tableName)
        .select('*', { count: 'exact', head: true });

      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            query = query.eq(key, value);
          }
        });
      }

      const { count, error } = await query;

      if (error) {
        return { data: null, error };
      }

      return { data: count || 0, error: null };

    } catch (error) {
      return { data: null, error: error as Error };
    }
  }

  /**
   * Sanitize options for logging (remove sensitive data)
   */
  private sanitizeOptions(options: QueryOptions): Record<string, any> {
    const sanitized = { ...options };
    
    // Remove potentially sensitive filter values
    if (sanitized.filters) {
      const sensitiveFields = ['password', 'token', 'secret', 'key'];
      sensitiveFields.forEach(field => {
        if (sanitized.filters![field]) {
          sanitized.filters![field] = '[REDACTED]';
        }
      });
    }

    return sanitized;
  }
}
