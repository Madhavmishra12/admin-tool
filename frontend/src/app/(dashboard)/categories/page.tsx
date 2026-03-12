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
  Lock,
  Tag,
  Activity,
  Settings,
  Loader2,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { fetchCategories, createCategory, updateCategory, deleteCategory, Category } from '@/lib/database';
import EditCategoryModal from '@/components/admin/EditCategoryModal';

export default function CategoriesPage() {
  const [search, setSearch] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editCategory, setEditCategory] = useState<Category | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<Category | null>(null);
  const { toast } = useToast();

  const loadCategories = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchCategories(search || undefined);
      setCategories(data);
    } catch (error) {
      console.error('Error loading categories:', error);
      toast({ title: 'Error', description: 'Failed to load categories.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [search, toast]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const handleCreate = () => {
    setEditCategory(null);
    setEditOpen(true);
  };

  const handleEdit = (category: Category) => {
    setEditCategory(category);
    setEditOpen(true);
  };

  const handleSave = async (data: Partial<Category>) => {
    setSaving(true);
    try {
      if (editCategory) {
        await updateCategory(editCategory.id, data);
        toast({ title: 'Success', description: 'Category updated successfully.' });
      } else {
        await createCategory(data);
        toast({ title: 'Success', description: 'Category created successfully.' });
      }
      setEditOpen(false);
      loadCategories();
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to save category.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;

    setSaving(true);
    try {
      await deleteCategory(deleteConfirm.id);
      toast({ title: 'Success', description: 'Category deleted successfully.' });
      setDeleteConfirm(null);
      loadCategories();
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to delete category.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const statusColors: Record<string, string> = {
    active: 'bg-success text-success-foreground',
    inactive: 'bg-destructive/80 text-destructive-foreground',
  };

  return (
    <div className="p-6 lg:p-8 animate-fade-in">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Role Play Categories</h1>
          <p className="text-muted-foreground mt-1">Manage role play categories for your application</p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="w-4 h-4 mr-2" />
          Add New Category
        </Button>
      </div>

      <Card className="shadow-soft border-border">
        <CardHeader className="border-b border-border py-4">
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
            <Input
              placeholder="Search categories..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full sm:w-96"
            />
            <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Lock className="w-4 h-4" />
              {categories.length} categories
            </span>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30 hover:bg-muted/30">
                  <TableHead className="w-16 font-semibold">#</TableHead>
                  <TableHead className="font-semibold">
                    <div className="flex items-center gap-2">
                      <Tag className="w-4 h-4" />
                      CATEGORY NAME
                    </div>
                  </TableHead>
                  <TableHead className="font-semibold">DESCRIPTION</TableHead>
                  <TableHead className="font-semibold text-center">
                    <div className="flex items-center justify-center gap-2">
                      <Activity className="w-4 h-4" />
                      STATUS
                    </div>
                  </TableHead>
                  <TableHead className="font-semibold text-center">
                    <div className="flex items-center justify-center gap-2">
                      <Settings className="w-4 h-4" />
                      ACTIONS
                    </div>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-12">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" />
                      <p className="text-muted-foreground mt-2">Loading categories...</p>
                    </TableCell>
                  </TableRow>
                ) : categories.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                      No categories found
                    </TableCell>
                  </TableRow>
                ) : (
                  categories.map((cat, idx) => (
                    <TableRow key={cat.id} className="border-b border-border">
                      <TableCell className="font-medium text-muted-foreground">{idx + 1}</TableCell>
                      <TableCell className="font-medium text-foreground">{cat.name}</TableCell>
                      <TableCell className="text-muted-foreground max-w-xs truncate">{cat.description || '-'}</TableCell>
                      <TableCell className="text-center">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColors[cat.status || 'active']}`}>
                          {(cat.status || 'active').charAt(0).toUpperCase() + (cat.status || 'active').slice(1)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8 border-primary/30 text-primary hover:bg-primary/10"
                            onClick={() => handleEdit(cat)}
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8 border-destructive/30 text-destructive hover:bg-destructive/10"
                            onClick={() => setDeleteConfirm(cat)}
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
        </CardContent>
      </Card>

      <EditCategoryModal
        category={editCategory}
        open={editOpen}
        onClose={() => setEditOpen(false)}
        onSave={handleSave}
        loading={saving}
      />

      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Category</AlertDialogTitle>
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
