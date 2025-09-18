'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { 
  Plus, Bot, Settings, Database, Zap, MessageSquare, BarChart3, ArrowLeft, Save, Eye, 
  Upload, FileText, Globe, Mail, Phone, Users, TrendingUp, Target, Headphones,
  PenTool, CheckSquare, Sparkles, Brain, Upload as UploadIcon
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const agentTypes = [
  { 
    id: 'customer_support', 
    name: 'Customer Support', 
    icon: Headphones, 
    description: 'Handle customer inquiries and support tickets',
    color: 'bg-blue-500',
    integrations: ['telegram', 'whatsapp', 'intercom', 'zendesk', 'discord'],
    features: ['24/7 Support', 'Ticket Management', 'FAQ Automation', 'Escalation Rules']
  },
  { 
    id: 'sales', 
    name: 'Sales Agent', 
    icon: Target, 
    description: 'Generate leads and close sales deals',
    color: 'bg-green-500',
    integrations: ['telegram', 'whatsapp', 'stripe', 'hubspot', 'salesforce'],
    features: ['Lead Qualification', 'Pipeline Management', 'Follow-up Automation', 'Revenue Tracking']
  },
  { 
    id: 'marketing', 
    name: 'Marketing Agent', 
    icon: TrendingUp, 
    description: 'Create campaigns and engage customers',
    color: 'bg-purple-500',
    integrations: ['mailchimp', 'google_ads', 'meta_ads', 'mixpanel', 'amplitude'],
    features: ['Campaign Creation', 'Audience Targeting', 'A/B Testing', 'Analytics']
  },
  { 
    id: 'content_creator', 
    name: 'Content Creator', 
    icon: PenTool, 
    description: 'Generate and manage content across platforms',
    color: 'bg-pink-500',
    integrations: ['instagram', 'facebook', 'twitter', 'linkedin', 'youtube'],
    features: ['Content Generation', 'Scheduling', 'Brand Voice', 'Multi-platform']
  },
  { 
    id: 'mail_manager', 
    name: 'Mail Manager', 
    icon: Mail, 
    description: 'Manage and organize email communications',
    color: 'bg-orange-500',
    integrations: ['gmail', 'outlook', 'sendgrid', 'mailchimp', 'twilio'],
    features: ['Email Automation', 'Template Management', 'Scheduling', 'Analytics']
  },
  { 
    id: 'task_handler', 
    name: 'Task Handler', 
    icon: CheckSquare, 
    description: 'Automate workflows and handle routine tasks',
    color: 'bg-cyan-500',
    integrations: ['zapier', 'notion', 'airtable', 'slack', 'trello'],
    features: ['Workflow Automation', 'Task Scheduling', 'Data Processing', 'Notifications']
  }
];

