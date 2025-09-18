'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { CreditCard, Download, Calendar, TrendingUp, AlertCircle, CheckCircle, Clock, Zap } from 'lucide-react';

interface Subscription {
  id: string;
  plan: string;
  status: 'active' | 'canceled' | 'past_due' | 'trialing';
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  amount: number;
  currency: string;
}

interface Invoice {
  id: string;
  number: string;
  status: 'paid' | 'open' | 'void' | 'draft';
  amount: number;
  currency: string;
  created: Date;
  dueDate?: Date;
  paidAt?: Date;
  downloadUrl?: string;
}

interface Usage {
  messages: number;
  agents: number;
  integrations: number;
  storage: number;
  limits: {
    messages: number;
    agents: number;
    integrations: number;
    storage: number;
  };
}

const plans = [
  {
    id: 'starter',
    name: 'Starter',
    price: 29,
    currency: 'USD',
    interval: 'month',
    features: [
      '3 AI Agents',
      '1,000 messages/month',
      '2 integrations',
      '1GB storage',
      'Email support'
    ],
    limits: {
      agents: 3,
      messages: 1000,
      integrations: 2,
      storage: 1
    }
  },
  {
    id: 'professional',
    name: 'Professional',
    price: 79,
    currency: 'USD',
    interval: 'month',
    features: [
      '10 AI Agents',
      '10,000 messages/month',
      '5 integrations',
      '10GB storage',
      'Priority support',
      'Advanced analytics'
    ],
    limits: {
      agents: 10,
      messages: 10000,
      integrations: 5,
      storage: 10
    },
    popular: true
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 199,
    currency: 'USD',
    interval: 'month',
    features: [
      'Unlimited AI Agents',
      '100,000 messages/month',
      'Unlimited integrations',
      '100GB storage',
      '24/7 phone support',
      'Custom integrations',
      'White-label options'
    ],
    limits: {
      agents: -1,
      messages: 100000,
      integrations: -1,
      storage: 100
    }
  }
];

