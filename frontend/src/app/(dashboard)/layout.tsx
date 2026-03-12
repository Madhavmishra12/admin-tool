"use client";

import React, { useState, useEffect } from 'react';
import Sidebar from '@/components/admin/Sidebar';
import { cn } from '@/lib/utils';
import { Bell, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import AdminChatbot from '@/components/admin/AdminChatbot';
import { useRouter } from 'next/navigation';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const { user, isAuthenticated, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading && !isAuthenticated) {
            router.push('/login');
        }
    }, [isAuthenticated, loading, router]);

    if (loading || !isAuthenticated) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    const today = new Date().toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });

    return (
        <div className="min-h-screen bg-background">
            <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />

            {/* Top Header */}
            <header
                className={cn(
                    'fixed top-0 right-0 h-16 bg-card border-b border-border flex items-center justify-between px-6 z-40 transition-all duration-300',
                    sidebarCollapsed ? 'left-16' : 'left-60'
                )}
            >
                <div>
                    <h2 className="font-semibold text-foreground">GrowQR Admin</h2>
                    <p className="text-sm text-muted-foreground">{today}</p>
                </div>

                <div className="flex items-center gap-4">
                    {/* Stats */}
                    <div className="hidden md:flex items-center gap-6 mr-4">
                        <div className="text-center">
                            <p className="text-xs text-muted-foreground">Online Users</p>
                            <p className="font-semibold text-foreground">89</p>
                        </div>
                        <div className="text-center border-l border-border pl-6">
                            <p className="text-xs text-muted-foreground">Active Sessions</p>
                            <p className="font-semibold text-foreground">156</p>
                        </div>
                    </div>

                    {/* Notifications */}
                    <Button variant="ghost" size="icon" className="relative">
                        <Bell className="w-5 h-5" />
                        <span className="absolute top-1 right-1 w-2 h-2 bg-destructive rounded-full" />
                    </Button>

                    {/* User dropdown */}
                    <div className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity">
                        <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-semibold text-sm">
                            {user && 'first_name' in user && user.first_name ? user.first_name.charAt(0).toUpperCase() : user && 'username' in user && user.username ? user.username.charAt(0).toUpperCase() : 'A'}
                        </div>
                        <div className="hidden sm:block">
                            <p className="text-sm font-medium text-foreground">
                                {user && 'first_name' in user && user.first_name ? user.first_name : user && 'username' in user && user.username ? user.username : 'Admin'}
                            </p>
                            <p className="text-xs text-muted-foreground">{user && 'email' in user ? user.email : 'admin@growqr.com'}</p>
                        </div>
                        <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    </div>
                </div>
            </header>

            <main
                className={cn(
                    'min-h-screen pt-16 transition-all duration-300',
                    sidebarCollapsed ? 'ml-16' : 'ml-60'
                )}
            >
                {children}
            </main>

            {/* AI Chatbot */}
            <AdminChatbot />
        </div>
    );
}
