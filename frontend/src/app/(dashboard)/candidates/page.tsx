"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Search,
  Filter,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Eye,
  Pencil,
  Trash2,
  UserCheck,
  UserX,
  Clock,
  MoreHorizontal,
  Upload,
  Users,
  Loader2,
  X,
  RefreshCw,
  Download,
  FileSpreadsheet,
  FileText,
  QrCode,
  Copy,
  ExternalLink,
  RotateCw,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import * as XLSX from 'xlsx';
import { fetchCandidates, updateUser, deleteUser, bulkUpdateCandidates, bulkDeleteCandidates, generateMagicToken, sendMagicLinkEmail, User } from '@/lib/database';
import UserDetailModal from '@/components/admin/UserDetailModal';
import EditUserModal from '@/components/admin/EditUserModal';
import BulkResumeUpload from '@/components/admin/BulkResumeUpload';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { User as MockUser, UserType } from '@/lib/mockData';

type StatusFilter = 'all' | 'active' | 'inactive' | 'pending';
type DateFilter = 'all' | 'today' | 'week' | 'month' | 'year';

export default function CandidateManagementPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const [candidates, setCandidates] = useState<MockUser[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [detailUser, setDetailUser] = useState<MockUser | null>(null);
  const [editUser, setEditUser] = useState<MockUser | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<MockUser | null>(null);
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);
  const [bulkStatusUpdate, setBulkStatusUpdate] = useState<string | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [qrCandidate, setQrCandidate] = useState<MockUser | null>(null);
  const [regenerating, setRegenerating] = useState(false);

  const { toast } = useToast();

  // Build login link using current origin so it works on any domain (Vercel, etc.)
  const getLoginLink = (token: string) => `${window.location.origin}/magic-login?token=${token}`;

  const getMagicToken = (candidate: MockUser): string | null => {
    return (candidate.metadata as Record<string, unknown>)?.magic_token as string || null;
  };

  const handleCopyLoginLink = (candidate: MockUser) => {
    const token = getMagicToken(candidate);
    if (!token) {
      toast({ title: 'No Login Link', description: 'This candidate has no magic login token. Regenerate one.', variant: 'destructive' });
      return;
    }
    navigator.clipboard.writeText(getLoginLink(token));
    toast({ title: 'Copied!', description: 'Login link copied to clipboard.' });
  };

  const handleRegenerateMagicLink = async (candidate: MockUser) => {
    setRegenerating(true);
    try {
      const newToken = await generateMagicToken(candidate.id);
      // Send magic link email
      await sendMagicLinkEmail(candidate.email, candidate.first_name, newToken, window.location.origin);
      toast({ title: 'Success', description: 'New login link generated and emailed to candidate.' });
      // Refresh the list to get updated metadata
      loadCandidates();
      // Update QR dialog if open
      if (qrCandidate?.id === candidate.id) {
        setQrCandidate({ ...candidate, metadata: { ...(candidate.metadata as Record<string, unknown>), magic_token: newToken } });
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to regenerate login link.', variant: 'destructive' });
    } finally {
      setRegenerating(false);
    }
  };

  const handleDownloadQR = (candidate: MockUser) => {
    const token = getMagicToken(candidate);
    if (!token) return;
    const svg = document.getElementById(`qr-dialog-${candidate.id}`);
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([svgData], { type: 'image/svg+xml' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `qr-${candidate.first_name}-${candidate.last_name || ''}.svg`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  // Export functions
  const fetchAllCandidatesForExport = async () => {
    try {
      const data = await fetchCandidates({
        page: 1,
        page_size: 10000, // Get all matching records
        search,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        date_filter: dateFilter !== 'all' ? dateFilter : undefined,
      });
      return data.items;
    } catch (error) {
      console.error('Error fetching candidates for export:', error);
      throw error;
    }
  };

  const formatCandidatesForExport = (items: User[]) => {
    return items.map(candidate => ({
      'ID': candidate.id,
      'First Name': candidate.first_name,
      'Last Name': candidate.last_name || '',
      'Email': candidate.email,
      'Phone': candidate.phone || '',
      'Gender': candidate.gender || '',
      'Date of Birth': candidate.date_of_birth || '',
      'Address': candidate.address || '',
      'City': candidate.city || '',
      'State': candidate.state || '',
      'Country': candidate.country || '',
      'Zip Code': candidate.zip_code || '',
      'Status': candidate.status || '',
      'Created At': new Date(candidate.created_at).toLocaleDateString(),
    }));
  };

  const exportToCSV = async () => {
    setExporting(true);
    try {
      const items = await fetchAllCandidatesForExport();
      const formattedData = formatCandidatesForExport(items);

      if (formattedData.length === 0) {
        toast({ title: 'No Data', description: 'No candidates to export with current filters.', variant: 'destructive' });
        return;
      }

      const headers = Object.keys(formattedData[0]);
      const csvContent = [
        headers.join(','),
        ...formattedData.map(row =>
          headers.map(header => {
            const value = String(row[header as keyof typeof row] || '');
            // Escape quotes and wrap in quotes if contains comma or quote
            if (value.includes(',') || value.includes('"') || value.includes('\n')) {
              return `"${value.replace(/"/g, '""')}"`;
            }
            return value;
          }).join(',')
        )
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `candidates_export_${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      URL.revokeObjectURL(link.href);

      toast({ title: 'Export Complete', description: `Exported ${formattedData.length} candidates to CSV.` });
    } catch (error) {
      toast({ title: 'Export Failed', description: 'Failed to export candidates.', variant: 'destructive' });
    } finally {
      setExporting(false);
    }
  };

  const exportToExcel = async () => {
    setExporting(true);
    try {
      const items = await fetchAllCandidatesForExport();
      const formattedData = formatCandidatesForExport(items);

      if (formattedData.length === 0) {
        toast({ title: 'No Data', description: 'No candidates to export with current filters.', variant: 'destructive' });
        return;
      }

      const worksheet = XLSX.utils.json_to_sheet(formattedData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Candidates');

      // Auto-size columns
      const colWidths = Object.keys(formattedData[0]).map(key => ({
        wch: Math.max(key.length, ...formattedData.map(row => String(row[key as keyof typeof row] || '').length))
      }));
      worksheet['!cols'] = colWidths;

      XLSX.writeFile(workbook, `candidates_export_${new Date().toISOString().split('T')[0]}.xlsx`);

      toast({ title: 'Export Complete', description: `Exported ${formattedData.length} candidates to Excel.` });
    } catch (error) {
      toast({ title: 'Export Failed', description: 'Failed to export candidates.', variant: 'destructive' });
    } finally {
      setExporting(false);
    }
  };

  const exportSelectedToCSV = async () => {
    if (selectedIds.size === 0) return;
    setExporting(true);
    try {
      const selectedCandidates = candidates.filter(c => selectedIds.has(c.id));
      const formattedData = selectedCandidates.map(candidate => ({
        'ID': candidate.id,
        'First Name': candidate.first_name,
        'Last Name': candidate.last_name || '',
        'Email': candidate.email,
        'Phone': candidate.phone || '',
        'Gender': candidate.gender || '',
        'Date of Birth': candidate.date_of_birth || '',
        'Address': candidate.address || '',
        'City': candidate.city || '',
        'State': candidate.state || '',
        'Country': candidate.country || '',
        'Zip Code': candidate.zip_code || '',
        'Status': candidate.status || '',
        'Created At': new Date(candidate.created_at).toLocaleDateString(),
      }));

      const headers = Object.keys(formattedData[0]);
      const csvContent = [
        headers.join(','),
        ...formattedData.map(row =>
          headers.map(header => {
            const value = String(row[header as keyof typeof row] || '');
            if (value.includes(',') || value.includes('"') || value.includes('\n')) {
              return `"${value.replace(/"/g, '""')}"`;
            }
            return value;
          }).join(',')
        )
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `candidates_selected_${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      URL.revokeObjectURL(link.href);

      toast({ title: 'Export Complete', description: `Exported ${formattedData.length} selected candidates to CSV.` });
    } catch (error) {
      toast({ title: 'Export Failed', description: 'Failed to export candidates.', variant: 'destructive' });
    } finally {
      setExporting(false);
    }
  };

  const exportSelectedToExcel = async () => {
    if (selectedIds.size === 0) return;
    setExporting(true);
    try {
      const selectedCandidates = candidates.filter(c => selectedIds.has(c.id));
      const formattedData = selectedCandidates.map(candidate => ({
        'ID': candidate.id,
        'First Name': candidate.first_name,
        'Last Name': candidate.last_name || '',
        'Email': candidate.email,
        'Phone': candidate.phone || '',
        'Gender': candidate.gender || '',
        'Date of Birth': candidate.date_of_birth || '',
        'Address': candidate.address || '',
        'City': candidate.city || '',
        'State': candidate.state || '',
        'Country': candidate.country || '',
        'Zip Code': candidate.zip_code || '',
        'Status': candidate.status || '',
        'Created At': new Date(candidate.created_at).toLocaleDateString(),
      }));

      const worksheet = XLSX.utils.json_to_sheet(formattedData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Candidates');

      const colWidths = Object.keys(formattedData[0]).map(key => ({
        wch: Math.max(key.length, ...formattedData.map(row => String(row[key as keyof typeof row] || '').length))
      }));
      worksheet['!cols'] = colWidths;

      XLSX.writeFile(workbook, `candidates_selected_${new Date().toISOString().split('T')[0]}.xlsx`);

      toast({ title: 'Export Complete', description: `Exported ${formattedData.length} selected candidates to Excel.` });
    } catch (error) {
      toast({ title: 'Export Failed', description: 'Failed to export candidates.', variant: 'destructive' });
    } finally {
      setExporting(false);
    }
  };

  const loadCandidates = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchCandidates({
        page,
        page_size: pageSize,
        search,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        date_filter: dateFilter !== 'all' ? dateFilter : undefined,
      });

      const mappedCandidates: MockUser[] = data.items.map(u => ({
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
        user_type: 'candidate' as UserType,
        status: (u.status || 'active') as 'active' | 'inactive' | 'pending',
        metadata: u.metadata as Record<string, unknown> | undefined,
        created_at: u.created_at,
      }));

      setCandidates(mappedCandidates);
      setTotal(data.total);
      setSelectedIds(new Set());
    } catch (error) {
      console.error('Error loading candidates:', error);
      toast({ title: 'Error', description: 'Failed to load candidates.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, statusFilter, dateFilter, toast]);

  useEffect(() => {
    loadCandidates();
  }, [loadCandidates]);

  const totalPages = Math.ceil(total / pageSize);

  // Selection handlers
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(candidates.map(c => c.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectOne = (id: number, checked: boolean) => {
    const newSelected = new Set(selectedIds);
    if (checked) {
      newSelected.add(id);
    } else {
      newSelected.delete(id);
    }
    setSelectedIds(newSelected);
  };

  const isAllSelected = candidates.length > 0 && selectedIds.size === candidates.length;
  const isPartialSelected = selectedIds.size > 0 && selectedIds.size < candidates.length;

  // Individual actions
  const handleEditUser = (user: MockUser) => {
    setEditUser(user);
    setEditOpen(true);
  };

  const handleSaveUser = async (userData: MockUser) => {
    setSaving(true);
    try {
      await updateUser(userData.id, userData);
      toast({ title: 'Success', description: 'Candidate updated successfully.' });
      setEditOpen(false);
      loadCandidates();
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to update candidate.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!deleteConfirm) return;
    setSaving(true);
    try {
      await deleteUser(deleteConfirm.id);
      toast({ title: 'Success', description: 'Candidate deleted successfully.' });
      setDeleteConfirm(null);
      loadCandidates();
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to delete candidate.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleQuickStatusUpdate = async (user: MockUser, newStatus: string) => {
    setSaving(true);
    try {
      await updateUser(user.id, { ...user, status: newStatus });
      toast({ title: 'Success', description: `Status updated to ${newStatus}.` });
      loadCandidates();
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to update status.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  // Bulk actions
  const handleBulkStatusUpdate = async () => {
    if (!bulkStatusUpdate || selectedIds.size === 0) return;
    setSaving(true);
    try {
      await bulkUpdateCandidates(Array.from(selectedIds), { status: bulkStatusUpdate });
      toast({
        title: 'Success',
        description: `Updated ${selectedIds.size} candidates to ${bulkStatusUpdate}.`
      });
      setBulkStatusUpdate(null);
      loadCandidates();
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to update candidates.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    setSaving(true);
    try {
      await bulkDeleteCandidates(Array.from(selectedIds));
      toast({
        title: 'Success',
        description: `Deleted ${selectedIds.size} candidates.`
      });
      setBulkDeleteConfirm(false);
      loadCandidates();
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to delete candidates.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const clearFilters = () => {
    setSearch('');
    setStatusFilter('all');
    setDateFilter('all');
    setPage(1);
  };

  const hasActiveFilters = search || statusFilter !== 'all' || dateFilter !== 'all';

  const statusColors: Record<string, string> = {
    active: 'bg-success text-success-foreground',
    pending: 'bg-warning text-warning-foreground',
    inactive: 'bg-destructive/80 text-destructive-foreground',
  };

  const statusIcons: Record<string, React.ReactNode> = {
    active: <UserCheck className="w-3 h-3" />,
    pending: <Clock className="w-3 h-3" />,
    inactive: <UserX className="w-3 h-3" />,
  };

  return (
    <div className="p-6 lg:p-8 animate-fade-in">
      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Candidate Management</h1>
          <p className="text-muted-foreground mt-1">Manage and track uploaded candidates</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Export Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2" disabled={exporting}>
                {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                Export
                <ChevronDown className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-popover z-50 w-48">
              <DropdownMenuItem onClick={exportToCSV} disabled={exporting}>
                <FileText className="w-4 h-4 mr-2" />
                Export All to CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={exportToExcel} disabled={exporting}>
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                Export All to Excel
              </DropdownMenuItem>
              {selectedIds.size > 0 && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={exportSelectedToCSV} disabled={exporting}>
                    <FileText className="w-4 h-4 mr-2" />
                    Export Selected ({selectedIds.size}) to CSV
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={exportSelectedToExcel} disabled={exporting}>
                    <FileSpreadsheet className="w-4 h-4 mr-2" />
                    Export Selected ({selectedIds.size}) to Excel
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          <Button onClick={() => setShowUpload(!showUpload)} className="gap-2">
            <Upload className="w-4 h-4" />
            {showUpload ? 'Hide Upload' : 'Upload Resumes'}
          </Button>
        </div>
      </div>

      {/* Upload Section */}
      {showUpload && (
        <div className="mb-6">
          <BulkResumeUpload onComplete={loadCandidates} />
        </div>
      )}

      {/* Stats Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card className="border-border">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Users className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{total}</p>
              <p className="text-xs text-muted-foreground">Total Candidates</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-success/10">
              <UserCheck className="w-5 h-5 text-success" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">
                {candidates.filter(c => c.status === 'active').length}
              </p>
              <p className="text-xs text-muted-foreground">Active</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-warning/10">
              <Clock className="w-5 h-5 text-warning" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">
                {candidates.filter(c => c.status === 'pending').length}
              </p>
              <p className="text-xs text-muted-foreground">Pending</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-destructive/10">
              <UserX className="w-5 h-5 text-destructive" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">
                {candidates.filter(c => c.status === 'inactive').length}
              </p>
              <p className="text-xs text-muted-foreground">Inactive</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Card */}
      <Card className="shadow-soft border-border">
        <CardHeader className="border-b border-border py-4">
          {/* Filters Row */}
          <div className="flex flex-col lg:flex-row gap-4 justify-between items-start lg:items-center">
            <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
              {/* Search */}
              <div className="relative flex-1 min-w-[200px] lg:min-w-[280px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or email..."
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                  className="pl-9"
                />
              </div>

              {/* Status Filter */}
              <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v as StatusFilter); setPage(1); }}>
                <SelectTrigger className="w-[130px]">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent className="bg-popover z-50">
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>

              {/* Date Filter */}
              <Select value={dateFilter} onValueChange={(v) => { setDateFilter(v as DateFilter); setPage(1); }}>
                <SelectTrigger className="w-[130px]">
                  <Clock className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Date" />
                </SelectTrigger>
                <SelectContent className="bg-popover z-50">
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">This Week</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                  <SelectItem value="year">This Year</SelectItem>
                </SelectContent>
              </Select>

              {/* Clear Filters */}
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1">
                  <X className="w-4 h-4" />
                  Clear
                </Button>
              )}

              {/* Refresh */}
              <Button variant="outline" size="icon" onClick={loadCandidates} disabled={loading}>
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </div>

            {/* Bulk Actions */}
            {selectedIds.size > 0 && (
              <div className="flex items-center gap-2 bg-muted/50 px-3 py-2 rounded-lg">
                <span className="text-sm font-medium text-foreground">
                  {selectedIds.size} selected
                </span>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-1">
                      Bulk Actions
                      <ChevronDown className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-popover z-50">
                    <DropdownMenuItem onClick={() => setBulkStatusUpdate('active')}>
                      <UserCheck className="w-4 h-4 mr-2 text-success" />
                      Set Active
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setBulkStatusUpdate('pending')}>
                      <Clock className="w-4 h-4 mr-2 text-warning" />
                      Set Pending
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setBulkStatusUpdate('inactive')}>
                      <UserX className="w-4 h-4 mr-2 text-muted-foreground" />
                      Set Inactive
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => setBulkDeleteConfirm(true)}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete Selected
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedIds(new Set())}
                >
                  Clear
                </Button>
              </div>
            )}
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30 hover:bg-muted/30">
                  <TableHead className="w-12">
                    <Checkbox
                      checked={isAllSelected}
                      onCheckedChange={handleSelectAll}
                      aria-label="Select all"
                      className={isPartialSelected ? 'data-[state=checked]:bg-primary/50' : ''}
                    />
                  </TableHead>
                  <TableHead className="font-semibold">NAME</TableHead>
                  <TableHead className="font-semibold">EMAIL</TableHead>
                  <TableHead className="font-semibold text-center">QR / LOGIN</TableHead>
                  <TableHead className="font-semibold">LOCATION</TableHead>
                  <TableHead className="font-semibold text-center">STATUS</TableHead>
                  <TableHead className="font-semibold">CREATED</TableHead>
                  <TableHead className="font-semibold text-center">ACTIONS</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-12">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" />
                      <p className="text-muted-foreground mt-2">Loading candidates...</p>
                    </TableCell>
                  </TableRow>
                ) : candidates.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                      {hasActiveFilters ? 'No candidates match your filters' : 'No candidates found'}
                    </TableCell>
                  </TableRow>
                ) : (
                  candidates.map((candidate) => (
                    <TableRow
                      key={candidate.id}
                      className="border-b border-border cursor-pointer hover:bg-muted/50 transition-colors"
                      onDoubleClick={() => router.push(`/candidates/${candidate.id}`)}
                    >
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.has(candidate.id)}
                          onCheckedChange={(checked) => handleSelectOne(candidate.id, checked as boolean)}
                          aria-label={`Select ${candidate.first_name}`}
                        />
                      </TableCell>
                      <TableCell>
                        <span className="font-medium text-foreground">
                          {candidate.first_name} {candidate.last_name}
                        </span>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{candidate.email}</TableCell>
                      <TableCell className="text-center">
                        {getMagicToken(candidate) ? (
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-primary hover:bg-primary/10"
                              title="View QR Code"
                              onClick={() => setQrCandidate(candidate)}
                            >
                              <QrCode className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:bg-muted"
                              title="Copy Login Link"
                              onClick={() => handleCopyLoginLink(candidate)}
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs text-muted-foreground gap-1"
                            onClick={() => handleRegenerateMagicLink(candidate)}
                            disabled={regenerating}
                          >
                            {regenerating ? <Loader2 className="w-3 h-3 animate-spin" /> : <RotateCw className="w-3 h-3" />}
                            Generate
                          </Button>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {[candidate.city, candidate.state, candidate.country].filter(Boolean).join(', ') || '-'}
                      </TableCell>
                      <TableCell className="text-center">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className={`gap-1.5 ${statusColors[candidate.status]} hover:opacity-80`}
                              disabled={saving}
                            >
                              {statusIcons[candidate.status]}
                              {candidate.status.charAt(0).toUpperCase() + candidate.status.slice(1)}
                              <ChevronDown className="w-3 h-3" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent className="bg-popover z-50">
                            <DropdownMenuItem onClick={() => handleQuickStatusUpdate(candidate, 'active')}>
                              <UserCheck className="w-4 h-4 mr-2 text-success" />
                              Active
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleQuickStatusUpdate(candidate, 'pending')}>
                              <Clock className="w-4 h-4 mr-2 text-warning" />
                              Pending
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleQuickStatusUpdate(candidate, 'inactive')}>
                              <UserX className="w-4 h-4 mr-2" />
                              Inactive
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {new Date(candidate.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-success hover:bg-success/10"
                            onClick={() => setDetailUser(candidate)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-primary hover:bg-primary/10"
                            onClick={() => handleEditUser(candidate)}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:bg-destructive/10"
                            onClick={() => setDeleteConfirm(candidate)}
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

          {/* Pagination */}
          <div className="flex items-center justify-between px-4 py-4 border-t border-border">
            <p className="text-sm text-muted-foreground">
              Showing {Math.min((page - 1) * pageSize + 1, total)} to {Math.min(page * pageSize, total)} of {total} candidates
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

      {/* Modals */}
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

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Candidate</AlertDialogTitle>
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

      {/* Bulk Delete Confirmation */}
      <AlertDialog open={bulkDeleteConfirm} onOpenChange={setBulkDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedIds.size} Candidates</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedIds.size} selected candidates? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              disabled={saving}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {saving ? 'Deleting...' : 'Delete All'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Status Update Confirmation */}
      <AlertDialog open={!!bulkStatusUpdate} onOpenChange={() => setBulkStatusUpdate(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Update {selectedIds.size} Candidates</AlertDialogTitle>
            <AlertDialogDescription>
              Set status to "{bulkStatusUpdate}" for {selectedIds.size} selected candidates?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkStatusUpdate} disabled={saving}>
              {saving ? 'Updating...' : 'Update All'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* QR Code Dialog */}
      <Dialog open={!!qrCandidate} onOpenChange={() => setQrCandidate(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-center">
              QR Code for {qrCandidate?.first_name} {qrCandidate?.last_name}
            </DialogTitle>
          </DialogHeader>
          {qrCandidate && getMagicToken(qrCandidate) && (
            <div className="flex flex-col items-center gap-4 py-4">
              <div className="bg-white p-4 rounded-lg">
                <QRCodeSVG
                  id={`qr-dialog-${qrCandidate.id}`}
                  value={getLoginLink(getMagicToken(qrCandidate)!)}
                  size={200}
                  level="M"
                />
              </div>
              <p className="text-xs text-muted-foreground text-center break-all px-4">
                {getLoginLink(getMagicToken(qrCandidate)!)}
              </p>
              <div className="flex gap-2 flex-wrap justify-center">
                <Button size="sm" variant="outline" className="gap-1.5" onClick={() => handleCopyLoginLink(qrCandidate)}>
                  <Copy className="w-3.5 h-3.5" /> Copy Link
                </Button>
                <Button size="sm" variant="outline" className="gap-1.5" onClick={() => handleDownloadQR(qrCandidate)}>
                  <Download className="w-3.5 h-3.5" /> Download QR
                </Button>
                <Button size="sm" variant="outline" className="gap-1.5" onClick={() => window.open(getLoginLink(getMagicToken(qrCandidate)!), '_blank')}>
                  <ExternalLink className="w-3.5 h-3.5" /> Open Link
                </Button>
                <Button size="sm" variant="outline" className="gap-1.5" onClick={() => handleRegenerateMagicLink(qrCandidate)} disabled={regenerating}>
                  {regenerating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCw className="w-3.5 h-3.5" />}
                  Regenerate
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
