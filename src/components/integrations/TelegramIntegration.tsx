'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Power, Copy, Bot, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';

// Import UI components
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

// Import types and validation
import { TelegramBot, TelegramBotFormData } from '@/lib/telegram/types';
import { validateBotToken } from '@/lib/telegram/validation';

// Import Supabase client
import { createClient } from '@/lib/supabase/client';

interface TelegramIntegrationProps {
  agentId: string;
}

const TelegramIntegration: React.FC<TelegramIntegrationProps> = ({ agentId }) => {
  // State management
  const [bots, setBots] = useState<TelegramBot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const [formData, setFormData] = useState<TelegramBotFormData>({
    bot_token: '',
    bot_username: '',
    webhook_url: '',
    use_platform_token: true,
    settings: {
      welcome_message: 'Hello! I\'m here to help you. How can I assist you today?',
      support_mode: 'auto',
      business_hours: {
        enabled: false,
        timezone: 'UTC',
        schedule: {
          monday: { start: '09:00', end: '17:00', enabled: true },
          tuesday: { start: '09:00', end: '17:00', enabled: true },
          wednesday: { start: '09:00', end: '17:00', enabled: true },
          thursday: { start: '09:00', end: '17:00', enabled: true },
          friday: { start: '09:00', end: '17:00', enabled: true },
          saturday: { start: '09:00', end: '17:00', enabled: false },
          sunday: { start: '09:00', end: '17:00', enabled: false }
        }
      },
      auto_responses: {
        enabled: false,
        fallback_message: 'I apologize, but I didn\'t understand your request. Please try rephrasing or contact our support team.',
        keywords: []
      },
      rate_limiting: {
        enabled: true,
        max_messages_per_minute: 30
      }
    }
  });

  const supabase = createClient();

  useEffect(() => {
    fetchTelegramBots();
  }, [agentId]);

  const fetchTelegramBots = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('telegram_bots')
        .select('*')
        .eq('agent_id', agentId);

      if (error) throw error;
      setBots(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch bots');
    } finally {
      setLoading(false);
    }
  };

  const createTelegramBot = async () => {
    const tokenToUse = formData.use_platform_token || !formData.bot_token.trim() 
      ? process.env.NEXT_PUBLIC_TELEGRAM_BOT_TOKEN || ''
      : formData.bot_token;

    if (!tokenToUse.trim()) {
      setError('Bot token is required. Please provide your own token or ensure platform token is configured.');
      return;
    }

    setCreating(true);
    setError(null);
    setSuccess(null);

    try {
      const validation = await validateBotToken(tokenToUse);
      if (!validation.isValid) {
        throw new Error(validation.error || 'Invalid bot token');
      }

      const { data, error } = await supabase
        .from('telegram_bots')
        .insert({
          agent_id: agentId,
          bot_token: tokenToUse,
          bot_username: formData.bot_username,
          bot_id: '',
          is_active: true,
          webhook_url: formData.webhook_url,
          settings: formData.settings
        })
        .select()
        .single();

      if (error) throw error;

      setBots([...bots, data]);
      setSuccess(`Telegram bot created successfully! ${formData.use_platform_token ? 'Using platform token.' : 'Using your custom token.'}`);
      
      // Reset form
      setFormData({
        bot_token: '',
        bot_username: '',
        webhook_url: '',
        use_platform_token: true,
        settings: {
          welcome_message: 'Hello! I\'m here to help you. How can I assist you today?',
          support_mode: 'auto',
          business_hours: {
            enabled: false,
            timezone: 'UTC',
            schedule: {
              monday: { start: '09:00', end: '17:00', enabled: true },
              tuesday: { start: '09:00', end: '17:00', enabled: true },
              wednesday: { start: '09:00', end: '17:00', enabled: true },
              thursday: { start: '09:00', end: '17:00', enabled: true },
              friday: { start: '09:00', end: '17:00', enabled: true },
              saturday: { start: '09:00', end: '17:00', enabled: false },
              sunday: { start: '09:00', end: '17:00', enabled: false }
            }
          },
          auto_responses: {
            enabled: false,
            fallback_message: 'I apologize, but I didn\'t understand your request. Please try rephrasing or contact our support team.',
            keywords: []
          },
          rate_limiting: {
            enabled: true,
            max_messages_per_minute: 30
          }
        }
      });

    } catch (err) {
      console.error('Error creating Telegram bot:', JSON.stringify(err, null, 2));
      setError(err instanceof Error ? err.message : 'Failed to create Telegram bot');
    } finally {
      setCreating(false);
    }
  };

  const handleToggleBot = async (botId: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('telegram_bots')
        .update({ is_active: !isActive })
        .eq('id', botId);

      if (error) throw error;

      setBots(bots.map(bot => 
        bot.id === botId ? { ...bot, is_active: !isActive } : bot
      ));
      setSuccess(`Bot ${!isActive ? 'activated' : 'deactivated'} successfully!`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to toggle bot');
    }
  };

  const handleDeleteBot = async (botId: string) => {
    try {
      const { error } = await supabase
        .from('telegram_bots')
        .delete()
        .eq('id', botId);

      if (error) throw error;

      setBots(bots.filter(bot => bot.id !== botId));
      setSuccess('Bot deleted successfully!');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete bot');
    }
  };

  const copyWebhookUrl = (botId: string) => {
    const webhookUrl = `${window.location.origin}/api/webhooks/telegram/${agentId}`;
    navigator.clipboard.writeText(webhookUrl);
    setSuccess('Webhook URL copied to clipboard!');
  };

  const toggleBotStatus = async (botId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('telegram_bots')
        .update({ is_active: !currentStatus })
        .eq('id', botId);

      if (error) throw error;

      await fetchTelegramBots();
      setSuccess(`Bot ${!currentStatus ? 'activated' : 'deactivated'} successfully!`);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to update bot status');
    }
  };

  const deleteBot = async (botId: string) => {
    if (!confirm('Are you sure you want to delete this bot? This action cannot be undone.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('telegram_bots')
        .delete()
        .eq('id', botId);

      if (error) throw error;

      await fetchTelegramBots();
      setSuccess('Bot deleted successfully!');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to delete bot');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading Telegram integration...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Bot className="h-5 w-5 text-blue-500" />
        <h2 className="text-xl font-semibold">Telegram Integration</h2>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-red-500" />
          <span className="text-red-700">{error}</span>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-2">
          <CheckCircle className="h-4 w-4 text-green-500" />
          <span className="text-green-700">{success}</span>
        </div>
      )}

      {/* Add Bot Form */}
      <Card>
        <CardHeader>
          <CardTitle>Connect Telegram Bot</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Token Source Selection */}
          <div className="space-y-3">
            <Label>Bot Token Source</Label>
            <div className="flex items-center space-x-4">
              <label className="flex items-center space-x-2">
                <input
                  type="radio"
                  name="token_source"
                  checked={formData.use_platform_token}
                  onChange={() => setFormData({...formData, use_platform_token: true, bot_token: ''})}
                  className="text-blue-600"
                />
                <span className="text-sm">Use Platform Token (Recommended)</span>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="radio"
                  name="token_source"
                  checked={!formData.use_platform_token}
                  onChange={() => setFormData({...formData, use_platform_token: false})}
                  className="text-blue-600"
                />
                <span className="text-sm">Use My Own Token</span>
              </label>
            </div>
            {formData.use_platform_token && (
              <p className="text-xs text-gray-400">
                Using our platform token means faster setup with no configuration needed.
              </p>
            )}
          </div>

          {/* Custom Token Input */}
          {!formData.use_platform_token && (
            <div>
              <Label htmlFor="bot_token">Your Bot Token</Label>
              <Input
                type="password"
                id="bot_token"
                placeholder="Enter your bot token from @BotFather"
                value={formData.bot_token}
                onChange={(e) => setFormData({...formData, bot_token: e.target.value})}
                className="bg-gray-800 border-gray-700 text-white"
              />
              <p className="text-xs text-gray-400 mt-1">
                Get your token from @BotFather on Telegram
              </p>
            </div>
          )}

          {/* Bot Username */}
          <div>
            <Label htmlFor="bot_username">Bot Username</Label>
            <Input
              type="text"
              id="bot_username"
              placeholder="@your_bot_username"
              value={formData.bot_username}
              onChange={(e) => setFormData({...formData, bot_username: e.target.value})}
              className="bg-gray-800 border-gray-700 text-white"
            />
          </div>

          {/* Welcome Message */}
          <div>
            <Label htmlFor="welcome_message">Welcome Message</Label>
            <Input
              type="text"
              placeholder="Enter welcome message"
              value={formData.settings.welcome_message}
              onChange={(e) => setFormData({ 
                ...formData, 
                settings: { 
                  ...formData.settings, 
                  welcome_message: e.target.value 
                } 
              })}
              className="bg-gray-800 border-gray-700 text-white"
            />
          </div>

          {/* Support Mode */}
          <div>
            <Label htmlFor="support_mode">Support Mode</Label>
            <Select
              value={formData.settings.support_mode}
              onValueChange={(value: 'auto' | 'hybrid' | 'manual') => 
                setFormData({ 
                  ...formData, 
                  settings: { 
                    ...formData.settings, 
                    support_mode: value 
                  } 
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select support mode" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">Automatic AI Responses</SelectItem>
                <SelectItem value="hybrid">Hybrid (AI + Human)</SelectItem>
                <SelectItem value="manual">Manual Only</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button onClick={createTelegramBot} disabled={creating} className="w-full">
            {creating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating Bot...
              </>
            ) : (
              <>
                <Plus className="mr-2 h-4 w-4" />
                Create Telegram Bot
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Existing Bots */}
      {bots.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Connected Bots</h3>
          {bots.map((bot) => (
            <Card key={bot.id} className="bg-gray-50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Bot className="h-5 w-5 text-blue-500" />
                    <div>
                      <p className="font-medium">@{bot.bot_username}</p>
                      <p className="text-sm text-gray-500">
                        Status: {bot.is_active ? 'Active' : 'Inactive'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="default"
                      onClick={() => copyWebhookUrl(bot.id)}
                      className="h-8 w-8 p-0"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="default"
                      onClick={() => handleToggleBot(bot.id, bot.is_active)}
                      className="h-8 w-8 p-0"
                    >
                      <Power className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => handleDeleteBot(bot.id)}
                      className="h-8 w-8 p-0"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default TelegramIntegration;
