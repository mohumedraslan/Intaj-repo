'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { supabase } from '@/lib/supabaseClient';
import { updateChatbot as updateAgent, deleteChatbot as deleteAgent, updateAgentPublicStatus, createApiKey, deleteApiKey } from '../actions';
import { ArrowLeft, Bot, Save, Trash2, Settings as SettingsIcon, BrainCircuit, Code, Copy as CopyIcon, AlertTriangle, Key } from 'lucide-react';

interface Agent {
  id: string;
  name: string;
  description?: string;
  model: string;
  settings: Record<string, unknown>;
  is_public: boolean;
  created_at: string;
}

interface ApiKey {
    key_prefix: string;
    created_at: string;
}

export default function EditAgentPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

  const [agent, setAgent] = useState<Agent | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [model, setModel] = useState('gpt-4');
  const [settings, setSettings] = useState('{}');
  const [isPublic, setIsPublic] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [newApiKey, setNewApiKey] = useState<string | null>(null);
  const [newKeyName, setNewKeyName] = useState('');

  const embedCode = `<script src="https://intaj.nabih.tech/widget.js" data-agent-id="${id}" async defer></script>`;

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  useEffect(() => {
    const fetchAgentAndKeys = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/auth/login');
        return;
      }

      // Fetch agent data
      const { data: agentData, error: agentError } = await supabase
        .from('chatbots')
        .select('*')
        .eq('id', id)
        .eq('user_id', user.id)
        .single();

      if (agentError) {
        setError('Agent not found or you do not have permission to view it.');
        setLoading(false);
        return;
      }

      setAgent(agentData);
      setName(agentData.name);
      setDescription(agentData.description || '');
      setModel(agentData.model);
      setSettings(JSON.stringify(agentData.settings || {}, null, 2));
      setIsPublic(agentData.is_public || false);

      // Fetch API keys
      const { data: keysData, error: keysError } = await supabase
        .from('api_keys')
        .select('key_prefix, created_at')
        .eq('user_id', user.id);

      if (keysError) {
        console.error("Error fetching API keys:", keysError);
      } else {
        setApiKeys(keysData as ApiKey[]);
      }

      setLoading(false);
    };

    if (id) {
      fetchAgentAndKeys();
    }
  }, [id, router]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await updateAgent({ id, name, description, model, settings: JSON.parse(settings) });
      router.refresh();
      // Optionally, show a success toast
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handlePublicToggle = async (is_public: boolean) => {
    setIsPublic(is_public);
    try {
      await updateAgentPublicStatus({ id, is_public });
    } catch (err) {
      setError((err as Error).message);
      // Revert the toggle on error
      setIsPublic(!is_public);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to permanently delete this agent? This action cannot be undone.')) return;
    try {
      await deleteAgent(id);
      router.push('/dashboard/agents');
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleGenerateKey = async () => {
    if (!newKeyName.trim()) {
      alert("Please provide a name for the API key.");
      return;
    }
    try {
      const result = await createApiKey(newKeyName.trim());
      setNewApiKey(result.apiKey);
      setApiKeys([...apiKeys, { key_prefix: result.key_prefix, created_at: result.created_at }]);
      setNewKeyName('');
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleDeleteKey = async (key_prefix: string) => {
    if (!confirm(`Are you sure you want to revoke the key starting with "${key_prefix}"?`)) return;
    try {
      await deleteApiKey(key_prefix);
      setApiKeys(apiKeys.filter(key => key.key_prefix !== key_prefix));
    } catch (err) {
      setError((err as Error).message);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-[#0a0a0b]">
        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col justify-center items-center h-screen bg-[#0a0a0b] text-white">
        <p className="text-red-500 text-lg">{error}</p>
        <Button onClick={() => router.push('/dashboard/agents')} className="mt-4">
          <ArrowLeft className="mr-2 h-4 w-4" /> Go Back to Agents
        </Button>
      </div>
    );
  }

  if (!agent) return null;

  return (
    <div className="min-h-screen bg-[#0a0a0b] text-white p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <Button onClick={() => router.push('/dashboard/agents')} variant="outline" className="border-gray-600 hover:bg-gray-800 mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Agents
          </Button>
          <h1 className="text-4xl font-bold">
            Edit Agent: <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">{agent.name}</span>
          </h1>
          <p className="text-gray-400 mt-2">Update your agent's configuration and settings.</p>
        </div>

        <Tabs defaultValue="settings" className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-[rgba(31,32,36,0.8)] border border-gray-700">
            <TabsTrigger value="settings">Settings</TabsTrigger>
            <TabsTrigger value="widget">Website Widget</TabsTrigger>
            <TabsTrigger value="api">API</TabsTrigger>
          </TabsList>
          <TabsContent value="settings">
            <form onSubmit={handleUpdate} className="space-y-8 mt-6">
              <Card className="bg-[rgba(31,32,36,0.8)] border border-gray-700">
                <CardHeader>
                  <CardTitle className="flex items-center"><Bot className="mr-2"/> General Information</CardTitle>
                  <CardDescription>Basic details for your agent.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-2">Agent Name</label>
                    <input
                      id="name"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      required
                      className="w-full px-4 py-2 bg-[#1f2024] border border-gray-600 rounded-lg focus:border-blue-500 focus:outline-none transition-colors"
                      placeholder="e.g., Support Pro, Sales Bot"
                    />
                  </div>
                  <div>
                    <label htmlFor="description" className="block text-sm font-medium text-gray-300 mb-2">Description</label>
                    <textarea
                      id="description"
                      value={description}
                      onChange={e => setDescription(e.target.value)}
                      rows={3}
                      className="w-full px-4 py-2 bg-[#1f2024] border border-gray-600 rounded-lg focus:border-blue-500 focus:outline-none transition-colors"
                      placeholder="What is the purpose of this agent?"
                    />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-[rgba(31,32,36,0.8)] border border-gray-700">
                <CardHeader>
                  <CardTitle className="flex items-center"><BrainCircuit className="mr-2"/> AI Configuration</CardTitle>
                  <CardDescription>Define the core behavior of the AI.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label htmlFor="model" className="block text-sm font-medium text-gray-300 mb-2">AI Model</label>
                    <select
                      id="model"
                      value={model}
                      onChange={e => setModel(e.target.value)}
                      className="w-full px-4 py-2 bg-[#1f2024] border border-gray-600 rounded-lg focus:border-blue-500 focus:outline-none transition-colors"
                    >
                      <option value="gpt-4">GPT-4</option>
                      <option value="gpt-4o">GPT-4o</option>
                      <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="settings" className="block text-sm font-medium text-gray-300 mb-2">Settings (JSON)</label>
                    <textarea
                      id="settings"
                      value={settings}
                      onChange={e => setSettings(e.target.value)}
                      rows={10}
                      className="w-full p-4 bg-[#1f2024] border border-gray-600 rounded-lg font-mono text-sm focus:border-blue-500 focus:outline-none transition-colors"
                      placeholder="{}"
                    />
                    <p className="text-xs text-gray-500 mt-2">
                      Provide advanced model settings in JSON format. E.g., {`{"temperature": 0.7, "custom_prompt": "You are a helpful pirate."}`}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-between items-center">
                <Button type="button" variant="destructive" onClick={handleDelete} className="bg-red-800/20 text-red-400 hover:bg-red-800/40 border border-red-500/30">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Agent
                </Button>
                <Button type="submit" className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 px-8 py-3 rounded-lg font-semibold transition-all duration-300 transform hover:-translate-y-0.5">
                  <Save className="mr-2 h-4 w-4" />
                  Save Changes
                </Button>
              </div>
            </form>
          </TabsContent>
          <TabsContent value="widget">
            <Card className="bg-[rgba(31,32,36,0.8)] border border-gray-700 mt-6">
              <CardHeader>
                <CardTitle className="flex items-center"><Code className="mr-2"/>Embed on Your Website</CardTitle>
                <CardDescription>Enable public access and then paste this snippet into your website's HTML.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between p-4 bg-blue-900/20 border border-blue-500/30 rounded-lg">
                  <div>
                    <h3 className="font-semibold text-white">Make Agent Public</h3>
                    <p className="text-sm text-gray-400">Allow this agent to be embedded on any website.</p>
                  </div>
                  <Switch
                    checked={isPublic}
                    onCheckedChange={handlePublicToggle}
                  />
                </div>

                {isPublic ? (
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Embed Code</label>
                    <div className="bg-[#1f2024] rounded-lg p-4 relative">
                      <pre className="text-sm text-gray-300 overflow-x-auto">
                        <code>
                          {embedCode}
                        </code>
                      </pre>
                      <Button onClick={() => handleCopy(embedCode)} size="icon" variant="ghost" className="absolute top-2 right-2 text-gray-400 hover:text-white">
                        <CopyIcon className="h-5 w-5" />
                      </Button>
                    </div>
                    {copied && <p className="text-green-400 text-sm mt-2">Copied to clipboard!</p>}
                  </div>
                ) : (
                  <div className="flex items-center p-4 bg-yellow-900/20 border border-yellow-500/30 rounded-lg text-yellow-300">
                    <AlertTriangle className="h-5 w-5 mr-3 flex-shrink-0"/>
                    <p className="text-sm">Enable public access to get the embed code.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="api">
             <Card className="bg-[rgba(31,32,36,0.8)] border border-gray-700 mt-6">
              <CardHeader>
                <CardTitle className="flex items-center"><Key className="mr-2"/>API Keys</CardTitle>
                <CardDescription>Manage API keys for programmatic access to this agent.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {newApiKey && (
                  <div className="p-4 bg-green-900/20 border border-green-500/30 rounded-lg">
                    <h3 className="font-semibold text-green-300">New API Key Generated</h3>
                    <p className="text-sm text-gray-400 mb-2">Please save this key. You will not be able to see it again.</p>
                    <div className="bg-[#1f2024] rounded-lg p-4 relative font-mono text-sm text-gray-300">
                      {newApiKey}
                       <Button onClick={() => handleCopy(newApiKey)} size="icon" variant="ghost" className="absolute top-2 right-2 text-gray-400 hover:text-white">
                        <CopyIcon className="h-5 w-5" />
                      </Button>
                    </div>
                  </div>
                )}

                <div className="space-y-4">
                  <h3 className="font-semibold text-white">Active Keys</h3>
                  {apiKeys.length > 0 ? apiKeys.map(key => (
                    <div key={key.key_prefix} className="flex items-center justify-between p-4 bg-[#1f2024] rounded-lg">
                      <div>
                        <p className="font-mono text-white">{key.key_prefix}...</p>
                        <p className="text-xs text-gray-400">Created on {new Date(key.created_at).toLocaleDateString()}</p>
                      </div>
                      <Button onClick={() => handleDeleteKey(key.key_prefix)} variant="destructive" size="sm">Revoke</Button>
                    </div>
                  )) : <p className="text-sm text-gray-400">No API keys generated yet.</p>}
                </div>

                <div className="pt-6 border-t border-gray-700">
                    <h3 className="font-semibold text-white mb-2">Generate New Key</h3>
                    <div className="flex space-x-2">
                        <Input
                            type="text"
                            placeholder="Enter a name for the key (e.g., 'My App')"
                            value={newKeyName}
                            onChange={(e) => setNewKeyName(e.target.value)}
                            className="bg-[#1f2024] border-gray-600"
                        />
                        <Button onClick={handleGenerateKey}>Generate</Button>
                    </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
