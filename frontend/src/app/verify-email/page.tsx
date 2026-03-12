"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { verifyEmail, resendVerification, sendVerificationEmail } from '@/lib/database';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle, XCircle, Loader2, Mail, ArrowLeft } from 'lucide-react';
import logo from '@/assets/growqr-logo.jpg';

export default function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();
  const token = searchParams.get('token');
  const email = searchParams.get('email');

  const [status, setStatus] = useState<'verifying' | 'success' | 'error' | 'pending'>('pending');
  const [errorMessage, setErrorMessage] = useState('');
  const [isResending, setIsResending] = useState(false);

  useEffect(() => {
    if (token) {
      handleVerification();
    }
  }, [token]);

  const handleVerification = async () => {
    if (!token) return;

    setStatus('verifying');
    try {
      const result = await verifyEmail(token);
      if (result.success) {
        setStatus('success');
        // Auto-login after verification
        localStorage.setItem('token', result.token);
        localStorage.setItem('user', JSON.stringify(result.user));
        toast({
          title: "Email verified!",
          description: "Your account is now active. Redirecting to dashboard...",
        });
        setTimeout(() => {
          router.push('/admin/dashboard');
          window.location.reload();
        }, 2000);
      }
    } catch (error) {
      setStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'Verification failed');
    }
  };

  const handleResendVerification = async () => {
    if (!email) {
      toast({
        title: "Email required",
        description: "Please go back to the login page and try again.",
        variant: "destructive"
      });
      return;
    }

    setIsResending(true);
    try {
      const result = await resendVerification(email);
      if (result.success) {
        // Send the verification email
        await sendVerificationEmail(
          email,
          result.first_name,
          result.verification_token,
          window.location.origin
        );
        toast({
          title: "Verification email sent!",
          description: "Please check your inbox for the new verification link.",
        });
      }
    } catch (error) {
      toast({
        title: "Failed to resend",
        description: error instanceof Error ? error.message : 'Please try again later',
        variant: "destructive"
      });
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto">
            <img src={logo.src} alt="GrowQR" className="h-12 w-auto rounded-lg" />
          </div>
          <CardTitle className="text-2xl">Email Verification</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {status === 'verifying' && (
            <div className="text-center space-y-4">
              <Loader2 className="h-16 w-16 text-primary animate-spin mx-auto" />
              <CardDescription className="text-lg">
                Verifying your email address...
              </CardDescription>
            </div>
          )}

          {status === 'success' && (
            <div className="text-center space-y-4">
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
              <CardDescription className="text-lg text-green-600">
                Email verified successfully!
              </CardDescription>
              <p className="text-sm text-muted-foreground">
                Redirecting to your dashboard...
              </p>
            </div>
          )}

          {status === 'error' && (
            <div className="text-center space-y-4">
              <XCircle className="h-16 w-16 text-destructive mx-auto" />
              <CardDescription className="text-lg text-destructive">
                {errorMessage}
              </CardDescription>
              {email && (
                <Button
                  onClick={handleResendVerification}
                  disabled={isResending}
                  variant="outline"
                  className="w-full"
                >
                  {isResending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Mail className="mr-2 h-4 w-4" />
                      Resend verification email
                    </>
                  )}
                </Button>
              )}
              <Link href="/login">
                <Button variant="ghost" className="w-full">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to login
                </Button>
              </Link>
            </div>
          )}

          {status === 'pending' && !token && (
            <div className="text-center space-y-4">
              <Mail className="h-16 w-16 text-primary mx-auto" />
              <CardDescription className="text-lg">
                Check your email
              </CardDescription>
              <p className="text-sm text-muted-foreground">
                We've sent a verification link to <strong>{email || 'your email'}</strong>.
                Click the link to verify your account.
              </p>
              {email && (
                <Button
                  onClick={handleResendVerification}
                  disabled={isResending}
                  variant="outline"
                  className="w-full"
                >
                  {isResending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Mail className="mr-2 h-4 w-4" />
                      Resend verification email
                    </>
                  )}
                </Button>
              )}
              <Link href="/login">
                <Button variant="ghost" className="w-full">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to login
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
