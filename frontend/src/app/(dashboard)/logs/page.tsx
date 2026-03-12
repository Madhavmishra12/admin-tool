"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollText, Clock, User, Activity } from 'lucide-react';

const logs = [
  { id: 1, action: 'User Login', user: 'admin@growqr.com', timestamp: '2025-12-11 11:02:44', type: 'info' },
  { id: 2, action: 'New User Created', user: 'admin@growqr.com', timestamp: '2025-12-11 10:45:12', type: 'success' },
  { id: 3, action: 'Category Updated', user: 'admin@growqr.com', timestamp: '2025-12-11 10:30:00', type: 'info' },
  { id: 4, action: 'Use Case Deleted', user: 'admin@growqr.com', timestamp: '2025-12-11 10:15:33', type: 'warning' },
  { id: 5, action: 'Settings Changed', user: 'admin@growqr.com', timestamp: '2025-12-11 09:50:21', type: 'info' },
  { id: 6, action: 'Bulk Upload Completed', user: 'admin@growqr.com', timestamp: '2025-12-11 09:30:00', type: 'success' },
];

const typeColors: Record<string, string> = {
  info: 'bg-info/10 text-info',
  success: 'bg-success/10 text-success',
  warning: 'bg-warning/10 text-warning',
  error: 'bg-destructive/10 text-destructive',
};

export default function LogsPage() {
  return (
    <div className="p-6 lg:p-8 animate-fade-in">
      <div className="mb-6">
        <h1 className="text-2xl lg:text-3xl font-bold text-foreground">System Logs</h1>
        <p className="text-muted-foreground mt-1">View all system activities and events</p>
      </div>

      <Card className="shadow-soft border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <ScrollText className="w-5 h-5" />
            Activity Log
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {logs.map((log) => (
              <div
                key={log.id}
                className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className={`p-2.5 rounded-lg ${typeColors[log.type]}`}>
                    <Activity className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{log.action}</p>
                    <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <User className="w-3.5 h-3.5" />
                        {log.user}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {log.timestamp}
                      </span>
                    </div>
                  </div>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${typeColors[log.type]}`}>
                  {log.type}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
