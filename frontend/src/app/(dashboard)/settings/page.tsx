"use client";

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';

export default function SettingsPage() {
  const { toast } = useToast();

  const handleSave = () => {
    toast({
      title: 'Settings Saved',
      description: 'Your preferences have been updated.',
    });
  };

  return (
    <div className="p-6 lg:p-8 animate-fade-in">
      <div className="mb-6">
        <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your application preferences</p>
      </div>

      <div className="space-y-6 max-w-2xl">
        <Card className="shadow-soft border-border">
          <CardHeader>
            <CardTitle>General Settings</CardTitle>
            <CardDescription>Configure general application settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="app-name">Application Name</Label>
              <Input id="app-name" defaultValue="GrowQR Admin" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="api-url">API Base URL</Label>
              <Input id="api-url" defaultValue="http://localhost:8000/api" />
              <p className="text-xs text-muted-foreground">
                Configure the FastAPI backend URL
              </p>
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <Label>Enable Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Receive in-app notifications for important events
                </p>
              </div>
              <Switch defaultChecked />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Auto-refresh Data</Label>
                <p className="text-sm text-muted-foreground">
                  Automatically refresh table data every 30 seconds
                </p>
              </div>
              <Switch />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-soft border-border">
          <CardHeader>
            <CardTitle>Database Connection</CardTitle>
            <CardDescription>MySQL connection settings (for reference)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="db-host">Host</Label>
                <Input id="db-host" defaultValue="localhost" disabled />
              </div>
              <div className="space-y-2">
                <Label htmlFor="db-port">Port</Label>
                <Input id="db-port" defaultValue="3306" disabled />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="db-name">Database Name</Label>
              <Input id="db-name" defaultValue="growqr_admin" disabled />
            </div>
            <p className="text-xs text-muted-foreground">
              Database settings are configured via environment variables on the backend.
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-soft border-border">
          <CardHeader>
            <CardTitle>Security</CardTitle>
            <CardDescription>Security and authentication settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Two-Factor Authentication</Label>
                <p className="text-sm text-muted-foreground">
                  Add an extra layer of security to your account
                </p>
              </div>
              <Switch />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Session Timeout</Label>
                <p className="text-sm text-muted-foreground">
                  Automatically log out after 30 minutes of inactivity
                </p>
              </div>
              <Switch defaultChecked />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Button variant="outline">Cancel</Button>
          <Button onClick={handleSave}>Save Changes</Button>
        </div>
      </div>
    </div>
  );
}
