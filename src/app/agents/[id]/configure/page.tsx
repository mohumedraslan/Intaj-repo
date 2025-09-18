'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Bot, Settings, Brain, Database, Zap, Upload, Globe, Trash2, Plus, Save } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

// Simple Switch component
const Switch = ({ checked, onCheckedChange }: { checked: boolean; onCheckedChange: (checked: boolean) => void }) => (
  <button
    onClick={() => onCheckedChange(!checked)}
    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
      checked ? 'bg-blue-600' : 'bg-gray-600'
    }`}
  >
    <span
      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
        checked ? 'translate-x-6' : 'translate-x-1'
      }`}
    />
  </button>
);

interface AgentData {
  id: string;
  name: string;
  description?: string;
  base_prompt?: string;
  model: string;
  avatar_url?: string;
  settings?: any;
  status: string;
  agent_type?: string;
}

interface KnowledgeFile {
  name: string;
  size: number;
  type: string;
}

const models = [
  { value: 'gpt-4o', label: 'GPT-4 Omni' },
  { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
  { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' },
  { value: 'claude-3-opus', label: 'Claude 3 Opus' },
  { value: 'claude-3-sonnet', label: 'Claude 3 Sonnet' },
  { value: 'claude-3-haiku', label: 'Claude 3 Haiku' }
];

const agentTypes = [
  { value: 'customer_support', label: 'Customer Support' },
  { value: 'sales', label: 'Sales Agent' },
  { value: 'marketing', label: 'Marketing Agent' },
  { value: 'content_creator', label: 'Content Creator' },
  { value: 'mail_manager', label: 'Mail Manager' },
  { value: 'task_handler', label: 'Task Handler' }
];

const integrations = [
  { id: 'whatsapp', name: 'WhatsApp', icon: '💬', category: 'Messaging' },
  { id: 'telegram', name: 'Telegram', icon: '✈️', category: 'Messaging' },
  { id: 'discord', name: 'Discord', icon: '🎮', category: 'Messaging' },
  { id: 'slack', name: 'Slack', icon: '💼', category: 'Messaging' },
  { id: 'facebook', name: 'Facebook', icon: '📘', category: 'Social' },
  { id: 'instagram', name: 'Instagram', icon: '📷', category: 'Social' },
  { id: 'twitter', name: 'Twitter', icon: '🐦', category: 'Social' },
  { id: 'gmail', name: 'Gmail', icon: '📧', category: 'Email' },
  { id: 'outlook', name: 'Outlook', icon: '📨', category: 'Email' },
  { id: 'shopify', name: 'Shopify', icon: '🛒', category: 'E-commerce' },
  { id: 'stripe', name: 'Stripe', icon: '💳', category: 'Payment' },
  { id: 'zapier', name: 'Zapier', icon: '⚡', category: 'Automation' }
];

// Integration Credential Form Component
const IntegrationCredentialForm = ({ integration, agentId }: { integration: any, agentId: string }) => {
  const [credentials, setCredentials] = useState({ token: '', source: 'new' });
  const [loading, setLoading] = useState(false);

  const saveCredentials = async () => {
    try {
      setLoading(true);
      const supabaseClient = createClient();
      const { data: { user } } = await supabaseClient.auth.getUser();
      
      if (user && credentials.token) {
        const { error } = await supabaseClient
          .from('connections')
          .upsert({
            user_id: user.id,
            platform: integration.id,
            agent_id: agentId,
            credentials: {
              token: credentials.token,
              source: credentials.source
            },
            created_at: new Date().toISOString()
          });
        
        if (!error) {
          alert('Credentials saved successfully!');
        } else {
          alert('Error saving credentials: ' + error.message);
        }
      }
    } catch (error) {
      alert('Error: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const testCredentials = async () => {
    if (integration.id === 'telegram') {
      try {
        setLoading(true);
        const response = await fetch('/api/integrations/telegram/test', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: credentials.token })
        });
        
        const result = await response.json();
        
        if (result.success) {
          alert(`✅ Bot test successful!\nBot Name: ${result.botInfo.first_name}\nUsername: @${result.botInfo.username}`);
        } else {
          alert(`❌ Bot test failed: ${result.error}`);
        }
      } catch (error) {
        alert('Error testing bot: ' + (error as Error).message);
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <Card className="bg-[#0a0a0b] border-gray-700">
      <CardHeader>
        <CardTitle className="flex items-center text-white">
          <span className="mr-2">{integration.icon}</span>
          {integration.name} Configuration
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label className="text-sm text-gray-300 mb-2 block">Credential Source</Label>
          <Select 
            value={credentials.source}
            onValueChange={(value) => setCredentials(prev => ({ ...prev, source: value }))}
          >
            <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-gray-800 border-gray-700">
              <SelectItem value="existing" className="text-gray-200">Use Existing Credentials</SelectItem>
              <SelectItem value="new" className="text-gray-200">Add New Credentials</SelectItem>
              <SelectItem value="platform" className="text-gray-200">Use Platform Token</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {integration.id === 'telegram' && (
          <div>
            <Label className="text-sm text-gray-300">Bot Token</Label>
            <Input 
              type="password"
              placeholder="Enter your Telegram bot token"
              className="bg-gray-700 border-gray-600 text-white placeholder-gray-400"
              value={credentials.token}
              onChange={(e) => setCredentials(prev => ({ ...prev, token: e.target.value }))}
            />
            <p className="text-xs text-gray-400 mt-1">
              Get your bot token from @BotFather on Telegram
            </p>
          </div>
        )}

        {integration.id === 'whatsapp' && (
          <div>
            <Label className="text-sm text-gray-300">WhatsApp Business API</Label>
            <Input 
              type="password"
              placeholder="Enter your WhatsApp Business API token"
              className="bg-gray-700 border-gray-600 text-white placeholder-gray-400"
              value={credentials.token}
              onChange={(e) => setCredentials(prev => ({ ...prev, token: e.target.value }))}
            />
            <p className="text-xs text-gray-400 mt-1">
              Requires WhatsApp Business API access
            </p>
          </div>
        )}

        {!['telegram', 'whatsapp'].includes(integration.id) && (
          <div>
            <Label className="text-sm text-gray-300">API Key / Access Token</Label>
            <Input 
              type="password"
              placeholder={`Enter your ${integration.name} credentials`}
              className="bg-gray-700 border-gray-600 text-white placeholder-gray-400"
              value={credentials.token}
              onChange={(e) => setCredentials(prev => ({ ...prev, token: e.target.value }))}
            />
            <p className="text-xs text-gray-400 mt-1">
              Check {integration.name} documentation for API credentials
            </p>
          </div>
        )}

        <div className="flex space-x-2">
          <Button 
            onClick={saveCredentials}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
            disabled={!credentials.token || loading}
          >
            {loading ? 'Saving...' : 'Save'}
          </Button>
          
          {integration.id === 'telegram' && (
            <Button 
              onClick={testCredentials}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white"
              disabled={!credentials.token || loading}
            >
              {loading ? 'Testing...' : 'Test Bot'}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default function AgentConfigurePage() {
  const router = useRouter();
  const params = useParams();
  const agentId = params?.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [agent, setAgent] = useState<AgentData | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    agent_type: '',
    base_prompt: '',
    model: 'gpt-4o',
    avatar_url: '',
    enableRAG: false,
    selectedIntegrations: [] as string[],
    knowledgeFiles: [] as KnowledgeFile[],
    websiteSources: [] as string[],
    status: 'active'
  });
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (agentId) {
      fetchAgent();
    }
  }, [agentId]);

  const fetchAgent = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      const { data: agentData, error } = await supabase
        .from('agents')
        .select('*')
        .eq('id', agentId)
        .eq('user_id', user.id)
        .single();

      if (error) {
        setError('Agent not found');
        return;
      }

      setAgent(agentData);
      setFormData({
        name: agentData.name || '',
        description: agentData.description || '',
        agent_type: agentData.agent_type || '',
        base_prompt: agentData.base_prompt || '',
        model: agentData.model || 'gpt-4o',
        avatar_url: agentData.avatar_url || '',
        enableRAG: agentData.settings?.enableRAG || false,
        selectedIntegrations: agentData.settings?.selectedIntegrations || [],
        knowledgeFiles: agentData.settings?.knowledgeFiles || [],
        websiteSources: agentData.settings?.websiteSources || [],
        status: agentData.status || 'active'
      });
    } catch (err) {
      setError('Failed to load agent');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const updateData = {
        name: formData.name,
        description: formData.description,
        agent_type: formData.agent_type,
        base_prompt: formData.base_prompt,
        model: formData.model,
        avatar_url: formData.avatar_url,
        status: formData.status,
        settings: {
          enableRAG: formData.enableRAG,
          selectedIntegrations: formData.selectedIntegrations,
          knowledgeFiles: formData.knowledgeFiles,
          websiteSources: formData.websiteSources
        }
      };

      const { error } = await supabase
        .from('agents')
        .update(updateData)
        .eq('id', agentId)
        .eq('user_id', user.id);

      if (error) {
        setError('Failed to update agent');
        return;
      }

      router.push('/agents');
    } catch (err) {
      setError('Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  const addWebsiteSource = () => {
    if (websiteUrl.trim() && !formData.websiteSources.includes(websiteUrl.trim())) {
      setFormData(prev => ({
        ...prev,
        websiteSources: [...prev.websiteSources, websiteUrl.trim()]
      }));
      setWebsiteUrl('');
    }
  };

  const removeWebsiteSource = (url: string) => {
    setFormData(prev => ({
      ...prev,
      websiteSources: prev.websiteSources.filter(source => source !== url)
    }));
  };

  const toggleIntegration = (integrationId: string) => {
    setFormData(prev => ({
      ...prev,
      selectedIntegrations: prev.selectedIntegrations.includes(integrationId)
        ? prev.selectedIntegrations.filter(id => id !== integrationId)
        : [...prev.selectedIntegrations, integrationId]
    }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0b] flex items-center justify-center">
        <div className="text-gray-400">Loading agent configuration...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#0a0a0b] flex items-center justify-center">
        <div className="text-red-400">{error}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0b] text-[#f8fafc]">
      {/* Logo Navigation */}
      <div className="fixed top-6 left-6 z-50">
        <Link href="/dashboard" className="flex items-center space-x-3 hover:opacity-80 transition-opacity">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
            <div className="w-5 h-5 bg-white rounded-sm opacity-90"></div>
          </div>
          <div>
            <span className="text-2xl font-bold bg-gradient-to-r from-blue-500 via-purple-500 to-cyan-400 bg-clip-text text-transparent">Intaj</span>
          </div>
        </Link>
      </div>

      <div className="max-w-6xl mx-auto p-6 pt-24">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-500 via-purple-500 to-cyan-400 bg-clip-text text-transparent">
                Configure Agent
              </h1>
              <p className="text-gray-400 mt-2">Customize your AI agent's behavior, integrations, and knowledge base</p>
            </div>
            <div className="flex space-x-3">
              <Button 
                variant="outline" 
                onClick={() => router.push('/agents')}
                className="border-gray-600 text-gray-300 hover:bg-gray-700"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleSave} 
                disabled={saving}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Save className="w-4 h-4 mr-2" />
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </div>

        <Tabs defaultValue="basic" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5 bg-[#141517] border border-gray-700/50">
            <TabsTrigger value="basic" className="flex items-center space-x-2">
              <Settings className="w-4 h-4" />
              <span>Basic</span>
            </TabsTrigger>
            <TabsTrigger value="personality" className="flex items-center space-x-2">
              <Brain className="w-4 h-4" />
              <span>Personality</span>
            </TabsTrigger>
            <TabsTrigger value="knowledge" className="flex items-center space-x-2">
              <Database className="w-4 h-4" />
              <span>Knowledge</span>
            </TabsTrigger>
            <TabsTrigger value="integrations" className="flex items-center space-x-2">
              <Zap className="w-4 h-4" />
              <span>Integrations</span>
            </TabsTrigger>
            <TabsTrigger value="advanced" className="flex items-center space-x-2">
              <Bot className="w-4 h-4" />
              <span>Advanced</span>
            </TabsTrigger>
          </TabsList>

          {/* Basic Information */}
          <TabsContent value="basic" className="space-y-6">
            <Card className="bg-[#141517] border-gray-700/50">
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
                <CardDescription>Configure your agent's basic details and appearance</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Agent Name</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="bg-[#0a0a0b] border-gray-700"
                      placeholder="Enter agent name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="agent_type">Agent Type</Label>
                    <Select value={formData.agent_type} onValueChange={(value) => setFormData({ ...formData, agent_type: value })}>
                      <SelectTrigger className="bg-[#0a0a0b] border-gray-700">
                        <SelectValue placeholder="Select agent type" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#141517] border-gray-700">
                        {agentTypes.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="bg-[#0a0a0b] border-gray-700"
                    placeholder="Describe what your agent does"
                    rows={3}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="model">AI Model</Label>
                    <Select value={formData.model} onValueChange={(value) => setFormData({ ...formData, model: value })}>
                      <SelectTrigger className="bg-[#0a0a0b] border-gray-700">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#141517] border-gray-700">
                        {models.map((model) => (
                          <SelectItem key={model.value} value={model.value}>
                            {model.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="status">Status</Label>
                    <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                      <SelectTrigger className="bg-[#0a0a0b] border-gray-700">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#141517] border-gray-700">
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                        <SelectItem value="training">Training</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="avatar_url">Avatar URL (Optional)</Label>
                  <Input
                    id="avatar_url"
                    value={formData.avatar_url}
                    onChange={(e) => setFormData({ ...formData, avatar_url: e.target.value })}
                    className="bg-[#0a0a0b] border-gray-700"
                    placeholder="https://example.com/avatar.jpg"
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Personality & Behavior */}
          <TabsContent value="personality" className="space-y-6">
            <Card className="bg-[#141517] border-gray-700/50">
              <CardHeader>
                <CardTitle>Personality & Behavior</CardTitle>
                <CardDescription>Define how your agent communicates and behaves</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="base_prompt">System Prompt</Label>
                  <Textarea
                    id="base_prompt"
                    value={formData.base_prompt}
                    onChange={(e) => setFormData({ ...formData, base_prompt: e.target.value })}
                    className="bg-[#0a0a0b] border-gray-700"
                    placeholder="You are a helpful AI assistant that..."
                    rows={8}
                  />
                  <p className="text-sm text-gray-400">
                    Define your agent's personality, tone, and behavior guidelines. This is the core instruction that shapes how your agent responds.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Knowledge Base */}
          <TabsContent value="knowledge" className="space-y-6">
            <Card className="bg-[#141517] border-gray-700/50">
              <CardHeader>
                <CardTitle>Knowledge Base</CardTitle>
                <CardDescription>Upload files and add website sources to train your agent</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* RAG Toggle */}
                <div className="flex items-center justify-between p-4 bg-[#0a0a0b] rounded-lg border border-gray-700">
                  <div>
                    <h3 className="font-medium">Retrieval Augmented Generation (RAG)</h3>
                    <p className="text-sm text-gray-400">Enable advanced knowledge retrieval for more accurate responses</p>
                  </div>
                  <Switch
                    checked={formData.enableRAG}
                    onCheckedChange={(checked) => setFormData({ ...formData, enableRAG: checked })}
                  />
                </div>

                {/* File Upload */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium">Knowledge Files</h3>
                    <div className="relative">
                      <input
                        type="file"
                        multiple
                        accept=".pdf,.doc,.docx,.txt,.md"
                        onChange={(e) => {
                          const files = Array.from(e.target.files || []);
                          const newFiles = files.map(file => ({
                            name: file.name,
                            size: file.size,
                            type: file.type
                          }));
                          setFormData(prev => ({
                            ...prev,
                            knowledgeFiles: [...prev.knowledgeFiles, ...newFiles]
                          }));
                        }}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                      <Button variant="outline" size="sm" className="border-gray-600">
                        <Upload className="w-4 h-4 mr-2" />
                        Upload Files
                      </Button>
                    </div>
                  </div>
                  {formData.knowledgeFiles.length > 0 ? (
                    <div className="space-y-2">
                      {formData.knowledgeFiles.map((file, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-[#0a0a0b] rounded-lg border border-gray-700">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center">
                              <Database className="w-4 h-4 text-blue-400" />
                            </div>
                            <div>
                              <div className="font-medium">{file.name}</div>
                              <div className="text-sm text-gray-400">{(file.size / 1024).toFixed(1)} KB</div>
                            </div>
                          </div>
                          <Button variant="ghost" size="sm" className="text-red-400 hover:text-red-300">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-400">
                      No files uploaded yet. Upload documents to enhance your agent's knowledge.
                    </div>
                  )}
                </div>

                {/* Website Sources */}
                <div className="space-y-4">
                  <h3 className="font-medium">Website Sources</h3>
                  <div className="flex space-x-2">
                    <Input
                      value={websiteUrl}
                      onChange={(e) => setWebsiteUrl(e.target.value)}
                      placeholder="https://example.com"
                      className="bg-[#0a0a0b] border-gray-700"
                    />
                    <Button onClick={addWebsiteSource} variant="outline" className="border-gray-600">
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  {formData.websiteSources.length > 0 && (
                    <div className="space-y-2">
                      {formData.websiteSources.map((url, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-[#0a0a0b] rounded-lg border border-gray-700">
                          <div className="flex items-center space-x-3">
                            <Globe className="w-4 h-4 text-green-400" />
                            <span className="text-sm">{url}</span>
                          </div>
                          <Button 
                            onClick={() => removeWebsiteSource(url)}
                            variant="ghost" 
                            size="sm" 
                            className="text-red-400 hover:text-red-300"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Integrations */}
          <TabsContent value="integrations" className="space-y-6">
            <Card className="bg-[#141517] border-gray-700/50">
              <CardHeader>
                <CardTitle>Integrations</CardTitle>
                <CardDescription>Connect your agent to various platforms and services</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Selected Integrations with Credential Management */}
                {formData.selectedIntegrations.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="font-medium text-white">Configure Selected Integrations</h3>
                    {formData.selectedIntegrations.map((integrationId) => {
                      const integration = integrations.find(i => i.id === integrationId);
                      if (!integration) return null;
                      
                      return (
                        <IntegrationCredentialForm 
                          key={integrationId}
                          integration={integration}
                          agentId={agentId}
                        />
                      );
                    })}
                  </div>
                )}

                {/* Integration Selection Grid */}
                <div>
                  <h3 className="font-medium text-white mb-4">Available Integrations</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {integrations.map((integration) => (
                      <div
                        key={integration.id}
                        onClick={() => toggleIntegration(integration.id)}
                        className={`p-4 rounded-lg border cursor-pointer transition-all ${
                          formData.selectedIntegrations.includes(integration.id)
                            ? 'border-blue-500 bg-blue-500/10'
                            : 'border-gray-700 bg-[#0a0a0b] hover:border-gray-600'
                        }`}
                      >
                        <div className="flex flex-col items-center space-y-2">
                          <div className="text-2xl">{integration.icon}</div>
                          <div className="font-medium text-center">{integration.name}</div>
                          <Badge variant="secondary" className="text-xs">
                            {integration.category}
                          </Badge>
                          {formData.selectedIntegrations.includes(integration.id) && (
                            <Badge className="bg-green-500/20 text-green-400 text-xs">
                              Selected
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Advanced Settings */}
          <TabsContent value="advanced" className="space-y-6">
            <Card className="bg-[#141517] border-gray-700/50">
              <CardHeader>
                <CardTitle>Advanced Settings</CardTitle>
                <CardDescription>Configure advanced agent behavior and performance settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center py-8 text-gray-400">
                  Advanced settings will be available in a future update.
                  This will include response time controls, conversation limits, and custom API configurations.
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
