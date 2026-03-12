"use client";

import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Eye, EyeOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { forgotPassword, sendPasswordResetEmail, generateMagicLink } from '@/lib/database';
import growqrLogo from '@/assets/growqr-logo.jpg';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [isMagicLink, setIsMagicLink] = useState(false);
  const [magicLink, setMagicLink] = useState('');
  const { login, signup } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (isForgotPassword) {
      try {
        const result = await forgotPassword(email);
        if (result.reset_token && result.email) {
          // Send password reset email
          await sendPasswordResetEmail(
            result.email,
            result.first_name || 'User',
            result.reset_token,
            window.location.origin
          );
          toast({
            title: 'Reset Link Sent',
            description: 'Check your email for the password reset link.',
          });
        } else {
          toast({
            title: 'Reset Link Sent',
            description: 'If an account exists with this email, you will receive a reset link.',
          });
        }
        setIsForgotPassword(false);
        setEmail('');
      } catch (error) {
        toast({
          title: 'Password reset failed',
          description: error instanceof Error ? error.message : 'Failed to send reset request',
          variant: 'destructive',
        });
      }
      setLoading(false);
      return;
    }

    if (isMagicLink) {
      try {
        const result = await generateMagicLink(email);
        if (result.success) {
          const link = `${window.location.origin}/magic-login?token=${result.token}`;
          setMagicLink(link);
          toast({
            title: 'Magic Link Generated',
            description: 'Your login link is ready below.',
          });
        }
      } catch (error) {
        toast({
          title: 'Magic Link failed',
          description: error instanceof Error ? error.message : 'Failed to generate link',
          variant: 'destructive',
        });
      }
      setLoading(false);
      return;
    }

    if (isSignUp) {
      const result = await signup(email, password, firstName, lastName);
      if (result.success) {
        toast({
          title: 'Account created!',
          description: 'Welcome to GrowQR. Check your email for a welcome message.',
        });
        router.push('/');
      } else {
        const isEmailExists = result.error?.toLowerCase().includes('already exists');
        toast({
          title: isEmailExists ? 'Email already registered' : 'Sign up failed',
          description: isEmailExists
            ? 'This email is already registered. Please sign in instead.'
            : (result.error || 'Failed to create account'),
          variant: 'destructive',
        });
        if (isEmailExists) {
          setIsSignUp(false);
        }
      }
    } else {
      try {
        const result = await login(email, password);
        if (result.success) {
          toast({
            title: 'Welcome back!',
            description: 'You have been signed in successfully.',
          });
          router.push('/');
        } else {
          toast({
            title: 'Login failed',
            description: 'Invalid email or password.',
            variant: 'destructive',
          });
        }
      } catch (error) {
        toast({
          title: 'Connection error',
          description: 'Unable to connect. Please check your internet and try again.',
          variant: 'destructive',
        });
      }
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen flex bg-muted">
      {/* Left side - Logo */}
      <div className="hidden lg:flex lg:w-1/2 items-center justify-center p-12">
        <div className="animate-fade-in">
          <img
            src={growqrLogo.src}
            alt="GrowQR Logo"
            className="max-w-md w-full"
          />
        </div>
      </div>

      {/* Right side - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md animate-slide-in-up">
          <div className="bg-card rounded-xl shadow-medium p-8 border border-border">
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold text-foreground">
                {isForgotPassword
                  ? 'Reset Password'
                  : isSignUp
                    ? 'Create Account'
                    : isMagicLink
                      ? 'Magic Link Login'
                      : 'Welcome Back'}
              </h1>
              <p className="text-muted-foreground mt-2">
                {isForgotPassword
                  ? 'Enter your email to reset your password'
                  : isSignUp
                    ? 'Sign up to get started with GrowQR'
                    : isMagicLink
                      ? 'Enter your email to receive a login link'
                      : 'Sign in to your account'}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  className="h-11"
                />
              </div>

              {/* Show name fields only on signup */}
              {isSignUp && !isForgotPassword && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name</Label>
                    <Input
                      id="firstName"
                      type="text"
                      placeholder="Enter your first name"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input
                      id="lastName"
                      type="text"
                      placeholder="Enter your last name"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="h-11"
                    />
                  </div>
                </>
              )}

              {/* Hide password field on forgot password or magic link */}
              {!isForgotPassword && !isMagicLink && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Password</Label>
                    {!isSignUp && (
                      <button
                        type="button"
                        onClick={() => setIsForgotPassword(true)}
                        className="text-xs text-primary hover:underline"
                      >
                        Forgot password?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      autoComplete={isSignUp ? 'new-password' : 'current-password'}
                      className="h-11 pr-10"
                      minLength={isSignUp ? 6 : undefined}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}

              <Button
                type="submit"
                className="w-full h-11 bg-sidebar text-sidebar-foreground hover:bg-sidebar/90"
                disabled={loading}
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isForgotPassword
                  ? 'Send Reset Link'
                  : isSignUp
                    ? 'Create Account'
                    : isMagicLink
                      ? 'Get Magic Link'
                      : 'Sign In'}
              </Button>
            </form>

            {magicLink && (
              <div className="mt-6 p-4 bg-primary/10 rounded-lg border border-primary/20 animate-fade-in">
                <p className="text-xs font-semibold text-primary mb-2 uppercase tracking-wider">Your Magic Link (Simulated)</p>
                <a
                  href={magicLink}
                  className="text-sm font-medium text-primary break-all hover:underline block"
                >
                  {magicLink}
                </a>
                <p className="text-[10px] text-muted-foreground mt-2 italic">
                  In a production app, this would be sent to your inbox.
                </p>
              </div>
            )}

            <div className="mt-6 text-center">
              {isForgotPassword ? (
                <p className="text-sm text-muted-foreground">
                  Remember your password?{' '}
                  <button
                    type="button"
                    onClick={() => setIsForgotPassword(false)}
                    className="text-primary hover:underline font-medium"
                  >
                    Back to Sign In
                  </button>
                </p>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
                    <button
                      type="button"
                      onClick={() => {
                        setIsSignUp(!isSignUp);
                        setIsMagicLink(false);
                        setMagicLink('');
                      }}
                      className="text-primary hover:underline font-medium"
                    >
                      {isSignUp ? 'Sign In' : 'Sign Up'}
                    </button>
                  </p>

                  {!isSignUp && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsMagicLink(!isMagicLink);
                        setMagicLink('');
                      }}
                      className="text-sm text-primary hover:underline"
                    >
                      {isMagicLink ? 'Back to Password Sign In' : 'Sign in with Magic Link'}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
