/**
 * Repository for managing agent deployments
 * Handles versioning and deployment tracking for agents
 */

import { BaseRepository, RepositoryResult } from './base/BaseRepository';

export interface Deployment {
  id: string;
  agent_id: string;
  version: number;
  config_snapshot: Record<string, any>;
  status: 'active' | 'inactive' | 'failed' | 'pending';
  deployment_type: 'manual' | 'auto' | 'rollback';
  notes?: string;
  deployed_at: string;
  deployed_by?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateDeploymentData {
  agent_id: string;
  config_snapshot: Record<string, any>;
  status?: Deployment['status'];
  deployment_type?: Deployment['deployment_type'];
  notes?: string;
  deployed_by?: string;
}

export class DeploymentRepository extends BaseRepository<Deployment> {
  constructor() {
    super('deployments');
  }

  /**
   * Find deployments by agent ID
   */
  async findByAgentId(
    agentId: string,
    correlationId?: string
  ): Promise<RepositoryResult<Deployment[]>> {
    const startTime = Date.now();
    
    try {
      this.logger.info('Finding deployments by agent ID', {
        correlationId,
        agentId,
        operation: 'findByAgentId'
      });

      const { data, error } = await this.client
        .from(this.tableName)
        .select('*')
        .eq('agent_id', agentId)
        .order('version', { ascending: false });

      if (error) {
        this.logger.error('Failed to find deployments by agent ID', {
          correlationId,
          agentId,
          error: error.message,
          duration: Date.now() - startTime
        });
        return { data: null, error: new Error(error.message) };
      }

      this.logger.info('Successfully found deployments by agent ID', {
        correlationId,
        agentId,
        count: data?.length || 0,
        duration: Date.now() - startTime
      });

      return { data: data || [], error: null };
    } catch (error) {
      this.logger.error('Exception in findByAgentId', {
        correlationId,
        agentId,
        error: error instanceof Error ? error.message : String(error),
        duration: Date.now() - startTime
      });
      return { data: null, error: new Error(error instanceof Error ? error.message : String(error)) };
    }
  }

  /**
   * Create a new deployment
   */
  async create(
    deploymentData: CreateDeploymentData,
    correlationId?: string
  ): Promise<RepositoryResult<Deployment>> {
    const startTime = Date.now();
    
    try {
      this.logger.info('Creating deployment', {
        correlationId,
        agentId: deploymentData.agent_id,
        deploymentType: deploymentData.deployment_type,
        operation: 'create'
      });

      const { data, error } = await this.client
        .from(this.tableName)
        .insert({
          ...deploymentData,
          status: deploymentData.status || 'active'
        })
        .select()
        .single();

      if (error) {
        this.logger.error('Failed to create deployment', {
          correlationId,
          agentId: deploymentData.agent_id,
          error: error.message,
          duration: Date.now() - startTime
        });
        return { data: null, error: new Error(error.message) };
      }

      this.logger.info('Successfully created deployment', {
        correlationId,
        deploymentId: data.id,
        agentId: data.agent_id,
        version: data.version,
        duration: Date.now() - startTime
      });

      return { data, error: null };
    } catch (error) {
      this.logger.error('Exception in create', {
        correlationId,
        agentId: deploymentData.agent_id,
        error: error instanceof Error ? error.message : String(error),
        duration: Date.now() - startTime
      });
      return { data: null, error: new Error(error instanceof Error ? error.message : String(error)) };
    }
  }
}