/**
 * Repository for managing agent templates
 * Handles CRUD operations for pre-built agent configurations
 */

import { BaseRepository, RepositoryResult } from './base/BaseRepository';

export interface AgentTemplate {
  id: string;
  type: 'customer_support' | 'sales' | 'marketing' | 'hr' | 'technical_support' | 'general';
  name: string;
  description?: string;
  base_prompt: string;
  default_config: Record<string, any>;
  available_tools: string[];
  model_recommendations: string[];
  use_cases: string[];
  tags: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateAgentTemplateData {
  type: AgentTemplate['type'];
  name: string;
  description?: string;
  base_prompt: string;
  default_config?: Record<string, any>;
  available_tools?: string[];
  model_recommendations?: string[];
  use_cases?: string[];
  tags?: string[];
  is_active?: boolean;
}

export interface UpdateAgentTemplateData {
  name?: string;
  description?: string;
  base_prompt?: string;
  default_config?: Record<string, any>;
  available_tools?: string[];
  model_recommendations?: string[];
  use_cases?: string[];
  tags?: string[];
  is_active?: boolean;
}

export class AgentTemplateRepository extends BaseRepository<AgentTemplate> {
  constructor() {
    super('agent_templates');
  }

  /**
   * Find active agent templates by type
   */
  async findByType(
    type: AgentTemplate['type'],
    correlationId?: string
  ): Promise<RepositoryResult<AgentTemplate[]>> {
    const startTime = Date.now();
    
    try {
      this.logger.info('Finding agent templates by type', {
        correlationId,
        type,
        operation: 'findByType'
      });

      const { data, error } = await this.client
        .from(this.tableName)
        .select('*')
        .eq('type', type)
        .eq('is_active', true)
        .order('name');

      if (error) {
        this.logger.error('Failed to find agent templates by type', {
          correlationId,
          type,
          error: error.message,
          duration: Date.now() - startTime
        });
        return { data: null, error };
      }

      this.logger.info('Successfully found agent templates by type', {
        correlationId,
        type,
        count: data?.length || 0,
        duration: Date.now() - startTime
      });

      return { data: data || [], error: null };
    } catch (error) {
      this.logger.error('Exception in findByType', {
        correlationId,
        type,
        error: error instanceof Error ? error.message : String(error),
        duration: Date.now() - startTime
      });
      return { data: null, error: error as Error };
    }
  }

  /**
   * Find all active agent templates
   */
  async findActive(correlationId?: string): Promise<RepositoryResult<AgentTemplate[]>> {
    const startTime = Date.now();
    
    try {
      this.logger.info('Finding active agent templates', {
        correlationId,
        operation: 'findActive'
      });

      const { data, error } = await this.client
        .from(this.tableName)
        .select('*')
        .eq('is_active', true)
        .order('type')
        .order('name');

      if (error) {
        this.logger.error('Failed to find active agent templates', {
          correlationId,
          error: error.message,
          duration: Date.now() - startTime
        });
        return { data: null, error };
      }

      this.logger.info('Successfully found active agent templates', {
        correlationId,
        count: data?.length || 0,
        duration: Date.now() - startTime
      });

      return { data: data || [], error: null };
    } catch (error) {
      this.logger.error('Exception in findActive', {
        correlationId,
        error: error instanceof Error ? error.message : String(error),
        duration: Date.now() - startTime
      });
      return { data: null, error: error as Error };
    }
  }

  /**
   * Search agent templates by name, description, or tags
   */
  async search(
    query: string,
    correlationId?: string
  ): Promise<RepositoryResult<AgentTemplate[]>> {
    const startTime = Date.now();
    
    try {
      this.logger.info('Searching agent templates', {
        correlationId,
        query,
        operation: 'search'
      });

      const { data, error } = await this.client
        .from(this.tableName)
        .select('*')
        .eq('is_active', true)
        .or(`name.ilike.%${query}%,description.ilike.%${query}%,tags.cs.{${query}}`)
        .order('name');

      if (error) {
        this.logger.error('Failed to search agent templates', {
          correlationId,
          query,
          error: error.message,
          duration: Date.now() - startTime
        });
        return { data: null, error };
      }

      this.logger.info('Successfully searched agent templates', {
        correlationId,
        query,
        count: data?.length || 0,
        duration: Date.now() - startTime
      });

      return { data: data || [], error: null };
    } catch (error) {
      this.logger.error('Exception in search', {
        correlationId,
        query,
        error: error instanceof Error ? error.message : String(error),
        duration: Date.now() - startTime
      });
      return { data: null, error: error as Error };
    }
  }

