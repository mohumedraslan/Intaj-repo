'use client';

import { useState } from 'react';
import { TwoFactorSetup } from '@/components/security/TwoFactorSetup';

export default function TwoFactorTestPage() {
  const [setupComplete, setSetupComplete] = useState(false);

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-md mx-auto">
        <h1 className="text-2xl font-bold mb-8">2FA Implementation Test</h1>

        {!setupComplete ? (
          <TwoFactorSetup
            onComplete={() => {
              setSetupComplete(true);
              console.log('2FA setup completed');
            }}
            onCancel={() => {
              console.log('2FA setup cancelled');
            }}
          />
        ) : (
          <div className="p-4 bg-green-600/20 border border-green-500 rounded-lg">
            <h2 className="text-lg font-semibold text-green-400 mb-2">2FA Setup Complete!</h2>
            <p className="text-sm text-gray-300">
              Two-factor authentication has been successfully enabled for your account. Try logging
              out and back in to test the 2FA flow.
            </p>
            <button
              onClick={() => setSetupComplete(false)}
              className="mt-4 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              Start Over
            </button>
          </div>
        )}

        <div className="mt-8 p-4 border border-gray-700 rounded-lg">
          <h3 className="font-semibold mb-2">Test Instructions:</h3>
          <ol className="list-decimal list-inside space-y-2 text-sm text-gray-300">
            <li>Click &quot;Start Setup&quot; to begin the 2FA configuration</li>
            <li>Use Google Authenticator or any TOTP app to scan the QR code</li>
            <li>Save the backup codes somewhere safe</li>
            <li>Enter the 6-digit code from your authenticator app</li>
            <li>Verify that you see the success message</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
