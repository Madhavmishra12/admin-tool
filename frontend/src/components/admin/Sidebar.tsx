"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import {
  Users,
  UserPlus,
  Settings,
  LayoutDashboard,
  LogOut,
  ChevronRight,
  FolderOpen,
  FileText,
  ScrollText,
  Briefcase,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import growqrLogo from '@/assets/growqr-logo.jpg';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

const getNavSections = (isBusinessUser: boolean) => {
  const sections = [
    {
      title: 'ADMIN PANEL',
      items: [
        { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
        ...(isBusinessUser ? [{ to: '/business-dashboard', icon: Briefcase, label: 'Business Dashboard' }] : []),
      ],
    },
    {
      title: 'USER MANAGEMENT',
      items: [
        { to: '/users', icon: Users, label: 'All Users' },
        { to: '/candidates', icon: UserPlus, label: 'Candidates' },
      ],
    },
    {
      title: 'ROLE PLAY',
      items: [
        { to: '/categories', icon: FolderOpen, label: 'Categories' },
        { to: '/use-cases', icon: FileText, label: 'Use Cases' },
      ],
    },
    {
      title: 'SYSTEM',
      items: [
        { to: '/settings', icon: Settings, label: 'Settings' },
        { to: '/logs', icon: ScrollText, label: 'Logs' },
      ],
    },
  ];

  return sections;
};

export default function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const { logout, user } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    window.location.href = '/login';
  };

  // Check if current user is a Business user
  const isBusinessUser = !!(user && (('role' in user && user.role === 'business') || ('user_type' in user && user.user_type === 'business')));
  const navSections = getNavSections(isBusinessUser);

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 h-screen bg-card text-card-foreground flex flex-col transition-all duration-300 z-50 border-r border-border',
        collapsed ? 'w-16' : 'w-60'
      )}
    >
      {/* Logo */}
      <div className="h-16 flex items-center px-4 border-b border-border">
        <div className="flex items-center gap-2 overflow-hidden">
          <img
            src={growqrLogo.src}
            alt="GrowQR"
            className="h-8 object-contain"
          />
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggle}
          className="ml-auto w-6 h-6 hover:bg-muted"
        >
          <ChevronRight className={cn('w-4 h-4 transition-transform', !collapsed && 'rotate-180')} />
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-3 overflow-y-auto scrollbar-thin">
        {navSections.map((section) => (
          <div key={section.title} className="mb-4">
            {!collapsed && (
              <p className="px-3 mb-2 text-[10px] font-semibold text-muted-foreground tracking-wider">
                {section.title}
              </p>
            )}
            <div className="space-y-1">
              {section.items.map((item) => {
                const isActive = pathname === item.to;
                return (
                  <Link
                    key={item.to}
                    href={item.to}
                    className={
                      cn(
                        'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors',
                        isActive
                          ? 'bg-primary text-primary-foreground'
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                      )
                    }
                  >
                    <item.icon className="w-5 h-5 flex-shrink-0" />
                    {!collapsed && <span className="text-sm font-medium">{item.label}</span>}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* User section */}
      <div className="p-3 border-t border-border">
        {!collapsed && user && (
          <div className="flex items-center gap-3 px-3 py-3 mb-2 rounded-xl bg-gradient-to-r from-primary to-primary/80 text-primary-foreground">
            <div className="w-10 h-10 rounded-full bg-primary-foreground/20 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-semibold truncate">
                {user && 'first_name' in user && user.first_name ? user.first_name : user && 'username' in user && user.username ? user.username : 'User'}
              </p>
              <p className="text-xs opacity-80 truncate">
                {user && 'email' in user ? user.email : 'admin@growqr.com'}
              </p>
            </div>
          </div>
        )}
        <Button
          variant="ghost"
          onClick={handleLogout}
          className={cn(
            'w-full text-muted-foreground hover:text-foreground hover:bg-muted',
            collapsed ? 'justify-center px-0' : 'justify-start'
          )}
        >
          <LogOut className="w-5 h-5" />
          {!collapsed && <span className="ml-3 text-sm">Logout</span>}
        </Button>
      </div>
    </aside>
  );
}