  /**
   * Get template statistics by type
   */
  async getTemplateStats(correlationId?: string): Promise<RepositoryResult<Record<string, number>>> {
    const startTime = Date.now();
    
    try {
      this.logger.info('Getting template statistics', {
        correlationId,
        operation: 'getTemplateStats'
      });

      const { data, error } = await this.client
        .from(this.tableName)
        .select('type')
        .eq('is_active', true);

      if (error) {
        this.logger.error('Failed to get template statistics', {
          correlationId,
          error: error.message,
          duration: Date.now() - startTime
        });
        return { data: null, error };
      }

      // Count templates by type
      const stats = (data || []).reduce((acc, template) => {
        acc[template.type] = (acc[template.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      this.logger.info('Successfully got template statistics', {
        correlationId,
        stats,
        duration: Date.now() - startTime
      });

      return { data: stats, error: null };
    } catch (error) {
      this.logger.error('Exception in getTemplateStats', {
        correlationId,
        error: error instanceof Error ? error.message : String(error),
        duration: Date.now() - startTime
      });
      return { data: null, error: error as Error };
    }
  }

  /**
   * Create a new agent template
   */
  async create(
    templateData: CreateAgentTemplateData,
    correlationId?: string
  ): Promise<RepositoryResult<AgentTemplate>> {
    const startTime = Date.now();
    
    try {
      this.logger.info('Creating agent template', {
        correlationId,
        templateData: {
          type: templateData.type,
          name: templateData.name
        },
        operation: 'create'
      });

      const { data, error } = await this.client
        .from(this.tableName)
        .insert({
          ...templateData,
          default_config: templateData.default_config || {},
          available_tools: templateData.available_tools || [],
          model_recommendations: templateData.model_recommendations || [],
          use_cases: templateData.use_cases || [],
          tags: templateData.tags || [],
          is_active: templateData.is_active ?? true
        })
        .select()
        .single();

      if (error) {
        this.logger.error('Failed to create agent template', {
          correlationId,
          templateData: {
            type: templateData.type,
            name: templateData.name
          },
          error: error.message,
          duration: Date.now() - startTime
        });
        return { data: null, error };
      }

      this.logger.info('Successfully created agent template', {
        correlationId,
        templateId: data.id,
        templateName: data.name,
        duration: Date.now() - startTime
      });

      return { data, error: null };
    } catch (error) {
      this.logger.error('Exception in create', {
        correlationId,
        templateData: {
          type: templateData.type,
          name: templateData.name
        },
        error: error instanceof Error ? error.message : String(error),
        duration: Date.now() - startTime
      });
      return { data: null, error: error as Error };
    }
  }

  /**
   * Update an agent template
   */
  async update(
    id: string,
    updateData: UpdateAgentTemplateData,
    correlationId?: string
  ): Promise<RepositoryResult<AgentTemplate>> {
    const startTime = Date.now();
    
    try {
      this.logger.info('Updating agent template', {
        correlationId,
        templateId: id,
        updateData: Object.keys(updateData),
        operation: 'update'
      });

      const { data, error } = await this.client
        .from(this.tableName)
        .update({
          ...updateData,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        this.logger.error('Failed to update agent template', {
          correlationId,
          templateId: id,
          error: error.message,
          duration: Date.now() - startTime
        });
        return { data: null, error };
      }

      this.logger.info('Successfully updated agent template', {
        correlationId,
        templateId: id,
        templateName: data.name,
        duration: Date.now() - startTime
      });

      return { data, error: null };
    } catch (error) {
      this.logger.error('Exception in update', {
        correlationId,
        templateId: id,
        error: error instanceof Error ? error.message : String(error),
        duration: Date.now() - startTime
      });
      return { data: null, error: error as Error };
    }
  }
}
