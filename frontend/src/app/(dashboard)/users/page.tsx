"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Upload,
  Pencil,
  Eye,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Lock,
  Plus,
  Loader2,
} from 'lucide-react';
import { User as MockUser, UserType } from '@/lib/mockData';
import { fetchUsers, createUser, updateUser, deleteUser, User } from '@/lib/database';
import UploadModal from '@/components/admin/UploadModal';
import UserDetailModal from '@/components/admin/UserDetailModal';
import EditUserModal from '@/components/admin/EditUserModal';
import BulkResumeUpload from '@/components/admin/BulkResumeUpload';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { Badge } from '@/components/ui/badge';

export default function UsersPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [uploadOpen, setUploadOpen] = useState(false);
  const [detailUser, setDetailUser] = useState<MockUser | null>(null);
  const [editUser, setEditUser] = useState<MockUser | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<MockUser | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [users, setUsers] = useState<MockUser[]>([]);
  const [total, setTotal] = useState(0);
  const { toast } = useToast();
  const { user: authUser } = useAuth();

  // Check if current user is a Business user
  const isBusinessUser = authUser && 'user_type' in authUser && authUser.user_type === 'business';

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchUsers({ page, page_size: pageSize, search });
      // Map database users to MockUser format
      const mappedUsers: MockUser[] = data.items.map(u => ({
        id: u.id,
        first_name: u.first_name,
        last_name: u.last_name || '',
        email: u.email,
        phone: u.phone || '',
        gender: u.gender || '',
        date_of_birth: u.date_of_birth || '',
        address: u.address || '',
        city: u.city || '',
        state: u.state || '',
        country: u.country || '',
        zip_code: u.zip_code || '',
        user_type: (u.user_type as UserType) || 'candidate',
        status: (u.status || 'active') as 'active' | 'inactive' | 'pending',
        created_at: u.created_at,
      }));
      setUsers(mappedUsers);
      setTotal(data.total);
    } catch (error) {
      console.error('Error loading users:', error);
      toast({ title: 'Error', description: 'Failed to load users.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, toast]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const totalPages = Math.ceil(total / pageSize);

  const handleCreateUser = () => {
    setEditUser(null);
    setEditOpen(true);
  };

  const handleEditUser = (user: MockUser) => {
    setEditUser(user);
    setEditOpen(true);
  };

  const handleSaveUser = async (userData: MockUser) => {
    setSaving(true);
    try {
      if (editUser) {
        await updateUser(editUser.id, userData);
        toast({ title: 'Success', description: 'User updated successfully.' });
      } else {
        await createUser(userData);
        toast({ title: 'Success', description: 'User created successfully.' });
      }
      setEditOpen(false);
      loadUsers();
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to save user.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!deleteConfirm) return;

    setSaving(true);
    try {
      await deleteUser(deleteConfirm.id);
      toast({ title: 'Success', description: 'User deleted successfully.' });
      setDeleteConfirm(null);
      loadUsers();
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to delete user.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const statusColors: Record<string, string> = {
    active: 'bg-success text-success-foreground',
    pending: 'bg-warning text-warning-foreground',
    inactive: 'bg-destructive/80 text-destructive-foreground',
  };

  const userTypeColors: Record<string, string> = {
    admin: 'bg-primary/20 text-primary border-primary/30',
    business: 'bg-info/20 text-info border-info/30',
    candidate: 'bg-secondary text-secondary-foreground',
  };

  return (
    <div className="p-6 lg:p-8 animate-fade-in">
      <div className="mb-6">
        <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Users</h1>
        <p className="text-muted-foreground mt-1">Manage application users</p>
      </div>

      <Card className="shadow-soft border-border">
        <CardHeader className="border-b border-border py-4">
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
            <div className="relative w-full sm:w-96">
              <Input
                placeholder="Search by name or email..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="pl-4"
              />
            </div>

            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Lock className="w-4 h-4" />
                {total} users
              </span>
              <Button size="sm" variant="outline" onClick={handleCreateUser}>
                <Plus className="w-4 h-4 mr-2" />
                Add User
              </Button>
              <Button size="sm" onClick={() => setUploadOpen(true)}>
                <Upload className="w-4 h-4 mr-2" />
                Upload
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30 hover:bg-muted/30">
                  <TableHead className="w-16 font-semibold">#</TableHead>
                  <TableHead className="font-semibold">NAME</TableHead>
                  <TableHead className="font-semibold">EMAIL</TableHead>
                  <TableHead className="font-semibold text-center">USER TYPE</TableHead>
                  <TableHead className="font-semibold text-center">STATUS</TableHead>
                  <TableHead className="font-semibold text-center">ACTIONS</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" />
                      <p className="text-muted-foreground mt-2">Loading users...</p>
                    </TableCell>
                  </TableRow>
                ) : users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                      No users found
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map((user, idx) => (
                    <TableRow key={user.id} className="border-b border-border">
                      <TableCell className="font-medium text-muted-foreground">
                        {(page - 1) * pageSize + idx + 1}
                      </TableCell>
                      <TableCell>
                        <span className="font-medium text-foreground">
                          {user.first_name} {user.last_name}
                        </span>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{user.email}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className={userTypeColors[user.user_type] || userTypeColors.candidate}>
                          {user.user_type ? user.user_type.charAt(0).toUpperCase() + user.user_type.slice(1) : 'Candidate'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColors[user.status]}`}>
                          {user.status.charAt(0).toUpperCase() + user.status.slice(1)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8 border-primary/30 text-primary hover:bg-primary/10"
                            onClick={() => handleEditUser(user)}
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8 border-success/30 text-success hover:bg-success/10"
                            onClick={() => setDetailUser(user)}
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8 border-destructive/30 text-destructive hover:bg-destructive/10"
                            onClick={() => setDeleteConfirm(user)}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center justify-between px-4 py-4 border-t border-border">
            <p className="text-sm text-muted-foreground">
              Showing {Math.min((page - 1) * pageSize + 1, total)} to {Math.min(page * pageSize, total)} of {total} entries
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 1 || loading}
                onClick={() => setPage(page - 1)}
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Previous
              </Button>
              <span className="text-sm text-muted-foreground px-2">
                Page {page} of {totalPages || 1}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page === totalPages || totalPages === 0 || loading}
                onClick={() => setPage(page + 1)}
              >
                Next
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Resume Upload - Only visible for Business users */}
      {isBusinessUser && (
        <BulkResumeUpload onComplete={loadUsers} />
      )}

      <UploadModal
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        onUploadComplete={() => {
          toast({ title: 'Upload Successful', description: 'User data has been imported.' });
          loadUsers();
        }}
      />

      <UserDetailModal
        user={detailUser}
        open={!!detailUser}
        onClose={() => setDetailUser(null)}
      />

      <EditUserModal
        user={editUser}
        open={editOpen}
        onClose={() => setEditOpen(false)}
        onSave={handleSaveUser}
        loading={saving}
      />

      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {deleteConfirm?.first_name} {deleteConfirm?.last_name}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteUser}
              disabled={saving}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {saving ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
