/**
 * User repository for managing user profiles and authentication data
 */

import { BaseRepository, BaseEntity } from './base/BaseRepository';

/**
 * User profile entity interface
 */
export interface User extends BaseEntity {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  subscription_tier?: string;
  subscription_status?: string;
  onboarding_steps?: {
    created_first_agent: boolean;
    added_data_source: boolean;
    connected_channel: boolean;
    has_dismissed: boolean;
  };
  created_at: string;
  updated_at: string;
}

/**
 * User settings entity interface
 */
export interface UserSettings extends BaseEntity {
  id: string;
  user_id: string;
  onboarding_steps: {
    created_first_agent: boolean;
    added_data_source: boolean;
    connected_channel: boolean;
    has_dismissed: boolean;
  };
  created_at: string;
  updated_at: string;
}

/**
 * User repository class
 */
export class UserRepository extends BaseRepository<User> {
  constructor() {
    super('profiles');
  }

  /**
   * Find user by email
   */
  async findByEmail(email: string, correlationId?: string) {
    try {
      this.logger.debug('Finding user by email', { correlationId, email });

      const { data, error } = await this.client
        .from(this.tableName)
        .select('*')
        .eq('email', email)
        .single();

      if (error) {
        this.logger.error('Error finding user by email', {
          correlationId,
          email,
          error
        });
        return { data: null, error };
      }

      return { data: data as User, error: null };

    } catch (error) {
      this.logger.error('Exception finding user by email', {
        correlationId,
        email,
        error: error as Error
      });
      return { data: null, error: error as Error };
    }
  }

  /**
   * Update user onboarding steps
   */
  async updateOnboardingSteps(
    userId: string,
    steps: Partial<User['onboarding_steps']>,
    correlationId?: string
  ) {
    try {
      this.logger.debug('Updating user onboarding steps', { 
        correlationId, 
        userId,
        steps 
      });

      // First get current onboarding steps
      const { data: currentUser } = await this.findById(userId, correlationId);
      if (!currentUser) {
        throw new Error('User not found');
      }

      const updatedSteps = {
        ...currentUser.onboarding_steps,
        ...steps
      };

      const { data, error } = await this.client
        .from(this.tableName)
        .update({ 
          onboarding_steps: updatedSteps,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)
        .select()
        .single();

      if (error) {
        this.logger.error('Error updating user onboarding steps', {
          correlationId,
          userId,
          error
        });
        return { data: null, error };
      }

      this.logger.info('Updated user onboarding steps', { 
        correlationId, 
        userId 
      });

      return { data: data as User, error: null };

    } catch (error) {
      this.logger.error('Exception updating user onboarding steps', {
        correlationId,
        userId,
        error: error as Error
      });
      return { data: null, error: error as Error };
    }
  }

  /**
   * Update user subscription
   */
  async updateSubscription(
    userId: string,
    subscriptionData: {
      subscription_tier?: string;
      subscription_status?: string;
    },
    correlationId?: string
  ) {
    try {
      this.logger.debug('Updating user subscription', { 
        correlationId, 
        userId,
        subscriptionData 
      });

      const { data, error } = await this.client
        .from(this.tableName)
        .update({
          ...subscriptionData,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)
        .select()
        .single();

      if (error) {
        this.logger.error('Error updating user subscription', {
          correlationId,
          userId,
          error
        });
        return { data: null, error };
      }

      this.logger.info('Updated user subscription', { 
        correlationId, 
        userId,
        tier: subscriptionData.subscription_tier,
        status: subscriptionData.subscription_status
      });

      return { data: data as User, error: null };

    } catch (error) {
      this.logger.error('Exception updating user subscription', {
        correlationId,
        userId,
        error: error as Error
      });
      return { data: null, error: error as Error };
    }
  }

  /**
   * Get user statistics
   */
  async getUserStats(userId: string, correlationId?: string) {
    try {
      this.logger.debug('Getting user statistics', { correlationId, userId });

      // Get agent count
      const { count: agentCount } = await this.client
        .from('agents')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);

      // Get message count
      const { count: messageCount } = await this.client
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);

      // Get connection count
      const { count: connectionCount } = await this.client
        .from('connections')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);

      const stats = {
        agentCount: agentCount || 0,
        messageCount: messageCount || 0,
        connectionCount: connectionCount || 0
      };

      this.logger.debug('Retrieved user statistics', { 
        correlationId, 
        userId, 
        stats 
      });

      return { data: stats, error: null };

    } catch (error) {
      this.logger.error('Exception getting user statistics', {
        correlationId,
        userId,
        error: error as Error
      });
      return { data: null, error: error as Error };
    }
  }
}
