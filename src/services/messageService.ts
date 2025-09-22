/**
 * Message service for managing conversation messages and processing
 */

import { BaseService, ValidationError, NotFoundError } from './base/BaseService';
import { MessageRepository, Message } from '../repositories/MessageRepository';
import { ConversationRepository, Conversation } from '../repositories/ConversationRepository';
import { AgentRepository } from '../repositories/AgentRepository';
import { generateCorrelationId } from '../lib/logging/Logger';

/**
 * Message creation data interface
 */
export interface CreateMessageData {
  agent_id: string;
  conversation_id?: string;
  content: string;
  direction: Message['direction'];
  platform?: string;
  platform_message_id?: string;
  metadata?: Message['metadata'];
}

/**
 * Inbound message data interface
 */
export interface InboundMessageData {
  agent_id: string;
  content: string;
  platform: string;
  platform_message_id?: string;
  external_conversation_id: string;
  sender_id?: string;
  sender_name?: string;
  chat_id?: string;
  message_type?: string;
  metadata?: Record<string, any>;
}

/**
 * Message statistics interface
 */
export interface MessageStats {
  totalCount: number;
  inboundCount: number;
  outboundCount: number;
  failedCount: number;
  successRate: number;
}

/**
 * Message service class
 */
export class MessageService extends BaseService {
  private messageRepository: MessageRepository;
  private conversationRepository: ConversationRepository;
  private agentRepository: AgentRepository;

  constructor() {
    super('MessageService');
    this.messageRepository = new MessageRepository();
    this.conversationRepository = new ConversationRepository();
    this.agentRepository = new AgentRepository();
  }

  /**
   * Create a new message
   */
  async createMessage(
    userId: string,
    messageData: CreateMessageData,
    correlationId: string = generateCorrelationId()
  ): Promise<Message> {
    const startTime = Date.now();
    this.logOperationStart('createMessage', { correlationId, userId });

    try {
      // Validate required fields
      this.validateRequired(
        { userId, ...messageData }, 
        ['userId', 'agent_id', 'content', 'direction'], 
        correlationId
      );

      // Validate agent exists and user has access
      const agent = await this.agentRepository.findById(messageData.agent_id, correlationId);
      if (agent.error || !agent.data) {
        throw new NotFoundError('Agent', messageData.agent_id);
      }
      this.validateUserAccess(userId, agent.data.user_id, correlationId);

      // Validate message content
      this.validateMessageContent(messageData.content);

      // Create message
      const newMessageData = {
        ...messageData,
        user_id: userId,
        status: 'pending' as const
      };

      const result = await this.messageRepository.create(newMessageData, correlationId);

      if (result.error) {
        throw result.error;
      }

      const duration = Date.now() - startTime;
      this.logOperationSuccess('createMessage', { 
        correlationId, 
        userId,
        messageId: result.data!.id,
        direction: messageData.direction,
        duration 
      });

      return result.data!;

    } catch (error) {
      this.handleError(error, { 
        correlationId, 
        operation: 'createMessage',
        userId,
        messageData: this.sanitizeForLogging(messageData)
      });
    }
  }