export default function BillingPage() {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [usage, setUsage] = useState<Usage | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const supabase = createClientComponentClient();

  useEffect(() => {
    fetchBillingData();
  }, []);

  const fetchBillingData = async () => {
    try {
      // Mock data for demonstration
      const mockSubscription: Subscription = {
        id: 'sub_1234567890',
        plan: 'Professional',
        status: 'active',
        currentPeriodStart: new Date('2024-01-01'),
        currentPeriodEnd: new Date('2024-02-01'),
        cancelAtPeriodEnd: false,
        amount: 79,
        currency: 'USD'
      };

      const mockInvoices: Invoice[] = [
        {
          id: 'inv_001',
          number: 'INV-2024-001',
          status: 'paid',
          amount: 79,
          currency: 'USD',
          created: new Date('2024-01-01'),
          paidAt: new Date('2024-01-01'),
          downloadUrl: '#'
        },
        {
          id: 'inv_002',
          number: 'INV-2024-002',
          status: 'open',
          amount: 79,
          currency: 'USD',
          created: new Date('2024-02-01'),
          dueDate: new Date('2024-02-15')
        }
      ];

      const mockUsage: Usage = {
        messages: 3247,
        agents: 7,
        integrations: 3,
        storage: 4.2,
        limits: {
          messages: 10000,
          agents: 10,
          integrations: 5,
          storage: 10
        }
      };

      setSubscription(mockSubscription);
      setInvoices(mockInvoices);
      setUsage(mockUsage);
    } catch (error) {
      console.error('Error fetching billing data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      active: { color: 'bg-green-500', text: 'Active' },
      canceled: { color: 'bg-red-500', text: 'Canceled' },
      past_due: { color: 'bg-yellow-500', text: 'Past Due' },
      trialing: { color: 'bg-blue-500', text: 'Trial' },
      paid: { color: 'bg-green-500', text: 'Paid' },
      open: { color: 'bg-yellow-500', text: 'Open' },
      void: { color: 'bg-gray-500', text: 'Void' },
      draft: { color: 'bg-gray-500', text: 'Draft' }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || { color: 'bg-gray-500', text: status };
    
    return (
      <Badge className={`${config.color} text-white`}>
        {config.text}
      </Badge>
    );
  };

  const getUsagePercentage = (used: number, limit: number) => {
    if (limit === -1) return 0; // Unlimited
    return Math.min((used / limit) * 100, 100);
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0b] text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent">
            Billing & Subscription
          </h1>
          <p className="text-gray-400 mt-2">Manage your subscription, usage, and billing information</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-gray-900 border-gray-800">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="usage">Usage</TabsTrigger>
            <TabsTrigger value="invoices">Invoices</TabsTrigger>
            <TabsTrigger value="plans">Plans</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Current Subscription */}
            {subscription && (
              <Card className="bg-gray-900/50 border-gray-800 backdrop-blur-sm">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <CreditCard className="h-5 w-5" />
                        Current Subscription
                      </CardTitle>
                      <CardDescription>Your active plan and billing cycle</CardDescription>
                    </div>
                    {getStatusBadge(subscription.status)}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-gray-400">Plan</p>
                      <p className="text-xl font-semibold">{subscription.plan}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-400">Amount</p>
                      <p className="text-xl font-semibold">{formatCurrency(subscription.amount, subscription.currency)}/month</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-400">Next Billing</p>
                      <p className="text-xl font-semibold">{subscription.currentPeriodEnd.toLocaleDateString()}</p>
                    </div>
                  </div>
                  
                  <div className="flex gap-3 pt-4">
                    <Button variant="outline" className="border-gray-700">
                      <Calendar className="h-4 w-4 mr-2" />
                      Change Plan
                    </Button>
                    <Button variant="outline" className="border-gray-700">
                      <CreditCard className="h-4 w-4 mr-2" />
                      Update Payment Method
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Usage Overview */}
            {usage && (
              <Card className="bg-gray-900/50 border-gray-800 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle>Usage This Month</CardTitle>
                  <CardDescription>Current usage against your plan limits</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Messages</span>
                        <span>{usage.messages.toLocaleString()} / {usage.limits.messages === -1 ? '∞' : usage.limits.messages.toLocaleString()}</span>
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-2">
                        <div 
                          className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${getUsagePercentage(usage.messages, usage.limits.messages)}%` }}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Agents</span>
                        <span>{usage.agents} / {usage.limits.agents === -1 ? '∞' : usage.limits.agents}</span>
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-2">
                        <div 
                          className="bg-purple-500 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${getUsagePercentage(usage.agents, usage.limits.agents)}%` }}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Integrations</span>
                        <span>{usage.integrations} / {usage.limits.integrations === -1 ? '∞' : usage.limits.integrations}</span>
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-2">
                        <div 
                          className="bg-cyan-500 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${getUsagePercentage(usage.integrations, usage.limits.integrations)}%` }}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Storage</span>
                        <span>{usage.storage}GB / {usage.limits.storage === -1 ? '∞' : `${usage.limits.storage}GB`}</span>
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-2">
                        <div 
                          className="bg-green-500 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${getUsagePercentage(usage.storage, usage.limits.storage)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="usage" className="space-y-6">
            <Card className="bg-gray-900/50 border-gray-800 backdrop-blur-sm">
              <CardHeader>
                <CardTitle>Detailed Usage Analytics</CardTitle>
                <CardDescription>Track your usage patterns and optimize your plan</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12 text-gray-400">
                  <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Usage analytics coming soon</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="invoices" className="space-y-6">
            <Card className="bg-gray-900/50 border-gray-800 backdrop-blur-sm">
              <CardHeader>
                <CardTitle>Invoice History</CardTitle>
                <CardDescription>Download and manage your invoices</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {invoices.map((invoice) => (
                    <div key={invoice.id} className="flex items-center justify-between p-4 border border-gray-800 rounded-lg">
                      <div className="flex items-center gap-4">
                        <div>
                          <p className="font-medium">{invoice.number}</p>
                          <p className="text-sm text-gray-400">
                            {invoice.created.toLocaleDateString()}
                            {invoice.dueDate && ` • Due ${invoice.dueDate.toLocaleDateString()}`}
                          </p>
                        </div>
                        {getStatusBadge(invoice.status)}
                      </div>
                      <div className="flex items-center gap-4">
                        <p className="font-medium">{formatCurrency(invoice.amount, invoice.currency)}</p>
                        {invoice.downloadUrl && (
                          <Button variant="outline" size="sm" className="border-gray-700">
                            <Download className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="plans" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {plans.map((plan) => (
                <Card key={plan.id} className={`bg-gray-900/50 border-gray-800 backdrop-blur-sm relative ${plan.popular ? 'ring-2 ring-blue-500' : ''}`}>
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                      <Badge className="bg-blue-500 text-white">Most Popular</Badge>
                    </div>
                  )}
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      {plan.name}
                      {plan.popular && <Zap className="h-5 w-5 text-blue-400" />}
                    </CardTitle>
                    <div className="text-3xl font-bold">
                      {formatCurrency(plan.price, plan.currency)}
                      <span className="text-sm font-normal text-gray-400">/{plan.interval}</span>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <ul className="space-y-2">
                      {plan.features.map((feature, index) => (
                        <li key={index} className="flex items-center gap-2 text-sm">
                          <CheckCircle className="h-4 w-4 text-green-400" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                    <Button 
                      className={`w-full ${plan.popular ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-700 hover:bg-gray-600'}`}
                      disabled={subscription?.plan === plan.name}
                    >
                      {subscription?.plan === plan.name ? 'Current Plan' : 'Upgrade'}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
