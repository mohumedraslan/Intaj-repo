'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/lib/supabaseClient';
import { createAgent } from '../../chatbots/actions';
import { Bot, Upload } from 'lucide-react';

export default function NewAgentPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [model, setModel] = useState('gpt-4o');
  const [basePrompt, setBasePrompt] = useState('');
  const [status, setStatus] = useState('active');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

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
      const agentId = crypto.randomUUID();
      const fileExt = avatarFile.name.split('.').pop();
      const fileName = `${agentId}.${fileExt}`;
      const filePath = `${userId}/${fileName}`;
      
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
      
      // Validate required fields
      if (!name?.trim()) {
        throw new Error('Agent name is required');
      }
      if (!model) {
        throw new Error('AI model selection is required');
      }
      
      // Prepare agent data
      const agentData = {
        name: name.trim(),
        description: description?.trim() || undefined,
        model,
        base_prompt: basePrompt?.trim() || undefined,
        settings: {
          status: status.toLowerCase()
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
      
      // Create new agent
      const result = await createAgent(agentData);
      
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
      
      // Redirect to agents list
      router.push('/dashboard/agents');
    } catch (err) {
      console.error('Error saving agent:', {
        error: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined
      });
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(`Failed to save agent: ${errorMessage}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="w-full min-h-screen bg-[#0a0a0b] text-white p-6">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">
          <span className="bg-gradient-to-r from-blue-500 via-purple-500 to-cyan-400 bg-clip-text text-transparent">
            Create New Agent
          </span>
        </h1>
        
        <Card className="bg-[rgba(31,32,36,0.8)] backdrop-blur-lg border border-gray-600/50 rounded-xl">
          <CardHeader>
            <CardTitle className="text-xl font-semibold">
              Agent Configuration
            </CardTitle>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-md p-4 mb-6">
                <p className="text-red-400">{error}</p>
              </div>
            )}
            
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
                <Label htmlFor="name" className="text-gray-300">Agent Name *</Label>
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
                <Label htmlFor="description" className="text-gray-300">Description</Label>
                <Input 
                  id="description" 
                  value={description} 
                  onChange={(e) => setDescription(e.target.value)} 
                  placeholder="A brief description of your agent"
                  className="bg-gray-800 border-gray-700 text-white" 
                />
              </div>
              
              {/* Model */}
              <div className="space-y-2">
                <Label htmlFor="model" className="text-gray-300">AI Model *</Label>
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
              
              {/* Base Prompt */}
              <div className="space-y-2">
                <Label htmlFor="basePrompt" className="text-gray-300">Base Prompt</Label>
                <Textarea 
                  id="basePrompt" 
                  value={basePrompt} 
                  onChange={(e) => setBasePrompt(e.target.value)} 
                  placeholder="You are a friendly and professional customer support assistant for 'Intaj AI'. Your main goal is to answer user questions about our products and services." 
                  className="bg-gray-800 border-gray-700 text-white min-h-[120px]" 
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
              <div className="flex justify-end space-x-4 pt-4">
                <Button 
                  type="button" 
                  className="border border-gray-600 text-gray-300 hover:bg-gray-700 bg-transparent"
                  onClick={() => router.push('/dashboard/agents')}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                  disabled={saving}
                >
                  {saving ? 'Creating...' : 'Create Agent'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
