'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';


interface ToastProps {
  title: string;
  description: string;
  variant?: 'default' | 'destructive';
}

// Temporary mock components until we set up shadcn/ui
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const Input = ({ value, onChange, className = '', ...props }: InputProps) => (
  <input
    {...props}
    value={value}
    onChange={onChange}
    className={`w-full px-3 py-2 border rounded-md ${className}`}
  />
);

const Alert = ({ children }: { children: React.ReactNode }) => (
  <div className="p-4 mb-4 text-sm border rounded-md bg-yellow-50 border-yellow-200">
    {children}
  </div>
);

const AlertDescription = ({ children }: { children: React.ReactNode }) => (
  <div>{children}</div>
);

const Card = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div className={`glass-card rounded-2xl border border-blue-100 shadow-xl ${className}`}>
    {children}
  </div>
);

const CardHeader = ({ children }: { children: React.ReactNode }) => (
  <div className="px-6 py-4 border-b">{children}</div>
);

const CardTitle = ({ children }: { children: React.ReactNode }) => (
  <h3 className="text-lg font-semibold">{children}</h3>
);

const CardDescription = ({ children }: { children: React.ReactNode }) => (
  <p className="mt-1 text-sm text-gray-600">{children}</p>
);

const CardContent = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div className={`px-6 py-4 ${className}`}>{children}</div>
);

const CardFooter = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div className={`px-6 py-4 bg-gray-50 ${className}`}>{children}</div>
);

const useToast = () => ({
  toast: ({ title, description, variant = 'default' }: ToastProps) => {
    // Temporary implementation - replace with actual toast implementation
    console.log(`Toast: ${variant} - ${title}: ${description}`);
  }
});

interface TwoFactorSetupProps {
  onComplete: () => void;
  onCancel: () => void;
}

export function TwoFactorSetup({ onComplete, onCancel }: TwoFactorSetupProps) {
  const [step, setStep] = useState<'init' | 'qr' | 'verify'>('init');
  const [qrCode, setQrCode] = useState<string>('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [verificationCode, setVerificationCode] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const startSetup = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/auth/2fa/setup');
      if (!response.ok) throw new Error('Setup failed');
      
      const data = await response.json();
      setQrCode(data.qrCode);
      setBackupCodes(data.backupCodes);
      setStep('qr');
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to start 2FA setup. Please try again.';
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive'
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: verificationCode })
      });

      if (!response.ok) throw new Error('Verification failed');
      
      toast({
        title: 'Success',
        description: 'Two-factor authentication has been enabled.'
      });
      onComplete();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Verification failed. Please check your code and try again.';
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  if (step === 'init') {
    return (
      <Card className="w-full max-w-md mx-auto p-8 bg-gradient-to-br from-blue-50 via-white to-blue-100">
        <CardHeader>
          <CardTitle>
            <span className="text-gradient text-2xl font-bold">Enable Two-Factor Authentication</span>
          </CardTitle>
          <CardDescription>
            <span className="text-gray-600">Add an extra layer of security to your account by requiring both your password and an authentication code.</span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertDescription>
              <span className="text-blue-700 font-medium">You&apos;ll need an authenticator app like Google Authenticator or Authy to complete this setup.</span>
            </AlertDescription>
          </Alert>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="destructive" onClick={onCancel} className="px-6 py-2 rounded-lg font-bold">Cancel</Button>
          <Button variant="default" onClick={startSetup} disabled={loading} className="px-6 py-2 rounded-lg font-bold bg-gradient-to-r from-blue-500 to-purple-600 text-white">
            {loading ? 'Setting up...' : 'Start Setup'}
          </Button>
        </CardFooter>
      </Card>
    );
  }

  if (step === 'qr') {
    return (
      <Card className="w-full max-w-md mx-auto p-8 bg-gradient-to-br from-blue-50 via-white to-blue-100">
        <CardHeader>
          <CardTitle>
            <span className="text-gradient text-2xl font-bold">Scan QR Code</span>
          </CardTitle>
          <CardDescription>
            <span className="text-gray-600">Scan this QR code with your authenticator app.</span>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-center">
            <Image
              src={qrCode}
              alt="QR Code"
              width={200}
              height={200}
              className="border-2 border-blue-200 rounded-xl p-2 bg-white shadow-lg"
            />
          </div>
          <Alert>
            <AlertDescription>
              <span className="text-blue-700 font-medium">Keep these backup codes safe. You can use them to access your account if you lose your authenticator device.</span>
            </AlertDescription>
          </Alert>
          <div className="grid grid-cols-2 gap-2">
            {backupCodes.map((code, i) => (
              <code key={i} className="bg-gradient-to-r from-blue-100 to-purple-100 p-2 rounded-lg text-center font-mono text-blue-700 shadow">
                {code}
              </code>
            ))}
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="destructive" onClick={() => setStep('init')} className="px-6 py-2 rounded-lg font-bold">Back</Button>
          <Button variant="default" onClick={() => setStep('verify')} className="px-6 py-2 rounded-lg font-bold bg-gradient-to-r from-blue-500 to-purple-600 text-white">Next</Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto p-8 bg-gradient-to-br from-blue-50 via-white to-blue-100">
      <CardHeader>
        <CardTitle>
          <span className="text-gradient text-2xl font-bold">Verify Setup</span>
        </CardTitle>
        <CardDescription>
          <span className="text-gray-600">Enter the verification code from your authenticator app.</span>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Input
          type="text"
          placeholder="Enter 6-digit code"
          value={verificationCode}
          onChange={e => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
          className="font-mono text-center text-lg border-2 border-blue-500 rounded-xl bg-white shadow-lg text-blue-900 placeholder-blue-400 focus:border-purple-500 focus:bg-blue-50"
          maxLength={6}
        />
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="destructive" onClick={() => setStep('qr')} className="px-6 py-2 rounded-lg font-bold">Back</Button>
        <Button 
          variant="default"
          onClick={verifyAndEnable} 
          disabled={loading || verificationCode.length !== 6}
          className="px-6 py-2 rounded-lg font-bold bg-gradient-to-r from-blue-500 to-purple-600 text-white"
        >
          {loading ? 'Enabling...' : 'Enable 2FA'}
        </Button>
      </CardFooter>
    </Card>
  );
}
