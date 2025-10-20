'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface TwoFactorSetupProps {
  onComplete: () => void;
  onCancel: () => void;
  mode?: 'setup' | 'disable';
  isEnabled?: boolean;
}

export function TwoFactorSetup({
  onComplete,
  onCancel,
  mode = 'setup',
  isEnabled = false,
}: TwoFactorSetupProps) {
  const [step, setStep] = useState<'init' | 'qr' | 'verify'>('init');
  const [qrCode, setQrCode] = useState<string>('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [verificationCode, setVerificationCode] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const disableTwoFactor = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/auth/2fa/disable', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code: verificationCode,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to disable 2FA');
      }

      toast({
        title: 'Success',
        description: 'Two-factor authentication has been disabled.',
      });
      onComplete();
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to disable 2FA. Please try again.';
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const startSetup = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/auth/2fa/setup', {
        method: 'POST',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Setup failed');
      }

      const data = await response.json();
      setQrCode(data.qrCode);
      setBackupCodes(data.backupCodes);
      setStep('qr');
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to start 2FA setup. Please try again.';
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const verifyAndEnable = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/auth/2fa/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code: verificationCode,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Verification failed');
      }

      toast({
        title: 'Success',
        description: 'Two-factor authentication has been enabled.',
      });
      onComplete();
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : 'Verification failed. Please check your code and try again.';
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (step === 'init') {
    if (mode === 'disable') {
      return (
        <Card className="w-full max-w-md mx-auto">
          <CardHeader>
            <CardTitle>Disable Two-Factor Authentication</CardTitle>
            <CardDescription>
              Enter your current authentication code to disable 2FA for your account.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive">
              <AlertDescription>
                Warning: Disabling 2FA will make your account less secure.
              </AlertDescription>
            </Alert>
            <div className="mt-4">
              <Input
                type="text"
                placeholder="Enter 6-digit code"
                value={verificationCode}
                onChange={e => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                maxLength={6}
              />
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={disableTwoFactor}
              disabled={loading || verificationCode.length !== 6}
            >
              {loading ? 'Disabling...' : 'Disable 2FA'}
            </Button>
          </CardFooter>
        </Card>
      );
    }

    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle>Enable Two-Factor Authentication</CardTitle>
          <CardDescription>
            Add an extra layer of security to your account.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertDescription>
              You'll need an authenticator app like Google Authenticator or Authy.
            </AlertDescription>
          </Alert>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={startSetup} disabled={loading}>
            {loading ? 'Setting up...' : 'Start Setup'}
          </Button>
        </CardFooter>
      </Card>
    );
  }

  if (step === 'qr') {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle>Scan QR Code</CardTitle>
          <CardDescription>Scan this QR code with your authenticator app.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-center">
            <Image src={qrCode} alt="QR Code" width={200} height={200} />
          </div>
          <Alert>
            <AlertDescription>
              Keep these backup codes safe.
            </AlertDescription>
          </Alert>
          <div className="grid grid-cols-2 gap-2">
            {backupCodes.map((code, i) => (
              <code key={i} className="p-2 rounded-lg text-center font-mono">
                {code}
              </code>
            ))}
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="outline" onClick={() => setStep('init')}>
            Back
          </Button>
          <Button onClick={() => setStep('verify')}>Next</Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Verify Setup</CardTitle>
        <CardDescription>
          Enter the verification code from your authenticator app.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Input
          type="text"
          placeholder="Enter 6-digit code"
          value={verificationCode}
          onChange={e => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
          maxLength={6}
        />
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline" onClick={() => setStep('qr')}>
          Back
        </Button>
        <Button
          onClick={verifyAndEnable}
          disabled={loading || verificationCode.length !== 6}
        >
          {loading ? 'Enabling...' : 'Enable 2FA'}
        </Button>
      </CardFooter>
    </Card>
  );
}
