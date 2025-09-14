'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import PlatformCard from './PlatformCard';
import { Platform, platforms } from '@/data/platforms';
import { Search, Copy, Check, AlertCircle } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
// Removed next-auth dependency for now
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

type WizardStep = 'select-platform' | 'select-agent' | 'authentication' | 'configuration' | 'confirmation';

interface ConnectionWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (connectionData: any) => void;
}

interface Agent {
  id: string;
  name: string;
  avatar_url?: string;
  description?: string;
}

interface ApiResponse {
  success: boolean;
  message?: string;
  error?: string;
  connection?: any;
  authUrl?: string;
  state?: string;
}

export default function ConnectionWizard({ isOpen, onClose, onComplete }: ConnectionWizardProps) {
  const [currentStep, setCurrentStep] = useState<WizardStep>('select-platform');
  const [selectedPlatform, setSelectedPlatform] = useState<Platform | null>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();
  const { data: session } = useSession();
  const router = useRouter();
  
  useEffect(() => {
    const fetchAgents = async () => {
      if (isOpen) {
        const supabase = createClientComponentClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data, error } = await supabase
            .from('agents')
            .select('id, name, avatar_url')
            .eq('user_id', user.id);
          if (error) {
            console.error('Error fetching agents:', error);
          } else {
            setAgents(data);
          }
        }
      }
    };
    fetchAgents();
  }, [isOpen]);

  // Reset state when modal is closed
  const handleClose = () => {
    setCurrentStep('select-platform');
    setSelectedPlatform(null);
    setSelectedAgent(null);
    setFormData({});
    setError(null);
    setIsLoading(false);
    onClose();
  };

  // Fetch agents when the component mounts or when the dialog opens
  useEffect(() => {
    if (isOpen && session?.user) {
      const fetchAgents = async () => {
        try {
          const supabase = createClientComponentClient();
          const { data, error } = await supabase
            .from('agents')
            .select('id, name, description, avatar_url')
            .eq('user_id', session.user.id);
            
          if (error) {
            console.error('Error fetching agents:', error);
            return;
          }
          
          setAgents(data || []);
        } catch (err) {
          console.error('Failed to fetch agents:', err);
        }
      };
      
      fetchAgents();
    }
  }, [isOpen, session]);

  // Function to initiate OAuth flow
  const initiateOAuthFlow = async () => {
    if (!selectedPlatform || !session?.user) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/connections/oauth/connect?platform=${selectedPlatform.id}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      const data: ApiResponse = await response.json();
      
      if (!data.success || !data.authUrl) {
        setError(data.error || 'Failed to initiate OAuth flow');
        setIsLoading(false);
        return;
      }
      
      // Redirect to the authorization URL
      window.location.href = data.authUrl;
      
    } catch (err) {
      console.error('OAuth initiation error:', err);
      setError('Failed to connect to the authentication service');
      setIsLoading(false);
    }
  };

  // Function to submit API key connection
  const submitConnection = async () => {
    if (!selectedPlatform || !session?.user) {
      setError('Session or platform data is missing');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      // For API key connections
      if (selectedPlatform.authType === 'api-key') {
        const payload = {
          platform: selectedPlatform.id,
          chatbot_id: selectedAgent,
          apiKey: formData.apiKey,
          ...(selectedPlatform.id === 'telegram' && formData.botUsername ? { botUsername: formData.botUsername } : {}),
          ...(formData.channel ? { channel: formData.channel } : {}),
          ...(formData.webhookUrl ? { webhookUrl: formData.webhookUrl } : {})
        };
        
        const response = await fetch('/api/connections/connect/api-key', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        });
        
        const data: ApiResponse = await response.json();
        
        if (!data.success) {
          setError(data.error || 'Failed to create connection');
          setIsLoading(false);
          return;
        }
        
        // Success - notify user and close wizard
        toast({
          title: 'Connection Created',
          description: `Successfully connected to ${selectedPlatform.name}`,
          variant: 'default'
        });
        
        // Check if this is the user's first connection and update onboarding steps
        const supabase = createClientComponentClient();
        
        // Get all connections for this user
        const { data: connections, error: connectionsError } = await supabase
          .from('connections')
          .select('id')
          .eq('user_id', session.user.id);
          
        if (!connectionsError && connections && connections.length === 1) {
          // This is the user's first connection, update onboarding steps
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('onboarding_steps')
            .eq('id', session.user.id)
            .single();
            
          if (!profileError && profile) {
            // Get current onboarding steps or use default if not set
            const currentSteps = profile.onboarding_steps || {
              created_first_chatbot: false,
              added_data_source: false,
              connected_channel: false,
              has_dismissed: false
            };
            
            // Update the connected_channel flag
            await supabase
              .from('profiles')
              .update({
                onboarding_steps: {
                  ...currentSteps,
                  connected_channel: true
                }
              })
              .eq('id', session.user.id);
          }
        }
        
        // Refresh connections list
        onComplete(data.connection);
        router.refresh();
        handleClose();
      }
      // For OAuth connections, this would typically happen in the callback
      // But we can add a success message here for the confirmation step
      else if (selectedPlatform.authType === 'oauth' && currentStep === 'confirmation') {
        toast({
          title: 'Connection Completed',
          description: `Successfully connected to ${selectedPlatform.name}`,
          variant: 'default'
        });
        
        // Check if this is the user's first connection and update onboarding steps
        const supabase = createClientComponentClient();
        
        // Get all connections for this user
        const { data: connections, error: connectionsError } = await supabase
          .from('connections')
          .select('id')
          .eq('user_id', session.user.id);
          
        if (!connectionsError && connections && connections.length === 1) {
          // This is the user's first connection, update onboarding steps
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('onboarding_steps')
            .eq('id', session.user.id)
            .single();
            
          if (!profileError && profile) {
            // Get current onboarding steps or use default if not set
            const currentSteps = profile.onboarding_steps || {
              created_first_chatbot: false,
              added_data_source: false,
              connected_channel: false,
              has_dismissed: false
            };
            
            // Update the connected_channel flag
            await supabase
              .from('profiles')
              .update({
                onboarding_steps: {
                  ...currentSteps,
                  connected_channel: true
                }
              })
              .eq('id', session.user.id);
          }
        }
        
        onComplete(formData.connection);
        router.refresh();
        handleClose();
      }
    } catch (err) {
      console.error('Connection submission error:', err);
      setError('Failed to create connection');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Check for OAuth callback parameters
  useEffect(() => {
    // This would be handled by the callback route and redirected back to the connections page
    // with a success parameter that would trigger opening this wizard with the confirmation step
    // This is just a placeholder for that logic
    const urlParams = new URLSearchParams(window.location.search);
    const connectionSuccess = urlParams.get('connectionSuccess');
    const platform = urlParams.get('platform');
    const connectionData = urlParams.get('connectionData');
    
    if (connectionSuccess === 'true' && platform && isOpen) {
      // Find the platform
      const platformData = platforms.find(p => p.id === platform);
      if (platformData) {
        setSelectedPlatform(platformData);
        setCurrentStep('confirmation');
        
        // If we have connection data, parse it
        if (connectionData) {
          try {
            const parsedData = JSON.parse(decodeURIComponent(connectionData));
            setFormData({ connection: parsedData });
          } catch (e) {
            console.error('Failed to parse connection data', e);
          }
        }
      }
    }
  }, [isOpen]);
  
  // Function to handle next step
  const handleNext = async () => {
    // Clear any previous errors
    setError(null);
    
    switch (currentStep) {
      case 'select-platform':
        setCurrentStep('select-agent');
        break;
      case 'select-agent':
        if (!selectedAgent) {
          setError('Please select an agent to connect.');
          return;
        }
        setCurrentStep('authentication');
        break;
      case 'authentication':
        if (selectedPlatform?.authType === 'api-key') {
          // Validate API key input
          if (!formData.apiKey || formData.apiKey.trim() === '') {
            setError('API key is required');
            return;
          }
          
          // For Telegram, validate bot username if provided
          if (selectedPlatform.id === 'telegram' && formData.botUsername && formData.botUsername.trim() === '') {
            setError('Bot username cannot be empty if provided');
            return;
          }
          
          setCurrentStep('configuration');
        } else if (selectedPlatform?.authType === 'oauth') {
          // Initiate OAuth flow
          await initiateOAuthFlow();
          // We don't change the step here as the user will be redirected
        }
        break;
      case 'configuration':
        // Validate configuration if needed
        if (selectedPlatform?.configOptions?.requiresChannel && !formData.channel) {
          setError('Please select a channel');
          return;
        }
        
        setCurrentStep('confirmation');
        break;
      case 'confirmation':
        // Submit the connection data
        await submitConnection();
        break;
    }
  };
  
  // Handle back navigation
  const handleBack = () => {
    switch (currentStep) {
      case 'select-agent':
        setCurrentStep('select-platform');
        break;
      case 'authentication':
        setCurrentStep('select-agent');
        break;
      case 'configuration':
        setCurrentStep('authentication');
        break;
      case 'confirmation':
        if (selectedPlatform?.authType === 'oauth') {
          setCurrentStep('authentication');
        } else {
          setCurrentStep('configuration');
        }
        break;
    }
  };
  
  // Filter platforms based on search query
  const [searchQuery, setSearchQuery] = useState('');
  
  const filteredPlatforms = platforms.filter(platform => 
    platform.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    platform.description.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  // Handle platform selection
  const handlePlatformSelect = (platform: Platform) => {
    if (platform.available) {
      setSelectedPlatform(platform);
      handleNext();
    }
  };
  
  // Render step content based on current step
  const renderStepContent = () => {
    switch (currentStep) {
      case 'select-platform':
        return (
          <div className="p-6">
            <h2 className="text-xl font-semibold text-white mb-4">Select Platform</h2>
            <p className="text-gray-400 mb-6">Choose a platform to connect with your account</p>
            
            {/* Search bar */}
            <div className="relative mb-6">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <Input
                type="text"
                placeholder="Search platforms..."
                className="pl-10 bg-[#1f2023] border-gray-700 text-white"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            {/* Platform selection grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredPlatforms.map((platform) => (
                <PlatformCard
                  key={platform.id}
                  {...platform}
                  selected={selectedPlatform?.id === platform.id}
                  onClick={() => handlePlatformSelect(platform)}
                />
              ))}
            </div>
            
            {filteredPlatforms.length === 0 && (
              <div className="text-center py-8">
                <p className="text-gray-400">No platforms found matching your search.</p>
              </div>
            )}
          </div>
        );
      
      case 'select-agent':
        return (
          <div className="p-6">
            <h2 className="text-xl font-semibold text-white mb-4">Select Agent</h2>
            <p className="text-gray-400 mb-6">Choose which agent to connect to {selectedPlatform?.name}</p>
            <div className="space-y-2">
              {agents.map(agent => (
                <div
                  key={agent.id}
                  className={`p-4 border rounded-lg cursor-pointer ${selectedAgent === agent.id ? 'border-blue-500 bg-blue-500/10' : 'border-gray-700'}`}
                  onClick={() => setSelectedAgent(agent.id)}
                >
                  {agent.name}
                </div>
              ))}
            </div>
          </div>
        );
      
      case 'authentication':
        return (
          <div className="p-6">
            <h2 className="text-xl font-semibold text-white mb-4">Authentication</h2>
            <p className="text-gray-400 mb-6">Connect to {selectedPlatform?.name}</p>
            
            {selectedPlatform?.authType === 'api-key' ? (
              <div className="space-y-6">
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 mb-6">
                  <p className="text-sm text-blue-400">
                    You'll need an API key from {selectedPlatform.name} to connect. 
                    <a href="#" className="text-blue-400 underline hover:text-blue-300 ml-1">
                      Learn how to get your API key
                    </a>
                  </p>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">API Key</label>
                    <Input 
                      type="text" 
                      className="bg-[#1f2023] border-gray-700 text-white" 
                      placeholder={`Enter your ${selectedPlatform.name} API key`}
                      value={formData.apiKey || ''}
                      onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                    />
                  </div>
                  
                  {selectedPlatform.id === 'telegram' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Bot Username</label>
                      <Input 
                        type="text" 
                        className="bg-[#1f2023] border-gray-700 text-white" 
                        placeholder="Enter your bot username"
                        value={formData.botUsername || ''}
                        onChange={(e) => setFormData({ ...formData, botUsername: e.target.value })}
                      />
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 mb-6">
                  <p className="text-sm text-blue-400">
                    You'll be redirected to {selectedPlatform?.name} to authorize access to your account.
                    We'll only request the permissions needed for the integration to work.
                  </p>
                </div>
                
                <Button 
                  className="w-full bg-[#1f2023] border border-gray-700 hover:bg-[#2a2b2f] text-white py-6"
                  onClick={initiateOAuthFlow}
                  disabled={isLoading}
                >
                  <div className="flex items-center justify-center space-x-3">
                    {selectedPlatform?.logo && (
                      <img 
                        src={selectedPlatform.logo} 
                        alt={`${selectedPlatform.name} logo`} 
                        className="w-6 h-6" 
                      />
                    )}
                    <span>Connect with {selectedPlatform?.name}</span>
                  </div>
                </Button>
              </div>
            )}
          </div>
        );
      
      case 'configuration':
        return (
          <div className="p-6">
            <h2 className="text-xl font-semibold text-white mb-4">Configuration</h2>
            <p className="text-gray-400 mb-6">Configure additional settings for {selectedPlatform?.name}</p>
            
            {!selectedPlatform?.configOptions ? (
              <div className="bg-green-500/20 border border-green-500/30 rounded-lg p-4 mb-6">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-green-500/20 rounded-full flex items-center justify-center">
                    <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">No Additional Configuration Required</h3>
                    <p className="text-gray-400 text-sm">This platform doesn't require any additional configuration.</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {selectedPlatform.configOptions.requiresChannel && (
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-300 mb-2">Channel</label>
                    <select 
                      className="w-full px-4 py-2 bg-[#1f2023] border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      value={formData.channel || ''}
                      onChange={(e) => setFormData({ ...formData, channel: e.target.value })}
                    >
                      <option value="">Select a channel</option>
                      {/* In a real implementation, these would be fetched from the platform's API */}
                      <option value="general">general</option>
                      <option value="random">random</option>
                      <option value="support">support</option>
                    </select>
                    <p className="text-xs text-gray-400 mt-1">Select the channel where the bot will be active.</p>
                  </div>
                )}
                
                {selectedPlatform.configOptions.requiresWebhook && (
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-300 mb-2">Webhook URL</label>
                    <div className="flex items-center">
                      <Input 
                        type="text" 
                        className="bg-[#1f2023] border-gray-700 text-white flex-grow" 
                        value={`https://api.intaj.ai/webhook/${selectedPlatform.id}/${Math.random().toString(36).substring(2, 15)}`}
                        readOnly
                      />
                      <Button 
                        className="ml-2 bg-gray-700 hover:bg-gray-600 text-white"
                        onClick={() => {
                          navigator.clipboard.writeText(formData.webhookUrl || `https://api.intaj.ai/webhook/${selectedPlatform?.id}/${Math.random().toString(36).substring(2, 15)}`);
                          setCopied(true);
                          setTimeout(() => setCopied(false), 2000);
                        }}
                      >
                        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">Copy this webhook URL and add it to your {selectedPlatform.name} settings.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      
      case 'confirmation':
        return (
          <div className="p-6">
            <h2 className="text-xl font-semibold text-white mb-4">Confirmation</h2>
            <p className="text-gray-400 mb-6">Your connection to {selectedPlatform?.name} is ready</p>
            
            <div className="bg-green-500/20 border border-green-500/30 rounded-lg p-4 mb-6">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-green-500/20 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-white">Connection Successful</h3>
                  <p className="text-gray-400 text-sm">Your account has been connected successfully</p>
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="bg-[#1f2023] border border-gray-700 rounded-lg p-4">
                <h3 className="font-semibold text-white mb-2">Connection Details</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="text-gray-400">Platform:</div>
                  <div className="text-white">{selectedPlatform?.name}</div>
                  
                  <div className="text-gray-400">Status:</div>
                  <div className="text-green-400">Active</div>
                  
                  {selectedPlatform?.authType === 'api-key' && (
                    <>
                      <div className="text-gray-400">API Key:</div>
                      <div className="text-white">••••••••••••{formData.apiKey?.slice(-4)}</div>
                    </>
                  )}
                  
                  {selectedPlatform?.configOptions?.requiresChannel && formData.channel && (
                    <>
                      <div className="text-gray-400">Channel:</div>
                      <div className="text-white">#{formData.channel}</div>
                    </>
                  )}
                </div>
              </div>
              
              <div className="bg-[#1f2023] border border-gray-700 rounded-lg p-4">
                <h3 className="font-semibold text-white mb-2">What's Next?</h3>
                <ul className="list-disc list-inside text-gray-400 text-sm space-y-2">
                  <li>Your connection is now active and ready to use</li>
                  <li>You can manage this connection from the Connections page</li>
                  <li>To test your connection, try sending a message</li>
                </ul>
              </div>
            </div>
          </div>
        );
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="bg-[#0a0a0b] border border-gray-800 max-w-3xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent">
            Connect New Platform
          </DialogTitle>
        </DialogHeader>
        
        {renderStepContent()}
        
        {error && (
          <div className="px-6 pb-2">
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 flex items-center space-x-2">
              <AlertCircle className="h-5 w-5 text-red-500" />
              <p className="text-sm text-red-400">{error}</p>
            </div>
          </div>
        )}
        
        <div className="flex justify-between p-6 pt-0">
          {currentStep !== 'select-platform' && (
            <Button 
              onClick={handleBack}
              className="bg-gray-800 hover:bg-gray-700 border border-gray-600 text-gray-200"
              disabled={isLoading}
            >
              Back
            </Button>
          )}
          
          <div className="flex space-x-2 ml-auto">
            <Button 
              onClick={handleClose}
              className="bg-gray-800 hover:bg-gray-700 border border-gray-600 text-gray-200"
              disabled={isLoading}
            >
              Cancel
            </Button>
            
            <Button 
              onClick={handleNext}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
              disabled={isLoading}
            >
              {isLoading ? 'Processing...' : currentStep === 'confirmation' ? 'Finish' : 'Next'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}