'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabaseClient';
import {
  ArrowLeft,
  MessageSquare,
  Bot,
  Settings,
  Rocket,
  TrendingUp,
  Target,
  Globe,
  Facebook,
  Instagram,
  Phone,
  Eye,
  Copy,
  CheckCircle,
  Circle,
  Sparkles
} from 'lucide-react';

interface StepProps {
  currentStep: number;
  totalSteps: number;
}

const ProgressSteps = ({ currentStep, totalSteps }: StepProps) => {
  const steps = [
    { id: 1, title: 'Basic Info', icon: Bot },
    { id: 2, title: 'Configuration', icon: Settings },
    { id: 3, title: 'Deploy', icon: Rocket }
  ];

  return (
    <div className="mb-12">
      <div className="flex items-center justify-center space-x-4 md:space-x-8">
        {steps.map((step, index) => {
          const Icon = step.icon;
          const isActive = currentStep === step.id;
          const isCompleted = currentStep > step.id;
          
          return (
            <div key={step.id} className="flex items-center">
              <div className="flex items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all duration-300 ${
                  isCompleted ? 'bg-green-500 text-white' :
                  isActive ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white' :
                  'bg-gray-600 text-gray-300'
                }`}>
                  {isCompleted ? <CheckCircle className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                </div>
                <span className={`ml-3 text-sm font-medium ${
                  isActive ? 'text-white' : 'text-gray-400'
                }`}>
                  {step.title}
                </span>
              </div>
              {index < steps.length - 1 && (
                <div className="w-16 h-1 bg-gray-700 rounded mx-4">
                  <div 
                    className={`h-1 rounded transition-all duration-500 ${
                      currentStep > step.id ? 'bg-green-500 w-full' :
                      currentStep === step.id ? 'bg-blue-500 w-1/2' : 'w-0'
                    }`}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default function CreateChatbotPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);

  // Form data
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    purpose: '',
    customInstructions: '',
    temperature: 70,
    maxTokens: 500,
    channels: {
      website: true,
      facebook: false,
      instagram: false,
      whatsapp: false
    }
  });

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    getUser();
  }, []);

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleChannelToggle = (channel: string) => {
    setFormData(prev => ({
      ...prev,
      channels: {
        ...prev.channels,
        [channel]: !prev.channels[channel as keyof typeof prev.channels]
      }
    }));
  };

  const nextStep = () => {
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const createChatbot = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const chatbotData = {
        name: formData.name,
        description: formData.description,
        model: 'gpt-4',
        settings: {
          purpose: formData.purpose,
          customInstructions: formData.customInstructions,
          temperature: formData.temperature / 100,
          maxTokens: formData.maxTokens,
          channels: formData.channels
        }
      };

      console.log('Creating chatbot with data:', chatbotData);

      const response = await fetch('/api/chatbots/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(chatbotData)
      });

      const responseData = await response.json();
      console.log('API Response:', responseData);

      if (response.ok) {
        console.log('Chatbot created successfully:', responseData.chatbot);
        // Force refresh of chatbots data by redirecting with a timestamp
        router.push('/dashboard/chatbots?refresh=' + Date.now());
      } else {
        console.error('API Error:', responseData.error);
        alert(`Failed to create chatbot: ${responseData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error creating chatbot:', error);
      alert(`Error: ${(error as Error).message}`);
    } finally {
      setLoading(false);
    }
  };

  const copyEmbedCode = () => {
    const code = `<script src="https://intaj.ai/widget.js" data-bot-id="your-bot-id"></script>`;
    navigator.clipboard.writeText(code);
  };

  return (
    <div className="w-full min-h-screen bg-[#0a0a0b] text-white">
      {/* Navigation */}
      <nav className="bg-[rgba(31,32,36,0.8)] backdrop-blur-lg border-b border-gray-700/50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button 
                className="text-gray-300 hover:text-white bg-transparent p-2"
                onClick={() => router.back()}
              >
                <ArrowLeft className="w-6 h-6" />
              </Button>
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                  <div className="w-4 h-4 bg-white rounded-sm opacity-90"></div>
                </div>
                <span className="text-2xl font-bold bg-gradient-to-r from-blue-500 via-purple-500 to-cyan-400 bg-clip-text text-transparent">
                  Intaj
                </span>
              </div>
            </div>
            <div className="hidden md:flex items-center space-x-4">
              <div className="text-sm text-gray-400">Creating new chatbot...</div>
            </div>
          </div>
        </div>
      </nav>

      <div className="min-h-screen bg-[#0a0a0b] p-6">
        <div className="max-w-6xl mx-auto py-8">
          <ProgressSteps currentStep={currentStep} totalSteps={3} />

          {/* Step Content Container */}
          <Card className="bg-[rgba(31,32,36,0.8)] backdrop-blur-lg border border-blue-500/10 rounded-2xl p-8 max-w-4xl mx-auto">
            
            {/* Step 1: Basic Information */}
            {currentStep === 1 && (
              <div className="space-y-8">
                <div className="text-center mb-8">
                  <h1 className="text-4xl font-bold mb-4">
                    Create Your <span className="bg-gradient-to-r from-blue-500 via-purple-500 to-cyan-400 bg-clip-text text-transparent">AI Chatbot</span>
                  </h1>
                  <p className="text-gray-300 text-lg">Let's start with the basics. What would you like your chatbot to be called?</p>
                </div>

                <div className="space-y-8">
                  {/* Bot Name */}
                  <div className="relative">
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      placeholder=" "
                      className="w-full px-4 py-3 bg-[#1f2024] border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:outline-none transition-colors peer"
                    />
                    <label className="absolute left-4 top-3 text-gray-400 transition-all duration-200 peer-focus:-translate-y-6 peer-focus:scale-75 peer-focus:text-blue-400 peer-[:not(:placeholder-shown)]:-translate-y-6 peer-[:not(:placeholder-shown)]:scale-75 bg-[#1f2024] px-2">
                      Chatbot Name
                    </label>
                  </div>

                  {/* Bot Description */}
                  <div className="relative">
                    <textarea
                      value={formData.description}
                      onChange={(e) => handleInputChange('description', e.target.value)}
                      placeholder=" "
                      rows={4}
                      className="w-full px-4 py-3 bg-[#1f2024] border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:outline-none transition-colors resize-none peer"
                    />
                    <label className="absolute left-4 top-3 text-gray-400 transition-all duration-200 peer-focus:-translate-y-6 peer-focus:scale-75 peer-focus:text-blue-400 peer-[:not(:placeholder-shown)]:-translate-y-6 peer-[:not(:placeholder-shown)]:scale-75 bg-[#1f2024] px-2">
                      Description (Optional)
                    </label>
                  </div>

                  {/* Bot Purpose */}
                  <div>
                    <label className="block text-sm font-medium mb-3">What's the primary purpose of your chatbot?</label>
                    <div className="grid md:grid-cols-3 gap-4">
                      {[
                        { id: 'support', title: 'Customer Support', desc: 'Help customers with questions, issues, and general inquiries', icon: Target, color: 'from-blue-500 to-purple-600' },
                        { id: 'sales', title: 'Sales Assistant', desc: 'Generate leads, qualify prospects, and boost conversions', icon: TrendingUp, color: 'from-purple-500 to-pink-600' },
                        { id: 'general', title: 'General Assistant', desc: 'Provide information and assist with various tasks', icon: MessageSquare, color: 'from-cyan-500 to-blue-600' }
                      ].map((purpose) => {
                        const Icon = purpose.icon;
                        return (
                          <div
                            key={purpose.id}
                            onClick={() => handleInputChange('purpose', purpose.id)}
                            className={`bg-[rgba(31,32,36,0.8)] backdrop-blur-lg border rounded-xl p-4 cursor-pointer transition-all duration-300 hover:border-blue-500/50 ${
                              formData.purpose === purpose.id ? 'border-blue-500 bg-blue-500/10' : 'border-gray-600'
                            }`}
                          >
                            <div className={`w-12 h-12 bg-gradient-to-r ${purpose.color} rounded-xl flex items-center justify-center mb-4 mx-auto`}>
                              <Icon className="w-6 h-6 text-white" />
                            </div>
                            <h3 className="font-semibold text-center mb-2">{purpose.title}</h3>
                            <p className="text-sm text-gray-400 text-center">{purpose.desc}</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Custom Instructions */}
                  <div>
                    <label className="block text-sm font-medium mb-3">Custom Instructions (Optional)</label>
                    <textarea
                      value={formData.customInstructions}
                      onChange={(e) => handleInputChange('customInstructions', e.target.value)}
                      placeholder="Add specific instructions for how your chatbot should behave, respond to certain topics, or handle specific scenarios..."
                      rows={4}
                      className="w-full px-4 py-3 bg-[#1f2024] border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:outline-none transition-colors resize-none"
                    />
                    <p className="text-xs text-gray-400 mt-2">
                      Example: "Always ask for contact details before providing pricing information" or "Be extra helpful with technical questions"
                    </p>
                  </div>
                </div>

                <div className="flex justify-between mt-8">
                  <div></div>
                  <Button 
                    onClick={nextStep}
                    disabled={!formData.name}
                    className="bg-gradient-to-r from-blue-500 to-purple-600 px-8 py-3 rounded-lg text-white font-semibold hover:opacity-90 transition-all duration-300"
                  >
                    Continue to Configuration
                    <Settings className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </div>
            )}

            {/* Step 2: Configuration */}
            {currentStep === 2 && (
              <div className="space-y-8">
                <div className="text-center mb-8">
                  <h2 className="text-3xl font-bold mb-4">
                    Configure Your <span className="bg-gradient-to-r from-blue-500 via-purple-500 to-cyan-400 bg-clip-text text-transparent">AI Settings</span>
                  </h2>
                  <p className="text-gray-300 text-lg">Fine-tune how your chatbot responds and behaves.</p>
                </div>

                <Card className="bg-[rgba(31,32,36,0.8)] backdrop-blur-lg border border-gray-600 p-6 rounded-xl">
                  <CardHeader className="p-0 mb-4">
                    <CardTitle className="font-semibold flex items-center">
                      <Sparkles className="w-5 h-5 mr-2" />
                      Advanced Settings
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-xs text-gray-400 mb-2">Response Temperature</label>
                        <div className="relative">
                          <input
                            type="range"
                            min="0"
                            max="100"
                            value={formData.temperature}
                            onChange={(e) => handleInputChange('temperature', parseInt(e.target.value))}
                            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                          />
                          <div className="flex justify-between text-xs text-gray-500 mt-1">
                            <span>Consistent</span>
                            <span>Creative</span>
                          </div>
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-400 mb-2">Max Response Tokens</label>
                        <input
                          type="number"
                          value={formData.maxTokens}
                          onChange={(e) => handleInputChange('maxTokens', parseInt(e.target.value))}
                          min="50"
                          max="2000"
                          className="w-full px-4 py-3 bg-[#1f2024] border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:outline-none"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <div className="flex justify-between mt-8">
                  <Button 
                    onClick={prevStep}
                    className="px-6 py-3 border border-gray-600 rounded-lg text-gray-300 hover:border-gray-500 transition-colors bg-transparent"
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back
                  </Button>
                  <Button 
                    onClick={nextStep}
                    className="bg-gradient-to-r from-blue-500 to-purple-600 px-8 py-3 rounded-lg text-white font-semibold hover:opacity-90 transition-all duration-300"
                  >
                    Continue to Deploy
                    <Rocket className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </div>
            )}

            {/* Step 3: Deploy */}
            {currentStep === 3 && (
              <div className="space-y-8">
                <div className="text-center mb-8">
                  <h2 className="text-3xl font-bold mb-4">
                    Deploy Your <span className="bg-gradient-to-r from-blue-500 via-purple-500 to-cyan-400 bg-clip-text text-transparent">Chatbot</span>
                  </h2>
                  <p className="text-gray-300 text-lg">Choose where you want your chatbot to be available for your customers.</p>
                </div>

                <div className="space-y-6">
                  {/* Website Widget */}
                  <Card className="bg-[rgba(31,32,36,0.8)] backdrop-blur-lg border border-gray-600 p-6 rounded-xl">
                    <div className="flex items-start space-x-4">
                      <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center flex-shrink-0">
                        <Globe className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-semibold">Website Widget</h3>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={formData.channels.website}
                              onChange={() => handleChannelToggle('website')}
                              className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                          </label>
                        </div>
                        <p className="text-sm text-gray-400 mb-4">Add a chat widget to your website that visitors can use to interact with your chatbot.</p>
                        {formData.channels.website && (
                          <div className="bg-[#1f2024] rounded-lg p-4">
                            <p className="text-xs text-gray-400 mb-2">Embed Code:</p>
                            <code className="text-xs bg-black/50 p-2 rounded block overflow-x-auto text-gray-300">
                              &lt;script src="https://intaj.ai/widget.js" data-bot-id="your-bot-id"&gt;&lt;/script&gt;
                            </code>
                            <Button 
                              onClick={copyEmbedCode}
                              className="mt-2 text-xs text-blue-400 hover:text-blue-300 bg-transparent p-0"
                            >
                              <Copy className="w-3 h-3 mr-1" />
                              Copy Code
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>

                  {/* Social Media Channels */}
                  <div className="grid md:grid-cols-3 gap-4">
                    {/* Facebook */}
                    <Card className="bg-[rgba(31,32,36,0.8)] backdrop-blur-lg border border-gray-600 p-6 rounded-xl">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                            <Facebook className="w-5 h-5 text-white" />
                          </div>
                          <h3 className="font-semibold">Facebook</h3>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.channels.facebook}
                            onChange={() => handleChannelToggle('facebook')}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                      </div>
                      <p className="text-sm text-gray-400 mb-4">Connect to Facebook Messenger</p>
                      <Button className="w-full py-2 px-4 border border-gray-600 rounded-lg text-gray-300 hover:border-blue-500 hover:text-blue-400 transition-colors text-sm bg-transparent">
                        Connect Facebook
                      </Button>
                    </Card>

                    {/* Instagram */}
                    <Card className="bg-[rgba(31,32,36,0.8)] backdrop-blur-lg border border-gray-600 p-6 rounded-xl">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                            <Instagram className="w-5 h-5 text-white" />
                          </div>
                          <h3 className="font-semibold">Instagram</h3>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.channels.instagram}
                            onChange={() => handleChannelToggle('instagram')}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                        </label>
                      </div>
                      <p className="text-sm text-gray-400 mb-4">Connect to Instagram DMs</p>
                      <Button className="w-full py-2 px-4 border border-gray-600 rounded-lg text-gray-300 hover:border-purple-500 hover:text-purple-400 transition-colors text-sm bg-transparent">
                        Connect Instagram
                      </Button>
                    </Card>

                    {/* WhatsApp */}
                    <Card className="bg-[rgba(31,32,36,0.8)] backdrop-blur-lg border border-gray-600 p-6 rounded-xl">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center">
                            <Phone className="w-5 h-5 text-white" />
                          </div>
                          <h3 className="font-semibold">WhatsApp</h3>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.channels.whatsapp}
                            onChange={() => handleChannelToggle('whatsapp')}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                        </label>
                      </div>
                      <p className="text-sm text-gray-400 mb-4">Connect WhatsApp Business</p>
                      <Button className="w-full py-2 px-4 border border-gray-600 rounded-lg text-gray-300 hover:border-green-500 hover:text-green-400 transition-colors text-sm bg-transparent">
                        Connect WhatsApp
                      </Button>
                    </Card>
                  </div>

                  {/* Preview Section */}
                  <Card className="bg-[rgba(31,32,36,0.8)] backdrop-blur-lg border border-gray-600 p-6 rounded-xl">
                    <div className="flex items-center space-x-3 mb-4">
                      <Eye className="w-5 h-5 text-blue-400" />
                      <h3 className="font-semibold">Live Preview</h3>
                    </div>
                    <div className="bg-[#1f2024] rounded-xl p-6 max-w-sm mx-auto">
                      <div className="bg-white rounded-t-lg p-4 text-black">
                        <div className="flex items-center space-x-2 mb-3">
                          <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                            <MessageSquare className="w-4 h-4 text-white" />
                          </div>
                          <div>
                            <div className="font-semibold text-sm">{formData.name || 'Your Chatbot'}</div>
                            <div className="text-xs text-gray-500 flex items-center">
                              <div className="w-2 h-2 bg-green-500 rounded-full mr-1 animate-pulse"></div>
                              Online
                            </div>
                          </div>
                        </div>
                        <div className="bg-gray-100 rounded-lg p-3">
                          <p className="text-sm">Hi! I'm your AI assistant. How can I help you today?</p>
                        </div>
                      </div>
                      <div className="bg-gray-200 rounded-b-lg p-4 flex items-center space-x-2">
                        <input 
                          type="text" 
                          placeholder="Type a message..." 
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-full text-sm text-black"
                          readOnly
                        />
                        <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path>
                          </svg>
                        </div>
                      </div>
                    </div>
                  </Card>
                </div>

                <div className="flex justify-between mt-8">
                  <Button 
                    onClick={prevStep}
                    className="px-6 py-3 border border-gray-600 rounded-lg text-gray-300 hover:border-gray-500 transition-colors bg-transparent"
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back
                  </Button>
                  <Button 
                    onClick={createChatbot}
                    disabled={loading}
                    className="bg-gradient-to-r from-blue-500 to-purple-600 px-12 py-4 rounded-lg text-white font-bold text-lg hover:opacity-90 transition-all duration-300 transform hover:-translate-y-0.5"
                  >
                    {loading ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <Rocket className="w-5 h-5 mr-2" />
                        Create Chatbot
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
