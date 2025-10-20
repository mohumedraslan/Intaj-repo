'use client';

import { useState } from 'react';
import { TwoFactorSetup } from '@/components/security/TwoFactorSetup';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';

export default function SecurityPage() {
  const [showSetup, setShowSetup] = useState(false);
  const [isEnabled, setIsEnabled] = useState(false); // In a real app, get this from user profile
  const { toast } = useToast();

  const handleComplete = () => {
    setShowSetup(false);
    setIsEnabled(true);
    toast({ title: 'Success', description: '2FA setup complete.' });
  };

  const handleCancel = () => {
    setShowSetup(false);
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Security Settings</h1>
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Two-Factor Authentication (2FA)</h2>
          <p className="text-sm text-gray-500">
            {isEnabled
              ? '2FA is currently enabled on your account.'
              : 'Add an extra layer of security to your account.'}
          </p>
          <Button onClick={() => setShowSetup(true)} className="mt-2">
            {isEnabled ? 'Disable 2FA' : 'Enable 2FA'}
          </Button>
        </div>
      </div>

      {showSetup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <TwoFactorSetup
            onComplete={handleComplete}
            onCancel={handleCancel}
            mode={isEnabled ? 'disable' : 'setup'}
          />
        </div>
      )}
    </div>
  );
}
