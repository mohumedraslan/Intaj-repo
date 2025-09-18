'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  MessageSquare, TrendingUp, BarChart3, Users, Mail, Phone, 
  ShoppingCart, Calendar, FileText, Headphones, Search, 
  Check, Star, Zap, Crown, Sparkles, ArrowRight
} from 'lucide-react';

interface AgentTemplate {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  category: 'Customer Support' | 'Sales' | 'Marketing' | 'HR' | 'E-commerce';
  tier: 'Basic' | 'Pro' | 'Enterprise';
  price: number;
  features: string[];
  capabilities: {
    conversations: number;
    integrations: number;
    analytics: boolean;
    customization: boolean;
    priority_support: boolean;
    api_access: boolean;
    white_label: boolean;
    advanced_ai: boolean;
  };
  use_cases: string[];
  setup_time: string;
  popular?: boolean;
}

const agentTemplates: AgentTemplate[] = [
  {
    id: 'customer-support-basic',
    name: 'Customer Support Assistant',
    description: 'Handle customer inquiries, FAQs, and basic support tickets with intelligent routing',
    icon: <Headphones className="w-6 h-6" />,
    category: 'Customer Support',
    tier: 'Basic',
    price: 29,
    features: [
      'FAQ automation',
      'Ticket routing',
      'Basic sentiment analysis',
      '24/7 availability',
      'Multi-language support'
    ],
    capabilities: {
      conversations: 1000,
      integrations: 3,
      analytics: true,
      customization: false,
      priority_support: false,
      api_access: false,
      white_label: false,
      advanced_ai: false
    },
    use_cases: [
      'Answer common questions',
      'Collect customer information',
      'Route complex issues to humans',
      'Provide order status updates'
    ],
    setup_time: '15 minutes',
    popular: true
  },
  {
    id: 'customer-support-pro',
    name: 'Advanced Support Agent',
    description: 'Enterprise-grade customer support with advanced AI and integrations',
    icon: <MessageSquare className="w-6 h-6" />,
    category: 'Customer Support',
    tier: 'Pro',
    price: 79,
    features: [
      'Advanced AI responses',
      'CRM integration',
      'Sentiment analysis',
      'Escalation workflows',
      'Performance analytics',
      'Custom knowledge base'
    ],
    capabilities: {
      conversations: 5000,
      integrations: 10,
      analytics: true,
      customization: true,
      priority_support: true,
      api_access: true,
      white_label: false,
      advanced_ai: true
    },
    use_cases: [
      'Complex problem resolution',
      'Proactive customer outreach',
      'Integration with support tools',
      'Advanced reporting and insights'
    ],
    setup_time: '30 minutes'
  },
  {
    id: 'sales-assistant',
    name: 'Sales Conversion Bot',
    description: 'Convert leads into customers with intelligent sales conversations',
    icon: <TrendingUp className="w-6 h-6" />,
    category: 'Sales',
    tier: 'Pro',
    price: 99,
    features: [
      'Lead qualification',
      'Product recommendations',
      'Price negotiations',
      'Appointment scheduling',
      'CRM integration',
      'Sales analytics'
    ],
    capabilities: {
      conversations: 3000,
      integrations: 8,
      analytics: true,
      customization: true,
      priority_support: true,
      api_access: true,
      white_label: false,
      advanced_ai: true
    },
    use_cases: [
      'Qualify incoming leads',
      'Schedule sales calls',
      'Provide product information',
      'Handle pricing inquiries'
    ],
    setup_time: '45 minutes'
  },
  {
    id: 'marketing-assistant',
    name: 'Marketing Automation Agent',
    description: 'Engage prospects and nurture leads through personalized conversations',
    icon: <BarChart3 className="w-6 h-6" />,
    category: 'Marketing',
    tier: 'Pro',
    price: 69,
    features: [
      'Lead nurturing',
      'Content recommendations',
      'Campaign automation',
      'Social media integration',
      'Email marketing sync',
      'Conversion tracking'
    ],
    capabilities: {
      conversations: 4000,
      integrations: 12,
      analytics: true,
      customization: true,
      priority_support: true,
      api_access: true,
      white_label: false,
      advanced_ai: true
    },
    use_cases: [
      'Nurture marketing leads',
      'Distribute content',
      'Collect feedback',
      'Drive event registrations'
    ],
    setup_time: '25 minutes'
  },
  {
    id: 'hr-assistant',
    name: 'HR Support Agent',
    description: 'Streamline HR processes with automated employee assistance',
    icon: <Users className="w-6 h-6" />,
    category: 'HR',
    tier: 'Basic',
    price: 49,
    features: [
      'Employee onboarding',
      'Policy information',
      'Leave requests',
      'Benefits guidance',
      'Internal communications'
    ],
    capabilities: {
      conversations: 2000,
      integrations: 5,
      analytics: true,
      customization: false,
      priority_support: false,
      api_access: false,
      white_label: false,
      advanced_ai: false
    },
    use_cases: [
      'Answer HR policy questions',
      'Guide new employee setup',
      'Process leave requests',
      'Provide benefits information'
    ],
    setup_time: '20 minutes'
  },
  {
    id: 'ecommerce-assistant',
    name: 'E-commerce Shopping Bot',
    description: 'Boost online sales with personalized shopping assistance',
    icon: <ShoppingCart className="w-6 h-6" />,
    category: 'E-commerce',
    tier: 'Enterprise',
    price: 149,
    features: [
      'Product recommendations',
      'Inventory management',
      'Order tracking',
      'Payment assistance',
      'Abandoned cart recovery',
      'Upselling & cross-selling'
    ],
    capabilities: {
      conversations: 10000,
      integrations: 15,
      analytics: true,
      customization: true,
      priority_support: true,
      api_access: true,
      white_label: true,
      advanced_ai: true
    },
    use_cases: [
      'Product discovery and recommendations',
      'Order status and tracking',
      'Return and refund assistance',
      'Promotional campaigns'
    ],
    setup_time: '60 minutes'
  }
];

