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
  Plus,
  Pencil,
  Trash2,
  Package,
  EyeOff,
  Loader2,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { fetchUseCases, createUseCase, updateUseCase, deleteUseCase, fetchCategories, UseCase, Category } from '@/lib/database';
import EditUseCaseModal from '@/components/admin/EditUseCaseModal';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export default function UseCasesPage() {
  const [search, setSearch] = useState('');
  const [useCases, setUseCases] = useState<UseCase[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editUseCase, setEditUseCase] = useState<UseCase | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [viewUseCase, setViewUseCase] = useState<UseCase | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<UseCase | null>(null);
  const { toast } = useToast();

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [useCasesData, categoriesData] = await Promise.all([
        fetchUseCases(search || undefined),
        fetchCategories(),
      ]);
      setUseCases(useCasesData);
      setCategories(categoriesData);
    } catch (error) {
      console.error('Error loading data:', error);
      toast({ title: 'Error', description: 'Failed to load data.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [search, toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreate = () => {
    setEditUseCase(null);
    setEditOpen(true);
  };

  const handleEdit = (useCase: UseCase) => {
    setEditUseCase(useCase);
    setEditOpen(true);
  };

  const handleSave = async (data: Partial<UseCase>) => {
    setSaving(true);
    try {
      if (editUseCase) {
        await updateUseCase(editUseCase.id, data);
        toast({ title: 'Success', description: 'Use case updated successfully.' });
      } else {
        await createUseCase(data);
        toast({ title: 'Success', description: 'Use case created successfully.' });
      }
      setEditOpen(false);
      loadData();
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to save use case.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;

    setSaving(true);
    try {
      await deleteUseCase(deleteConfirm.id);
      toast({ title: 'Success', description: 'Use case deleted successfully.' });
      setDeleteConfirm(null);
      loadData();
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to delete use case.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const getCategoryName = (categoryId?: number) => {
    if (!categoryId) return '-';
    const category = categories.find(c => c.id === categoryId);
    return category?.name || '-';
  };

  const statusColors: Record<string, string> = {
    active: 'bg-success text-success-foreground',
    inactive: 'bg-destructive/80 text-destructive-foreground',
  };

  return (
    <div className="p-6 lg:p-8 animate-fade-in">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Role Play Use Cases</h1>
          <p className="text-muted-foreground mt-1">Manage role play use cases for your application</p>
        </div>
        <Button onClick={handleCreate} className="bg-primary hover:bg-primary/90">
          <Plus className="w-4 h-4 mr-2" />
          Add New Use Case
        </Button>
      </div>

      <Card className="shadow-soft border-border">
        <CardHeader className="border-b border-border py-4">
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
            <Input
              placeholder="Search use cases or categories..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full sm:w-96"
            />
            <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Package className="w-4 h-4" />
              {useCases.length} items
            </span>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30 hover:bg-muted/30">
                  <TableHead className="w-12 font-semibold text-foreground">#</TableHead>
                  <TableHead className="font-semibold text-foreground">NAME</TableHead>
                  <TableHead className="font-semibold text-foreground">CATEGORY</TableHead>
                  <TableHead className="font-semibold text-foreground">PROMPT</TableHead>
                  <TableHead className="font-semibold text-foreground text-center">STATUS</TableHead>
                  <TableHead className="font-semibold text-foreground text-center">ACTIONS</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" />
                      <p className="text-muted-foreground mt-2">Loading use cases...</p>
                    </TableCell>
                  </TableRow>
                ) : useCases.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                      No use cases found
                    </TableCell>
                  </TableRow>
                ) : (
                  useCases.map((uc, idx) => (
                    <TableRow key={uc.id} className="border-b border-border hover:bg-muted/20">
                      <TableCell className="font-medium text-muted-foreground">{idx + 1}</TableCell>
                      <TableCell className="font-semibold text-foreground">{uc.name}</TableCell>
                      <TableCell className="text-muted-foreground">{getCategoryName(uc.category_id)}</TableCell>
                      <TableCell className="text-muted-foreground max-w-md">{uc.description || '-'}</TableCell>
                      <TableCell className="text-center">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColors[uc.status || 'active']}`}>
                          {(uc.status || 'active').charAt(0).toUpperCase() + (uc.status || 'active').slice(1)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-950 dark:text-blue-400 dark:hover:bg-blue-900 rounded-md"
                            onClick={() => handleEdit(uc)}
                            title="Edit"
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 bg-amber-50 text-amber-600 hover:bg-amber-100 dark:bg-amber-950 dark:text-amber-400 dark:hover:bg-amber-900 rounded-md"
                            onClick={() => setViewUseCase(uc)}
                            title="View details"
                          >
                            <EyeOff className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-950 dark:text-red-400 dark:hover:bg-red-900 rounded-md"
                            onClick={() => setDeleteConfirm(uc)}
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <EditUseCaseModal
        useCase={editUseCase}
        categories={categories}
        open={editOpen}
        onClose={() => setEditOpen(false)}
        onSave={handleSave}
        loading={saving}
      />

      {/* View Use Case Modal */}
      <Dialog open={!!viewUseCase} onOpenChange={() => setViewUseCase(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Use Case Details</DialogTitle>
          </DialogHeader>
          {viewUseCase && (
            <div className="space-y-4 pt-4">
              <div>
                <p className="text-sm text-muted-foreground">Name</p>
                <p className="font-medium text-foreground">{viewUseCase.name}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Category</p>
                <p className="font-medium text-foreground">{getCategoryName(viewUseCase.category_id)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Description</p>
                <p className="font-medium text-foreground bg-muted/50 p-3 rounded-lg">{viewUseCase.description || 'No description'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColors[viewUseCase.status || 'active']}`}>
                  {(viewUseCase.status || 'active').charAt(0).toUpperCase() + (viewUseCase.status || 'active').slice(1)}
                </span>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-border">
                <Button variant="outline" onClick={() => setViewUseCase(null)}>
                  Close
                </Button>
                <Button onClick={() => { setViewUseCase(null); handleEdit(viewUseCase); }}>
                  Edit
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Use Case</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteConfirm?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
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
