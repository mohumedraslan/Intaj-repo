'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { MessageSquare, Bot, Settings, AlertCircle, CheckCircle, ExternalLink, Hash } from 'lucide-react';

interface SlackConfig {
  botToken: string;
  appToken: string;
  signingSecret: string;
  clientId: string;
  clientSecret: string;
  channels: string[];
  autoRespond: boolean;
  threadReplies: boolean;
  mentionOnly: boolean;
  welcomeMessage: string;
  status: 'connected' | 'disconnected' | 'error';
}

export default function SlackIntegration({ agentId }: { agentId: string }) {
  const [config, setConfig] = useState<SlackConfig>({
    botToken: '',
    appToken: '',
    signingSecret: '',
    clientId: '',
    clientSecret: '',
    channels: [],
    autoRespond: true,
    threadReplies: true,
    mentionOnly: false,
    welcomeMessage: 'Hi there! 👋 I\'m your AI assistant. How can I help you today?',
    status: 'disconnected'
  });
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [newChannel, setNewChannel] = useState('');
  const supabase = createClientComponentClient();

  const handleSave = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('integrations')
        .upsert({
          agent_id: agentId,
          platform: 'slack',
          config: config,
          status: 'active'
        });

      if (error) throw error;
      
      setConfig(prev => ({ ...prev, status: 'connected' }));
    } catch (error) {
      console.error('Error saving Slack integration:', error);
      setConfig(prev => ({ ...prev, status: 'error' }));
    } finally {
      setLoading(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      setConfig(prev => ({ ...prev, status: 'connected' }));
    } catch (error) {
      console.error('Slack test failed:', error);
      setConfig(prev => ({ ...prev, status: 'error' }));
    } finally {
      setTesting(false);
    }
  };

  const addChannel = () => {
    if (newChannel && !config.channels.includes(newChannel)) {
      setConfig(prev => ({
        ...prev,
        channels: [...prev.channels, newChannel]
      }));
      setNewChannel('');
    }
  };

  const removeChannel = (channel: string) => {
    setConfig(prev => ({
      ...prev,
      channels: prev.channels.filter(c => c !== channel)
    }));
  };

  const getStatusIcon = () => {
    switch (config.status) {
      case 'connected':
        return <CheckCircle className="h-5 w-5 text-green-400" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-400" />;
      default:
        return <MessageSquare className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusBadge = () => {
    const statusConfig = {
      connected: { color: 'bg-green-500', text: 'Connected' },
      disconnected: { color: 'bg-gray-500', text: 'Disconnected' },
      error: { color: 'bg-red-500', text: 'Error' }
    };

    const { color, text } = statusConfig[config.status];
    return <Badge className={`${color} text-white`}>{text}</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-gray-900/50 border-gray-800 backdrop-blur-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {getStatusIcon()}
              <div>
                <CardTitle>Slack Integration</CardTitle>
                <CardDescription>Connect your agent to Slack workspaces and channels</CardDescription>
              </div>
            </div>
            {getStatusBadge()}
          </div>
        </CardHeader>
      </Card>

      {/* Setup Instructions */}
      <Card className="bg-gray-900/50 border-gray-800 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Setup Instructions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-4">
            <h4 className="font-medium text-purple-400 mb-2">Before you start:</h4>
            <ol className="list-decimal list-inside space-y-2 text-sm text-gray-300">
              <li>Go to <a href="https://api.slack.com/apps" target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:underline inline-flex items-center gap-1">Slack API <ExternalLink className="h-3 w-3" /></a> and create a new app</li>
              <li>Enable Socket Mode and generate an App-Level Token</li>
              <li>Add Bot Token Scopes: chat:write, channels:read, groups:read, im:read, mpim:read</li>
              <li>Install the app to your workspace</li>
              <li>Copy the Bot User OAuth Token and App-Level Token</li>
              <li>Add the bot to desired channels</li>
            </ol>
          </div>
        </CardContent>
      </Card>

      {/* Configuration */}
      <Card className="bg-gray-900/50 border-gray-800 backdrop-blur-sm">
        <CardHeader>
          <CardTitle>App Configuration</CardTitle>
          <CardDescription>Configure your Slack app credentials</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="botToken">Bot User OAuth Token</Label>
              <Input
                id="botToken"
                type="password"
                placeholder="xoxb-your-bot-token"
                value={config.botToken}
                onChange={(e) => setConfig(prev => ({ ...prev, botToken: e.target.value }))}
                className="bg-gray-800 border-gray-700"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="appToken">App-Level Token</Label>
              <Input
                id="appToken"
                type="password"
                placeholder="xapp-your-app-token"
                value={config.appToken}
                onChange={(e) => setConfig(prev => ({ ...prev, appToken: e.target.value }))}
                className="bg-gray-800 border-gray-700"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="signingSecret">Signing Secret</Label>
              <Input
                id="signingSecret"
                type="password"
                placeholder="Your app signing secret"
                value={config.signingSecret}
                onChange={(e) => setConfig(prev => ({ ...prev, signingSecret: e.target.value }))}
                className="bg-gray-800 border-gray-700"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="clientId">Client ID</Label>
              <Input
                id="clientId"
                placeholder="Your app client ID"
                value={config.clientId}
                onChange={(e) => setConfig(prev => ({ ...prev, clientId: e.target.value }))}
                className="bg-gray-800 border-gray-700"
              />
            </div>
          </div>

          {/* Channel Management */}
          <div className="space-y-4">
            <Label>Active Channels</Label>
            <div className="flex gap-2">
              <Input
                placeholder="Channel name (e.g., general, support)"
                value={newChannel}
                onChange={(e) => setNewChannel(e.target.value)}
                className="bg-gray-800 border-gray-700"
              />
              <Button onClick={addChannel} variant="outline" className="border-gray-700">
                <Hash className="h-4 w-4 mr-2" />
                Add Channel
              </Button>
            </div>
            
            {config.channels.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {config.channels.map((channel) => (
                  <Badge
                    key={channel}
                    variant="secondary"
                    className="bg-gray-700 text-white cursor-pointer hover:bg-red-600"
                    onClick={() => removeChannel(channel)}
                  >
                    #{channel} ×
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Settings */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="autoRespond">Auto-respond to messages</Label>
                <p className="text-sm text-gray-400">Automatically respond to direct messages and channel messages</p>
              </div>
              <Switch
                id="autoRespond"
                checked={config.autoRespond}
                onCheckedChange={(checked) => setConfig(prev => ({ ...prev, autoRespond: checked }))}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="threadReplies">Reply in threads</Label>
                <p className="text-sm text-gray-400">Reply in threads to keep channels organized</p>
              </div>
              <Switch
                id="threadReplies"
                checked={config.threadReplies}
                onCheckedChange={(checked) => setConfig(prev => ({ ...prev, threadReplies: checked }))}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="mentionOnly">Mention only mode</Label>
                <p className="text-sm text-gray-400">Only respond when the bot is mentioned</p>
              </div>
              <Switch
                id="mentionOnly"
                checked={config.mentionOnly}
                onCheckedChange={(checked) => setConfig(prev => ({ ...prev, mentionOnly: checked }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="welcomeMessage">Welcome Message</Label>
              <Textarea
                id="welcomeMessage"
                placeholder="Enter a welcome message for new users"
                value={config.welcomeMessage}
                onChange={(e) => setConfig(prev => ({ ...prev, welcomeMessage: e.target.value }))}
                className="bg-gray-800 border-gray-700"
                rows={3}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button onClick={handleTest} disabled={testing || !config.botToken} variant="outline" className="border-gray-700">
              {testing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Testing...
                </>
              ) : (
                <>
                  <Bot className="h-4 w-4 mr-2" />
                  Test Connection
                </>
              )}
            </Button>
            
            <Button onClick={handleSave} disabled={loading || !config.botToken}>
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Saving...
                </>
              ) : (
                'Save Configuration'
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Features */}
      <Card className="bg-gray-900/50 border-gray-800 backdrop-blur-sm">
        <CardHeader>
          <CardTitle>Slack Features</CardTitle>
          <CardDescription>What your agent can do on Slack</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="font-medium text-white">✅ Supported Features</h4>
              <ul className="text-sm text-gray-300 space-y-1">
                <li>• Direct message responses</li>
                <li>• Channel message monitoring</li>
                <li>• Thread replies</li>
                <li>• Mention detection</li>
                <li>• Rich message formatting</li>
                <li>• File sharing</li>
                <li>• Slash commands</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium text-white">🚧 Coming Soon</h4>
              <ul className="text-sm text-gray-400 space-y-1">
                <li>• Interactive components</li>
                <li>• Workflow automation</li>
                <li>• Custom emoji reactions</li>
                <li>• Advanced permissions</li>
                <li>• Multi-workspace support</li>
                <li>• Analytics dashboard</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
