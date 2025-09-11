'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Key, Trash2, Copy, Check } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { User } from '@supabase/supabase-js';

interface ApiKey {
  id: string;
  key_name: string;
  api_key_hash: string; // We only store the hash
  created_at: string;
}

export default function ApiKeyManager() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [newKeyName, setNewKeyName] = useState('');
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const fetchUserAndKeys = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUser(user);
        fetchApiKeys(user.id);
      } else {
        setLoading(false);
      }
    };
    fetchUserAndKeys();
  }, []);

  const fetchApiKeys = async (userId: string) => {
    setLoading(true);
    const { data, error } = await supabase
      .from('api_keys')
      .select('*')
      .eq('user_id', userId);

    if (error) {
      console.error('Error fetching API keys:', error);
    } else {
      setKeys(data);
    }
    setLoading(false);
  };

  const handleGenerateKey = async () => {
    if (!newKeyName.trim() || !user) return;

    // In a real implementation, this would call a secure backend endpoint
    // that generates the key, hashes it, and stores the hash.
    // For now, we'll simulate this.
    const newKey = `sk-${[...Array(32)].map(() => Math.random().toString(36)[2]).join('')}`;
    setGeneratedKey(newKey);

    // Simulate saving the hash
    const newKeyData: ApiKey = {
      id: crypto.randomUUID(),
      key_name: newKeyName,
      api_key_hash: 'simulated_hash_of_' + newKey,
      created_at: new Date().toISOString(),
    };

    setKeys([...keys, newKeyData]);
    setNewKeyName('');
  };

  const handleDeleteKey = async (keyId: string) => {
    if (!confirm('Are you sure you want to delete this API key?')) return;

    // Simulate deletion
    setKeys(keys.filter(key => key.id !== keyId));
  };

  const handleCopy = (key: string) => {
    navigator.clipboard.writeText(key);
    setCopied(true);
    setTimeout(() => {
      setCopied(false);
      setGeneratedKey(null); // Hide the key after copying
    }, 2000);
  };

  return (
    <Card className="glass-card p-8 rounded-2xl animate-slide-up">
      <CardHeader>
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-10 h-10 bg-yellow-600 rounded-lg flex items-center justify-center">
            <Key className="w-5 h-5 text-white" />
          </div>
          <h3 className="text-xl font-semibold">API Keys</h3>
        </div>
        <CardDescription>
          Manage API keys for programmatic access to your agents.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <h4 className="font-medium mb-4">Your API Keys</h4>
          <div className="border border-gray-700 rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Key (Hashed)</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={4} className="text-center">Loading...</TableCell></TableRow>
                ) : keys.length === 0 ? (
                  <TableRow><TableCell colSpan={4} className="text-center">No API keys found.</TableCell></TableRow>
                ) : (
                  keys.map(key => (
                    <TableRow key={key.id}>
                      <TableCell>{key.key_name}</TableCell>
                      <TableCell className="font-mono">...{key.api_key_hash.slice(-4)}</TableCell>
                      <TableCell>{new Date(key.created_at).toLocaleDateString()}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="destructive" size="icon" onClick={() => handleDeleteKey(key.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        {generatedKey && (
          <div className="bg-green-500/10 border border-green-500/20 p-4 rounded-lg space-y-2">
            <p className="text-sm text-green-400">
              Your new API key has been generated. Please copy and store it securely. You will not be able to see it again.
            </p>
            <div className="relative bg-gray-900 rounded-md p-2 font-mono text-sm">
              <code>{generatedKey}</code>
              <Button
                size="icon"
                variant="ghost"
                className="absolute top-1 right-1 h-7 w-7"
                onClick={() => handleCopy(generatedKey)}
              >
                {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        )}

        <div>
          <h4 className="font-medium mb-4">Create New API Key</h4>
          <div className="flex items-center space-x-2">
            <Input
              type="text"
              placeholder="Enter a name for the key..."
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              className="bg-bg-tertiary border-gray-600"
            />
            <Button onClick={handleGenerateKey} disabled={!newKeyName.trim()}>
              Generate Key
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
