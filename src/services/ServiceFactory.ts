/**
 * Service factory for dependency injection and service management
 * Provides centralized access to all services with proper initialization
 */

import { UserService } from './userService';
import { AgentService } from './agentService';
import { MessageService } from './messageService';
import { IntegrationService } from './integrationService';
import { LLMService } from './llmService';

/**
 * Service factory class for managing service instances
 */
export class ServiceFactory {
  private static instance: ServiceFactory;
  private services: Map<string, any> = new Map();

  private constructor() {
    // Private constructor for singleton pattern
  }

  /**
   * Get the singleton instance of ServiceFactory
   */
  static getInstance(): ServiceFactory {
    if (!ServiceFactory.instance) {
      ServiceFactory.instance = new ServiceFactory();
    }
    return ServiceFactory.instance;
  }

  /**
   * Get UserService instance
   */
  getUserService(): UserService {
    if (!this.services.has('UserService')) {
      this.services.set('UserService', new UserService());
    }
    return this.services.get('UserService');
  }

  /**
   * Get AgentService instance
   */
  getAgentService(): AgentService {
    if (!this.services.has('AgentService')) {
      this.services.set('AgentService', new AgentService());
    }
    return this.services.get('AgentService');
  }

  /**
   * Get MessageService instance
   */
  getMessageService(): MessageService {
    if (!this.services.has('MessageService')) {
      this.services.set('MessageService', new MessageService());
    }
    return this.services.get('MessageService');
  }

  /**
   * Get IntegrationService instance
   */
  getIntegrationService(): IntegrationService {
    if (!this.services.has('IntegrationService')) {
      this.services.set('IntegrationService', new IntegrationService());
    }
    return this.services.get('IntegrationService');
  }

  /**
   * Get LLMService instance
   */
  getLLMService(): LLMService {
    if (!this.services.has('LLMService')) {
      this.services.set('LLMService', new LLMService());
    }
    return this.services.get('LLMService');
  }

  /**
   * Clear all service instances (useful for testing)
   */
  clearServices(): void {
    this.services.clear();
  }

  /**
   * Get all initialized services
   */
  getInitializedServices(): string[] {
    return Array.from(this.services.keys());
  }
}

/**
 * Convenience functions for getting services
 */
export const getUserService = () => ServiceFactory.getInstance().getUserService();
export const getAgentService = () => ServiceFactory.getInstance().getAgentService();
export const getMessageService = () => ServiceFactory.getInstance().getMessageService();
export const getIntegrationService = () => ServiceFactory.getInstance().getIntegrationService();
export const getLLMService = () => ServiceFactory.getInstance().getLLMService();

/**
 * Initialize all services (useful for warming up)
 */
export const initializeAllServices = () => {
  const factory = ServiceFactory.getInstance();
  factory.getUserService();
  factory.getAgentService();
  factory.getMessageService();
  factory.getIntegrationService();
  factory.getLLMService();
};

/**
 * Service container type for dependency injection
 */
export interface ServiceContainer {
  userService: UserService;
  agentService: AgentService;
  messageService: MessageService;
  integrationService: IntegrationService;
  llmService: LLMService;
}

/**
 * Get all services as a container object
 */
export const getServiceContainer = (): ServiceContainer => {
  const factory = ServiceFactory.getInstance();
  return {
    userService: factory.getUserService(),
    agentService: factory.getAgentService(),
    messageService: factory.getMessageService(),
    integrationService: factory.getIntegrationService(),
    llmService: factory.getLLMService()
  };
};
   * Get AgentTemplateRepository instance
   */
  getAgentTemplateRepository(): AgentTemplateRepository {
    if (!this.services.has('AgentTemplateRepository')) {
      this.services.set('AgentTemplateRepository', new AgentTemplateRepository());
    }
    return this.services.get('AgentTemplateRepository');
  }

  /**
   * Get DeploymentRepository instance
   */
  getDeploymentRepository(): DeploymentRepository {
    if (!this.services.has('DeploymentRepository')) {
      this.services.set('DeploymentRepository', new DeploymentRepository());
    }
    return this.services.get('DeploymentRepository');
  }

  /**
   * Get UsageLogRepository instance
   */
  getUsageLogRepository(): UsageLogRepository {
    if (!this.services.has('UsageLogRepository')) {
      this.services.set('UsageLogRepository', new UsageLogRepository());
    }
    return this.services.get('UsageLogRepository');
  }

  /**
 * Convenience functions for getting repositories
 */
export const getAgentTemplateRepository = () => ServiceFactory.getInstance().getAgentTemplateRepository();
export const getDeploymentRepository = () => ServiceFactory.getInstance().getDeploymentRepository();
export const getUsageLogRepository = () => ServiceFactory.getInstance().getUsageLogRepository();

/**
