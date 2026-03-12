"use client";

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { User } from '@/lib/mockData';
import { Mail, Phone, MapPin, Calendar, X } from 'lucide-react';

interface UserDetailModalProps {
  user: User | null;
  open: boolean;
  onClose: () => void;
}

export default function UserDetailModal({ user, open, onClose }: UserDetailModalProps) {
  if (!user) return null;

  const statusColors = {
    active: 'bg-success/10 text-success border-success/20',
    pending: 'bg-warning/10 text-warning border-warning/20',
    inactive: 'bg-muted text-muted-foreground border-border',
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>User Details</DialogTitle>
        </DialogHeader>

        <div className="pt-4">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xl font-semibold">
              {user.first_name[0]}{user.last_name[0]}
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground">
                {user.first_name} {user.last_name}
              </h3>
              <Badge variant="outline" className={statusColors[user.status]}>
                {user.status}
              </Badge>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-3 text-sm">
              <Mail className="w-4 h-4 text-muted-foreground" />
              <span className="text-foreground">{user.email}</span>
            </div>

            <div className="flex items-center gap-3 text-sm">
              <Phone className="w-4 h-4 text-muted-foreground" />
              <span className="text-foreground">{user.phone}</span>
            </div>

            <div className="flex items-center gap-3 text-sm">
              <MapPin className="w-4 h-4 text-muted-foreground" />
              <span className="text-foreground">
                {user.city}, {user.state}, {user.country}
              </span>
            </div>

            <div className="flex items-center gap-3 text-sm">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <span className="text-foreground">
                Born: {new Date(user.date_of_birth).toLocaleDateString()}
              </span>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-border">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Gender</p>
                <p className="font-medium text-foreground">{user.gender}</p>
              </div>
              <div>
                <p className="text-muted-foreground">User ID</p>
                <p className="font-medium text-foreground">#{user.id}</p>
              </div>
              <div className="col-span-2">
                <p className="text-muted-foreground">Created</p>
                <p className="font-medium text-foreground">
                  {new Date(user.created_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-border">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
            <Button>Edit User</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
