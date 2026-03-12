"use client";

import React, { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Eye, EyeOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { updatePassword } from '@/lib/database';
import growqrLogo from '@/assets/growqr-logo.jpg';

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();

  const resetToken = searchParams.get('token');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!resetToken) {
      toast({
        title: 'Invalid Reset Link',
        description: 'Please request a new password reset link.',
        variant: 'destructive',
      });
      return;
    }

    if (password !== confirmPassword) {
      toast({
        title: 'Passwords do not match',
        description: 'Please make sure both passwords are the same.',
        variant: 'destructive',
      });
      return;
    }

    if (password.length < 6) {
      toast({
        title: 'Password too short',
        description: 'Password must be at least 6 characters.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      await updatePassword({ new_password: password, reset_token: resetToken });
      toast({
        title: 'Password updated!',
        description: 'Your password has been successfully updated. Please sign in.',
      });
      router.push('/login');
    } catch (error) {
      toast({
        title: 'Password update failed',
        description: error instanceof Error ? error.message : 'Failed to update password',
        variant: 'destructive',
      });
    }

    setLoading(false);
  };

  if (!resetToken) {
    return (
      <div className="min-h-screen flex bg-muted items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="bg-card rounded-xl shadow-medium p-8 border border-border text-center">
            <h1 className="text-2xl font-bold text-foreground mb-4">Invalid Reset Link</h1>
            <p className="text-muted-foreground mb-6">
              This password reset link is invalid or has expired.
            </p>
            <Button onClick={() => router.push('/login')} className="w-full">
              Back to Sign In
            </Button>
          </div>
        </div>
      </div>
    );
  }

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

      {/* Right side - Reset Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md animate-slide-in-up">
          <div className="bg-card rounded-xl shadow-medium p-8 border border-border">
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold text-foreground">
                Create New Password
              </h1>
              <p className="text-muted-foreground mt-2">
                Enter your new password below
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="password">New Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter new password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="new-password"
                    className="h-11 pr-10"
                    minLength={6}
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

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                  className="h-11"
                  minLength={6}
                />
              </div>
              
              <Button 
                type="submit" 
                className="w-full h-11 bg-sidebar text-sidebar-foreground hover:bg-sidebar/90" 
                disabled={loading}
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Update Password
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-muted-foreground">
                Remember your password?{' '}
                <button
                  type="button"
                  onClick={() => router.push('/login')}
                  className="text-primary hover:underline font-medium"
                >
                  Back to Sign In
                </button>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
