'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Mail, Settings, Zap, CheckCircle, AlertCircle, Trash2, Archive, Reply } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';

interface EmailManagerConfigProps {
  agentId: string;
  isConnected: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
}

interface EmailRule {
  id: string;
  name: string;
  condition: string;
  action: string;
  category?: string;
  enabled: boolean;
}

export default function EmailManagerConfig({ 
  agentId, 
  isConnected, 
  onConnect, 
  onDisconnect 
}: EmailManagerConfigProps) {
  const [autoSort, setAutoSort] = useState(false);
  const [sortFrequency, setSortFrequency] = useState('hourly');
  const [emailRules, setEmailRules] = useState<EmailRule[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastSortTime, setLastSortTime] = useState<string | null>(null);

  useEffect(() => {
    if (isConnected) {
      fetchEmailSettings();
    }
  }, [isConnected, agentId]);

  const fetchEmailSettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch agent settings for email configuration
      const { data: agent } = await supabase
        .from('agents')
        .select('settings')
        .eq('id', agentId)
        .single();

      if (agent?.settings?.email_config) {
        const config = agent.settings.email_config;
        setAutoSort(config.auto_sort || false);
        setSortFrequency(config.sort_frequency || 'hourly');
        setEmailRules(config.rules || []);
        setLastSortTime(config.last_sort_time || null);
      }
    } catch (error) {
      console.error('Error fetching email settings:', error);
    }
  };

  const updateEmailSettings = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get current agent settings
      const { data: agent } = await supabase
        .from('agents')
        .select('settings')
        .eq('id', agentId)
        .single();

      const currentSettings = agent?.settings || {};
      const emailConfig = {
        auto_sort: autoSort,
        sort_frequency: sortFrequency,
        rules: emailRules,
        last_sort_time: lastSortTime
      };

      // Update agent settings with email config
      const { error } = await supabase
        .from('agents')
        .update({
          settings: {
            ...currentSettings,
            email_config: emailConfig
          }
        })
        .eq('id', agentId);

      if (error) {
        console.error('Error updating email settings:', error);
      }
    } catch (error) {
      console.error('Error updating email settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAutoSort = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Call the auto-sort function
      const response = await fetch('/api/agents/email-actions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          agentId,
          userId: user.id,
          action: 'auto_sort'
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        setLastSortTime(new Date().toISOString());
        await updateEmailSettings();
      }
    } catch (error) {
      console.error('Error performing auto-sort:', error);
    } finally {
      setLoading(false);
    }
  };

  const defaultRules: EmailRule[] = [
    {
      id: '1',
      name: 'Notifications',
      condition: 'From contains "noreply" OR Subject contains "notification"',
      action: 'sort',
      category: 'Notifications',
      enabled: true
    },
    {
      id: '2',
      name: 'Financial',
      condition: 'Subject contains "invoice" OR "receipt" OR "payment"',
      action: 'sort',
      category: 'Financial',
      enabled: true
    },
    {
      id: '3',
      name: 'Meetings',
      condition: 'Subject contains "meeting" OR "calendar" OR "appointment"',
      action: 'sort',
      category: 'Meetings',
      enabled: true
    },
    {
      id: '4',
      name: 'Promotions',
      condition: 'Content contains "promotion" OR "sale" OR "discount"',
      action: 'sort',
      category: 'Promotions',
      enabled: true
    },
    {
      id: '5',
      name: 'Support',
      condition: 'From contains "support" OR Subject contains "support"',
      action: 'sort',
      category: 'Support',
      enabled: true
    }
  ];

  if (!isConnected) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5" />
            Email Manager Configuration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Mail className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-400 mb-4">
              Connect your Google account to enable email management features
            </p>
            <Button onClick={onConnect} className="bg-blue-600 hover:bg-blue-700">
              <Mail className="w-4 h-4 mr-2" />
              Connect Gmail
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Connection Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Mail className="w-5 h-5" />
              Gmail Connection
            </div>
            <Badge variant="outline" className="text-green-400 border-green-400">
              <CheckCircle className="w-3 h-3 mr-1" />
              Connected
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <p className="text-gray-400">
              Your Gmail account is connected and ready for email management
            </p>
            <Button variant="destructive" onClick={onDisconnect}>
              Disconnect
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Auto-Sort Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5" />
            Automatic Email Sorting
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="auto-sort">Enable Auto-Sort</Label>
              <p className="text-sm text-gray-400">
                Automatically categorize incoming emails based on rules
              </p>
            </div>
            <Switch
              id="auto-sort"
              checked={autoSort}
              onCheckedChange={(checked: boolean) => {
                setAutoSort(checked);
                updateEmailSettings();
              }}
            />
          </div>

          {autoSort && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="sort-frequency">Sort Frequency</Label>
                <Select value={sortFrequency} onValueChange={setSortFrequency}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="realtime">Real-time</SelectItem>
                    <SelectItem value="hourly">Every Hour</SelectItem>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Manual Sort</p>
                  <p className="text-xs text-gray-400">
                    Sort unread emails now
                  </p>
                </div>
                <Button 
                  onClick={handleAutoSort} 
                  disabled={loading}
                  size="sm"
                >
                  {loading ? 'Sorting...' : 'Sort Now'}
                </Button>
              </div>

              {lastSortTime && (
                <p className="text-xs text-gray-400">
                  Last sorted: {new Date(lastSortTime).toLocaleString()}
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Email Rules */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Sorting Rules
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {defaultRules.map((rule) => (
              <div key={rule.id} className="flex items-center justify-between p-3 border border-gray-700 rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium">{rule.name}</h4>
                    <Badge variant="outline" className="text-xs">
                      {rule.category}
                    </Badge>
                  </div>
                  <p className="text-xs text-gray-400">{rule.condition}</p>
                </div>
                <Switch
                  checked={rule.enabled}
                  onCheckedChange={(checked: boolean) => {
                    const updatedRules = defaultRules.map(r => 
                      r.id === rule.id ? { ...r, enabled: checked } : r
                    );
                    setEmailRules(updatedRules);
                    updateEmailSettings();
                  }}
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Email Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5" />
            Available Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-3 p-3 border border-gray-700 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-400" />
              <div>
                <p className="font-medium">Mark as Read</p>
                <p className="text-xs text-gray-400">Mark emails as read</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 border border-gray-700 rounded-lg">
              <Archive className="w-5 h-5 text-blue-400" />
              <div>
                <p className="font-medium">Archive</p>
                <p className="text-xs text-gray-400">Archive emails</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 border border-gray-700 rounded-lg">
              <Trash2 className="w-5 h-5 text-red-400" />
              <div>
                <p className="font-medium">Delete</p>
                <p className="text-xs text-gray-400">Move to trash</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 border border-gray-700 rounded-lg">
              <Reply className="w-5 h-5 text-purple-400" />
              <div>
                <p className="font-medium">Auto Reply</p>
                <p className="text-xs text-gray-400">Send automated replies</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
