'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Search, 
  Star, 
  Download, 
  Bot, 
  ShoppingCart, 
  Headphones, 
  BookOpen, 
  Briefcase,
  Heart,
  Zap,
  Users,
  TrendingUp,
  Filter
} from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';

interface AgentTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  use_case: string;
  avatar_url?: string;
  base_prompt: string;
  model: string;
  settings: Record<string, any>;
  workflows: Array<{
    name: string;
    triggers: any[];
    actions: any[];
  }>;
  rating: number;
  downloads: number;
  tags: string[];
  created_by: string;
  is_premium: boolean;
  price?: number;
}

const templateCategories = [
  { id: 'all', name: 'All Templates', icon: Bot },
  { id: 'customer_support', name: 'Customer Support', icon: Headphones },
  { id: 'sales', name: 'Sales & Marketing', icon: TrendingUp },
  { id: 'ecommerce', name: 'E-commerce', icon: ShoppingCart },
  { id: 'education', name: 'Education', icon: BookOpen },
  { id: 'business', name: 'Business Operations', icon: Briefcase },
  { id: 'healthcare', name: 'Healthcare', icon: Heart },
  { id: 'hr', name: 'Human Resources', icon: Users }
];

const predefinedTemplates: AgentTemplate[] = [
  {
    id: 'customer-support-pro',
    name: 'Customer Support Pro',
    description: 'Advanced customer support agent with escalation workflows, ticket creation, and satisfaction tracking.',
    category: 'customer_support',
    use_case: 'Handle customer inquiries, create support tickets, and escalate complex issues to human agents.',
    base_prompt: `You are a professional customer support agent. Your role is to:
1. Provide helpful and accurate information about products/services
2. Resolve customer issues efficiently and empathetically
3. Escalate complex problems to human agents when needed
4. Collect customer feedback and satisfaction ratings
5. Create support tickets for tracking purposes

Always maintain a friendly, professional tone and prioritize customer satisfaction.`,
    model: 'gpt-4o',
    settings: {
      status: 'active',
      response_style: 'professional',
      escalation_enabled: true,
      satisfaction_tracking: true
    },
    workflows: [
      {
        name: 'Escalate Complex Issues',
        triggers: [{ type: 'keyword_detected', value: 'escalate,manager,supervisor,complaint' }],
        actions: [{ type: 'transfer_human', config: { department: 'support' } }]
      },
      {
        name: 'Collect Satisfaction',
        triggers: [{ type: 'conversation_end' }],
        actions: [{ type: 'send_message', config: { message: 'How would you rate your experience today? (1-5 stars)' } }]
      }
    ],
    rating: 4.8,
    downloads: 1250,
    tags: ['support', 'escalation', 'tickets', 'satisfaction'],
    created_by: 'Intaj Team',
    is_premium: false
  },
  {
    id: 'ecommerce-sales-assistant',
    name: 'E-commerce Sales Assistant',
    description: 'Boost your online sales with product recommendations, cart recovery, and order assistance.',
    category: 'ecommerce',
    use_case: 'Product recommendations, cart abandonment recovery, order tracking, and sales conversion.',
    base_prompt: `You are an e-commerce sales assistant. Your goals are to:
1. Help customers find the perfect products
2. Provide detailed product information and comparisons
3. Assist with order tracking and shipping information
4. Recover abandoned carts with personalized offers
5. Upsell and cross-sell relevant products
6. Handle return and refund inquiries

Be enthusiastic about products while being helpful and honest.`,
    model: 'gpt-4o',
    settings: {
      status: 'active',
      product_catalog_integration: true,
      cart_recovery: true,
      order_tracking: true
    },
    workflows: [
      {
        name: 'Cart Recovery',
        triggers: [{ type: 'time_based', value: '30 minutes after cart abandonment' }],
        actions: [{ type: 'send_message', config: { message: 'Hi! I noticed you left some items in your cart. Would you like a 10% discount to complete your purchase?' } }]
      },
      {
        name: 'Product Recommendations',
        triggers: [{ type: 'keyword_detected', value: 'recommend,suggest,similar,alternative' }],
        actions: [{ type: 'api_call', config: { url: '/api/recommendations', method: 'GET' } }]
      }
    ],
    rating: 4.9,
    downloads: 890,
    tags: ['ecommerce', 'sales', 'recommendations', 'cart-recovery'],
    created_by: 'Intaj Team',
    is_premium: true,
    price: 29
  },
  {
    id: 'lead-qualification-bot',
    name: 'Lead Qualification Bot',
    description: 'Qualify leads, schedule meetings, and nurture prospects with intelligent conversation flows.',
    category: 'sales',
    use_case: 'Lead qualification, meeting scheduling, prospect nurturing, and CRM integration.',
    base_prompt: `You are a lead qualification specialist. Your mission is to:
1. Engage website visitors and qualify their interest level
2. Ask qualifying questions to understand their needs and budget
3. Schedule meetings with sales representatives for qualified leads
4. Collect contact information and company details
5. Nurture leads with relevant content and follow-ups
6. Integrate with CRM systems for lead tracking

Be conversational and consultative, not pushy.`,
    model: 'gpt-4o',
    settings: {
      status: 'active',
      lead_scoring: true,
      calendar_integration: true,
      crm_integration: true
    },
    workflows: [
      {
        name: 'Qualify Lead',
        triggers: [{ type: 'message_received' }],
        actions: [
          { type: 'collect_info', config: { fields: 'name,email,company,budget,timeline' } },
          { type: 'api_call', config: { url: '/api/crm/leads', method: 'POST' } }
        ]
      },
      {
        name: 'Schedule Meeting',
        triggers: [{ type: 'keyword_detected', value: 'meeting,demo,call,schedule' }],
        actions: [{ type: 'api_call', config: { url: '/api/calendar/schedule', method: 'POST' } }]
      }
    ],
    rating: 4.7,
    downloads: 650,
    tags: ['sales', 'leads', 'qualification', 'crm', 'meetings'],
    created_by: 'Intaj Team',
    is_premium: true,
    price: 49
  },
  {
    id: 'hr-onboarding-assistant',
    name: 'HR Onboarding Assistant',
    description: 'Streamline employee onboarding with document collection, policy explanations, and FAQ responses.',
    category: 'hr',
    use_case: 'New employee onboarding, document collection, policy Q&A, and first-day assistance.',
    base_prompt: `You are an HR onboarding assistant. Your responsibilities include:
1. Welcome new employees and guide them through onboarding
2. Explain company policies, benefits, and procedures
3. Collect required documents and information
4. Answer common HR questions and concerns
5. Schedule meetings with HR representatives and managers
6. Provide resources for training and development

Be welcoming, informative, and supportive throughout the process.`,
    model: 'gpt-4o',
    settings: {
      status: 'active',
      document_collection: true,
      policy_database: true,
      meeting_scheduling: true
    },
    workflows: [
      {
        name: 'Welcome New Employee',
        triggers: [{ type: 'user_joined' }],
        actions: [{ type: 'send_message', config: { message: 'Welcome to the team! I\'m here to help you get started. Let\'s begin with collecting some basic information.' } }]
      },
      {
        name: 'Document Collection',
        triggers: [{ type: 'keyword_detected', value: 'documents,forms,paperwork' }],
        actions: [{ type: 'collect_info', config: { fields: 'tax_forms,emergency_contact,bank_details' } }]
      }
    ],
    rating: 4.6,
    downloads: 420,
    tags: ['hr', 'onboarding', 'documents', 'policies'],
    created_by: 'Intaj Team',
    is_premium: false
  },
  {
    id: 'appointment-scheduler',
    name: 'Smart Appointment Scheduler',
    description: 'Automate appointment booking with calendar integration, reminders, and rescheduling capabilities.',
    category: 'business',
    use_case: 'Appointment scheduling, calendar management, automated reminders, and booking confirmations.',
    base_prompt: `You are a smart appointment scheduling assistant. Your functions include:
1. Check availability and book appointments
2. Send confirmation and reminder messages
3. Handle rescheduling and cancellation requests
4. Collect necessary information before appointments
5. Integrate with calendar systems and booking platforms
6. Provide location and preparation instructions

Be efficient and clear about scheduling details.`,
    model: 'gpt-4o',
    settings: {
      status: 'active',
      calendar_integration: true,
      reminder_system: true,
      timezone_handling: true
    },
    workflows: [
      {
        name: 'Book Appointment',
        triggers: [{ type: 'keyword_detected', value: 'book,schedule,appointment,meeting' }],
        actions: [
          { type: 'api_call', config: { url: '/api/calendar/availability', method: 'GET' } },
          { type: 'collect_info', config: { fields: 'preferred_date,preferred_time,contact_info' } }
        ]
      },
      {
        name: 'Send Reminders',
        triggers: [{ type: 'time_based', value: '24 hours before appointment' }],
        actions: [{ type: 'send_message', config: { message: 'Reminder: You have an appointment tomorrow at {time}. Please confirm or reschedule if needed.' } }]
      }
    ],
    rating: 4.5,
    downloads: 780,
    tags: ['scheduling', 'appointments', 'calendar', 'reminders'],
    created_by: 'Intaj Team',
    is_premium: false
  }
];

