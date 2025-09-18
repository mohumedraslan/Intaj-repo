'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import LiveChatWidget from '@/components/widgets/LiveChatWidget';
import { Copy, Eye, Code, Download, Settings, Palette, MessageSquare } from 'lucide-react';

export default function WidgetPage() {
  const [config, setConfig] = useState({
    agentId: 'demo-agent',
    position: 'bottom-right' as 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left',
    theme: 'dark' as 'light' | 'dark' | 'auto',
    primaryColor: '#3b82f6',
    welcomeMessage: 'Hi! 👋 How can I help you today?',
    placeholder: 'Type your message...',
    showTypingIndicator: true,
    showOnlineStatus: true,
    minimized: false
  });

  const [showPreview, setShowPreview] = useState(true);

  const generateEmbedCode = () => {
    return `<!-- Intaj Live Chat Widget -->
<script>
  window.IntajWidget = {
    agentId: '${config.agentId}',
    position: '${config.position}',
    theme: '${config.theme}',
    primaryColor: '${config.primaryColor}',
    welcomeMessage: '${config.welcomeMessage}',
    placeholder: '${config.placeholder}',
    showTypingIndicator: ${config.showTypingIndicator},
    showOnlineStatus: ${config.showOnlineStatus}
  };
</script>
<script src="https://widget.intaj.com/embed.js" async></script>`;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0b] text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent">
            Website Widget
          </h1>
          <p className="text-gray-400 mt-2">Embed a live chat widget on your website</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Configuration Panel */}
          <div className="space-y-6">
            <Tabs defaultValue="appearance" className="space-y-4">
              <TabsList className="bg-gray-900 border-gray-800">
                <TabsTrigger value="appearance">
                  <Palette className="h-4 w-4 mr-2" />
                  Appearance
                </TabsTrigger>
                <TabsTrigger value="behavior">
                  <Settings className="h-4 w-4 mr-2" />
                  Behavior
                </TabsTrigger>
                <TabsTrigger value="messages">
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Messages
                </TabsTrigger>
              </TabsList>

              <TabsContent value="appearance" className="space-y-4">
                <Card className="bg-gray-900/50 border-gray-800 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle>Widget Appearance</CardTitle>
                    <CardDescription>Customize how your widget looks</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="position">Position</Label>
                        <Select value={config.position} onValueChange={(value: any) => setConfig(prev => ({ ...prev, position: value }))}>
                          <SelectTrigger className="bg-gray-800 border-gray-700">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="bottom-right">Bottom Right</SelectItem>
                            <SelectItem value="bottom-left">Bottom Left</SelectItem>
                            <SelectItem value="top-right">Top Right</SelectItem>
                            <SelectItem value="top-left">Top Left</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="theme">Theme</Label>
                        <Select value={config.theme} onValueChange={(value: any) => setConfig(prev => ({ ...prev, theme: value }))}>
                          <SelectTrigger className="bg-gray-800 border-gray-700">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="light">Light</SelectItem>
                            <SelectItem value="dark">Dark</SelectItem>
                            <SelectItem value="auto">Auto</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="primaryColor">Primary Color</Label>
                      <div className="flex gap-2">
                        <Input
                          id="primaryColor"
                          type="color"
                          value={config.primaryColor}
                          onChange={(e) => setConfig(prev => ({ ...prev, primaryColor: e.target.value }))}
                          className="w-16 h-10 bg-gray-800 border-gray-700"
                        />
                        <Input
                          value={config.primaryColor}
                          onChange={(e) => setConfig(prev => ({ ...prev, primaryColor: e.target.value }))}
                          className="flex-1 bg-gray-800 border-gray-700"
                          placeholder="#3b82f6"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="behavior" className="space-y-4">
                <Card className="bg-gray-900/50 border-gray-800 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle>Widget Behavior</CardTitle>
                    <CardDescription>Configure widget functionality</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="showTypingIndicator">Show typing indicator</Label>
                        <p className="text-sm text-gray-400">Display when the agent is typing</p>
                      </div>
                      <Switch
                        id="showTypingIndicator"
                        checked={config.showTypingIndicator}
                        onCheckedChange={(checked) => setConfig(prev => ({ ...prev, showTypingIndicator: checked }))}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="showOnlineStatus">Show online status</Label>
                        <p className="text-sm text-gray-400">Display agent availability</p>
                      </div>
                      <Switch
                        id="showOnlineStatus"
                        checked={config.showOnlineStatus}
                        onCheckedChange={(checked) => setConfig(prev => ({ ...prev, showOnlineStatus: checked }))}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="agentId">Agent ID</Label>
                      <Input
                        id="agentId"
                        value={config.agentId}
                        onChange={(e) => setConfig(prev => ({ ...prev, agentId: e.target.value }))}
                        className="bg-gray-800 border-gray-700"
                        placeholder="Enter your agent ID"
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="messages" className="space-y-4">
                <Card className="bg-gray-900/50 border-gray-800 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle>Message Settings</CardTitle>
                    <CardDescription>Customize widget messages</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="welcomeMessage">Welcome Message</Label>
                      <Textarea
                        id="welcomeMessage"
                        value={config.welcomeMessage}
                        onChange={(e) => setConfig(prev => ({ ...prev, welcomeMessage: e.target.value }))}
                        className="bg-gray-800 border-gray-700"
                        placeholder="Enter welcome message"
                        rows={3}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="placeholder">Input Placeholder</Label>
                      <Input
                        id="placeholder"
                        value={config.placeholder}
                        onChange={(e) => setConfig(prev => ({ ...prev, placeholder: e.target.value }))}
                        className="bg-gray-800 border-gray-700"
                        placeholder="Type your message..."
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            {/* Embed Code */}
            <Card className="bg-gray-900/50 border-gray-800 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Code className="h-5 w-5" />
                  Embed Code
                </CardTitle>
                <CardDescription>Copy this code to your website</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="relative">
                  <pre className="bg-gray-800 p-4 rounded-lg text-sm overflow-x-auto">
                    <code className="text-gray-300">{generateEmbedCode()}</code>
                  </pre>
                  <Button
                    onClick={() => copyToClipboard(generateEmbedCode())}
                    className="absolute top-2 right-2"
                    size="sm"
                    variant="outline"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={() => setShowPreview(!showPreview)}
                    variant="outline"
                    className="border-gray-700"
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    {showPreview ? 'Hide Preview' : 'Show Preview'}
                  </Button>
                  
                  <Button variant="outline" className="border-gray-700">
                    <Download className="h-4 w-4 mr-2" />
                    Download HTML
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Preview Panel */}
          <div className="space-y-6">
            <Card className="bg-gray-900/50 border-gray-800 backdrop-blur-sm">
              <CardHeader>
                <CardTitle>Live Preview</CardTitle>
                <CardDescription>See how your widget will look on your website</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="relative bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg p-8 min-h-[400px]">
                  {/* Mock Website Content */}
                  <div className="space-y-4">
                    <div className="h-8 bg-gray-300 rounded w-3/4"></div>
                    <div className="h-4 bg-gray-300 rounded w-full"></div>
                    <div className="h-4 bg-gray-300 rounded w-5/6"></div>
                    <div className="h-4 bg-gray-300 rounded w-4/5"></div>
                    <div className="h-32 bg-gray-300 rounded w-full"></div>
                    <div className="h-4 bg-gray-300 rounded w-3/4"></div>
                    <div className="h-4 bg-gray-300 rounded w-2/3"></div>
                  </div>

                  {/* Widget Preview */}
                  {showPreview && (
                    <LiveChatWidget 
                      config={config}
                      onConfigChange={setConfig}
                    />
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Integration Guide */}
            <Card className="bg-gray-900/50 border-gray-800 backdrop-blur-sm">
              <CardHeader>
                <CardTitle>Integration Guide</CardTitle>
                <CardDescription>How to add the widget to your website</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-bold">1</div>
                    <div>
                      <h4 className="font-medium">Copy the embed code</h4>
                      <p className="text-sm text-gray-400">Use the code generated above</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-bold">2</div>
                    <div>
                      <h4 className="font-medium">Paste before closing &lt;/body&gt; tag</h4>
                      <p className="text-sm text-gray-400">Add the code to every page where you want the widget</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-bold">3</div>
                    <div>
                      <h4 className="font-medium">Test the widget</h4>
                      <p className="text-sm text-gray-400">Verify it appears and functions correctly</p>
                    </div>
                  </div>
                </div>

                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 mt-4">
                  <h4 className="font-medium text-blue-400 mb-2">Popular Platforms:</h4>
                  <ul className="text-sm text-gray-300 space-y-1">
                    <li>• WordPress: Add to theme footer or use a plugin</li>
                    <li>• Shopify: Add to theme.liquid file</li>
                    <li>• Squarespace: Use Code Injection in settings</li>
                    <li>• Wix: Add via HTML embed element</li>
                    <li>• React/Next.js: Import as a component</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
