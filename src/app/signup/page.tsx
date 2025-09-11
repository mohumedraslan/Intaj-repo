'use client';

import AuthPage from '@/app/auth/page';
import { Suspense } from 'react';

function Signup() {
  // Render the AuthPage component in "sign up" mode.
  return <AuthPage initialIsSignIn={false} />;
}

// Wrap with Suspense for any client-side data fetching that might be added later.
export default function SignupPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <Signup />
    </Suspense>
  );
}
