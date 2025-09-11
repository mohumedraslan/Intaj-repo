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
import { Bot, Trash2, Upload } from 'lucide-react';
import { AddDataSourceDialog } from '@/components/add-data-source-dialog';
import { DataSourceList } from '@/components/data-source-list';
import WidgetEmbedCode from '@/components/chat/WidgetEmbedCode';

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
  const id = params?.id as string;
  const isNew = id === 'new';
  
  const [agent, setAgent] = useState<Agent | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [model, setModel] = useState('gpt-4o');
  const [basePrompt, setBasePrompt] = useState('');
  const [status, setStatus] = useState('active');
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
        
        const { data, error } = await supabase
          .from('chatbots')
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
      const fileName = `${chatbotId}.${fileExt}`;
      const filePath = `${userId}/${fileName}`;
      
      // Check if bucket exists before uploading
      const { data: buckets } = await supabase.storage.listBuckets();
      const bucketExists = buckets?.some(bucket => bucket.name === 'chatbot-avatars');
      
      if (!bucketExists) {
        throw new Error('Storage bucket not found. Please contact administrator.');
      }
      
      const { error: uploadError } = await supabase.storage
        .from('chatbot-avatars')
        .upload(filePath, avatarFile, {
          upsert: true,
          cacheControl: '3600'
        });
        
      if (uploadError) {
        throw uploadError;
      }
      
      const { data } = supabase.storage
        .from('chatbot-avatars')
        .getPublicUrl(filePath);
        
      return data.publicUrl;
    } catch (err) {
      console.error('Error uploading avatar:', err);
      throw new Error(`Error uploading avatar: ${err instanceof Error ? err.message : String(err)}`);
    }
  };
  
  const fetchDataSources = async (chatbotId: string) => {
    try {
      const { data, error } = await supabase
        .from('data_sources')
        .select('*')
        .eq('chatbot_id', chatbotId);
        
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
      
      // Generate a UUID for new agents
      const agentId = isNew ? crypto.randomUUID() : id;
      
      // Prepare agent data
      const agentData = {
        name,
        description, // Allow empty string to be saved as null
        model,
        base_prompt: basePrompt,
        settings: {
          status: status.toLowerCase()
        }
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
      
      if (isNew) {
        // Create new agent using the createAgent function
        await createAgent({
          ...agentData,
          id: agentId
        });

        
        // Check if this is the user's first agent and update onboarding steps
        const { data: chatbots, error: chatbotsError } = await supabase
          .from('chatbots')
          .select('id')
          .eq('user_id', user.id);
          
        if (!chatbotsError && chatbots && chatbots.length === 1) {
          // This is the user's first agent, update onboarding steps
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('onboarding_steps')
            .eq('id', user.id)
            .single();
            
          if (!profileError && profile) {
            // Get current onboarding steps or use default if not set
            const currentSteps = profile.onboarding_steps || {
              created_first_chatbot: false,
              added_data_source: false,
              connected_channel: false,
              has_dismissed: false
            };
            
            // Update the created_first_chatbot flag
            await supabase
              .from('profiles')
              .update({
                onboarding_steps: {
                  ...currentSteps,
                  created_first_chatbot: true
                }
              })
              .eq('id', user.id);
          }
        }
        
        // Redirect to the newly created agent
        router.push('/dashboard/chatbots');
      } else {
        // Update existing agent
        await updateAgent(id, agentData);
        router.push('/dashboard/chatbots');
      }
    } catch (err) {
      console.error('Error saving agent:', err);
      setError((err as Error).message);
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
              <TabsList className="grid grid-cols-4 w-full mb-6">
                <TabsTrigger value="general">General</TabsTrigger>
                <TabsTrigger value="personality">Personality & Model</TabsTrigger>
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
                        variant="outline" 
                        className="border-gray-600 text-gray-300 hover:bg-gray-700"
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
                <form onSubmit={handleSubmit} className="space-y-6">
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
                      type="submit" 
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                      disabled={saving}
                    >
                      {saving ? 'Saving...' : 'Save Changes'}
                    </Button>
                  </div>
                </form>
              </TabsContent>
              <TabsContent value="data" className="space-y-6">
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-medium">Data Sources</h3>
                    <AddDataSourceDialog 
                      chatbotId={id} 
                      onSuccess={refreshDataSources} 
                    />
                  </div>
                  
                  <DataSourceList 
                    dataSources={dataSources} 
                    onDelete={refreshDataSources} 
                  />
                </div>
              </TabsContent>
              <TabsContent value="widget">
                <WidgetEmbedCode chatbotId={id} />
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
