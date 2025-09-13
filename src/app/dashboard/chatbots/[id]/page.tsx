// src/app/dashboard/chatbots/[id]/page.tsx
'use client';
import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/lib/supabaseClient';
import { updateAgent, deleteAgent, createAgent } from '../actions';
import { Bot, Upload, Save, Trash2, Play, Settings, BarChart3, Zap } from 'lucide-react';
import { AddDataSourceDialog } from '@/components/add-data-source-dialog';
import { DataSourceList } from '@/components/data-source-list';
import WidgetEmbedCode from '@/components/chat/WidgetEmbedCode';
import WorkflowBuilder from '@/components/agents/WorkflowBuilder';
import TelegramIntegration from '@/components/integrations/TelegramIntegration';
import WhatsAppIntegration from '@/components/integrations/WhatsAppIntegration';

interface Agent {
  id: string;
  name: string;
  description?: string;
  model: string;
  base_prompt?: string;
  settings: Record<string, unknown>;
  created_at: string;
  avatar_url?: string;
}

export default function EditAgentPage() {
  const router = useRouter();
  const params = useParams();
  const rawId = params?.id as string;
  // Handle URL encoding issues
  const id = rawId ? decodeURIComponent(rawId) : '';
  const isNew = id === 'new';
  
  const [agent, setAgent] = useState<Agent | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [model, setModel] = useState('gpt-4o');
  const [basePrompt, setBasePrompt] = useState('');
  const [status, setStatus] = useState('active');
  const [agentType, setAgentType] = useState('customer_support');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('general');
  const [dataSources, setDataSources] = useState<any[]>([]);

  useEffect(() => {
    if (isNew) {
      setLoading(false);
      return;
    }
    
    const fetchAgent = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.push('/login');
          return;
        }
        
        // Validate UUID format before querying
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(id)) {
          setError('Invalid agent ID format');
          setLoading(false);
          return;
        }

        const { data, error } = await supabase
          .from('agents')
          .select('*')
          .eq('id', id)
          .eq('user_id', user.id)
          .single();
          
        if (error) {
          setError(error.message);
        } else if (data) {
          setAgent(data);
          setName(data.name);
          setDescription(data.description || '');
          setModel(data.model || 'gpt-4o');
          setBasePrompt(data.base_prompt || '');
          setStatus(data.settings?.status || 'active');
          setAgentType(data.settings?.agent_type || 'customer_support');
          setAvatarUrl(data.avatar_url || null);
          
          // Fetch data sources for this agent
          fetchDataSources(data.id);
        } else {
          setError('Agent not found');
        }
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    };
    
    fetchAgent();
  }, [id, isNew, router]);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setAvatarFile(file);
      
      // Create a preview URL
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setAvatarUrl(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };
  
  const uploadAvatar = async (userId: string): Promise<string | null> => {
    if (!avatarFile) return avatarUrl;
    
    try {
      // Generate a UUID if we don't have one (for new agents)
      const agentId = id !== 'new' ? id : crypto.randomUUID();
      const fileExt = avatarFile.name.split('.').pop();
      const fileName = `${agentId}.${fileExt}`;
      const filePath = `${userId}/${fileName}`;
      
      // Check if bucket exists before uploading
      const { data: buckets } = await supabase.storage.listBuckets();
      const bucketExists = buckets?.some(bucket => bucket.name === 'agent-avatars');
      
      if (!bucketExists) {
        throw new Error('Storage bucket not found. Please contact administrator.');
      }
      
      const { error: uploadError } = await supabase.storage
        .from('agent-avatars')
        .upload(filePath, avatarFile, {
          upsert: true,
          cacheControl: '3600'
        });
        
      if (uploadError) {
        throw uploadError;
      }
      
      const { data } = supabase.storage
        .from('agent-avatars')
        .getPublicUrl(filePath);
        
      return data.publicUrl;
    } catch (err) {
      console.error('Error uploading avatar:', err);
      throw new Error(`Error uploading avatar: ${err instanceof Error ? err.message : String(err)}`);
    }
  };
  
  const fetchDataSources = async (agentId: string) => {
    try {
      const { data, error } = await supabase
        .from('data_sources')
        .select('*')
        .eq('chatbot_id', agentId);
        
      if (error) throw error;
      setDataSources(data || []);
    } catch (err) {
      console.error('Error fetching data sources:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      
      // Debug logging
      console.log('DEBUG - handleSubmit:', { 
        id, 
        isNew, 
        rawId: params?.id,
        name: name?.trim(),
        model,
        hasDescription: !!description?.trim(),
        hasBasePrompt: !!basePrompt?.trim()
      });
      
      // Generate a UUID for new agents
      const agentId = isNew ? crypto.randomUUID() : id;
      
      // Validate required fields
      if (!name?.trim()) {
        throw new Error('Agent name is required');
      }
      if (!model) {
        throw new Error('AI model selection is required');
      }
      
      // Set default base prompt based on agent type if none provided
      let finalBasePrompt = basePrompt?.trim();
      if (!finalBasePrompt && isNew) {
        const agentTypePrompts = {
          customer_support: "You are a friendly and professional customer support assistant. Your main goal is to help customers with their questions, resolve issues, and provide excellent service. Always be polite, empathetic, and solution-focused.",
          mail_manager: "You are an intelligent email management assistant. You help organize, prioritize, and draft professional emails. You can categorize messages, suggest responses, and help maintain efficient email communication.",
          sales_agent: "You are a skilled sales assistant focused on helping customers find the right solutions. You understand customer needs, present product benefits clearly, and guide prospects through the sales process with professionalism and expertise.",
          marketing_agent: "You are a creative marketing assistant specializing in content creation, campaign ideas, and brand messaging. You help develop engaging marketing materials and strategies that resonate with target audiences."
        };
        finalBasePrompt = agentTypePrompts[agentType as keyof typeof agentTypePrompts] || agentTypePrompts.customer_support;
      }

      // Prepare agent data
      const agentData = {
        name: name.trim(),
        description: description?.trim() || undefined,
        model,
        base_prompt: finalBasePrompt || undefined,
        settings: {
          status: status.toLowerCase(),
          agent_type: agentType
        },
        avatar_url: undefined as string | undefined
      };
      
      // Upload avatar if there's a new file
      try {
        if (avatarFile) {
          const newAvatarUrl = await uploadAvatar(user.id);
          if (newAvatarUrl) {
            agentData.avatar_url = newAvatarUrl;
          }
        }
      } catch (avatarError) {
        // Continue with save but show avatar error
        setError(`${avatarError instanceof Error ? avatarError.message : 'Error uploading avatar'}`);
      }
      
      // Force create path for 'new' agents regardless of isNew flag
      if (isNew || id === 'new' || !id || id === 'undefined' || id === 'null') {
        console.log('DEBUG - Taking CREATE path');
        
        // Create new agent using the createAgent function
        const result = await createAgent({
          ...agentData,
          id: agentId
        });
        
        if (!result) {
          throw new Error('Failed to create agent - no data returned');
        }

        
        // Check if this is the user's first agent and update onboarding steps
        const { data: agents, error: agentsError } = await supabase
          .from('agents')
          .select('id')
          .eq('user_id', user.id);
          
        if (!agentsError && agents && agents.length === 1) {
          // This is the user's first agent, update onboarding steps
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('onboarding_steps')
            .eq('id', user.id)
            .single();
            
          if (!profileError && profile) {
            // Get current onboarding steps or use default if not set
            const currentSteps = profile.onboarding_steps || {
              created_first_agent: false,
              added_data_source: false,
              connected_channel: false,
              has_dismissed: false
            };
            
            // Update the created_first_agent flag
            await supabase
              .from('profiles')
              .update({
                onboarding_steps: {
                  ...currentSteps,
                  created_first_agent: true
                }
              })
              .eq('id', user.id);
          }
        }
        
        // Redirect to the newly created agent
        router.push('/dashboard/chatbots');
      } else {
        console.log('DEBUG - Taking UPDATE path');
        
        // Update existing agent
        const result = await updateAgent(id, agentData);
        
        if (!result) {
          throw new Error('Failed to update agent');
        }
        
        router.push('/dashboard/chatbots');
      }
    } catch (err) {
      console.error('Error saving agent:', {
        error: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined,
        isNew,
        agentId: isNew ? 'new' : id
      });
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(`Failed to save agent: ${errorMessage}`);
      setSaving(false);
    } finally {
      setSaving(false);
    }
  };
  
  const handleDelete = async () => {
    try {
      await deleteAgent(id);
      router.push('/dashboard/chatbots');
    } catch (err) {
      setError((err as Error).message);
      setDeleteDialogOpen(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full min-h-screen bg-[#0a0a0b] text-white p-6">
        <div className="max-w-3xl mx-auto">
          <Card className="bg-[rgba(31,32,36,0.8)] backdrop-blur-lg border border-gray-600/50 rounded-xl">
            <CardContent className="p-6 flex justify-center items-center">
              <div className="animate-pulse text-gray-400">Loading...</div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Handle refreshing data sources after changes
  const refreshDataSources = () => {
    if (!isNew) {
      fetchDataSources(id);
    }
  };

  return (
    <div className="w-full min-h-screen bg-[#0a0a0b] text-white p-6">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">
          <span className="bg-gradient-to-r from-blue-500 via-purple-500 to-cyan-400 bg-clip-text text-transparent">
            {isNew ? 'Create New Agent' : 'Edit Agent'}
          </span>
        </h1>
        
        <Card className="bg-[rgba(31,32,36,0.8)] backdrop-blur-lg border border-gray-600/50 rounded-xl">
          <CardHeader>
            <CardTitle className="text-xl font-semibold">
              {isNew ? 'Agent Configuration' : 'Edit Agent Configuration'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-md p-4 mb-6">
                <p className="text-red-400">{error}</p>
              </div>
            )}
            
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid grid-cols-6 w-full mb-6">
                <TabsTrigger value="general">General</TabsTrigger>
                <TabsTrigger value="personality">Personality & Model</TabsTrigger>
                <TabsTrigger value="workflows">
                  <Zap className="h-4 w-4 mr-2" />
                  Workflows
                </TabsTrigger>
                <TabsTrigger value="integrations">Integrations</TabsTrigger>
                <TabsTrigger value="data">Data Sources</TabsTrigger>
                <TabsTrigger value="widget">Website Widget</TabsTrigger>
              </TabsList>
              
              <TabsContent value="general" className="space-y-6">
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Avatar Upload */}
                  <div className="flex flex-col items-center space-y-4">
                    <Avatar className="h-24 w-24 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600">
                      {avatarUrl ? (
                        <AvatarImage src={avatarUrl} alt="Agent avatar" className="rounded-xl" />
                      ) : (
                        <AvatarFallback className="rounded-xl bg-gradient-to-r from-blue-500 to-purple-600">
                          <Bot className="h-12 w-12 text-white" />
                        </AvatarFallback>
                      )}
                    </Avatar>
                    
                    <div className="flex items-center">
                      <Label htmlFor="avatar" className="cursor-pointer bg-gray-700 hover:bg-gray-600 text-white py-2 px-4 rounded-md flex items-center">
                        <Upload className="h-4 w-4 mr-2" />
                        Upload Avatar
                      </Label>
                      <input 
                        id="avatar" 
                        type="file" 
                        accept="image/*" 
                        onChange={handleAvatarChange} 
                        className="hidden" 
                      />
                    </div>
                  </div>
                  
                  {/* Name */}
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-gray-300">Agent Name</Label>
                    <Input 
                      id="name" 
                      value={name} 
                      onChange={(e) => setName(e.target.value)} 
                      placeholder="My Awesome Agent"
                      required 
                      className="bg-gray-800 border-gray-700 text-white" 
                    />
                  </div>
                  
                  {/* Description */}
                  <div className="space-y-2">
                    <Label htmlFor="description" className="text-gray-300">Description (optional)</Label>
                    <Input 
                      id="description" 
                      value={description} 
                      onChange={(e) => setDescription(e.target.value)} 
                      placeholder="A brief description of your agent"
                      className="bg-gray-800 border-gray-700 text-white" 
                    />
                  </div>
                  
                  {/* Agent Type */}
                  {isNew && (
                    <div className="space-y-2">
                      <Label htmlFor="agentType" className="text-gray-300">Agent Type</Label>
                      <Select value={agentType} onValueChange={setAgentType}>
                        <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                          <SelectValue placeholder="Select agent type" />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-800 border-gray-700 text-white">
                          <SelectItem value="customer_support">Customer Support</SelectItem>
                          <SelectItem value="sales_agent">Sales Agent</SelectItem>
                          <SelectItem value="marketing_agent">Marketing Agent</SelectItem>
                          <SelectItem value="mail_manager">Mail Manager</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-sm text-gray-400">This will set up default prompts and behaviors for your agent.</p>
                    </div>
                  )}
                  
                  {/* Status */}
                  <div className="space-y-2">
                    <Label htmlFor="status" className="text-gray-300">Status</Label>
                    <Select value={status} onValueChange={setStatus}>
                      <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-800 border-gray-700 text-white">
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="flex justify-between pt-4">
                    <div>
                      {!isNew && (
                        <Button 
                          type="button" 
                          variant="destructive" 
                          className="bg-red-600 hover:bg-red-700 text-white"
                          onClick={() => setDeleteDialogOpen(true)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete Agent
                        </Button>
                      )}
                    </div>
                    <div className="flex space-x-4">
                      <Button 
                        type="button" 
                        variant="default" 
                        className="border-gray-600 text-gray-300 hover:bg-gray-700 bg-transparent"
                        onClick={() => router.push('/dashboard/chatbots')}
                      >
                        Cancel
                      </Button>
                      <Button 
                        type="submit" 
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                        disabled={saving}
                      >
                        {saving ? 'Saving...' : 'Save Changes'}
                      </Button>
                    </div>
                  </div>
                </form>
              </TabsContent>
              
              <TabsContent value="personality" className="space-y-6">
                <div className="space-y-6">
                  {/* Base Prompt */}
                  <div className="space-y-2">
                    <Label htmlFor="basePrompt" className="text-gray-300">Base Prompt</Label>
                    <Textarea 
                      id="basePrompt" 
                      value={basePrompt} 
                      onChange={(e) => setBasePrompt(e.target.value)} 
                      placeholder="You are a friendly and professional customer support assistant for 'Intaj AI'. Your main goal is to answer user questions about our products and services." 
                      className="bg-gray-800 border-gray-700 text-white min-h-[200px]" 
                    />
                  </div>
                  
                  {/* Model */}
                  <div className="space-y-2">
                    <Label htmlFor="model" className="text-gray-300">AI Model</Label>
                    <Select value={model} onValueChange={setModel}>
                      <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                        <SelectValue placeholder="Select a model" />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-800 border-gray-700 text-white">
                        <SelectItem value="gpt-4o">GPT-4o</SelectItem>
                        <SelectItem value="claude-3-sonnet">Claude 3 Sonnet</SelectItem>
                        <SelectItem value="llama-3-70b">Llama 3 70B</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="flex justify-end pt-4">
                    <Button 
                      type="button"
                      onClick={handleSubmit}
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                      disabled={saving}
                    >
                      {saving ? 'Saving...' : (isNew ? 'Create Agent' : 'Save Changes')}
                    </Button>
                  </div>
                </div>
              </TabsContent>
              <TabsContent value="data" className="space-y-6">
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-medium">Data Sources</h3>
                    {!isNew && (
                      <AddDataSourceDialog 
                        agentId={id}
                      >
                        <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                          Add Data Source
                        </Button>
                      </AddDataSourceDialog>
                    )}
                    {isNew && (
                      <div className="text-sm text-gray-400">
                        Save agent first to add data sources
                      </div>
                    )}
                  </div>
                  
                  {!isNew ? (
                    <DataSourceList 
                      agentId={id}
                      dataSources={dataSources} 
                      onDelete={refreshDataSources} 
                    />
                  ) : (
                    <div className="text-center py-8 text-gray-400">
                      <p>Create your agent first, then add data sources to train it.</p>
                    </div>
                  )}
                </div>
              </TabsContent>
              <TabsContent value="workflows">
                {!isNew ? (
                  <WorkflowBuilder agentId={id} />
                ) : (
                  <div className="text-center py-8 text-gray-400">
                    <p>Save your agent first to create workflows.</p>
                  </div>
                )}
              </TabsContent>
              <TabsContent value="integrations">
                {!isNew ? (
                  <div className="space-y-6">
                    <TelegramIntegration agentId={id} />
                    <WhatsAppIntegration agentId={id} />
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-400">
                    <p>Save your agent first to set up integrations.</p>
                  </div>
                )}
              </TabsContent>
              <TabsContent value="widget">
                {!isNew ? (
                  <WidgetEmbedCode agentId={id} />
                ) : (
                  <div className="text-center py-8 text-gray-400">
                    <p>Save your agent first to get the embed code.</p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
        
        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent className="bg-gray-800 border-gray-700 text-white">
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription className="text-gray-400">
                This action cannot be undone. This will permanently delete the agent
                and all associated data including messages and connections.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="bg-gray-700 text-white hover:bg-gray-600">
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction 
                className="bg-red-600 text-white hover:bg-red-700"
                onClick={handleDelete}
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
