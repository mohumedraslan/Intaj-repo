'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  MessageCircle, 
  Phone, 
  Settings, 
  CheckCircle, 
  AlertCircle, 
  Clock,
  Users,
  BarChart3,
  Zap,
  Globe,
  Shield
} from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';

interface WhatsAppBot {
  id: string;
  agent_id: string;
  phone_number_id: string;
  access_token: string;
  webhook_verify_token: string;
  business_account_id: string;
  phone_number: string;
  display_name: string;
  status: 'active' | 'inactive' | 'pending';
  support_mode: 'auto' | 'hybrid' | 'manual';
  business_hours: {
    enabled: boolean;
    timezone: string;
    schedule: Record<string, { start: string; end: string; enabled: boolean }>;
  };
  auto_responses: {
    welcome_message: string;
    business_hours_message: string;
    fallback_message: string;
  };
  created_at: string;
  updated_at: string;
}

interface WhatsAppStats {
  total_messages: number;
  messages_today: number;
  response_rate: number;
  avg_response_time: number;
  active_conversations: number;
}

export default function WhatsAppIntegration({ agentId }: { agentId: string }) {
  const [whatsappBot, setWhatsappBot] = useState<WhatsAppBot | null>(null);
  const [stats, setStats] = useState<WhatsAppStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showSetup, setShowSetup] = useState(false);
  const [formData, setFormData] = useState({
    phoneNumberId: '',
    accessToken: '',
    webhookVerifyToken: '',
    businessAccountId: '',
    displayName: '',
    supportMode: 'hybrid' as const,
    welcomeMessage: 'Hello! 👋 Welcome to our WhatsApp support. How can I help you today?',
    businessHoursMessage: 'Thanks for contacting us! We\'re currently outside business hours but will respond as soon as possible.',
    fallbackMessage: 'I\'m not sure how to help with that. Let me connect you with a human agent.',
    businessHours: {
      enabled: true,
      timezone: 'UTC',
      monday: { start: '09:00', end: '17:00', enabled: true },
      tuesday: { start: '09:00', end: '17:00', enabled: true },
      wednesday: { start: '09:00', end: '17:00', enabled: true },
      thursday: { start: '09:00', end: '17:00', enabled: true },
      friday: { start: '09:00', end: '17:00', enabled: true },
      saturday: { start: '10:00', end: '14:00', enabled: false },
      sunday: { start: '10:00', end: '14:00', enabled: false }
    }
  });

  useEffect(() => {
    fetchWhatsAppBot();
    fetchStats();
  }, [agentId]);

  const fetchWhatsAppBot = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('whatsapp_bots')
        .select('*')
        .eq('agent_id', agentId)
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching WhatsApp bot:', JSON.stringify(error, null, 2));
        return;
      }

      if (data) {
        setWhatsappBot(data);
        setFormData({
          phoneNumberId: data.phone_number_id,
          accessToken: data.access_token,
          webhookVerifyToken: data.webhook_verify_token,
          businessAccountId: data.business_account_id,
          displayName: data.display_name,
          supportMode: data.support_mode,
          welcomeMessage: data.auto_responses.welcome_message,
          businessHoursMessage: data.auto_responses.business_hours_message,
          fallbackMessage: data.auto_responses.fallback_message,
          businessHours: data.business_hours.schedule
        });
      }
    } catch (error) {
      console.error('Error fetching WhatsApp bot:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch WhatsApp analytics
      const { data: analyticsData } = await supabase
        .from('whatsapp_analytics')
        .select('*')
        .eq('agent_id', agentId)
        .eq('user_id', user.id)
        .order('message_date', { ascending: false })
        .limit(30);

      if (analyticsData && analyticsData.length > 0) {
        const totalMessages = analyticsData.reduce((sum, day) => sum + day.total_messages, 0);
        const todayMessages = analyticsData[0]?.total_messages || 0;
        const avgResponseTime = analyticsData.reduce((sum, day) => sum + day.avg_response_time, 0) / analyticsData.length;
        
        setStats({
          total_messages: totalMessages,
          messages_today: todayMessages,
          response_rate: 95, // Simulated
          avg_response_time: avgResponseTime,
          active_conversations: analyticsData[0]?.active_conversations || 0
        });
      } else {
        setStats({
          total_messages: 0,
          messages_today: 0,
          response_rate: 0,
          avg_response_time: 0,
          active_conversations: 0
        });
      }
    } catch (error) {
      console.error('Error fetching WhatsApp stats:', error);
    }
  };

  const validateWhatsAppCredentials = async (phoneNumberId: string, accessToken: string) => {
    try {
      const response = await fetch(`https://graph.facebook.com/v18.0/${phoneNumberId}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      if (!response.ok) {
        throw new Error('Invalid credentials or phone number ID');
      }

      const data = await response.json();
      return {
        isValid: true,
        phoneNumber: data.display_phone_number,
        displayName: data.verified_name
      };
    } catch (error) {
      return {
        isValid: false,
        error: error instanceof Error ? error.message : 'Validation failed'
      };
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Validate credentials
      const validation = await validateWhatsAppCredentials(formData.phoneNumberId, formData.accessToken);
      if (!validation.isValid) {
        throw new Error(validation.error || 'Invalid WhatsApp credentials');
      }

      const botData = {
        agent_id: agentId,
        user_id: user.id,
        phone_number_id: formData.phoneNumberId,
        access_token: formData.accessToken,
        webhook_verify_token: formData.webhookVerifyToken,
        business_account_id: formData.businessAccountId,
        phone_number: validation.phoneNumber || '',
        display_name: formData.displayName || validation.displayName || '',
        status: 'active' as const,
        support_mode: formData.supportMode,
        business_hours: {
          enabled: formData.businessHours.enabled,
          timezone: formData.businessHours.timezone,
          schedule: formData.businessHours
        },
        auto_responses: {
          welcome_message: formData.welcomeMessage,
          business_hours_message: formData.businessHoursMessage,
          fallback_message: formData.fallbackMessage
        }
      };

      if (whatsappBot) {
        const { error } = await supabase
          .from('whatsapp_bots')
          .update(botData)
          .eq('id', whatsappBot.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('whatsapp_bots')
          .insert(botData);

        if (error) throw error;
      }

      // Set up webhook URL
      const webhookUrl = `${window.location.origin}/api/webhooks/whatsapp/${agentId}`;
      await setupWebhook(formData.phoneNumberId, formData.accessToken, webhookUrl, formData.webhookVerifyToken);

      await fetchWhatsAppBot();
      setShowSetup(false);
      alert('WhatsApp integration saved successfully!');
    } catch (error) {
      console.error('Error saving WhatsApp bot:', error);
      alert(error instanceof Error ? error.message : 'Failed to save WhatsApp integration');
    } finally {
      setSaving(false);
    }
  };

  const setupWebhook = async (phoneNumberId: string, accessToken: string, webhookUrl: string, verifyToken: string) => {
    try {
      const response = await fetch(`https://graph.facebook.com/v18.0/${phoneNumberId}/webhooks`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          webhook_url: webhookUrl,
          verify_token: verifyToken,
          subscribed_fields: ['messages']
        })
      });

      if (!response.ok) {
        throw new Error('Failed to set up webhook');
      }
    } catch (error) {
      console.error('Error setting up webhook:', error);
      throw error;
    }
  };

  const handleDelete = async () => {
    if (!whatsappBot || !confirm('Are you sure you want to delete this WhatsApp integration?')) return;

    try {
      const { error } = await supabase
        .from('whatsapp_bots')
        .delete()
        .eq('id', whatsappBot.id);

      if (error) throw error;

      setWhatsappBot(null);
      setStats(null);
      alert('WhatsApp integration deleted successfully!');
    } catch (error) {
      console.error('Error deleting WhatsApp bot:', error);
      alert('Failed to delete WhatsApp integration');
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-700 rounded w-1/3 mb-4"></div>
          <div className="h-32 bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-xl font-semibold text-white flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-green-500" />
            WhatsApp Business Integration
          </h3>
          <p className="text-gray-400 text-sm mt-1">
            Connect your agent to WhatsApp Business API for customer support
          </p>
        </div>
        {whatsappBot ? (
          <div className="flex gap-2">
            <Button
              onClick={() => setShowSetup(true)}
              variant="default"
              className="border-gray-600 text-gray-300 hover:bg-gray-700"
            >
              <Settings className="h-4 w-4 mr-2" />
              Configure
            </Button>
            <Button
              onClick={handleDelete}
              variant="destructive"
              className="bg-red-600 hover:bg-red-700"
            >
              Delete Integration
            </Button>
          </div>
        ) : (
          <Button
            onClick={() => setShowSetup(true)}
            className="bg-green-600 hover:bg-green-700"
          >
            <MessageCircle className="h-4 w-4 mr-2" />
            Set Up WhatsApp
          </Button>
        )}
      </div>

      {/* Current Status */}
      {whatsappBot && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Status</p>
                  <div className="flex items-center gap-2 mt-1">
                    <div className={`h-2 w-2 rounded-full ${
                      whatsappBot.status === 'active' ? 'bg-green-500' : 'bg-red-500'
                    }`}></div>
                    <span className="text-white capitalize">{whatsappBot.status}</span>
                  </div>
                </div>
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Phone Number</p>
                  <p className="text-white font-medium">{whatsappBot.phone_number}</p>
                </div>
                <Phone className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Support Mode</p>
                  <Badge className={
                    whatsappBot.support_mode === 'auto' ? 'bg-green-500/20 text-green-400' :
                    whatsappBot.support_mode === 'hybrid' ? 'bg-blue-500/20 text-blue-400' :
                    'bg-gray-500/20 text-gray-400'
                  }>
                    {whatsappBot.support_mode}
                  </Badge>
                </div>
                <Zap className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Messages Today</p>
                  <p className="text-white font-medium">{stats?.messages_today || 0}</p>
                </div>
                <BarChart3 className="h-8 w-8 text-cyan-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Statistics */}
      {whatsappBot && stats && (
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white">WhatsApp Analytics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-white">{stats.total_messages.toLocaleString()}</p>
                <p className="text-gray-400 text-sm">Total Messages</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-white">{stats.response_rate}%</p>
                <p className="text-gray-400 text-sm">Response Rate</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-white">{stats.avg_response_time.toFixed(1)}s</p>
                <p className="text-gray-400 text-sm">Avg Response Time</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-white">{stats.active_conversations}</p>
                <p className="text-gray-400 text-sm">Active Chats</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Setup/Configuration Modal */}
      {showSetup && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="bg-gray-800 border-gray-700 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle className="text-white">
                {whatsappBot ? 'Configure WhatsApp Integration' : 'Set Up WhatsApp Integration'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* API Credentials */}
              <div className="space-y-4">
                <h4 className="text-white font-medium">WhatsApp Business API Credentials</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="phoneNumberId" className="text-gray-300">Phone Number ID</Label>
                    <Input
                      id="phoneNumberId"
                      value={formData.phoneNumberId}
                      onChange={(e) => setFormData(prev => ({ ...prev, phoneNumberId: e.target.value }))}
                      className="bg-gray-700 border-gray-600 text-white"
                      placeholder="123456789012345"
                    />
                  </div>
                  <div>
                    <Label htmlFor="businessAccountId" className="text-gray-300">Business Account ID</Label>
                    <Input
                      id="businessAccountId"
                      value={formData.businessAccountId}
                      onChange={(e) => setFormData(prev => ({ ...prev, businessAccountId: e.target.value }))}
                      className="bg-gray-700 border-gray-600 text-white"
                      placeholder="123456789012345"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="accessToken" className="text-gray-300">Access Token</Label>
                  <Input
                    id="accessToken"
                    type="password"
                    value={formData.accessToken}
                    onChange={(e) => setFormData(prev => ({ ...prev, accessToken: e.target.value }))}
                    className="bg-gray-700 border-gray-600 text-white"
                    placeholder="Your WhatsApp Business API access token"
                  />
                </div>
                <div>
                  <Label htmlFor="webhookVerifyToken" className="text-gray-300">Webhook Verify Token</Label>
                  <Input
                    id="webhookVerifyToken"
                    value={formData.webhookVerifyToken}
                    onChange={(e) => setFormData(prev => ({ ...prev, webhookVerifyToken: e.target.value }))}
                    className="bg-gray-700 border-gray-600 text-white"
                    placeholder="Your custom webhook verify token"
                  />
                </div>
              </div>

              {/* Support Mode */}
              <div className="space-y-4">
                <h4 className="text-white font-medium">Support Configuration</h4>
                <div>
                  <Label htmlFor="supportMode" className="text-gray-300">Support Mode</Label>
                  <Select value={formData.supportMode} onValueChange={(value: any) => setFormData(prev => ({ ...prev, supportMode: value }))}>
                    <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto">Fully Automated</SelectItem>
                      <SelectItem value="hybrid">Hybrid (AI + Human)</SelectItem>
                      <SelectItem value="manual">Manual Only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="displayName" className="text-gray-300">Display Name</Label>
                  <Input
                    id="displayName"
                    value={formData.displayName}
                    onChange={(e) => setFormData(prev => ({ ...prev, displayName: e.target.value }))}
                    className="bg-gray-700 border-gray-600 text-white"
                    placeholder="Your business name"
                  />
                </div>
              </div>

              {/* Auto Responses */}
              <div className="space-y-4">
                <h4 className="text-white font-medium">Automated Messages</h4>
                <div>
                  <Label htmlFor="welcomeMessage" className="text-gray-300">Welcome Message</Label>
                  <Textarea
                    id="welcomeMessage"
                    value={formData.welcomeMessage}
                    onChange={(e) => setFormData(prev => ({ ...prev, welcomeMessage: e.target.value }))}
                    className="bg-gray-700 border-gray-600 text-white"
                    rows={3}
                  />
                </div>
                <div>
                  <Label htmlFor="businessHoursMessage" className="text-gray-300">Outside Business Hours Message</Label>
                  <Textarea
                    id="businessHoursMessage"
                    value={formData.businessHoursMessage}
                    onChange={(e) => setFormData(prev => ({ ...prev, businessHoursMessage: e.target.value }))}
                    className="bg-gray-700 border-gray-600 text-white"
                    rows={3}
                  />
                </div>
                <div>
                  <Label htmlFor="fallbackMessage" className="text-gray-300">Fallback Message</Label>
                  <Textarea
                    id="fallbackMessage"
                    value={formData.fallbackMessage}
                    onChange={(e) => setFormData(prev => ({ ...prev, fallbackMessage: e.target.value }))}
                    className="bg-gray-700 border-gray-600 text-white"
                    rows={3}
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-700">
                <Button
                  onClick={() => setShowSetup(false)}
                  variant="default"
                  className="border-gray-600 text-gray-300 hover:bg-gray-700"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={saving || !formData.phoneNumberId || !formData.accessToken}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {saving ? 'Saving...' : whatsappBot ? 'Update Integration' : 'Create Integration'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Getting Started Guide */}
      {!whatsappBot && !showSetup && (
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white">Getting Started with WhatsApp Business</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="h-6 w-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium">1</div>
                <div>
                  <p className="text-white font-medium">Create a WhatsApp Business Account</p>
                  <p className="text-gray-400 text-sm">Sign up for WhatsApp Business API through Meta Business</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="h-6 w-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium">2</div>
                <div>
                  <p className="text-white font-medium">Get API Credentials</p>
                  <p className="text-gray-400 text-sm">Obtain your Phone Number ID, Access Token, and Business Account ID</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="h-6 w-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium">3</div>
                <div>
                  <p className="text-white font-medium">Configure Integration</p>
                  <p className="text-gray-400 text-sm">Add your credentials and customize your bot's behavior</p>
                </div>
              </div>
            </div>
            <div className="pt-4">
              <Button
                onClick={() => setShowSetup(true)}
                className="bg-green-600 hover:bg-green-700"
              >
                <MessageCircle className="h-4 w-4 mr-2" />
                Start Setup
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
