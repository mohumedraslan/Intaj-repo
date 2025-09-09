'use client';

import ChatWidget from '@/components/chat/ChatWidget';
import WidgetTemplates from '@/components/chat/WidgetTemplates';
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageCircle, Settings, Code, FileText } from 'lucide-react';

export default function ChatWidgetPage() {
  const [activeTab, setActiveTab] = useState<'demo' | 'templates' | 'settings'>('demo');
  const [widgetConfig, setWidgetConfig] = useState<{
    botName: string;
    welcomeMessage: string;
    primaryColor: string;
    position: 'bottom-right' | 'bottom-left';
    allowFileUpload: boolean;
    maxFileSize: number;
    allowedFileTypes: string[];
  }>({
    botName: 'Intaj Assistant',
    welcomeMessage: 'Hello! How can I help you today?',
    primaryColor: '#3b82f6',
    position: 'bottom-right',
    allowFileUpload: true,
    maxFileSize: 10,
    allowedFileTypes: ['image/*', 'application/pdf', '.doc', '.docx', '.txt']
  });

  const tabs = [
    { id: 'demo', label: 'Live Demo', icon: MessageCircle },
    { id: 'templates', label: 'Templates', icon: FileText },
    { id: 'settings', label: 'Settings', icon: Settings }
  ];

  if (activeTab === 'templates') {
    return <WidgetTemplates />;
  }

  return (
    <div className="min-h-screen bg-[#0a0a0b] text-white p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent mb-4">
            Chat Widget
          </h1>
          <p className="text-gray-400 text-lg">
            Create and customize your website chat widget
          </p>
        </div>

        {/* Navigation Tabs */}
        <div className="flex space-x-1 mb-8 bg-gray-800/30 rounded-lg p-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as 'demo' | 'templates' | 'settings')}
                className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-colors ${
                  activeTab === tab.id
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                }`}
              >
                <Icon size={16} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {activeTab === 'demo' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Preview */}
            <div>
              <Card className="bg-[#141517]/50 backdrop-blur-xl border-gray-800/50 mb-6">
                <CardHeader>
                  <CardTitle className="text-white flex items-center space-x-2">
                    <MessageCircle size={20} />
                    <span>Live Preview</span>
                  </CardTitle>
                  <CardDescription>
                    See how your chat widget will appear on your website
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="relative bg-gradient-to-br from-gray-900 to-gray-800 rounded-lg p-8 min-h-[400px] overflow-hidden">
                    {/* Mock website content */}
                    <div className="space-y-4 opacity-30">
                      <div className="h-4 bg-gray-600 rounded w-3/4"></div>
                      <div className="h-4 bg-gray-600 rounded w-1/2"></div>
                      <div className="h-4 bg-gray-600 rounded w-2/3"></div>
                      <div className="h-20 bg-gray-700 rounded"></div>
                      <div className="h-4 bg-gray-600 rounded w-1/3"></div>
                      <div className="h-4 bg-gray-600 rounded w-3/4"></div>
                    </div>
                    
                    {/* Chat Widget */}
                    <ChatWidget {...widgetConfig} />
                  </div>
                </CardContent>
              </Card>

              {/* Embed Code */}
              <Card className="bg-[#141517]/50 backdrop-blur-xl border-gray-800/50">
                <CardHeader>
                  <CardTitle className="text-white flex items-center space-x-2">
                    <Code size={20} />
                    <span>Embed Code</span>
                  </CardTitle>
                  <CardDescription>
                    Copy this code to add the widget to your website
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <pre className="bg-gray-900 p-4 rounded-lg text-sm text-gray-300 overflow-x-auto">
                    <code>{`<!-- Intaj Chat Widget -->
<script>
  window.IntajChatConfig = ${JSON.stringify(widgetConfig, null, 2)};
</script>
<script src="https://cdn.intaj.ai/widget.js"></script>`}</code>
                  </pre>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(`<!-- Intaj Chat Widget -->
<script>
  window.IntajChatConfig = ${JSON.stringify(widgetConfig, null, 2)};
</script>
<script src="https://cdn.intaj.ai/widget.js"></script>`);
                      alert('Embed code copied to clipboard!');
                    }}
                    className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                  >
                    Copy Code
                  </button>
                </CardContent>
              </Card>
            </div>

            {/* Configuration */}
            <div>
              <Card className="bg-[#141517]/50 backdrop-blur-xl border-gray-800/50">
                <CardHeader>
                  <CardTitle className="text-white flex items-center space-x-2">
                    <Settings size={20} />
                    <span>Widget Configuration</span>
                  </CardTitle>
                  <CardDescription>
                    Customize your chat widget appearance and behavior
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Basic Settings */}
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-4">Basic Settings</h3>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Bot Name</label>
                        <input
                          type="text"
                          value={widgetConfig.botName}
                          onChange={(e) => setWidgetConfig(prev => ({ ...prev, botName: e.target.value }))}
                          className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Assistant name"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Welcome Message</label>
                        <textarea
                          value={widgetConfig.welcomeMessage}
                          onChange={(e) => setWidgetConfig(prev => ({ ...prev, welcomeMessage: e.target.value }))}
                          className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                          rows={3}
                          placeholder="First message users will see"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Primary Color</label>
                        <div className="flex items-center space-x-3">
                          <input
                            type="color"
                            value={widgetConfig.primaryColor}
                            onChange={(e) => setWidgetConfig(prev => ({ ...prev, primaryColor: e.target.value }))}
                            className="w-12 h-12 bg-gray-800 border border-gray-700 rounded-lg"
                          />
                          <input
                            type="text"
                            value={widgetConfig.primaryColor}
                            onChange={(e) => setWidgetConfig(prev => ({ ...prev, primaryColor: e.target.value }))}
                            className="flex-1 p-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="#3b82f6"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Position</label>
                        <select
                          value={widgetConfig.position}
                          onChange={(e) => setWidgetConfig(prev => ({ ...prev, position: e.target.value as 'bottom-right' | 'bottom-left' }))}
                          className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="bottom-right">Bottom Right</option>
                          <option value="bottom-left">Bottom Left</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* File Upload Settings */}
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-4">File Upload Settings</h3>
                    
                    <div className="space-y-4">
                      <div className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          checked={widgetConfig.allowFileUpload}
                          onChange={(e) => setWidgetConfig(prev => ({ ...prev, allowFileUpload: e.target.checked }))}
                          className="w-4 h-4 text-blue-600 bg-gray-800 border-gray-700 rounded focus:ring-blue-500"
                        />
                        <label className="text-sm font-medium text-gray-300">Allow File Upload</label>
                      </div>

                      {widgetConfig.allowFileUpload && (
                        <>
                          <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                              Max File Size (MB)
                            </label>
                            <input
                              type="number"
                              value={widgetConfig.maxFileSize}
                              onChange={(e) => setWidgetConfig(prev => ({ ...prev, maxFileSize: parseInt(e.target.value) }))}
                              className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                              min="1"
                              max="50"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                              Allowed File Types
                            </label>
                            <div className="space-y-2">
                              {['image/*', 'application/pdf', '.doc', '.docx', '.txt'].map((type) => (
                                <div key={type} className="flex items-center space-x-3">
                                  <input
                                    type="checkbox"
                                    checked={widgetConfig.allowedFileTypes.includes(type)}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setWidgetConfig(prev => ({
                                          ...prev,
                                          allowedFileTypes: [...prev.allowedFileTypes, type]
                                        }));
                                      } else {
                                        setWidgetConfig(prev => ({
                                          ...prev,
                                          allowedFileTypes: prev.allowedFileTypes.filter(t => t !== type)
                                        }));
                                      }
                                    }}
                                    className="w-4 h-4 text-blue-600 bg-gray-800 border-gray-700 rounded focus:ring-blue-500"
                                  />
                                  <label className="text-sm text-gray-300">{type}</label>
                                </div>
                              ))}
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Save Button */}
                  <div className="pt-4 border-t border-gray-700">
                    <button className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:opacity-90 transition-opacity">
                      Save Configuration
                    </button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
