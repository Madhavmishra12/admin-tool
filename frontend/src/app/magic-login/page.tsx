"use client";

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { verifyMagicLink } from '@/lib/database';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import growqrLogo from '@/assets/growqr-logo.jpg';

export default function MagicLoginPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const token = searchParams.get('token');

    if (!token) {
      setStatus('error');
      setErrorMessage('Invalid login link. Please request a new one.');
      return;
    }

    verifyMagicToken(token);
  }, [searchParams]);

  const verifyMagicToken = async (token: string) => {
    try {
      const result = await verifyMagicLink(token);

      if (result.success && result.user) {
        // Store auth token and user info
        localStorage.setItem('token', result.token);
        localStorage.setItem('user', JSON.stringify(result.user));

        setStatus('success');
        toast({
          title: 'Welcome!',
          description: 'You have been logged in successfully.',
        });

        // Redirect to dashboard after a short delay
        setTimeout(() => {
          router.push('/');
        }, 2000);
      } else {
        setStatus('error');
        setErrorMessage(result.message || 'Login link has expired or is invalid.');
      }
    } catch (error) {
      setStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'Failed to verify login link.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted p-4">
      <div className="w-full max-w-md">
        <div className="bg-card rounded-xl shadow-medium p-8 border border-border text-center">
          <img
            src={growqrLogo.src}
            alt="GrowQR Logo"
            className="w-32 h-32 mx-auto mb-6 rounded-lg"
          />

          {status === 'loading' && (
            <>
              <Loader2 className="w-12 h-12 mx-auto mb-4 text-primary animate-spin" />
              <h1 className="text-xl font-semibold text-foreground mb-2">
                Verifying your login link...
              </h1>
              <p className="text-muted-foreground">
                Please wait while we log you in.
              </p>
            </>
          )}

          {status === 'success' && (
            <>
              <CheckCircle className="w-12 h-12 mx-auto mb-4 text-green-500" />
              <h1 className="text-xl font-semibold text-foreground mb-2">
                Login Successful!
              </h1>
              <p className="text-muted-foreground mb-4">
                Redirecting you to the dashboard...
              </p>
              <Loader2 className="w-6 h-6 mx-auto text-primary animate-spin" />
            </>
          )}

          {status === 'error' && (
            <>
              <XCircle className="w-12 h-12 mx-auto mb-4 text-destructive" />
              <h1 className="text-xl font-semibold text-foreground mb-2">
                Login Failed
              </h1>
              <p className="text-muted-foreground mb-6">
                {errorMessage}
              </p>
              <Button
                onClick={() => router.push('/login')}
                className="bg-sidebar text-sidebar-foreground hover:bg-sidebar/90"
              >
                Go to Login Page
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
