'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Eye, Edit, Copy, Trash2, Plus, Save, X } from 'lucide-react';

interface WidgetTemplate {
  id: string;
  name: string;
  description: string;
  category: 'customer-support' | 'sales' | 'lead-generation' | 'feedback' | 'custom';
  config: {
    botName: string;
    welcomeMessage: string;
    primaryColor: string;
    position: 'bottom-right' | 'bottom-left';
    allowFileUpload: boolean;
    maxFileSize: number;
    allowedFileTypes: string[];
    customCSS?: string;
    autoGreeting: boolean;
    operatingHours?: {
      enabled: boolean;
      timezone: string;
      schedule: { [key: string]: { start: string; end: string; enabled: boolean } };
    };
  };
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const defaultTemplates: WidgetTemplate[] = [
  {
    id: '1',
    name: 'Customer Support',
    description: 'Professional support widget with file sharing and ticket creation',
    category: 'customer-support',
    config: {
      botName: 'Support Assistant',
      welcomeMessage: "Hello! I'm here to help you with any questions or issues you may have.",
      primaryColor: '#3b82f6',
      position: 'bottom-right',
      allowFileUpload: true,
      maxFileSize: 10,
      allowedFileTypes: ['image/*', 'application/pdf', '.doc', '.docx'],
      autoGreeting: true,
      operatingHours: {
        enabled: true,
        timezone: 'UTC',
        schedule: {
          monday: { start: '09:00', end: '17:00', enabled: true },
          tuesday: { start: '09:00', end: '17:00', enabled: true },
          wednesday: { start: '09:00', end: '17:00', enabled: true },
          thursday: { start: '09:00', end: '17:00', enabled: true },
          friday: { start: '09:00', end: '17:00', enabled: true },
          saturday: { start: '10:00', end: '14:00', enabled: false },
          sunday: { start: '10:00', end: '14:00', enabled: false },
        },
      },
    },
    isActive: true,
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-20'),
  },
  {
    id: '2',
    name: 'Sales Assistant',
    description: 'Convert visitors into leads with personalized sales conversations',
    category: 'sales',
    config: {
      botName: 'Sales Bot',
      welcomeMessage: "Hi there! Looking to learn more about our solutions? I'd love to help!",
      primaryColor: '#10b981',
      position: 'bottom-right',
      allowFileUpload: false,
      maxFileSize: 5,
      allowedFileTypes: ['image/*'],
      autoGreeting: true,
    },
    isActive: false,
    createdAt: new Date('2024-01-10'),
    updatedAt: new Date('2024-01-18'),
  },
  {
    id: '3',
    name: 'Lead Capture',
    description: 'Collect visitor information and qualify leads automatically',
    category: 'lead-generation',
    config: {
      botName: 'Lead Assistant',
      welcomeMessage: 'Welcome! I can help you find the perfect solution for your business needs.',
      primaryColor: '#8b5cf6',
      position: 'bottom-left',
      allowFileUpload: false,
      maxFileSize: 5,
      allowedFileTypes: [],
      autoGreeting: false,
    },
    isActive: false,
    createdAt: new Date('2024-01-12'),
    updatedAt: new Date('2024-01-19'),
  },
];

export default function WidgetTemplates() {
  const [templates, setTemplates] = useState<WidgetTemplate[]>(defaultTemplates);
  const [selectedTemplate, setSelectedTemplate] = useState<WidgetTemplate | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [editForm, setEditForm] = useState<Partial<WidgetTemplate>>({});

  const categoryColors = {
    'customer-support': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    sales: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    'lead-generation': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
    feedback: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    custom: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
  };

  const handleCreateTemplate = () => {
    setIsCreating(true);
    setEditForm({
      name: '',
      description: '',
      category: 'custom',
      config: {
        botName: 'Assistant',
        welcomeMessage: 'Hello! How can I help you today?',
        primaryColor: '#3b82f6',
        position: 'bottom-right',
        allowFileUpload: true,
        maxFileSize: 10,
        allowedFileTypes: ['image/*', 'application/pdf'],
        autoGreeting: true,
      },
      isActive: false,
    });
  };

  const handleEditTemplate = (template: WidgetTemplate) => {
    setSelectedTemplate(template);
    setEditForm(template);
    setIsEditing(true);
  };

  const handleSaveTemplate = () => {
    if (isCreating) {
      const newTemplate: WidgetTemplate = {
        ...(editForm as WidgetTemplate),
        id: Date.now().toString(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      setTemplates(prev => [...prev, newTemplate]);
    } else if (selectedTemplate) {
      setTemplates(prev =>
        prev.map(t =>
          t.id === selectedTemplate.id
            ? { ...(editForm as WidgetTemplate), updatedAt: new Date() }
            : t
        )
      );
    }

    setIsEditing(false);
    setIsCreating(false);
    setSelectedTemplate(null);
    setEditForm({});
  };

  const handleDeleteTemplate = (id: string) => {
    if (confirm('Are you sure you want to delete this template?')) {
      setTemplates(prev => prev.filter(t => t.id !== id));
    }
  };

  const handleDuplicateTemplate = (template: WidgetTemplate) => {
    const duplicated: WidgetTemplate = {
      ...template,
      id: Date.now().toString(),
      name: `${template.name} (Copy)`,
      isActive: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    setTemplates(prev => [...prev, duplicated]);
  };

  const toggleTemplateStatus = (id: string) => {
    setTemplates(prev =>
      prev.map(t => (t.id === id ? { ...t, isActive: !t.isActive, updatedAt: new Date() } : t))
    );
  };

  const generateEmbedCode = (template: WidgetTemplate) => {
    return `<!-- Intaj Chat Widget -->
<script>
  window.IntajChatConfig = ${JSON.stringify(template.config, null, 2)};
</script>
<script src="https://cdn.intaj.ai/widget.js"></script>`;
  };

  if (isEditing || isCreating) {
    return (
      <div className="min-h-screen bg-[#0a0a0b] text-white p-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent">
              {isCreating ? 'Create Widget Template' : 'Edit Widget Template'}
            </h1>
            <button
              onClick={() => {
                setIsEditing(false);
                setIsCreating(false);
                setSelectedTemplate(null);
                setEditForm({});
              }}
              className="p-2 text-gray-400 hover:text-white transition-colors"
            >
              <X size={24} />
            </button>
          </div>

          <Card className="bg-[#141517]/50 backdrop-blur-xl border-gray-800/50">
            <CardContent className="p-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Basic Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-white mb-4">Basic Information</h3>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Template Name
                    </label>
                    <input
                      type="text"
                      value={editForm.name || ''}
                      onChange={e => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter template name"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Description
                    </label>
                    <textarea
                      value={editForm.description || ''}
                      onChange={e =>
                        setEditForm(prev => ({ ...prev, description: e.target.value }))
                      }
                      className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      rows={3}
                      placeholder="Describe this template"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Category</label>
                    <select
                      value={editForm.category || 'custom'}
                      onChange={e =>
                        setEditForm(prev => ({ ...prev, category: e.target.value as any }))
                      }
                      className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="customer-support">Customer Support</option>
                      <option value="sales">Sales</option>
                      <option value="lead-generation">Lead Generation</option>
                      <option value="feedback">Feedback</option>
                      <option value="custom">Custom</option>
                    </select>
                  </div>
                </div>

                {/* Widget Configuration */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-white mb-4">Widget Configuration</h3>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Bot Name</label>
                    <input
                      type="text"
                      value={editForm.config?.botName || ''}
                      onChange={e =>
                        setEditForm(prev => ({
                          ...prev,
                          config: { ...prev.config!, botName: e.target.value },
                        }))
                      }
                      className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Assistant name"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Welcome Message
                    </label>
                    <textarea
                      value={editForm.config?.welcomeMessage || ''}
                      onChange={e =>
                        setEditForm(prev => ({
                          ...prev,
                          config: { ...prev.config!, welcomeMessage: e.target.value },
                        }))
                      }
                      className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      rows={2}
                      placeholder="First message users will see"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Primary Color
                    </label>
                    <input
                      type="color"
                      value={editForm.config?.primaryColor || '#3b82f6'}
                      onChange={e =>
                        setEditForm(prev => ({
                          ...prev,
                          config: { ...prev.config!, primaryColor: e.target.value },
                        }))
                      }
                      className="w-full h-12 bg-gray-800 border border-gray-700 rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Position</label>
                    <select
                      value={editForm.config?.position || 'bottom-right'}
                      onChange={e =>
                        setEditForm(prev => ({
                          ...prev,
                          config: { ...prev.config!, position: e.target.value as any },
                        }))
                      }
                      className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="bottom-right">Bottom Right</option>
                      <option value="bottom-left">Bottom Left</option>
                    </select>
                  </div>

                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={editForm.config?.allowFileUpload || false}
                      onChange={e =>
                        setEditForm(prev => ({
                          ...prev,
                          config: { ...prev.config!, allowFileUpload: e.target.checked },
                        }))
                      }
                      className="w-4 h-4 text-blue-600 bg-gray-800 border-gray-700 rounded focus:ring-blue-500"
                    />
                    <label className="text-sm font-medium text-gray-300">Allow File Upload</label>
                  </div>

                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={editForm.config?.autoGreeting || false}
                      onChange={e =>
                        setEditForm(prev => ({
                          ...prev,
                          config: { ...prev.config!, autoGreeting: e.target.checked },
                        }))
                      }
                      className="w-4 h-4 text-blue-600 bg-gray-800 border-gray-700 rounded focus:ring-blue-500"
                    />
                    <label className="text-sm font-medium text-gray-300">Auto Greeting</label>
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-4 mt-8">
                <button
                  onClick={() => {
                    setIsEditing(false);
                    setIsCreating(false);
                    setSelectedTemplate(null);
                    setEditForm({});
                  }}
                  className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveTemplate}
                  className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:opacity-90 transition-opacity flex items-center space-x-2"
                >
                  <Save size={20} />
                  <span>Save Template</span>
                </button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0b] text-white p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent mb-4">
              Widget Templates
            </h1>
            <p className="text-gray-400 text-lg">
              Create and manage customizable chat widget templates
            </p>
          </div>
          <button
            onClick={handleCreateTemplate}
            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:opacity-90 transition-opacity flex items-center space-x-2"
          >
            <Plus size={20} />
            <span>Create Template</span>
          </button>
        </div>

        {/* Templates Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map(template => (
            <Card
              key={template.id}
              className="bg-[#141517]/50 backdrop-blur-xl border-gray-800/50 hover:border-gray-700/50 transition-all duration-300"
            >
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <CardTitle className="text-lg text-white">{template.name}</CardTitle>
                      {template.isActive && (
                        <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                          Active
                        </Badge>
                      )}
                    </div>
                    <Badge className={categoryColors[template.category]}>
                      {template.category.replace('-', ' ')}
                    </Badge>
                  </div>
                </div>
                <CardDescription className="text-gray-400 mt-2">
                  {template.description}
                </CardDescription>
              </CardHeader>

              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-400">Bot Name:</span>
                      <p className="text-white font-medium">{template.config.botName}</p>
                    </div>
                    <div>
                      <span className="text-gray-400">Position:</span>
                      <p className="text-white font-medium capitalize">
                        {template.config.position.replace('-', ' ')}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 text-sm">
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: template.config.primaryColor }}
                    ></div>
                    <span className="text-gray-400">Primary Color</span>
                  </div>

                  <div className="flex flex-wrap gap-2 text-xs">
                    {template.config.allowFileUpload && (
                      <Badge variant="secondary">File Upload</Badge>
                    )}
                    {template.config.autoGreeting && (
                      <Badge variant="secondary">Auto Greeting</Badge>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-gray-700">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleEditTemplate(template)}
                        className="p-2 text-gray-400 hover:text-blue-400 transition-colors"
                        title="Edit template"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => handleDuplicateTemplate(template)}
                        className="p-2 text-gray-400 hover:text-green-400 transition-colors"
                        title="Duplicate template"
                      >
                        <Copy size={16} />
                      </button>
                      <button
                        onClick={() => handleDeleteTemplate(template.id)}
                        className="p-2 text-gray-400 hover:text-red-400 transition-colors"
                        title="Delete template"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                    <button
                      onClick={() => toggleTemplateStatus(template.id)}
                      className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                        template.isActive
                          ? 'bg-red-600/20 text-red-400 hover:bg-red-600/30'
                          : 'bg-green-600/20 text-green-400 hover:bg-green-600/30'
                      }`}
                    >
                      {template.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Embed Code Modal */}
        {selectedTemplate && !isEditing && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <Card className="w-full max-w-2xl bg-[#141517] border-gray-800">
              <CardHeader>
                <CardTitle className="text-white">Embed Code</CardTitle>
                <CardDescription>
                  Copy this code and paste it into your website's HTML
                </CardDescription>
              </CardHeader>
              <CardContent>
                <pre className="bg-gray-900 p-4 rounded-lg text-sm text-gray-300 overflow-x-auto">
                  <code>{generateEmbedCode(selectedTemplate)}</code>
                </pre>
                <div className="flex justify-end space-x-4 mt-4">
                  <button
                    onClick={() => setSelectedTemplate(null)}
                    className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                  >
                    Close
                  </button>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(generateEmbedCode(selectedTemplate));
                      alert('Embed code copied to clipboard!');
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                  >
                    Copy Code
                  </button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
