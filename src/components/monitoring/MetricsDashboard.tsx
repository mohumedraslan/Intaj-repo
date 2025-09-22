/**
 * Real-time Monitoring Dashboard
 * Displays system metrics, health status, and performance indicators
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Database, 
  Server, 
  Zap,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Download
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';

interface HealthStatus {
  name: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  message: string;
  responseTime?: number;
  critical: boolean;
}

interface SystemMetrics {
  timestamp: string;
  responseTime: number;
  errorRate: number;
  throughput: number;
  memoryUsage: number;
  cpuUsage: number;
  activeConnections: number;
}

interface PerformanceAlert {
  id: string;
  type: 'performance' | 'error' | 'capacity';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  timestamp: string;
  resolved: boolean;
}

export function MetricsDashboard() {
  const [healthStatus, setHealthStatus] = useState<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    checks: HealthStatus[];
    uptime: number;
  } | null>(null);
  
  const [metrics, setMetrics] = useState<SystemMetrics[]>([]);
  const [alerts, setAlerts] = useState<PerformanceAlert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Fetch health status
  const fetchHealthStatus = async () => {
    try {
      const response = await fetch('/api/v1/health');
      const data = await response.json();
      
      setHealthStatus({
        status: data.status,
        checks: data.checks.map((check: any) => ({
          name: check.name,
          status: check.status.healthy ? 'healthy' : 'unhealthy',
          message: check.status.message,
          responseTime: check.status.responseTime,
          critical: check.critical
        })),
        uptime: data.uptime
      });
    } catch (error) {
      console.error('Failed to fetch health status:', error);
    }
  };

  // Fetch system metrics
  const fetchMetrics = async () => {
    try {
      // In a real implementation, this would fetch actual metrics
      // For now, we'll generate mock data
      const now = new Date();
      const newMetrics: SystemMetrics[] = [];
      
      for (let i = 29; i >= 0; i--) {
        const timestamp = new Date(now.getTime() - i * 60000);
        newMetrics.push({
          timestamp: timestamp.toISOString(),
          responseTime: 800 + Math.random() * 400,
          errorRate: Math.random() * 5,
          throughput: 50 + Math.random() * 100,
          memoryUsage: 60 + Math.random() * 30,
          cpuUsage: 30 + Math.random() * 40,
          activeConnections: 100 + Math.random() * 50
        });
      }
      
      setMetrics(newMetrics);
    } catch (error) {
      console.error('Failed to fetch metrics:', error);
    }
  };

  // Fetch alerts
  const fetchAlerts = async () => {
    try {
      // Mock alerts data
      const mockAlerts: PerformanceAlert[] = [
        {
          id: '1',
          type: 'performance',
          severity: 'medium',
          message: 'Response time above threshold (1.2s avg)',
          timestamp: new Date(Date.now() - 300000).toISOString(),
          resolved: false
        },
        {
          id: '2',
          type: 'capacity',
          severity: 'low',
          message: 'Memory usage at 85%',
          timestamp: new Date(Date.now() - 600000).toISOString(),
          resolved: false
        }
      ];
      
      setAlerts(mockAlerts);
    } catch (error) {
      console.error('Failed to fetch alerts:', error);
    }
  };

  // Refresh all data
  const refreshData = async () => {
    setIsLoading(true);
    await Promise.all([
      fetchHealthStatus(),
      fetchMetrics(),
      fetchAlerts()
    ]);
    setLastUpdated(new Date());
    setIsLoading(false);
  };

  // Auto-refresh effect
  useEffect(() => {
    refreshData();
    
    if (autoRefresh) {
      const interval = setInterval(refreshData, 30000); // Refresh every 30 seconds
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600 bg-green-50 border-green-200';
      case 'degraded': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'unhealthy': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return <CheckCircle className="h-4 w-4" />;
      case 'degraded': return <AlertTriangle className="h-4 w-4" />;
      case 'unhealthy': return <AlertTriangle className="h-4 w-4" />;
      default: return <Activity className="h-4 w-4" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'low': return 'bg-blue-100 text-blue-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'critical': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading && !healthStatus) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading monitoring data...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">System Monitoring</h1>
          <p className="text-muted-foreground">
            Real-time system health and performance metrics
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={refreshData}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          
          <Button
            variant={autoRefresh ? "default" : "outline"}
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            <Activity className="h-4 w-4 mr-2" />
            Auto-refresh
          </Button>
          
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* System Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              {healthStatus && getStatusIcon(healthStatus.status)}
              <div>
                <p className="text-sm font-medium">System Status</p>
                <p className={`text-lg font-bold ${getStatusColor(healthStatus?.status || 'unknown')}`}>
                  {healthStatus?.status.toUpperCase() || 'UNKNOWN'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-blue-600" />
              <div>
                <p className="text-sm font-medium">Uptime</p>
                <p className="text-lg font-bold">
                  {healthStatus ? Math.floor(healthStatus.uptime / 1000 / 60 / 60) : 0}h
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-4 w-4 text-green-600" />
              <div>
                <p className="text-sm font-medium">Avg Response Time</p>
                <p className="text-lg font-bold">
                  {metrics.length > 0 ? 
                    Math.round(metrics[metrics.length - 1].responseTime) : 0}ms
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-4 w-4 text-orange-600" />
              <div>
                <p className="text-sm font-medium">Active Alerts</p>
                <p className="text-lg font-bold">
                  {alerts.filter(alert => !alert.resolved).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Dashboard */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="health">Health Checks</TabsTrigger>
          <TabsTrigger value="alerts">Alerts</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Response Time Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Response Time</CardTitle>
                <CardDescription>Average response time over the last 30 minutes</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={metrics}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="timestamp" 
                      tickFormatter={(value) => new Date(value).toLocaleTimeString()}
                    />
                    <YAxis />
                    <Tooltip 
                      labelFormatter={(value) => new Date(value).toLocaleString()}
                      formatter={(value: number) => [`${Math.round(value)}ms`, 'Response Time']}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="responseTime" 
                      stroke="#3b82f6" 
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* System Resources */}
            <Card>
              <CardHeader>
                <CardTitle>System Resources</CardTitle>
                <CardDescription>Current resource utilization</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Memory Usage</span>
                    <span>{metrics.length > 0 ? Math.round(metrics[metrics.length - 1].memoryUsage) : 0}%</span>
                  </div>
                  <Progress 
                    value={metrics.length > 0 ? metrics[metrics.length - 1].memoryUsage : 0} 
                    className="h-2"
                  />
                </div>
                
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>CPU Usage</span>
                    <span>{metrics.length > 0 ? Math.round(metrics[metrics.length - 1].cpuUsage) : 0}%</span>
                  </div>
                  <Progress 
                    value={metrics.length > 0 ? metrics[metrics.length - 1].cpuUsage : 0} 
                    className="h-2"
                  />
                </div>
                
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Active Connections</span>
                    <span>{metrics.length > 0 ? Math.round(metrics[metrics.length - 1].activeConnections) : 0}</span>
                  </div>
                  <Progress 
                    value={metrics.length > 0 ? (metrics[metrics.length - 1].activeConnections / 200) * 100 : 0} 
                    className="h-2"
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Throughput and Error Rate */}
          <Card>
            <CardHeader>
              <CardTitle>Throughput & Error Rate</CardTitle>
              <CardDescription>Request throughput and error rate over time</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={metrics}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="timestamp" 
                    tickFormatter={(value) => new Date(value).toLocaleTimeString()}
                  />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip 
                    labelFormatter={(value) => new Date(value).toLocaleString()}
                  />
                  <Area
                    yAxisId="left"
                    type="monotone"
                    dataKey="throughput"
                    stackId="1"
                    stroke="#10b981"
                    fill="#10b981"
                    fillOpacity={0.6}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="errorRate"
                    stroke="#ef4444"
                    strokeWidth={2}
                    dot={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="health" className="space-y-4">
          <div className="grid gap-4">
            {healthStatus?.checks.map((check, index) => (
              <Card key={index}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      {getStatusIcon(check.status)}
                      <div>
                        <h3 className="font-medium">{check.name}</h3>
                        <p className="text-sm text-muted-foreground">{check.message}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      {check.responseTime && (
                        <Badge variant="outline">
                          {Math.round(check.responseTime)}ms
                        </Badge>
                      )}
                      <Badge className={getStatusColor(check.status)}>
                        {check.status}
                      </Badge>
                      {check.critical && (
                        <Badge variant="destructive">Critical</Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="alerts" className="space-y-4">
          <div className="space-y-4">
            {alerts.length === 0 ? (
              <Card>
                <CardContent className="p-6 text-center">
                  <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
                  <h3 className="text-lg font-medium">No Active Alerts</h3>
                  <p className="text-muted-foreground">All systems are operating normally</p>
                </CardContent>
              </Card>
            ) : (
              alerts.map((alert) => (
                <Alert key={alert.id}>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle className="flex items-center justify-between">
                    <span>{alert.type.toUpperCase()} Alert</span>
                    <Badge className={getSeverityColor(alert.severity)}>
                      {alert.severity}
                    </Badge>
                  </AlertTitle>
                  <AlertDescription>
                    <p>{alert.message}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(alert.timestamp).toLocaleString()}
                    </p>
                  </AlertDescription>
                </Alert>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Footer */}
      {lastUpdated && (
        <div className="text-center text-sm text-muted-foreground">
          Last updated: {lastUpdated.toLocaleString()}
        </div>
      )}
    </div>
  );
}
