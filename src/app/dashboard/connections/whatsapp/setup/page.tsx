'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useRouter, useSearchParams } from 'next/navigation';

interface BusinessAccount {
  id: string;
  name: string;
}

export default function WhatsAppSetupPage() {
  const [accounts, setAccounts] = useState<BusinessAccount[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<string>('');
  const [phoneNumbers, setPhoneNumbers] = useState<any[]>([]);
  const [selectedPhoneNumber, setSelectedPhoneNumber] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const state = searchParams.get('state');

  useEffect(() => {
    async function fetchAccounts() {
      setLoading(true);
      try {
        const response = await fetch('/api/whatsapp/accounts');
        if (!response.ok) {
          throw new Error('Failed to fetch accounts');
        }
        const data = await response.json();
        setAccounts(data.accounts);
      } catch (error) {
        toast({
          title: 'Error',
          description: 'Failed to fetch WhatsApp Business Accounts.',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    }
    fetchAccounts();
  }, [toast]);

  // Fetch phone numbers when an account is selected
  useEffect(() => {
    async function fetchPhoneNumbers() {
      if (!selectedAccount) return;
      setLoading(true);
      try {
        const response = await fetch(
          `/api/whatsapp/phone-numbers?accountId=${selectedAccount}`
        );
        if (!response.ok) {
          throw new Error('Failed to fetch phone numbers');
        }
        const data = await response.json();
        setPhoneNumbers(data.phoneNumbers);
      } catch (error) {
        toast({
          title: 'Error',
          description: 'Failed to fetch phone numbers for the selected account.',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    }
    fetchPhoneNumbers();
  }, [selectedAccount, toast]);

  const handleConnect = async () => {
    if (!selectedAccount || !selectedPhoneNumber) {
      toast({
        title: 'Error',
        description: 'Please select an account and phone number.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/whatsapp/connect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          accountId: selectedAccount,
          phoneNumberId: selectedPhoneNumber,
          chatbotId: state,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to connect');
      }

      toast({
        title: 'Success',
        description: 'WhatsApp connection successful.',
      });
      router.push('/dashboard/connections');
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to connect WhatsApp account.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Connect WhatsApp</h1>
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Select Business Account</h2>
          <Select onValueChange={setSelectedAccount} value={selectedAccount}>
            <SelectTrigger>
              <SelectValue placeholder="Select an account" />
            </SelectTrigger>
            <SelectContent>
              {accounts.map(account => (
                <SelectItem key={account.id} value={account.id}>
                  {account.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {selectedAccount && (
          <div>
            <h2 className="text-lg font-semibold">Select Phone Number</h2>
            <Select
              onValueChange={setSelectedPhoneNumber}
              value={selectedPhoneNumber}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a phone number" />
              </SelectTrigger>
              <SelectContent>
                {phoneNumbers.map(phone => (
                  <SelectItem key={phone.id} value={phone.id}>
                    {phone.display_phone_number}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        <Button
          onClick={handleConnect}
          disabled={loading || !selectedAccount || !selectedPhoneNumber}
        >
          {loading ? 'Connecting...' : 'Connect'}
        </Button>
      </div>
    </div>
  );
}