  /**
   * Process inbound message from platform
   */
  async processInboundMessage(
    messageData: InboundMessageData,
    correlationId: string = generateCorrelationId()
  ): Promise<Message> {
    const startTime = Date.now();
    this.logOperationStart('processInboundMessage', { 
      correlationId, 
      agentId: messageData.agent_id,
      platform: messageData.platform
    });

    try {
      // Validate required fields
      this.validateRequired(
        messageData, 
        ['agent_id', 'content', 'platform', 'external_conversation_id'], 
        correlationId
      );

      // Get agent and validate
      const agent = await this.agentRepository.findById(messageData.agent_id, correlationId);
      if (agent.error || !agent.data) {
        throw new NotFoundError('Agent', messageData.agent_id);
      }

      // Check for duplicate message
      if (messageData.platform_message_id) {
        const existing = await this.messageRepository.findByPlatformMessageId(
          messageData.platform_message_id,
          messageData.platform,
          correlationId
        );
        if (existing.data) {
          this.logger.info('Duplicate message detected, returning existing', {
            correlationId,
            messageId: existing.data.id,
            platformMessageId: messageData.platform_message_id
          });
          return existing.data;
        }
      }

      // Find or create conversation
      const conversation = await this.conversationRepository.findOrCreate({
        agent_id: messageData.agent_id,
        user_id: agent.data.user_id,
        external_id: messageData.external_conversation_id,
        platform: messageData.platform,
        metadata: {
          participant_name: messageData.sender_name,
          participant_id: messageData.sender_id,
          chat_type: messageData.message_type || 'private'
        }
      }, correlationId);

      if (conversation.error || !conversation.data) {
        throw conversation.error || new Error('Failed to create conversation');
      }

      // Create inbound message
      const message = await this.messageRepository.create({
        agent_id: messageData.agent_id,
        user_id: agent.data.user_id,
        conversation_id: conversation.data.id,
        content: messageData.content,
        direction: 'inbound',
        status: 'pending',
        platform: messageData.platform,
        platform_message_id: messageData.platform_message_id,
        metadata: {
          sender_id: messageData.sender_id,
          sender_name: messageData.sender_name,
          chat_id: messageData.chat_id,
          message_type: messageData.message_type,
          ...messageData.metadata
        }
      }, correlationId);

      if (message.error || !message.data) {
        throw message.error || new Error('Failed to create message');
      }

      // Update conversation last message timestamp
      await this.conversationRepository.updateLastMessageAt(
        conversation.data.id,
        undefined,
        correlationId
      );

      const duration = Date.now() - startTime;
      this.logOperationSuccess('processInboundMessage', { 
        correlationId, 
        messageId: message.data.id,
        conversationId: conversation.data.id,
        platform: messageData.platform,
        duration 
      });

      return message.data;

    } catch (error) {
      this.handleError(error, { 
        correlationId, 
        operation: 'processInboundMessage',
        messageData: this.sanitizeForLogging(messageData)
      });
    }
  }

  /**
   * Get message by ID with user access validation
   */
  async getMessageById(
    messageId: string,
    userId: string,
    correlationId: string = generateCorrelationId()
  ): Promise<Message> {
    this.logOperationStart('getMessageById', { correlationId, messageId, userId });

    try {
      this.validateRequired({ messageId, userId }, ['messageId', 'userId'], correlationId);

      const result = await this.messageRepository.findById(messageId, correlationId);

      if (result.error) {
        throw result.error;
      }

      if (!result.data) {
        throw new NotFoundError('Message', messageId);
      }

      // Validate user access
      this.validateUserAccess(userId, result.data.user_id, correlationId);

      this.logOperationSuccess('getMessageById', { correlationId, messageId, userId });

      return result.data;

    } catch (error) {
      this.handleError(error, { 
        correlationId, 
        operation: 'getMessageById',
        messageId,
        userId 
      });
    }
  }

  /**
   * Get messages by conversation ID
   */
  async getConversationMessages(
    conversationId: string,
    userId: string,
    limit: number = 50,
    correlationId: string = generateCorrelationId()
  ): Promise<Message[]> {
    this.logOperationStart('getConversationMessages', { 
      correlationId, 
      conversationId, 
      userId,
      limit 
    });

    try {
      this.validateRequired(
        { conversationId, userId }, 
        ['conversationId', 'userId'], 
        correlationId
      );

      // Verify conversation exists and user has access
      const conversation = await this.conversationRepository.findById(conversationId, correlationId);
      if (conversation.error || !conversation.data) {
        throw new NotFoundError('Conversation', conversationId);
      }
      this.validateUserAccess(userId, conversation.data.user_id, correlationId);

      const result = await this.messageRepository.findByConversationId(
        conversationId,
        limit,
        correlationId
      );

      if (result.error) {
        throw result.error;
      }

      this.logOperationSuccess('getConversationMessages', { 
        correlationId, 
        conversationId,
        userId,
        count: result.data.length
      });

      return result.data;

    } catch (error) {
      this.handleError(error, { 
        correlationId, 
        operation: 'getConversationMessages',
        conversationId,
        userId,
        limit
      });
    }
  }

  /**
   * Get messages by agent ID
   */
  async getAgentMessages(
    agentId: string,
    userId: string,
    limit: number = 100,
    offset: number = 0,
    correlationId: string = generateCorrelationId()
  ): Promise<{ messages: Message[]; totalCount: number }> {
    this.logOperationStart('getAgentMessages', { 
      correlationId, 
      agentId, 
      userId,
      limit,
      offset 
    });

    try {
      this.validateRequired({ agentId, userId }, ['agentId', 'userId'], correlationId);

      // Verify agent exists and user has access
      const agent = await this.agentRepository.findById(agentId, correlationId);
      if (agent.error || !agent.data) {
        throw new NotFoundError('Agent', agentId);
      }
      this.validateUserAccess(userId, agent.data.user_id, correlationId);

      const result = await this.messageRepository.findByAgentId(
        agentId,
        limit,
        offset,
        correlationId
      );

      if (result.error) {
        throw result.error;
      }

      this.logOperationSuccess('getAgentMessages', { 
        correlationId, 
        agentId,
        userId,
        count: result.data.length,
        totalCount: result.count
      });

      return {
        messages: result.data,
        totalCount: result.count
      };

    } catch (error) {
      this.handleError(error, { 
        correlationId, 
        operation: 'getAgentMessages',
        agentId,
        userId,
        limit,
        offset
      });
    }
  }

