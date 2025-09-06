import { createClient } from '../supabaseClient';
import { ChatMessage } from '../openrouter';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_URL || '',
  token: process.env.UPSTASH_REDIS_TOKEN || '',
});

export class ChatContextManager {
  private readonly maxContextLength = 10;
  private readonly contextTTL = 60 * 60; // 1 hour
  private readonly supabase = createClient();

  async getContext(chatId: string): Promise<ChatMessage[]> {
    try {
      // Try to get context from Redis first
      const cachedContext = await redis.get<ChatMessage[]>(`chat:${chatId}`);
      if (cachedContext) {
        return cachedContext;
      }

      // If not in Redis, get from database
      const { data: messages } = await this.supabase
        .from('messages')
        .select('*')
        .eq('chatbot_id', chatId)
        .order('created_at', { ascending: false })
        .limit(this.maxContextLength);

      const context = messages
        ? messages.map(msg => ({
            role: msg.role as ChatMessage['role'],
            content: msg.content,
          }))
        : [];

      // Cache in Redis
      await redis.set(`chat:${chatId}`, context, {
        ex: this.contextTTL,
      });

      return context;
    } catch (error) {
      console.error('Error getting chat context:', error);
      return [];
    }
  }

  async addMessage(chatId: string, message: ChatMessage): Promise<void> {
    try {
      // Add to database
      await this.supabase.from('messages').insert({
        chatbot_id: chatId,
        role: message.role,
        content: message.content,
      });

      // Update Redis cache
      const context = await this.getContext(chatId);
      context.push(message);
      if (context.length > this.maxContextLength) {
        context.shift();
      }
      await redis.set(`chat:${chatId}`, context, {
        ex: this.contextTTL,
      });
    } catch (error) {
      console.error('Error adding message to context:', error);
    }
  }

  async clearContext(chatId: string): Promise<void> {
    try {
      await Promise.all([
        redis.del(`chat:${chatId}`),
        this.supabase
          .from('messages')
          .delete()
          .eq('chatbot_id', chatId),
      ]);
    } catch (error) {
      console.error('Error clearing chat context:', error);
    }
  }
}
