/**
 * User service for managing user profiles, authentication, and settings
 */

import { BaseService, ValidationError, NotFoundError } from './base/BaseService';
import { UserRepository, User } from '../repositories/UserRepository';
import { generateCorrelationId } from '../lib/logging/Logger';

/**
 * User creation data interface
 */
export interface CreateUserData {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
}

/**
 * User update data interface
 */
export interface UpdateUserData {
  full_name?: string;
  avatar_url?: string;
  subscription_tier?: string;
  subscription_status?: string;
}

/**
 * Onboarding step update interface
 */
export interface OnboardingStepUpdate {
  created_first_agent?: boolean;
  added_data_source?: boolean;
  connected_channel?: boolean;
  has_dismissed?: boolean;
}

/**
 * User service class
 */
export class UserService extends BaseService {
  private userRepository: UserRepository;

  constructor() {
    super('UserService');
    this.userRepository = new UserRepository();
  }

  /**
   * Create a new user profile
   */
  async createUser(
    userData: CreateUserData,
    correlationId: string = generateCorrelationId()
  ): Promise<User> {
    const startTime = Date.now();
    this.logOperationStart('createUser', { correlationId, userId: userData.id });

    try {
      // Validate required fields
      this.validateRequired(userData, ['id', 'email'], correlationId);

      // Validate email format
      if (!this.isValidEmail(userData.email)) {
        throw new ValidationError('Invalid email format');
      }

      // Check if user already exists
      const { data: existingUser } = await this.userRepository.findByEmail(
        userData.email,
        correlationId
      );

      if (existingUser) {
        throw new ValidationError('User with this email already exists');
      }

      // Create user with default onboarding steps
      const newUserData = {
        ...userData,
        onboarding_steps: {
          created_first_agent: false,
          added_data_source: false,
          connected_channel: false,
          has_dismissed: false
        }
      };

      const result = await this.userRepository.create(newUserData, correlationId);

      if (result.error) {
        throw result.error;
      }

      const duration = Date.now() - startTime;
      this.logOperationSuccess('createUser', { 
        correlationId, 
        userId: result.data!.id,
        duration 
      });

      return result.data!;

    } catch (error) {
      this.handleError(error, { 
        correlationId, 
        operation: 'createUser',
        userData: this.sanitizeForLogging(userData)
      });
    }
  }

  /**
   * Get user by ID
   */
  async getUserById(
    userId: string,
    correlationId: string = generateCorrelationId()
  ): Promise<User> {
    this.logOperationStart('getUserById', { correlationId, userId });

    try {
      this.validateRequired({ userId }, ['userId'], correlationId);

      const result = await this.userRepository.findById(userId, correlationId);

      if (result.error) {
        throw result.error;
      }

      if (!result.data) {
        throw new NotFoundError('User', userId);
      }

      this.logOperationSuccess('getUserById', { correlationId, userId });

      return result.data;

    } catch (error) {
      this.handleError(error, { 
        correlationId, 
        operation: 'getUserById',
        userId 
      });
    }
  }

  /**
   * Get user by email
   */
  async getUserByEmail(
    email: string,
    correlationId: string = generateCorrelationId()
  ): Promise<User> {
    this.logOperationStart('getUserByEmail', { correlationId, email });

    try {
      this.validateRequired({ email }, ['email'], correlationId);

      if (!this.isValidEmail(email)) {
        throw new ValidationError('Invalid email format');
      }

      const result = await this.userRepository.findByEmail(email, correlationId);

      if (result.error) {
        throw result.error;
      }

      if (!result.data) {
        throw new NotFoundError('User with email ' + email);
      }

      this.logOperationSuccess('getUserByEmail', { correlationId, email });

      return result.data;

    } catch (error) {
      this.handleError(error, { 
        correlationId, 
        operation: 'getUserByEmail',
        email 
      });
    }
  }