const integrationOptions = {
  // Communication Platforms
  telegram: { name: 'Telegram', icon: MessageSquare, category: 'Communication' },
  whatsapp: { name: 'WhatsApp', icon: Phone, category: 'Communication' },
  discord: { name: 'Discord', icon: Users, category: 'Communication' },
  slack: { name: 'Slack', icon: MessageSquare, category: 'Communication' },
  
  // Social Media
  instagram: { name: 'Instagram', icon: Users, category: 'Social Media' },
  facebook: { name: 'Facebook', icon: Users, category: 'Social Media' },
  twitter: { name: 'Twitter', icon: Users, category: 'Social Media' },
  linkedin: { name: 'LinkedIn', icon: Users, category: 'Social Media' },
  youtube: { name: 'YouTube', icon: Users, category: 'Social Media' },
  
  // Analytics & Attribution
  appsflyer: { name: 'AppsFlyer', icon: BarChart3, category: 'Analytics' },
  adjust: { name: 'Adjust', icon: BarChart3, category: 'Analytics' },
  branch: { name: 'Branch', icon: BarChart3, category: 'Analytics' },
  mixpanel: { name: 'Mixpanel', icon: BarChart3, category: 'Analytics' },
  amplitude: { name: 'Amplitude', icon: BarChart3, category: 'Analytics' },
  firebase: { name: 'Firebase Analytics', icon: BarChart3, category: 'Analytics' },
  
  // Marketing & Email
  mailchimp: { name: 'Mailchimp', icon: Mail, category: 'Marketing' },
  sendgrid: { name: 'SendGrid', icon: Mail, category: 'Marketing' },
  twilio: { name: 'Twilio', icon: Phone, category: 'Marketing' },
  google_ads: { name: 'Google Ads', icon: Target, category: 'Marketing' },
  meta_ads: { name: 'Meta Ads', icon: Target, category: 'Marketing' },
  
  // Payments & Revenue
  stripe: { name: 'Stripe', icon: BarChart3, category: 'Payments' },
  revenuecat: { name: 'RevenueCat', icon: BarChart3, category: 'Payments' },
  
  // Customer Support
  intercom: { name: 'Intercom', icon: Headphones, category: 'Support' },
  zendesk: { name: 'Zendesk', icon: Headphones, category: 'Support' },
  
  // CRM & Sales
  hubspot: { name: 'HubSpot', icon: Target, category: 'CRM' },
  salesforce: { name: 'Salesforce', icon: Target, category: 'CRM' },
  
  // Productivity
  gmail: { name: 'Gmail', icon: Mail, category: 'Productivity' },
  outlook: { name: 'Outlook', icon: Mail, category: 'Productivity' },
  notion: { name: 'Notion', icon: Database, category: 'Productivity' },
  airtable: { name: 'Airtable', icon: Database, category: 'Productivity' },
  trello: { name: 'Trello', icon: CheckSquare, category: 'Productivity' },
  zapier: { name: 'Zapier', icon: Zap, category: 'Productivity' }
};

const sidebarSteps = [
  { id: 'type', title: 'Agent Type', icon: Bot, completed: false },
  { id: 'basic', title: 'Basic Information', icon: Settings, completed: false },
  { id: 'personality', title: 'Personality & Behavior', icon: Brain, completed: false },
  { id: 'knowledge', title: 'Knowledge Base', icon: Database, completed: false },
  { id: 'integrations', title: 'Integrations', icon: Zap, completed: false }
];