  /**
   * Update message status
   */
  async updateMessageStatus(
    messageId: string,
    userId: string,
    status: Message['status'],
    correlationId: string = generateCorrelationId()
  ): Promise<Message> {
    const startTime = Date.now();
    this.logOperationStart('updateMessageStatus', { 
      correlationId, 
      messageId, 
      userId,
      status 
    });

    try {
      this.validateRequired(
        { messageId, userId, status }, 
        ['messageId', 'userId', 'status'], 
        correlationId
      );

      // Verify message exists and user has access
      await this.getMessageById(messageId, userId, correlationId);

      const result = await this.messageRepository.updateStatus(messageId, status, correlationId);

      if (result.error) {
        throw result.error;
      }

      const duration = Date.now() - startTime;
      this.logOperationSuccess('updateMessageStatus', { 
        correlationId, 
        messageId,
        userId,
        status,
        duration 
      });

      return result.data!;

    } catch (error) {
      this.handleError(error, { 
        correlationId, 
        operation: 'updateMessageStatus',
        messageId,
        userId,
        status
      });
    }
  }

  /**
   * Get pending messages for processing
   */
  async getPendingMessages(
    limit: number = 10,
    correlationId: string = generateCorrelationId()
  ): Promise<Message[]> {
    this.logOperationStart('getPendingMessages', { correlationId, limit });

    try {
      const result = await this.messageRepository.findPendingMessages(limit, correlationId);

      if (result.error) {
        throw result.error;
      }

      this.logOperationSuccess('getPendingMessages', { 
        correlationId, 
        count: result.data.length
      });

      return result.data;

    } catch (error) {
      this.handleError(error, { 
        correlationId, 
        operation: 'getPendingMessages',
        limit
      });
    }
  }

  /**
   * Get message statistics for an agent
   */
  async getMessageStats(
    agentId: string,
    userId: string,
    correlationId: string = generateCorrelationId()
  ): Promise<MessageStats> {
    this.logOperationStart('getMessageStats', { correlationId, agentId, userId });

    try {
      this.validateRequired({ agentId, userId }, ['agentId', 'userId'], correlationId);

      // Verify agent exists and user has access
      const agent = await this.agentRepository.findById(agentId, correlationId);
      if (agent.error || !agent.data) {
        throw new NotFoundError('Agent', agentId);
      }
      this.validateUserAccess(userId, agent.data.user_id, correlationId);

      const result = await this.messageRepository.getMessageStats(agentId, correlationId);

      if (result.error) {
        throw result.error;
      }

      this.logOperationSuccess('getMessageStats', { 
        correlationId, 
        agentId,
        userId,
        stats: result.data
      });

      return result.data!;

    } catch (error) {
      this.handleError(error, { 
        correlationId, 
        operation: 'getMessageStats',
        agentId,
        userId
      });
    }
  }

  /**
   * Get recent messages for dashboard
   */
  async getRecentMessages(
    userId: string,
    limit: number = 10,
    correlationId: string = generateCorrelationId()
  ): Promise<any[]> {
    this.logOperationStart('getRecentMessages', { correlationId, userId, limit });

    try {
      this.validateRequired({ userId }, ['userId'], correlationId);

      const result = await this.messageRepository.getRecentMessages(userId, limit, correlationId);

      if (result.error) {
        throw result.error;
      }

      this.logOperationSuccess('getRecentMessages', { 
        correlationId, 
        userId,
        count: result.data.length
      });

      return result.data;

    } catch (error) {
      this.handleError(error, { 
        correlationId, 
        operation: 'getRecentMessages',
        userId,
        limit
      });
    }
  }

  /**
   * Validate message content
   */
  private validateMessageContent(content: string): void {
    if (!content || typeof content !== 'string') {
      throw new ValidationError('Message content is required and must be a string');
    }

    const trimmedContent = content.trim();
    if (trimmedContent.length === 0) {
      throw new ValidationError('Message content cannot be empty');
    }

    if (trimmedContent.length > 4000) {
      throw new ValidationError('Message content must be less than 4000 characters');
    }
  }
}
