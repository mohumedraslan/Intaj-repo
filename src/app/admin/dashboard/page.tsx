'use client';

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Shield, AlertCircle } from 'lucide-react';

type User = {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
  subscription_tier: string | null;
};

export default function AdminDashboard() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const rowsPerPage = 10;
  
  const supabase = createClientComponentClient();

  useEffect(() => {
    async function fetchUsers() {
      try {
        setLoading(true);
        
        // Count total users for pagination
        const { count, error: countError } = await supabase
          .from('users')
          .select('*', { count: 'exact', head: true });
          
        if (countError) throw countError;
        
        if (count) {
          setTotalPages(Math.ceil(count / rowsPerPage));
        }
        
        // Fetch users with pagination
        const { data, error: fetchError } = await supabase
          .from('users')
          .select('id, email, created_at, last_sign_in_at, subscription_tier')
          .range((page - 1) * rowsPerPage, page * rowsPerPage - 1)
          .order('created_at', { ascending: false });

        if (fetchError) throw fetchError;
        
        setUsers(data || []);
      } catch (err) {
        console.error('Error fetching users:', err);
        setError('Failed to load users. Please try again.');
      } finally {
        setLoading(false);
      }
    }

    fetchUsers();
  }, [supabase, page]);

  const handleChangePage = (event: React.ChangeEvent<unknown>, value: number) => {
    setPage(value);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className="w-full min-h-screen bg-[#0a0a0b] text-white p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center space-x-4 mb-6">
          <Shield className="h-8 w-8 text-blue-500" />
          <h1 className="text-3xl font-bold">
            <span className="bg-gradient-to-r from-blue-500 via-purple-500 to-cyan-400 bg-clip-text text-transparent">
              Admin Dashboard
            </span>
          </h1>
        </div>

        <Card className="bg-[rgba(31,32,36,0.8)] backdrop-blur-lg border border-gray-600/50">
          <CardHeader>
            <CardTitle className="text-xl font-semibold">User Management</CardTitle>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-md p-4 mb-6 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-red-500" />
                <span className="text-red-400">{error}</span>
              </div>
            )}

            {loading ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                <span className="ml-2 text-gray-400">Loading users...</span>
              </div>
            ) : (
              <>
                <div className="rounded-md border border-gray-600">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-gray-600">
                        <TableHead className="text-gray-300">Email</TableHead>
                        <TableHead className="text-gray-300">Sign-up Date</TableHead>
                        <TableHead className="text-gray-300">Last Sign In</TableHead>
                        <TableHead className="text-gray-300">Subscription</TableHead>
                        <TableHead className="text-gray-300 text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map((user) => (
                        <TableRow key={user.id} className="border-gray-600">
                          <TableCell className="text-white">{user.email}</TableCell>
                          <TableCell className="text-gray-300">{formatDate(user.created_at)}</TableCell>
                          <TableCell className="text-gray-300">{formatDate(user.last_sign_in_at)}</TableCell>
                          <TableCell>
                            <Badge 
                              variant={user.subscription_tier ? 'default' : 'secondary'}
                              className={user.subscription_tier ? 'bg-blue-600' : ''}
                            >
                              {user.subscription_tier || 'Free'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button 
                              disabled
                              className="text-xs px-3 py-1 opacity-50 cursor-not-allowed"
                              title="Coming Soon"
                            >
                              Impersonate
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                
                {totalPages > 1 && (
                  <div className="flex justify-center mt-6">
                    <div className="flex items-center space-x-2">
                      <Button
                        onClick={() => setPage(Math.max(1, page - 1))}
                        disabled={page === 1}
                        className="px-3 py-1 text-sm"
                      >
                        Previous
                      </Button>
                      <span className="text-gray-400 text-sm">
                        Page {page} of {totalPages}
                      </span>
                      <Button
                        onClick={() => setPage(Math.min(totalPages, page + 1))}
                        disabled={page === totalPages}
                        className="px-3 py-1 text-sm"
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}