export default function TemplatesPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedTier, setSelectedTier] = useState<string>('All');
  const [selectedTemplate, setSelectedTemplate] = useState<AgentTemplate | null>(null);
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([]);
  const [showCustomization, setShowCustomization] = useState(false);

  const categories = ['All', ...Array.from(new Set(agentTemplates.map(t => t.category)))];
  const tiers = ['All', 'Basic', 'Pro', 'Enterprise'];

  const filteredTemplates = agentTemplates.filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         template.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || template.category === selectedCategory;
    const matchesTier = selectedTier === 'All' || template.tier === selectedTier;
    return matchesSearch && matchesCategory && matchesTier;
  });

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'Basic': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'Pro': return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      case 'Enterprise': return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const getTierIcon = (tier: string) => {
    switch (tier) {
      case 'Basic': return <Zap className="w-3 h-3" />;
      case 'Pro': return <Star className="w-3 h-3" />;
      case 'Enterprise': return <Crown className="w-3 h-3" />;
      default: return <Sparkles className="w-3 h-3" />;
    }
  };

  const handleTemplateSelect = (template: AgentTemplate) => {
    setSelectedTemplate(template);
    setSelectedFeatures(template.features);
    setShowCustomization(true);
  };

  const handleCreateAgent = () => {
    if (selectedTemplate) {
      // Navigate to agent creation with template data
      const templateData = {
        ...selectedTemplate,
        selectedFeatures
      };
      
      // Store template data in sessionStorage for the creation process
      sessionStorage.setItem('selectedTemplate', JSON.stringify(templateData));
      
      router.push('/dashboard/agents/create');
    }
  };

  const calculateCustomPrice = () => {
    if (!selectedTemplate) return 0;
    
    const basePrice = selectedTemplate.price;
    const featureMultiplier = selectedFeatures.length / selectedTemplate.features.length;
    return Math.round(basePrice * featureMultiplier);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0b] text-white p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent mb-4">
            Agent Templates
          </h1>
          <p className="text-gray-400 text-lg">
            Choose from pre-built agent templates tailored for specific business needs
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              type="text"
              placeholder="Search templates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-gray-800/50 border-gray-700 text-white"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {categories.map(category => (
              <Button
                key={category}
                variant={selectedCategory === category ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory(category)}
                className={selectedCategory === category 
                  ? "bg-blue-600 hover:bg-blue-700" 
                  : "border-gray-600 text-gray-300 hover:border-blue-500"
                }
              >
                {category}
              </Button>
            ))}
          </div>
          <div className="flex gap-2">
            {tiers.map(tier => (
              <Button
                key={tier}
                variant={selectedTier === tier ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedTier(tier)}
                className={selectedTier === tier 
                  ? "bg-purple-600 hover:bg-purple-700" 
                  : "border-gray-600 text-gray-300 hover:border-purple-500"
                }
              >
                {tier !== 'All' && getTierIcon(tier)}
                <span className={tier !== 'All' ? 'ml-1' : ''}>{tier}</span>
              </Button>
            ))}
          </div>
        </div>

        {/* Templates Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTemplates.map((template) => (
            <Card key={template.id} className="bg-[#141517]/50 backdrop-blur-xl border-gray-800/50 hover:border-gray-700/50 transition-all duration-300 group">
              <CardHeader>
                <div className="flex items-center justify-between mb-2">
                  <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                    {template.icon}
                  </div>
                  <div className="flex items-center space-x-2">
                    {template.popular && (
                      <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30">
                        <Star className="w-3 h-3 mr-1" />
                        Popular
                      </Badge>
                    )}
                    <Badge className={getTierColor(template.tier)}>
                      {getTierIcon(template.tier)}
                      <span className="ml-1">{template.tier}</span>
                    </Badge>
                  </div>
                </div>
                <CardTitle className="text-xl text-white">{template.name}</CardTitle>
                <CardDescription className="text-gray-400">
                  {template.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold text-white">${template.price}</div>
                    <div className="text-sm text-gray-400">per month</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-400">Setup time</div>
                    <div className="text-sm font-medium text-white">{template.setup_time}</div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="text-sm font-medium text-gray-300">Key Features:</div>
                  <div className="space-y-1">
                    {template.features.slice(0, 3).map((feature, index) => (
                      <div key={index} className="flex items-center text-sm text-gray-400">
                        <Check className="w-3 h-3 text-green-400 mr-2 flex-shrink-0" />
                        {feature}
                      </div>
                    ))}
                    {template.features.length > 3 && (
                      <div className="text-sm text-blue-400">
                        +{template.features.length - 3} more features
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="text-sm font-medium text-gray-300">Capabilities:</div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="text-gray-400">
                      <span className="text-blue-400 font-medium">{template.capabilities.conversations.toLocaleString()}</span> conversations/mo
                    </div>
                    <div className="text-gray-400">
                      <span className="text-purple-400 font-medium">{template.capabilities.integrations}</span> integrations
                    </div>
                  </div>
                </div>

                <Dialog>
                  <DialogTrigger asChild>
                    <Button 
                      onClick={() => handleTemplateSelect(template)}
                      className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 group-hover:shadow-lg transition-all"
                    >
                      Customize & Create
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-[#141517] border-gray-700 text-white max-w-2xl">
                    <DialogHeader>
                      <DialogTitle className="flex items-center">
                        <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center mr-3">
                          {template.icon}
                        </div>
                        Customize {template.name}
                      </DialogTitle>
                      <DialogDescription className="text-gray-400">
                        Select the features you need for your agent
                      </DialogDescription>
                    </DialogHeader>
                    
                    <div className="space-y-6">
                      {/* Feature Selection */}
                      <div>
                        <h3 className="font-medium text-white mb-3">Features & Capabilities</h3>
                        <div className="space-y-2">
                          {template.features.map((feature, index) => (
                            <div key={index} className="flex items-center space-x-3">
                              <Checkbox 
                                id={`feature-${index}`}
                                checked={selectedFeatures.includes(feature)}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setSelectedFeatures([...selectedFeatures, feature]);
                                  } else {
                                    setSelectedFeatures(selectedFeatures.filter(f => f !== feature));
                                  }
                                }}
                              />
                              <label htmlFor={`feature-${index}`} className="text-sm text-gray-300">
                                {feature}
                              </label>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Use Cases */}
                      <div>
                        <h3 className="font-medium text-white mb-3">Perfect for:</h3>
                        <div className="grid grid-cols-2 gap-2">
                          {template.use_cases.map((useCase, index) => (
                            <div key={index} className="flex items-center text-sm text-gray-400">
                              <Check className="w-3 h-3 text-green-400 mr-2 flex-shrink-0" />
                              {useCase}
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Pricing */}
                      <div className="bg-gray-800/30 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-sm text-gray-400">Custom Price</div>
                            <div className="text-2xl font-bold text-white">
                              ${calculateCustomPrice()}
                              <span className="text-sm text-gray-400 font-normal">/month</span>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm text-gray-400">Selected Features</div>
                            <div className="text-lg font-medium text-blue-400">
                              {selectedFeatures.length} of {template.features.length}
                            </div>
                          </div>
                        </div>
                      </div>

                      <Button 
                        onClick={handleCreateAgent}
                        className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
                        disabled={selectedFeatures.length === 0}
                      >
                        Create Agent with Selected Features
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredTemplates.length === 0 && (
          <div className="text-center py-12">
            <MessageSquare className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No templates found</h3>
            <p className="text-gray-400">Try adjusting your search or filter criteria</p>
          </div>
        )}
      </div>
    </div>
  );
}