export default function NewAgentPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState('type');
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    agent_type: '',
    base_prompt: '',
    model: 'gpt-4o',
    avatar_url: '',
    enableRAG: false,
    selectedIntegrations: [] as string[],
    integrationCredentials: {} as Record<string, {source: string, token: string, username?: string}>,
    knowledgeFiles: [] as Array<{name: string, size: number, type: string}>,
    websiteSources: [] as string[]
  });
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [steps, setSteps] = useState(sidebarSteps);
  const [selectedAgentType, setSelectedAgentType] = useState<typeof agentTypes[0] | null>(null);

  const supabase = createClient();

  const handleSave = async () => {
    if (!formData.name.trim()) {
      alert('Please enter an agent name');
      return;
    }
    if (!formData.agent_type) {
      alert('Please select an agent type');
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
            status: 'active',
            enableRAG: formData.enableRAG,
            integrations: formData.selectedIntegrations,
            knowledge_files: formData.knowledgeFiles,
            website_sources: formData.websiteSources
          }
        })
        .select()
        .single();

      if (error) throw error;

      router.push(`/agents/${data.id}/dashboard`);
    } catch (error) {
      console.error('Error creating agent:', JSON.stringify(error, null, 2));
      alert('Failed to create agent. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getDefaultPrompt = (agentType: string) => {
    const prompts = {
      customer_support: "You are a helpful customer support agent. Provide friendly, professional assistance to customers. Always be empathetic and solution-focused. Handle inquiries efficiently and escalate complex issues when needed.",
      sales: "You are a skilled sales agent. Help customers understand our products and guide them through the purchasing process. Be persuasive but not pushy. Focus on building relationships and understanding customer needs.",
      marketing: "You are a creative marketing agent. Engage customers with compelling content and help build brand awareness. Be enthusiastic and inspiring. Create campaigns that resonate with target audiences.",
      content_creator: "You are a creative content creator. Generate engaging, original content across multiple platforms. Maintain brand voice consistency and create content that drives engagement and conversions.",
      mail_manager: "You are an efficient mail manager. Help organize, prioritize, and manage email communications effectively. Be organized and detail-oriented. Automate routine tasks and improve email workflows.",
      task_handler: "You are an intelligent task handler. Automate workflows and handle routine tasks efficiently. Be proactive in identifying optimization opportunities and streamline processes."
    };
    return prompts[agentType as keyof typeof prompts] || "You are a helpful AI assistant.";
  };

  const handlePreview = () => {
    if (!formData.agent_type) {
      alert('Please select an agent type first');
      return;
    }
    const previewData = {
      ...formData,
      base_prompt: formData.base_prompt || getDefaultPrompt(formData.agent_type)
    };
    console.log('🤖 Agent Preview:', {
      name: previewData.name || `${selectedAgentType?.name || 'Unnamed Agent'}`,
      type: previewData.agent_type,
      model: previewData.model,
      description: previewData.description,
      prompt: previewData.base_prompt,
      integrations: previewData.selectedIntegrations,
      rag_enabled: previewData.enableRAG,
      knowledge_files: previewData.knowledgeFiles.length,
      website_sources: previewData.websiteSources.length
    });
  };

  const handleStepComplete = (stepId: string) => {
    setSteps(prev => prev.map(step => 
      step.id === stepId ? { ...step, completed: true } : step
    ));
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      const fileList = Array.from(files).map(file => ({
        name: file.name,
        size: file.size,
        type: file.type
      }));
      setFormData(prev => ({
        ...prev,
        knowledgeFiles: [...prev.knowledgeFiles, ...fileList]
      }));
    }
  };

  const removeFile = (index: number) => {
    setFormData(prev => ({
      ...prev,
      knowledgeFiles: prev.knowledgeFiles.filter((_, i) => i !== index)
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

  const addWebsite = () => {
    if (!websiteUrl.trim()) return;
    
    try {
      new URL(websiteUrl); // Validate URL
      setFormData(prev => ({
        ...prev,
        websiteSources: [...prev.websiteSources, websiteUrl.trim()]
      }));
      setWebsiteUrl('');
    } catch {
      alert('Please enter a valid URL');
    }
  };

  const removeWebsite = (index: number) => {
    setFormData(prev => ({
      ...prev,
      websiteSources: prev.websiteSources.filter((_, i) => i !== index)
    }));
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 'type':
        return (
          <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
            <div>
              <h2 className="text-3xl font-bold mb-2 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                Choose Your Agent Type
              </h2>
              <p className="text-gray-400 text-lg">Select the type of AI agent you want to create. Each type comes with specialized capabilities and integrations.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {agentTypes.map((type) => {
                const Icon = type.icon;
                const isSelected = formData.agent_type === type.id;
                
                return (
                  <Card
                    key={type.id}
                    className={`cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-2xl ${
                      isSelected
                        ? 'border-blue-500 bg-blue-500/10 shadow-blue-500/20 shadow-lg'
                        : 'border-gray-600 bg-[#1f2024] hover:border-gray-500'
                    }`}
                    onClick={() => {
                      setFormData({ ...formData, agent_type: type.id });
                      setSelectedAgentType(type);
                      handleStepComplete('type');
                    }}
                  >
                    <CardContent className="p-6">
                      <div className="flex flex-col items-center text-center space-y-4">
                        <div className={`p-4 rounded-full ${type.color} bg-opacity-20`}>
                          <Icon className="h-8 w-8 text-white" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-lg text-white mb-2">{type.name}</h3>
                          <p className="text-sm text-gray-400 mb-4">{type.description}</p>
                          <div className="flex flex-wrap gap-1 justify-center">
                            {type.features.map((feature, index) => (
                              <Badge key={index} variant="secondary" className="text-xs">
                                {feature}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {formData.agent_type && (
              <div className="mt-8 p-6 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-lg border border-blue-500/20">
                <div className="flex items-center space-x-3 mb-4">
                  <Sparkles className="h-5 w-5 text-blue-400" />
                  <h3 className="text-lg font-semibold text-white">Recommended Integrations</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {selectedAgentType?.integrations.map((integration: string) => {
                    const integrationData = integrationOptions[integration as keyof typeof integrationOptions];
                    if (!integrationData) return null;
                    const IntegrationIcon = integrationData.icon;
                    return (
                      <Badge key={integration} className="bg-blue-600/20 text-blue-300 border-blue-500/30">
                        <IntegrationIcon className="h-3 w-3 mr-1" />
                        {integrationData.name}
                      </Badge>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        );

      case 'basic':
        return (
          <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
            <div>
              <h2 className="text-3xl font-bold mb-2 bg-gradient-to-r from-green-400 to-blue-400 bg-clip-text text-transparent">
                Basic Information
              </h2>
              <p className="text-gray-400 text-lg">Give your {selectedAgentType?.name || 'agent'} a name and description.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div>
                  <Label htmlFor="name" className="text-base font-medium">Agent Name *</Label>
                  <Input
                    id="name"
                    placeholder={`e.g., ${selectedAgentType?.name || 'My AI Agent'}`}
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
          <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
            <div>
              <h2 className="text-3xl font-bold mb-2 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                Personality & Behavior
              </h2>
              <p className="text-gray-400 text-lg">Define how your {selectedAgentType?.name || 'agent'} should communicate and behave.</p>
            </div>

            <div className="space-y-8">
              <div>
                <Label htmlFor="base_prompt" className="text-base font-medium mb-3 block">System Prompt</Label>
                <Textarea
                  id="base_prompt"
                  placeholder={getDefaultPrompt(formData.agent_type)}
                  value={formData.base_prompt}
                  onChange={(e) => setFormData({ ...formData, base_prompt: e.target.value })}
                  className="mt-2 min-h-[250px] bg-[#1f2024] border-gray-600 text-white placeholder:text-gray-400 text-sm leading-relaxed"
                />
                <p className="text-sm text-gray-400 mt-3">
                  This defines your agent's personality, communication style, and behavioral guidelines.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="bg-[#1f2024] border-gray-600">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center">
                      <Brain className="h-5 w-5 mr-2 text-purple-400" />
                      AI Model
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Select value={formData.model} onValueChange={(value) => setFormData({ ...formData, model: value })}>
                      <SelectTrigger className="bg-[#141517] border-gray-600">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="gpt-4o">GPT-4o (Recommended)</SelectItem>
                        <SelectItem value="gpt-4">GPT-4</SelectItem>
                        <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo</SelectItem>
                        <SelectItem value="claude-3-opus">Claude 3 Opus</SelectItem>
                        <SelectItem value="claude-3-sonnet">Claude 3 Sonnet</SelectItem>
                      </SelectContent>
                    </Select>
                  </CardContent>
                </Card>

                <Card className="bg-[#1f2024] border-gray-600">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center">
                      <Settings className="h-5 w-5 mr-2 text-blue-400" />
                      Response Style
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm">Formal Communication</Label>
                      <input type="checkbox" className="rounded" />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label className="text-sm">Emoji Usage</Label>
                      <input type="checkbox" className="rounded" />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label className="text-sm">Detailed Responses</Label>
                      <input type="checkbox" className="rounded" defaultChecked />
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        );

      case 'knowledge':
        return (
          <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
            <div>
              <h2 className="text-3xl font-bold mb-2 bg-gradient-to-r from-orange-400 to-red-400 bg-clip-text text-transparent">
                Knowledge Base & RAG
              </h2>
              <p className="text-gray-400 text-lg">Upload data sources and enable RAG (Retrieval Augmented Generation) for your {selectedAgentType?.name || 'agent'}.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="space-y-6">
                <Card className="bg-[#1f2024] border-gray-600">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center justify-between">
                      <div className="flex items-center">
                        <Brain className="h-5 w-5 mr-2 text-orange-400" />
                        Enable RAG
                      </div>
                      <input 
                        type="checkbox"
                        checked={formData.enableRAG}
                        onChange={(e) => setFormData({ ...formData, enableRAG: e.target.checked })}
                        className="rounded"
                      />
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-400">
                      RAG allows your agent to access and reference uploaded documents, websites, and data sources for more accurate and contextual responses.
                    </p>
                  </CardContent>
                </Card>

                <Card className="bg-[#1f2024] border-gray-600">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center">
                      <UploadIcon className="h-5 w-5 mr-2 text-blue-400" />
                      Upload Files
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="border-2 border-dashed border-gray-600 rounded-lg p-6 text-center hover:border-gray-500 transition-colors">
                      <input
                        type="file"
                        multiple
                        onChange={handleFileUpload}
                        className="hidden"
                        id="file-upload"
                        accept=".pdf,.doc,.docx,.txt,.csv,.json"
                      />
                      <label htmlFor="file-upload" className="cursor-pointer">
                        <FileText className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-sm text-gray-400">
                          Click to upload or drag and drop
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          PDF, DOC, TXT, CSV, JSON files
                        </p>
                      </label>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-6">
                <Card className="bg-[#1f2024] border-gray-600">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center">
                      <FileText className="h-5 w-5 mr-2 text-green-400" />
                      Uploaded Files ({formData.knowledgeFiles.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {formData.knowledgeFiles.length === 0 ? (
                      <p className="text-gray-400 text-sm">No files uploaded yet</p>
                    ) : (
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {formData.knowledgeFiles.map((file, index) => (
                          <div key={index} className="flex items-center justify-between p-2 bg-[#141517] rounded border border-gray-700">
                            <div className="flex items-center space-x-2">
                              <FileText className="h-4 w-4 text-blue-400" />
                              <div>
                                <p className="text-sm text-white truncate max-w-48">{file.name}</p>
                                <p className="text-xs text-gray-400">{(file.size / 1024).toFixed(1)} KB</p>
                              </div>
                            </div>
                            <Button
                              variant="default"
                              onClick={() => removeFile(index)}
                              className="h-6 w-6 p-0 text-red-400 hover:text-red-300"
                            >
                              ×
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card className="bg-[#1f2024] border-gray-600">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center">
                      <Globe className="h-5 w-5 mr-2 text-purple-400" />
                      Website Sources
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Input
                      placeholder="https://example.com/docs"
                      value={websiteUrl}
                      onChange={(e) => setWebsiteUrl(e.target.value)}
                      className="bg-[#141517] border-gray-600 text-white placeholder:text-gray-400"
                      onKeyPress={(e) => e.key === 'Enter' && addWebsite()}
                    />
                    <Button 
                      onClick={addWebsite}
                      className="w-full bg-purple-600 hover:bg-purple-700"
                      disabled={!websiteUrl.trim()}
                    >
                      Add Website
                    </Button>
                    
                    {formData.websiteSources.length > 0 && (
                      <div className="space-y-2 max-h-32 overflow-y-auto">
                        <p className="text-sm font-medium text-gray-300">Added Websites:</p>
                        {formData.websiteSources.map((url, index) => (
                          <div key={index} className="flex items-center justify-between p-2 bg-[#141517] rounded border border-gray-700">
                            <div className="flex items-center space-x-2">
                              <Globe className="h-4 w-4 text-purple-400" />
                              <span className="text-sm text-white truncate max-w-48">{url}</span>
                            </div>
                            <Button
                              variant="default"
                              onClick={() => removeWebsite(index)}
                              className="h-6 w-6 p-0 text-red-400 hover:text-red-300"
                            >
                              ×
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        );

      case 'integrations':
        const availableIntegrations = selectedAgentType?.integrations || [];
        const groupedIntegrations = Object.entries(integrationOptions)
          .filter(([key]) => availableIntegrations.includes(key))
          .reduce((acc, [key, value]) => {
            if (!acc[value.category]) acc[value.category] = [];
            acc[value.category].push({ key, ...value });
            return acc;
          }, {} as Record<string, Array<{key: string, name: string, icon: any, category: string}>>);

        return (
          <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
            <div>
              <h2 className="text-3xl font-bold mb-2 bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
                Integrations & Platforms
              </h2>
              <p className="text-gray-400 text-lg">
                Connect your {selectedAgentType?.name || 'agent'} to platforms and services. 
                {selectedAgentType && ` Recommended for ${selectedAgentType.name.toLowerCase()}.`}
              </p>
            </div>

            {Object.entries(groupedIntegrations).map(([category, integrations]) => (
              <div key={category} className="space-y-4">
                <h3 className="text-xl font-semibold text-white flex items-center">
                  <Zap className="h-5 w-5 mr-2 text-cyan-400" />
                  {category}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {integrations.map((integration) => {
                    const Icon = integration.icon;
                    const isSelected = formData.selectedIntegrations.includes(integration.key);
                    
                    return (
                      <Card
                        key={integration.key}
                        className={`cursor-pointer transition-all duration-200 hover:scale-105 ${
                          isSelected
                            ? 'border-cyan-500 bg-cyan-500/10 shadow-cyan-500/20 shadow-md'
                            : 'border-gray-600 bg-[#1f2024] hover:border-gray-500'
                        }`}
                        onClick={() => toggleIntegration(integration.key)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center space-x-3">
                            <div className={`p-2 rounded-lg ${isSelected ? 'bg-cyan-500/20' : 'bg-gray-700'}`}>
                              <Icon className="h-6 w-6 text-white" />
                            </div>
                            <div className="flex-1">
                              <h4 className="font-medium text-white">{integration.name}</h4>
                              <p className="text-xs text-gray-400">{integration.category}</p>
                            </div>
                            {isSelected && (
                              <div className="w-5 h-5 bg-cyan-500 rounded-full flex items-center justify-center">
                                <span className="text-white text-xs">✓</span>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            ))}

            {formData.selectedIntegrations.length > 0 && (
              <Card className="bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border-cyan-500/20">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center">
                    <Sparkles className="h-5 w-5 mr-2 text-cyan-400" />
                    Selected Integrations ({formData.selectedIntegrations.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {formData.selectedIntegrations.map((integrationKey) => {
                      const integration = integrationOptions[integrationKey as keyof typeof integrationOptions];
                      if (!integration) return null;
                      const Icon = integration.icon;
                      return (
                        <Badge key={integrationKey} className="bg-cyan-600/20 text-cyan-300 border-cyan-500/30 px-3 py-1">
                          <Icon className="h-3 w-3 mr-1" />
                          {integration.name}
                        </Badge>
                      );
                    })}
                  </div>
                  <div className="mt-4 space-y-3">
                    {formData.selectedIntegrations.map((integrationKey) => {
                      const integration = integrationOptions[integrationKey as keyof typeof integrationOptions];
                      if (!integration) return null;
                      
                      return (
                        <div key={integrationKey} className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="font-medium text-white flex items-center">
                              <integration.icon className="h-4 w-4 mr-2" />
                              {integration.name} Configuration
                            </h4>
                          </div>
                          
                          <div className="space-y-3">
                            <div>
                              <Label className="text-sm text-gray-300 mb-2 block">Credential Source</Label>
                              <Select 
                                defaultValue="new"
                                onValueChange={(value) => {
                                  setFormData(prev => ({
                                    ...prev,
                                    integrationCredentials: {
                                      ...prev.integrationCredentials,
                                      [integrationKey]: {
                                        ...prev.integrationCredentials[integrationKey],
                                        source: value
                                      }
                                    }
                                  }));
                                }}
                              >
                                <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                                  <SelectValue placeholder="Choose credential source" />
                                </SelectTrigger>
                                <SelectContent className="bg-gray-800 border-gray-700">
                                  <SelectItem value="existing" className="text-gray-200">Use Existing Credentials</SelectItem>
                                  <SelectItem value="new" className="text-gray-200">Add New Credentials</SelectItem>
                                  <SelectItem value="platform" className="text-gray-200">Use Platform Token (if available)</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            
                            {integrationKey === 'telegram' && (
                              <div className="space-y-2">
                                <Label className="text-sm text-gray-300">Bot Token</Label>
                                <Input 
                                  type="password"
                                  placeholder="Enter your Telegram bot token"
                                  className="bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                                  value={formData.integrationCredentials[integrationKey]?.token || ''}
                                  onChange={(e) => {
                                    setFormData(prev => ({
                                      ...prev,
                                      integrationCredentials: {
                                        ...prev.integrationCredentials,
                                        [integrationKey]: {
                                          ...prev.integrationCredentials[integrationKey],
                                          token: e.target.value,
                                          source: prev.integrationCredentials[integrationKey]?.source || 'new'
                                        }
                                      }
                                    }));
                                  }}
                                />
                                <p className="text-xs text-gray-400">
                                  Get your bot token from @BotFather on Telegram
                                </p>
                              </div>
                            )}
                            
                            {integrationKey === 'whatsapp' && (
                              <div className="space-y-2">
                                <Label className="text-sm text-gray-300">WhatsApp Business API</Label>
                                <Input 
                                  type="password"
                                  placeholder="Enter your WhatsApp Business API token"
                                  className="bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                                  value={formData.integrationCredentials[integrationKey]?.token || ''}
                                  onChange={(e) => {
                                    setFormData(prev => ({
                                      ...prev,
                                      integrationCredentials: {
                                        ...prev.integrationCredentials,
                                        [integrationKey]: {
                                          ...prev.integrationCredentials[integrationKey],
                                          token: e.target.value,
                                          source: prev.integrationCredentials[integrationKey]?.source || 'new'
                                        }
                                      }
                                    }));
                                  }}
                                />
                                <p className="text-xs text-gray-400">
                                  Requires WhatsApp Business API access
                                </p>
                              </div>
                            )}
                            
                            {integrationKey === 'stripe' && (
                              <div className="space-y-2">
                                <Label className="text-sm text-gray-300">Stripe Secret Key</Label>
                                <Input 
                                  type="password"
                                  placeholder="sk_live_... or sk_test_..."
                                  className="bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                                  value={formData.integrationCredentials[integrationKey]?.token || ''}
                                  onChange={(e) => {
                                    setFormData(prev => ({
                                      ...prev,
                                      integrationCredentials: {
                                        ...prev.integrationCredentials,
                                        [integrationKey]: {
                                          ...prev.integrationCredentials[integrationKey],
                                          token: e.target.value,
                                          source: prev.integrationCredentials[integrationKey]?.source || 'new'
                                        }
                                      }
                                    }));
                                  }}
                                />
                                <p className="text-xs text-gray-400">
                                  Found in your Stripe Dashboard under API Keys
                                </p>
                              </div>
                            )}
                            
                            {!['telegram', 'whatsapp', 'stripe'].includes(integrationKey) && (
                              <div className="space-y-2">
                                <Label className="text-sm text-gray-300">API Key / Access Token</Label>
                                <Input 
                                  type="password"
                                  placeholder={`Enter your ${integration.name} credentials`}
                                  className="bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                                  value={formData.integrationCredentials[integrationKey]?.token || ''}
                                  onChange={(e) => {
                                    setFormData(prev => ({
                                      ...prev,
                                      integrationCredentials: {
                                        ...prev.integrationCredentials,
                                        [integrationKey]: {
                                          ...prev.integrationCredentials[integrationKey],
                                          token: e.target.value,
                                          source: prev.integrationCredentials[integrationKey]?.source || 'new'
                                        }
                                      }
                                    }));
                                  }}
                                />
                                <p className="text-xs text-gray-400">
                                  Check {integration.name} documentation for API credentials
                                </p>
                              </div>
                            )}
                            
                            <div className="flex space-x-2">
                              <Button 
                                onClick={async () => {
                                  try {
                                    setLoading(true);
                                    const supabase = createClient();
                                    const { data: { user } } = await supabase.auth.getUser();
                                    
                                    if (user && formData.integrationCredentials[integrationKey]?.token) {
                                      const { error } = await supabase
                                        .from('connections')
                                        .upsert({
                                          user_id: user.id,
                                          platform: integrationKey,
                                          credentials: {
                                            token: formData.integrationCredentials[integrationKey].token,
                                            source: formData.integrationCredentials[integrationKey].source
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
                                }}
                                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                                disabled={!formData.integrationCredentials[integrationKey]?.token || loading}
                              >
                                {loading ? 'Saving...' : 'Save'}
                              </Button>
                              
                              {integrationKey === 'telegram' && (
                                <Button 
                                  onClick={async () => {
                                    try {
                                      setLoading(true);
                                      const token = formData.integrationCredentials[integrationKey]?.token;
                                      
                                      if (!token) {
                                        alert('Please enter a bot token first');
                                        return;
                                      }
                                      
                                      // Test Telegram bot by sending a test message
                                      const response = await fetch('/api/integrations/telegram/test', {
                                        method: 'POST',
                                        headers: {
                                          'Content-Type': 'application/json',
                                        },
                                        body: JSON.stringify({ token })
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
                                  }}
                                  className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                                  disabled={!formData.integrationCredentials[integrationKey]?.token || loading}
                                >
                                  {loading ? 'Testing...' : 'Test Bot'}
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  
                  <p className="text-sm text-gray-400 mt-3">
                    Configure your integration credentials now or set them up later in the agent settings.
                  </p>
                </CardContent>
              </Card>
            )}

            <div className="bg-gradient-to-r from-blue-500/5 to-purple-500/5 rounded-lg p-6 border border-blue-500/20">
              <div className="flex items-start space-x-3">
                <div className="p-2 bg-blue-500/20 rounded-lg">
                  <Settings className="h-5 w-5 text-blue-400" />
                </div>
                <div>
                  <h4 className="font-medium text-white mb-2">Integration Setup</h4>
                  <p className="text-sm text-gray-400 leading-relaxed">
                    After creating your agent, you'll be able to configure each integration with API keys, 
                    webhooks, and specific settings. Popular integrations like Telegram and WhatsApp 
                    include guided setup wizards.
                  </p>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0b] text-[#f8fafc] flex">
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

      {/* Sidebar */}
      <div className="w-80 bg-[#141517] border-r border-gray-700/50 flex flex-col">
        <div className="p-6 border-b border-gray-700/50 pt-20">
          <button 
            onClick={() => router.push('/dashboard/agents')}
            className="flex items-center space-x-2 text-gray-400 hover:text-gray-200 transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Agents</span>
          </button>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            Create New Agent
          </h1>
          <p className="text-gray-400 text-sm mt-2">Build your intelligent AI assistant</p>
        </div>

        {/* Steps Navigation */}
        <div className="flex-1 p-6">
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

        {/* Action Buttons */}
        <div className="p-6 border-t border-gray-700/50">
          <div className="flex space-x-2">
            <Button 
              onClick={handlePreview}
              variant="default"
              className="flex-1 h-10 border border-gray-600 bg-transparent text-gray-300 hover:bg-gray-700"
            >
              <Eye className="h-4 w-4 mr-2" />
              Preview
            </Button>
            <Button 
              onClick={handleSave}
              disabled={loading || !formData.name.trim()}
              className="flex-1 h-10 bg-blue-600 hover:bg-blue-700"
            >
              <Save className="h-4 w-4 mr-2" />
              {loading ? 'Creating...' : 'Create Agent'}
            </Button>
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
  );
}