  /**
   * Update user profile
   */
  async updateUser(
    userId: string,
    updateData: UpdateUserData,
    correlationId: string = generateCorrelationId()
  ): Promise<User> {
    const startTime = Date.now();
    this.logOperationStart('updateUser', { correlationId, userId });

    try {
      this.validateRequired({ userId }, ['userId'], correlationId);

      // Verify user exists
      await this.getUserById(userId, correlationId);

      const result = await this.userRepository.update(userId, updateData, correlationId);

      if (result.error) {
        throw result.error;
      }

      const duration = Date.now() - startTime;
      this.logOperationSuccess('updateUser', { 
        correlationId, 
        userId,
        duration 
      });

      return result.data!;

    } catch (error) {
      this.handleError(error, { 
        correlationId, 
        operation: 'updateUser',
        userId,
        updateData: this.sanitizeForLogging(updateData)
      });
    }
  }

  /**
   * Update user onboarding steps
   */
  async updateOnboardingSteps(
    userId: string,
    steps: OnboardingStepUpdate,
    correlationId: string = generateCorrelationId()
  ): Promise<User> {
    const startTime = Date.now();
    this.logOperationStart('updateOnboardingSteps', { correlationId, userId });

    try {
      this.validateRequired({ userId }, ['userId'], correlationId);

      const result = await this.userRepository.updateOnboardingSteps(
        userId,
        steps,
        correlationId
      );

      if (result.error) {
        throw result.error;
      }

      const duration = Date.now() - startTime;
      this.logOperationSuccess('updateOnboardingSteps', { 
        correlationId, 
        userId,
        steps,
        duration 
      });

      return result.data!;

    } catch (error) {
      this.handleError(error, { 
        correlationId, 
        operation: 'updateOnboardingSteps',
        userId,
        steps
      });
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
    correlationId: string = generateCorrelationId()
  ): Promise<User> {
    const startTime = Date.now();
    this.logOperationStart('updateSubscription', { correlationId, userId });

    try {
      this.validateRequired({ userId }, ['userId'], correlationId);

      // Validate subscription tier if provided
      if (subscriptionData.subscription_tier) {
        const validTiers = ['free', 'pro', 'enterprise'];
        if (!validTiers.includes(subscriptionData.subscription_tier)) {
          throw new ValidationError(
            `Invalid subscription tier. Must be one of: ${validTiers.join(', ')}`
          );
        }
      }

      // Validate subscription status if provided
      if (subscriptionData.subscription_status) {
        const validStatuses = ['active', 'inactive', 'cancelled', 'past_due'];
        if (!validStatuses.includes(subscriptionData.subscription_status)) {
          throw new ValidationError(
            `Invalid subscription status. Must be one of: ${validStatuses.join(', ')}`
          );
        }
      }

      const result = await this.userRepository.updateSubscription(
        userId,
        subscriptionData,
        correlationId
      );

      if (result.error) {
        throw result.error;
      }

      const duration = Date.now() - startTime;
      this.logOperationSuccess('updateSubscription', { 
        correlationId, 
        userId,
        subscriptionData,
        duration 
      });

      return result.data!;

    } catch (error) {
      this.handleError(error, { 
        correlationId, 
        operation: 'updateSubscription',
        userId,
        subscriptionData
      });
    }
  }

  /**
   * Get user dashboard statistics
   */
  async getUserStats(
    userId: string,
    correlationId: string = generateCorrelationId()
  ): Promise<{
    agentCount: number;
    messageCount: number;
    connectionCount: number;
  }> {
    this.logOperationStart('getUserStats', { correlationId, userId });

    try {
      this.validateRequired({ userId }, ['userId'], correlationId);

      const result = await this.userRepository.getUserStats(userId, correlationId);

      if (result.error) {
        throw result.error;
      }

      this.logOperationSuccess('getUserStats', { 
        correlationId, 
        userId,
        stats: result.data
      });

      return result.data!;

    } catch (error) {
      this.handleError(error, { 
        correlationId, 
        operation: 'getUserStats',
        userId 
      });
    }
  }

  /**
   * Check if user has completed onboarding
   */
  async hasCompletedOnboarding(
    userId: string,
    correlationId: string = generateCorrelationId()
  ): Promise<boolean> {
    try {
      const user = await this.getUserById(userId, correlationId);
      
      const steps = user.onboarding_steps;
      if (!steps) return false;

      return steps.created_first_agent && 
             steps.added_data_source && 
             steps.connected_channel;

    } catch (error) {
      this.handleError(error, { 
        correlationId, 
        operation: 'hasCompletedOnboarding',
        userId 
      });
    }
  }

  /**
   * Validate email format
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}
