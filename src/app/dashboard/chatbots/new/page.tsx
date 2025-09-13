'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Bot, Settings, Database, Zap, MessageSquare, BarChart3, ArrowLeft, Save, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { createClient } from '@/lib/supabase/client';

const agentTypes = [
  { id: 'customer_support', name: 'Customer Support', icon: MessageSquare, description: 'Handle customer inquiries and support tickets' },
  { id: 'sales', name: 'Sales Agent', icon: BarChart3, description: 'Generate leads and close sales deals' },
  { id: 'marketing', name: 'Marketing Agent', icon: Zap, description: 'Create campaigns and engage customers' },
  { id: 'mail_manager', name: 'Mail Manager', icon: Database, description: 'Manage and organize email communications' }
];

const sidebarSteps = [
  { id: 'basic', title: 'Basic Information', icon: Bot, completed: false },
  { id: 'personality', title: 'Personality & Behavior', icon: Settings, completed: false },
  { id: 'knowledge', title: 'Knowledge Base', icon: Database, completed: false },
  { id: 'integrations', title: 'Integrations', icon: Zap, completed: false }
];

export default function NewChatbotPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState('basic');
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    agent_type: '',
    base_prompt: '',
    model: 'gpt-4o',
    avatar_url: ''
  });
  const [loading, setLoading] = useState(false);
  const [steps, setSteps] = useState(sidebarSteps);

  const supabase = createClient();

  const handleStepComplete = (stepId: string) => {
    setSteps(prev => prev.map(step => 
      step.id === stepId ? { ...step, completed: true } : step
    ));
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      alert('Please enter a chatbot name');
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('agents')
        .insert({
          user_id: user.id,
          name: formData.name,
          description: formData.description,
          model: formData.model,
          base_prompt: formData.base_prompt || getDefaultPrompt(formData.agent_type),
          avatar_url: formData.avatar_url,
          settings: {
            agent_type: formData.agent_type,
            status: 'active'
          }
        })
        .select()
        .single();

      if (error) throw error;

      router.push(`/dashboard/chatbots/${data.id}`);
    } catch (error) {
      console.error('Error creating chatbot:', error);
      alert('Failed to create chatbot. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getDefaultPrompt = (agentType: string) => {
    const prompts = {
      customer_support: "You are a helpful customer support agent. Provide friendly, professional assistance to customers. Always be empathetic and solution-focused.",
      sales: "You are a skilled sales agent. Help customers understand our products and guide them through the purchasing process. Be persuasive but not pushy.",
      marketing: "You are a creative marketing agent. Engage customers with compelling content and help build brand awareness. Be enthusiastic and inspiring.",
      mail_manager: "You are an efficient mail manager. Help organize, prioritize, and manage email communications effectively. Be organized and detail-oriented."
    };
    return prompts[agentType as keyof typeof prompts] || "You are a helpful AI assistant.";
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 'basic':
        return (
          <div className="space-y-8">
            <div>
              <h2 className="text-2xl font-bold mb-2">Create Your AI Chatbot</h2>
              <p className="text-gray-400">Let's start with the basics. Choose a name and type for your chatbot.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div>
                  <Label htmlFor="name" className="text-base font-medium">Chatbot Name *</Label>
                  <Input
                    id="name"
                    placeholder="e.g., Customer Support Bot"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="mt-2 h-12 bg-[#1f2024] border-gray-600 text-white placeholder:text-gray-400"
                  />
                </div>

                <div>
                  <Label htmlFor="description" className="text-base font-medium">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Describe what your chatbot does..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="mt-2 min-h-[100px] bg-[#1f2024] border-gray-600 text-white placeholder:text-gray-400"
                  />
                </div>

                <div>
                  <Label htmlFor="model" className="text-base font-medium">AI Model</Label>
                  <Select value={formData.model} onValueChange={(value) => setFormData({ ...formData, model: value })}>
                    <SelectTrigger className="mt-2 h-12 bg-[#1f2024] border-gray-600">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gpt-4o">GPT-4o (Recommended)</SelectItem>
                      <SelectItem value="gpt-4">GPT-4</SelectItem>
                      <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label className="text-base font-medium mb-4 block">Choose Chatbot Type</Label>
                <div className="grid grid-cols-1 gap-4">
                  {agentTypes.map((type) => {
                    const Icon = type.icon;
                    return (
                      <Card
                        key={type.id}
                        className={`cursor-pointer transition-all hover:border-blue-500 ${
                          formData.agent_type === type.id
                            ? 'border-blue-500 bg-blue-500/10'
                            : 'border-gray-600 bg-[#1f2024]'
                        }`}
                        onClick={() => setFormData({ ...formData, agent_type: type.id })}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start space-x-3">
                            <Icon className="h-6 w-6 text-blue-400 mt-1" />
                            <div>
                              <h3 className="font-medium text-white">{type.name}</h3>
                              <p className="text-sm text-gray-400 mt-1">{type.description}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        );

      case 'personality':
        return (
          <div className="space-y-8">
            <div>
              <h2 className="text-2xl font-bold mb-2">Personality & Behavior</h2>
              <p className="text-gray-400">Define how your chatbot should communicate and behave.</p>
            </div>

            <div className="space-y-6">
              <div>
                <Label htmlFor="base_prompt" className="text-base font-medium">System Prompt</Label>
                <Textarea
                  id="base_prompt"
                  placeholder={getDefaultPrompt(formData.agent_type)}
                  value={formData.base_prompt}
                  onChange={(e) => setFormData({ ...formData, base_prompt: e.target.value })}
                  className="mt-2 min-h-[200px] bg-[#1f2024] border-gray-600 text-white placeholder:text-gray-400"
                />
                <p className="text-sm text-gray-400 mt-2">
                  This defines your chatbot's personality and how it should respond to users.
                </p>
              </div>
            </div>
          </div>
        );

      case 'knowledge':
        return (
          <div className="space-y-8">
            <div>
              <h2 className="text-2xl font-bold mb-2">Knowledge Base</h2>
              <p className="text-gray-400">Add data sources to make your chatbot smarter.</p>
            </div>

            <div className="text-center py-12">
              <Database className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Knowledge Base Coming Soon</h3>
              <p className="text-gray-400 mb-6">You'll be able to upload documents, websites, and other data sources.</p>
              <Badge variant="secondary">Available after creation</Badge>
            </div>
          </div>
        );

      case 'integrations':
        return (
          <div className="space-y-8">
            <div>
              <h2 className="text-2xl font-bold mb-2">Integrations</h2>
              <p className="text-gray-400">Connect your chatbot to various platforms.</p>
            </div>

            <div className="text-center py-12">
              <Zap className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Integrations Coming Soon</h3>
              <p className="text-gray-400 mb-6">Connect to Telegram, WhatsApp, Discord, and more.</p>
              <Badge variant="secondary">Available after creation</Badge>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0b] text-white">
      {/* Header */}
      <div className="border-b border-gray-800 bg-[#141517]">
        <div className="flex items-center justify-between px-8 py-4">
          <div className="flex items-center space-x-4">
            <Button
              variant="default"
              onClick={() => router.back()}
              className="h-10 w-10 p-0"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-xl font-semibold">Create New Chatbot</h1>
              <p className="text-sm text-gray-400">Build your AI-powered assistant</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <Button variant="default" className="h-10">
              <Eye className="h-4 w-4 mr-2" />
              Preview
            </Button>
            <Button 
              onClick={handleSave}
              disabled={loading || !formData.name.trim()}
              className="h-10 bg-blue-600 hover:bg-blue-700"
            >
              <Save className="h-4 w-4 mr-2" />
              {loading ? 'Creating...' : 'Create Chatbot'}
            </Button>
          </div>
        </div>
      </div>

      <div className="flex">
        {/* Sidebar */}
        <div className="w-80 bg-[#141517] border-r border-gray-800 min-h-[calc(100vh-73px)]">
          <div className="p-6">
            <h2 className="text-lg font-semibold mb-6">Setup Steps</h2>
            <div className="space-y-2">
              {steps.map((step, index) => {
                const Icon = step.icon;
                const isActive = currentStep === step.id;
                const isCompleted = step.completed;
                
                return (
                  <button
                    key={step.id}
                    onClick={() => setCurrentStep(step.id)}
                    className={`w-full flex items-center space-x-3 p-4 rounded-lg text-left transition-colors ${
                      isActive
                        ? 'bg-blue-600/20 border border-blue-600/30'
                        : 'hover:bg-gray-800/50'
                    }`}
                  >
                    <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
                      isCompleted
                        ? 'bg-green-600'
                        : isActive
                        ? 'bg-blue-600'
                        : 'bg-gray-700'
                    }`}>
                      {isCompleted ? (
                        <div className="w-4 h-4 text-white">✓</div>
                      ) : (
                        <Icon className="w-4 h-4 text-white" />
                      )}
                    </div>
                    <div>
                      <div className={`font-medium ${isActive ? 'text-blue-400' : 'text-white'}`}>
                        {step.title}
                      </div>
                      <div className="text-xs text-gray-400">
                        Step {index + 1} of {steps.length}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-8">
          <div className="max-w-4xl mx-auto">
            {renderStepContent()}
          </div>
        </div>
      </div>
    </div>
  );
}