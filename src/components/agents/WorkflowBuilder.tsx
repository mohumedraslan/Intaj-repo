'use client';

import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Plus, X, Play, Save, Zap, MessageSquare, Clock, Users } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';

interface WorkflowTrigger {
  id: string;
  type: 'message_received' | 'keyword_detected' | 'time_based' | 'user_joined' | 'custom';
  condition: string;
  value?: string;
}

interface WorkflowAction {
  id: string;
  type: 'send_message' | 'transfer_human' | 'collect_info' | 'api_call' | 'wait' | 'custom';
  config: Record<string, any>;
  delay?: number;
}

interface WorkflowRule {
  id: string;
  name: string;
  description: string;
  triggers: WorkflowTrigger[];
  actions: WorkflowAction[];
  isActive: boolean;
  priority: number;
}

interface WorkflowBuilderProps {
  agentId: string;
  onSave?: (workflows: WorkflowRule[]) => void;
}

const triggerTypes = [
  { value: 'message_received', label: 'Message Received', icon: MessageSquare },
  { value: 'keyword_detected', label: 'Keyword Detected', icon: Zap },
  { value: 'time_based', label: 'Time Based', icon: Clock },
  { value: 'user_joined', label: 'User Joined', icon: Users },
  { value: 'custom', label: 'Custom Condition', icon: Zap }
];

const actionTypes = [
  { value: 'send_message', label: 'Send Message', config: ['message'] },
  { value: 'transfer_human', label: 'Transfer to Human', config: ['department'] },
  { value: 'collect_info', label: 'Collect Information', config: ['fields', 'message'] },
  { value: 'api_call', label: 'API Call', config: ['url', 'method', 'headers'] },
  { value: 'wait', label: 'Wait/Delay', config: ['duration'] },
  { value: 'custom', label: 'Custom Action', config: ['code'] }
];

