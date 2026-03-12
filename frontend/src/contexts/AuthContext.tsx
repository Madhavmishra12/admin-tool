"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { adminLogin, userLogin, userSignup, sendWelcomeEmail, AuthUser } from '@/lib/database';

interface AuthContextType {
  isAuthenticated: boolean;
  user: AuthUser | { username: string; email: string } | null;
  login: (email: string, password: string) => Promise<{ success: boolean }>;
  signup: (email: string, password: string, firstName?: string, lastName?: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<AuthUser | { username: string; email: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for existing auth token (email/password login)
    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');

    if (token && storedUser) {
      try {
        setUser(JSON.parse(storedUser));
        setIsAuthenticated(true);
      } catch {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
    setLoading(false);
  }, []);

  const login = async (email: string, password: string): Promise<{ success: boolean }> => {
    try {
      const response = await userLogin(email, password);
      if (response && response.token) {
        localStorage.setItem('token', response.token);
        localStorage.setItem('user', JSON.stringify(response.user));
        setIsAuthenticated(true);
        setUser(response.user);
        return { success: true };
      }
      return { success: false };
    } catch (error: any) {
      console.error('Login error:', error);
      return { success: false };
    }
  };

  const signup = async (email: string, password: string, firstName?: string, lastName?: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await userSignup({ email, password, first_name: firstName, last_name: lastName });

      // Auto-login the user after signup
      if (response.token) {
        localStorage.setItem('token', response.token);
        localStorage.setItem('user', JSON.stringify(response.user));
        setIsAuthenticated(true);
        setUser(response.user);
      }

      // Send welcome email asynchronously
      setTimeout(async () => {
        try {
          await sendWelcomeEmail(email, firstName || 'User', 'email');
          console.log('Welcome email sent successfully');
        } catch (error) {
          console.error('Failed to send welcome email:', error);
        }
      }, 0);

      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Signup failed' };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setIsAuthenticated(false);
    setUser(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, login, signup, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