export default function AgentTemplates() {
  const [templates, setTemplates] = useState<AgentTemplate[]>(predefinedTemplates);
  const [filteredTemplates, setFilteredTemplates] = useState<AgentTemplate[]>(predefinedTemplates);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    filterTemplates();
  }, [selectedCategory, searchQuery, templates]);

  const filterTemplates = () => {
    let filtered = templates;

    if (selectedCategory !== 'all') {
      filtered = filtered.filter(template => template.category === selectedCategory);
    }

    if (searchQuery) {
      filtered = filtered.filter(template =>
        template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        template.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        template.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    setFilteredTemplates(filtered);
  };

  const createAgentFromTemplate = async (template: AgentTemplate) => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Create the agent
      const { data: agent, error: agentError } = await supabase
        .from('agents')
        .insert({
          user_id: user.id,
          name: `${template.name} - Copy`,
          description: template.description,
          model: template.model,
          base_prompt: template.base_prompt,
          settings: template.settings,
          avatar_url: template.avatar_url
        })
        .select()
        .single();

      if (agentError) throw agentError;

      // Create workflows if any
      if (template.workflows && template.workflows.length > 0) {
        const workflowPromises = template.workflows.map(workflow =>
          supabase.from('agent_workflows').insert({
            agent_id: agent.id,
            user_id: user.id,
            name: workflow.name,
            description: `Auto-created from ${template.name} template`,
            triggers: workflow.triggers,
            actions: workflow.actions,
            is_active: true,
            priority: 1
          })
        );

        await Promise.all(workflowPromises);
      }

      // Update download count
      const updatedTemplates = templates.map(t =>
        t.id === template.id ? { ...t, downloads: t.downloads + 1 } : t
      );
      setTemplates(updatedTemplates);

      alert(`Agent "${agent.name}" created successfully!`);
    } catch (error) {
      console.error('Error creating agent from template:', error);
      alert('Failed to create agent from template');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">Agent Templates</h1>
          <p className="text-gray-400 mt-1">Choose from pre-built agents for common business use cases</p>
        </div>
        <div className="flex gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search templates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 w-64 bg-gray-800 border-gray-700 text-white"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Categories Sidebar */}
        <div className="lg:col-span-1">
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Categories
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {templateCategories.map((category) => {
                const Icon = category.icon;
                return (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategory(category.id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors ${
                      selectedCategory === category.id
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-300 hover:bg-gray-700'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="text-sm">{category.name}</span>
                  </button>
                );
              })}
            </CardContent>
          </Card>
        </div>

        {/* Templates Grid */}
        <div className="lg:col-span-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredTemplates.map((template) => (
              <Card key={template.id} className="bg-gray-800 border-gray-700 hover:border-gray-600 transition-colors">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-12 w-12">
                        {template.avatar_url ? (
                          <AvatarImage src={template.avatar_url} />
                        ) : (
                          <AvatarFallback className="bg-gradient-to-r from-blue-500 to-purple-600">
                            <Bot className="h-6 w-6 text-white" />
                          </AvatarFallback>
                        )}
                      </Avatar>
                      <div>
                        <h3 className="text-white font-semibold">{template.name}</h3>
                        <p className="text-gray-400 text-sm">by {template.created_by}</p>
                      </div>
                    </div>
                    {template.is_premium && (
                      <Badge className="bg-yellow-500/20 text-yellow-400">
                        Premium ${template.price}
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-gray-300 text-sm">{template.description}</p>
                  
                  <div className="flex items-center gap-4 text-sm text-gray-400">
                    <div className="flex items-center gap-1">
                      <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                      <span>{template.rating}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Download className="h-3 w-3" />
                      <span>{template.downloads.toLocaleString()}</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1">
                    {template.tags.slice(0, 3).map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                    {template.tags.length > 3 && (
                      <Badge variant="secondary" className="text-xs">
                        +{template.tags.length - 3}
                      </Badge>
                    )}
                  </div>

                  <div className="pt-2">
                    <Button
                      onClick={() => createAgentFromTemplate(template)}
                      disabled={loading}
                      className="w-full bg-blue-600 hover:bg-blue-700"
                    >
                      <Zap className="h-4 w-4 mr-2" />
                      {loading ? 'Creating...' : 'Use Template'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredTemplates.length === 0 && (
            <div className="text-center py-12">
              <Bot className="h-12 w-12 text-gray-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">No templates found</h3>
              <p className="text-gray-400">
                Try adjusting your search or category filter
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