export default function WorkflowBuilder({ agentId, onSave }: WorkflowBuilderProps) {
  const [workflows, setWorkflows] = useState<WorkflowRule[]>([]);
  const [currentWorkflow, setCurrentWorkflow] = useState<WorkflowRule | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);

  const createNewWorkflow = useCallback(() => {
    const newWorkflow: WorkflowRule = {
      id: crypto.randomUUID(),
      name: 'New Workflow',
      description: 'Describe what this workflow does',
      triggers: [],
      actions: [],
      isActive: true,
      priority: 1
    };
    setCurrentWorkflow(newWorkflow);
    setIsEditing(true);
  }, []);

  const addTrigger = useCallback(() => {
    if (!currentWorkflow) return;
    
    const newTrigger: WorkflowTrigger = {
      id: crypto.randomUUID(),
      type: 'message_received',
      condition: 'contains',
      value: ''
    };
    
    setCurrentWorkflow({
      ...currentWorkflow,
      triggers: [...currentWorkflow.triggers, newTrigger]
    });
  }, [currentWorkflow]);

  const addAction = useCallback(() => {
    if (!currentWorkflow) return;
    
    const newAction: WorkflowAction = {
      id: crypto.randomUUID(),
      type: 'send_message',
      config: { message: '' }
    };
    
    setCurrentWorkflow({
      ...currentWorkflow,
      actions: [...currentWorkflow.actions, newAction]
    });
  }, [currentWorkflow]);

  const updateTrigger = useCallback((triggerId: string, updates: Partial<WorkflowTrigger>) => {
    if (!currentWorkflow) return;
    
    setCurrentWorkflow({
      ...currentWorkflow,
      triggers: currentWorkflow.triggers.map(trigger =>
        trigger.id === triggerId ? { ...trigger, ...updates } : trigger
      )
    });
  }, [currentWorkflow]);

  const updateAction = useCallback((actionId: string, updates: Partial<WorkflowAction>) => {
    if (!currentWorkflow) return;
    
    setCurrentWorkflow({
      ...currentWorkflow,
      actions: currentWorkflow.actions.map(action =>
        action.id === actionId ? { ...action, ...updates } : action
      )
    });
  }, [currentWorkflow]);

  const removeTrigger = useCallback((triggerId: string) => {
    if (!currentWorkflow) return;
    
    setCurrentWorkflow({
      ...currentWorkflow,
      triggers: currentWorkflow.triggers.filter(trigger => trigger.id !== triggerId)
    });
  }, [currentWorkflow]);

  const removeAction = useCallback((actionId: string) => {
    if (!currentWorkflow) return;
    
    setCurrentWorkflow({
      ...currentWorkflow,
      actions: currentWorkflow.actions.filter(action => action.id !== actionId)
    });
  }, [currentWorkflow]);

  const saveWorkflow = useCallback(async () => {
    if (!currentWorkflow) return;
    
    setLoading(true);
    try {
      // Save to database
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('agent_workflows')
        .upsert({
          id: currentWorkflow.id,
          agent_id: agentId,
          user_id: user.id,
          name: currentWorkflow.name,
          description: currentWorkflow.description,
          triggers: currentWorkflow.triggers,
          actions: currentWorkflow.actions,
          is_active: currentWorkflow.isActive,
          priority: currentWorkflow.priority
        });

      if (error) throw error;

      // Update local state
      const updatedWorkflows = workflows.some(w => w.id === currentWorkflow.id)
        ? workflows.map(w => w.id === currentWorkflow.id ? currentWorkflow : w)
        : [...workflows, currentWorkflow];
      
      setWorkflows(updatedWorkflows);
      setIsEditing(false);
      onSave?.(updatedWorkflows);
      
    } catch (error) {
      console.error('Error saving workflow:', error);
    } finally {
      setLoading(false);
    }
  }, [currentWorkflow, agentId, workflows, onSave]);

  const renderTriggerConfig = (trigger: WorkflowTrigger) => {
    switch (trigger.type) {
      case 'keyword_detected':
        return (
          <div className="space-y-2">
            <Label>Keywords (comma separated)</Label>
            <Input
              value={trigger.value || ''}
              onChange={(e) => updateTrigger(trigger.id, { value: e.target.value })}
              placeholder="help, support, question"
            />
          </div>
        );
      case 'time_based':
        return (
          <div className="space-y-2">
            <Label>Schedule</Label>
            <Input
              value={trigger.value || ''}
              onChange={(e) => updateTrigger(trigger.id, { value: e.target.value })}
              placeholder="0 9 * * 1-5 (9 AM weekdays)"
            />
          </div>
        );
      case 'custom':
        return (
          <div className="space-y-2">
            <Label>Custom Condition</Label>
            <Textarea
              value={trigger.value || ''}
              onChange={(e) => updateTrigger(trigger.id, { value: e.target.value })}
              placeholder="user.message.length > 100"
            />
          </div>
        );
      default:
        return null;
    }
  };

  const renderActionConfig = (action: WorkflowAction) => {
    switch (action.type) {
      case 'send_message':
        return (
          <div className="space-y-2">
            <Label>Message</Label>
            <Textarea
              value={action.config.message || ''}
              onChange={(e) => updateAction(action.id, { 
                config: { ...action.config, message: e.target.value }
              })}
              placeholder="Hello! How can I help you today?"
            />
          </div>
        );
      case 'transfer_human':
        return (
          <div className="space-y-2">
            <Label>Department</Label>
            <Select
              value={action.config.department || ''}
              onValueChange={(value) => updateAction(action.id, { 
                config: { ...action.config, department: value }
              })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="support">Support</SelectItem>
                <SelectItem value="sales">Sales</SelectItem>
                <SelectItem value="technical">Technical</SelectItem>
              </SelectContent>
            </Select>
          </div>
        );
      case 'collect_info':
        return (
          <div className="space-y-2">
            <Label>Fields to Collect</Label>
            <Input
              value={action.config.fields || ''}
              onChange={(e) => updateAction(action.id, { 
                config: { ...action.config, fields: e.target.value }
              })}
              placeholder="name, email, phone"
            />
          </div>
        );
      case 'api_call':
        return (
          <div className="space-y-2">
            <Label>API URL</Label>
            <Input
              value={action.config.url || ''}
              onChange={(e) => updateAction(action.id, { 
                config: { ...action.config, url: e.target.value }
              })}
              placeholder="https://api.example.com/webhook"
            />
          </div>
        );
      case 'wait':
        return (
          <div className="space-y-2">
            <Label>Duration (seconds)</Label>
            <Input
              type="number"
              value={action.config.duration || ''}
              onChange={(e) => updateAction(action.id, { 
                config: { ...action.config, duration: parseInt(e.target.value) }
              })}
              placeholder="30"
            />
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white">Workflow Builder</h2>
          <p className="text-gray-400">Create intelligent automation rules for your agent</p>
        </div>
        <Button onClick={createNewWorkflow} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="h-4 w-4 mr-2" />
          New Workflow
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Workflow List */}
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white">Existing Workflows</CardTitle>
          </CardHeader>
          <CardContent>
            {workflows.length === 0 ? (
              <p className="text-gray-400 text-center py-8">
                No workflows created yet. Create your first workflow to get started!
              </p>
            ) : (
              <div className="space-y-3">
                {workflows.map((workflow) => (
                  <div
                    key={workflow.id}
                    className="p-3 bg-gray-700 rounded-lg cursor-pointer hover:bg-gray-600"
                    onClick={() => {
                      setCurrentWorkflow(workflow);
                      setIsEditing(true);
                    }}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="text-white font-medium">{workflow.name}</h4>
                        <p className="text-gray-400 text-sm">{workflow.description}</p>
                      </div>
                      <Badge variant={workflow.isActive ? "default" : "secondary"}>
                        {workflow.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                    <div className="mt-2 flex gap-2">
                      <Badge variant="outline" className="text-xs">
                        {workflow.triggers.length} triggers
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {workflow.actions.length} actions
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Workflow Editor */}
        {isEditing && currentWorkflow && (
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Edit Workflow</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Basic Info */}
              <div className="space-y-4">
                <div>
                  <Label>Workflow Name</Label>
                  <Input
                    value={currentWorkflow.name}
                    onChange={(e) => setCurrentWorkflow({
                      ...currentWorkflow,
                      name: e.target.value
                    })}
                    className="bg-gray-700 border-gray-600 text-white"
                  />
                </div>
                <div>
                  <Label>Description</Label>
                  <Textarea
                    value={currentWorkflow.description}
                    onChange={(e) => setCurrentWorkflow({
                      ...currentWorkflow,
                      description: e.target.value
                    })}
                    className="bg-gray-700 border-gray-600 text-white"
                  />
                </div>
              </div>

              {/* Triggers */}
              <div>
                <div className="flex justify-between items-center mb-3">
                  <Label className="text-lg">When (Triggers)</Label>
                  <Button onClick={addTrigger} className="text-sm px-3 py-1 border border-gray-600 text-gray-300 hover:bg-gray-700 bg-transparent">
                    <Plus className="h-3 w-3 mr-1" />
                    Add Trigger
                  </Button>
                </div>
                <div className="space-y-3">
                  {currentWorkflow.triggers.map((trigger) => (
                    <Card key={trigger.id} className="bg-gray-700 border-gray-600">
                      <CardContent className="pt-4">
                        <div className="flex justify-between items-start mb-3">
                          <Select
                            value={trigger.type}
                            onValueChange={(value) => updateTrigger(trigger.id, { 
                              type: value as WorkflowTrigger['type'] 
                            })}
                          >
                            <SelectTrigger className="w-48">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {triggerTypes.map((type) => (
                                <SelectItem key={type.value} value={type.value}>
                                  {type.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button
                            onClick={() => removeTrigger(trigger.id)}
                            className="text-sm px-2 py-1 text-gray-400 hover:text-red-400 hover:bg-gray-600 bg-transparent"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                        {renderTriggerConfig(trigger)}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div>
                <div className="flex justify-between items-center mb-3">
                  <Label className="text-lg">Then (Actions)</Label>
                  <Button onClick={addAction} className="text-sm px-3 py-1 border border-gray-600 text-gray-300 hover:bg-gray-700 bg-transparent">
                    <Plus className="h-3 w-3 mr-1" />
                    Add Action
                  </Button>
                </div>
                <div className="space-y-3">
                  {currentWorkflow.actions.map((action, index) => (
                    <Card key={action.id} className="bg-gray-700 border-gray-600">
                      <CardContent className="pt-4">
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              {index + 1}
                            </Badge>
                            <Select
                              value={action.type}
                              onValueChange={(value) => updateAction(action.id, { 
                                type: value as WorkflowAction['type'] 
                              })}
                            >
                              <SelectTrigger className="w-48">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {actionTypes.map((type) => (
                                  <SelectItem key={type.value} value={type.value}>
                                    {type.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <Button
                            onClick={() => removeAction(action.id)}
                            className="text-sm px-2 py-1 text-gray-400 hover:text-red-400 hover:bg-gray-600 bg-transparent"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                        {renderActionConfig(action)}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Save Actions */}
              <div className="flex gap-3 pt-4">
                <Button
                  onClick={saveWorkflow}
                  disabled={loading}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {loading ? 'Saving...' : 'Save Workflow'}
                </Button>
                <Button
                  onClick={() => setIsEditing(false)}
                  className="border border-gray-600 text-gray-300 hover:bg-gray-700 bg-transparent"
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
