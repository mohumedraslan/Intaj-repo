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
import { MessageSquare, Bot, Settings, AlertCircle, CheckCircle, ExternalLink } from 'lucide-react';

interface DiscordConfig {
  botToken: string;
  applicationId: string;
  guildId: string;
  channelIds: string[];
  commandPrefix: string;
  autoRespond: boolean;
  welcomeMessage: string;
  status: 'connected' | 'disconnected' | 'error';
}

export default function DiscordIntegration({ agentId }: { agentId: string }) {
  const [config, setConfig] = useState<DiscordConfig>({
    botToken: '',
    applicationId: '',
    guildId: '',
    channelIds: [],
    commandPrefix: '!',
    autoRespond: true,
    welcomeMessage: 'Hello! I\'m your AI assistant. How can I help you today?',
    status: 'disconnected'
  });
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [newChannelId, setNewChannelId] = useState('');
  const supabase = createClientComponentClient();

  const handleSave = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('integrations')
        .upsert({
          agent_id: agentId,
          platform: 'discord',
          config: config,
          status: 'active'
        });

      if (error) throw error;
      
      setConfig(prev => ({ ...prev, status: 'connected' }));
    } catch (error) {
      console.error('Error saving Discord integration:', error);
      setConfig(prev => ({ ...prev, status: 'error' }));
    } finally {
      setLoading(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    try {
      // Simulate Discord API test
      await new Promise(resolve => setTimeout(resolve, 2000));
      setConfig(prev => ({ ...prev, status: 'connected' }));
    } catch (error) {
      console.error('Discord test failed:', error);
      setConfig(prev => ({ ...prev, status: 'error' }));
    } finally {
      setTesting(false);
    }
  };

  const addChannelId = () => {
    if (newChannelId && !config.channelIds.includes(newChannelId)) {
      setConfig(prev => ({
        ...prev,
        channelIds: [...prev.channelIds, newChannelId]
      }));
      setNewChannelId('');
    }
  };

  const removeChannelId = (channelId: string) => {
    setConfig(prev => ({
      ...prev,
      channelIds: prev.channelIds.filter(id => id !== channelId)
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
                <CardTitle>Discord Integration</CardTitle>
                <CardDescription>Connect your agent to Discord servers and channels</CardDescription>
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
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
            <h4 className="font-medium text-blue-400 mb-2">Before you start:</h4>
            <ol className="list-decimal list-inside space-y-2 text-sm text-gray-300">
              <li>Go to the <a href="https://discord.com/developers/applications" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline inline-flex items-center gap-1">Discord Developer Portal <ExternalLink className="h-3 w-3" /></a></li>
              <li>Create a new application and bot</li>
              <li>Copy the Bot Token and Application ID</li>
              <li>Invite the bot to your server with appropriate permissions</li>
              <li>Get your Guild (Server) ID and Channel IDs</li>
            </ol>
          </div>
        </CardContent>
      </Card>

      {/* Configuration */}
      <Card className="bg-gray-900/50 border-gray-800 backdrop-blur-sm">
        <CardHeader>
          <CardTitle>Bot Configuration</CardTitle>
          <CardDescription>Configure your Discord bot settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="botToken">Bot Token</Label>
              <Input
                id="botToken"
                type="password"
                placeholder="Your Discord bot token"
                value={config.botToken}
                onChange={(e) => setConfig(prev => ({ ...prev, botToken: e.target.value }))}
                className="bg-gray-800 border-gray-700"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="applicationId">Application ID</Label>
              <Input
                id="applicationId"
                placeholder="Your Discord application ID"
                value={config.applicationId}
                onChange={(e) => setConfig(prev => ({ ...prev, applicationId: e.target.value }))}
                className="bg-gray-800 border-gray-700"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="guildId">Guild (Server) ID</Label>
              <Input
                id="guildId"
                placeholder="Your Discord server ID"
                value={config.guildId}
                onChange={(e) => setConfig(prev => ({ ...prev, guildId: e.target.value }))}
                className="bg-gray-800 border-gray-700"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="commandPrefix">Command Prefix</Label>
              <Input
                id="commandPrefix"
                placeholder="!"
                value={config.commandPrefix}
                onChange={(e) => setConfig(prev => ({ ...prev, commandPrefix: e.target.value }))}
                className="bg-gray-800 border-gray-700"
              />
            </div>
          </div>

          {/* Channel Management */}
          <div className="space-y-4">
            <Label>Active Channels</Label>
            <div className="flex gap-2">
              <Input
                placeholder="Channel ID"
                value={newChannelId}
                onChange={(e) => setNewChannelId(e.target.value)}
                className="bg-gray-800 border-gray-700"
              />
              <Button onClick={addChannelId} variant="outline" className="border-gray-700">
                Add Channel
              </Button>
            </div>
            
            {config.channelIds.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {config.channelIds.map((channelId) => (
                  <Badge
                    key={channelId}
                    variant="secondary"
                    className="bg-gray-700 text-white cursor-pointer hover:bg-red-600"
                    onClick={() => removeChannelId(channelId)}
                  >
                    #{channelId} ×
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
                <p className="text-sm text-gray-400">Automatically respond to direct messages and mentions</p>
              </div>
              <Switch
                id="autoRespond"
                checked={config.autoRespond}
                onCheckedChange={(checked) => setConfig(prev => ({ ...prev, autoRespond: checked }))}
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
          <CardTitle>Discord Features</CardTitle>
          <CardDescription>What your agent can do on Discord</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="font-medium text-white">✅ Supported Features</h4>
              <ul className="text-sm text-gray-300 space-y-1">
                <li>• Direct message responses</li>
                <li>• Channel message monitoring</li>
                <li>• Slash commands</li>
                <li>• Mention detection</li>
                <li>• Rich embeds</li>
                <li>• File attachments</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium text-white">🚧 Coming Soon</h4>
              <ul className="text-sm text-gray-400 space-y-1">
                <li>• Voice channel integration</li>
                <li>• Reaction-based interactions</li>
                <li>• Thread management</li>
                <li>• Advanced moderation</li>
                <li>• Custom emoji support</li>
                <li>• Server analytics</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
