'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, AreaChart, Area, RadialBarChart, RadialBar, Legend } from 'recharts';
import { TrendingUp, TrendingDown, Users, MessageSquare, Clock, Target, Activity, Zap, Calendar, Filter, Download, RefreshCw, AlertTriangle, CheckCircle, XCircle, Minus } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import AdvancedAnalyticsDashboard from '@/components/analytics/AdvancedAnalyticsDashboard';

export default function AnalyticsPage() {
  const searchParams = useSearchParams();
  const agentId = searchParams?.get('agent') || null;

  return (
    <div className="w-full min-h-screen bg-[#0a0a0b] text-white p-6">
      <div className="max-w-7xl mx-auto">
        <AdvancedAnalyticsDashboard agentId={agentId} />
      </div>
    </div>
  );
}
