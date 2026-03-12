"use client";

import React, { useState, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Upload,
  FileText,
  X,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertTriangle,
  Download,
  QrCode,
  Link2,
  Copy,
  ExternalLink,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { QRCodeSVG } from 'qrcode.react';

export interface ParsedResumeResult {
  filename: string;
  candidate_name: string | null;
  email: string | null;
  address: string | null;
  status: 'success' | 'failed' | 'duplicate';
  error?: string;
  user_id?: number;
  temp_password?: string;
  magic_token?: string;
  email_sent?: boolean;
}

interface BulkResumeUploadProps {
  onComplete?: () => void;
}

export default function BulkResumeUpload({ onComplete }: BulkResumeUploadProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<ParsedResumeResult[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [selectedQR, setSelectedQR] = useState<{ name: string; url: string } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const appUrl = window.location.origin;

  const getLoginUrl = (token: string) => `${appUrl}/magic-login?token=${token}`;

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const validateFiles = (fileList: FileList | File[]): File[] => {
    const validFiles: File[] = [];
    const invalidFiles: string[] = [];

    Array.from(fileList).forEach((file) => {
      if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
        validFiles.push(file);
      } else {
        invalidFiles.push(file.name);
      }
    });

    if (invalidFiles.length > 0) {
      toast({
        title: 'Invalid Files Rejected',
        description: `Only PDF files are accepted. Rejected: ${invalidFiles.slice(0, 3).join(', ')}${invalidFiles.length > 3 ? ` and ${invalidFiles.length - 3} more` : ''}`,
        variant: 'destructive',
      });
    }

    return validFiles;
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const validFiles = validateFiles(e.dataTransfer.files);
      setFiles((prev) => [...prev, ...validFiles]);
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const validFiles = validateFiles(e.target.files);
      setFiles((prev) => [...prev, ...validFiles]);
    }
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const clearAll = () => {
    setFiles([]);
    setResults([]);
    setProgress(0);
  };

  const handleUpload = async () => {
    if (files.length === 0) return;

    setUploading(true);
    setProgress(0);
    setResults([]);

    const allResults: ParsedResumeResult[] = [];
    const batchSize = 50;
    const totalBatches = Math.ceil(files.length / batchSize);

    try {
      for (let batch = 0; batch < totalBatches; batch++) {
        const batchFiles = files.slice(batch * batchSize, (batch + 1) * batchSize);
        const formData = new FormData();
        batchFiles.forEach((file) => {
          formData.append('files', file);
        });

        setProgress(Math.round(((batch) / totalBatches) * 80) + 5);

        const response = await fetch(
          `http://localhost:8000/api/resumes/bulk-upload`,
          {
            method: 'POST',
            body: formData,
          }
        );

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(errorText || `Upload failed: ${response.status}`);
        }

        const data = await response.json();
        allResults.push(...(data.results || []));
      }

      setProgress(100);
      setResults(allResults);

      const successCount = allResults.filter((r) => r.status === 'success').length;
      const failedCount = allResults.filter((r) => r.status === 'failed').length;
      const duplicateCount = allResults.filter((r) => r.status === 'duplicate').length;
      const emailsSent = allResults.filter((r) => r.email_sent).length;

      toast({
        title: 'Processing Complete',
        description: `${successCount} accounts created, ${duplicateCount} duplicates, ${failedCount} failed. ${emailsSent} login emails sent.`,
        variant: failedCount > 0 ? 'destructive' : 'default',
      });

      if (onComplete) onComplete();

    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: 'Upload Failed',
        description: error instanceof Error ? error.message : 'Server error occurred.',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'Copied!', description: 'Login link copied to clipboard.' });
  };

  const showQRCode = (name: string, token: string) => {
    setSelectedQR({ name, url: getLoginUrl(token) });
    setQrDialogOpen(true);
  };

  const downloadQRCode = (name: string, token: string) => {
    const canvas = document.createElement('canvas');
    const svg = document.createElement('div');
    svg.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300"></svg>`;

    // Use a temporary render to get SVG
    const tempDiv = document.createElement('div');
    tempDiv.style.position = 'absolute';
    tempDiv.style.left = '-9999px';
    document.body.appendChild(tempDiv);

    // Create SVG QR code using canvas approach
    const url = getLoginUrl(token);
    const img = new Image();
    const svgString = `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300">
      <rect width="300" height="300" fill="white"/>
      <text x="150" y="150" text-anchor="middle" font-size="12">QR: ${url.substring(0, 40)}...</text>
    </svg>`;

    // For proper QR download, use the SVG element from the dialog
    const svgEl = document.querySelector('#qr-code-svg svg') as SVGSVGElement;
    if (svgEl) {
      const svgData = new XMLSerializer().serializeToString(svgEl);
      const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      const downloadUrl = URL.createObjectURL(svgBlob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `qr-${name?.replace(/\s+/g, '-') || 'candidate'}.svg`;
      a.click();
      URL.revokeObjectURL(downloadUrl);
    }

    document.body.removeChild(tempDiv);
  };

  const downloadAllQRCodes = async () => {
    const successResults = results.filter(r => r.status === 'success' && r.magic_token);
    if (successResults.length === 0) return;

    // Generate CSV with login links
    const csv = [
      ['Name', 'Email', 'Login URL', 'QR Code URL'].join(','),
      ...successResults.map(r => [
        r.candidate_name || '',
        r.email || '',
        getLoginUrl(r.magic_token!),
        getLoginUrl(r.magic_token!),
      ].map(v => `"${v.replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `candidate-login-links-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    toast({ title: 'Downloaded', description: `Exported ${successResults.length} login links.` });
  };

  const downloadReport = () => {
    const csv = [
      ['Filename', 'Candidate Name', 'Email', 'Status', 'Login URL', 'Email Sent', 'Error'].join(','),
      ...results.map((r) => [
        r.filename,
        r.candidate_name || '',
        r.email || '',
        r.status,
        r.magic_token ? getLoginUrl(r.magic_token) : '',
        r.email_sent ? 'Yes' : 'No',
        r.error || '',
      ].map((v) => `"${v.replace(/"/g, '""')}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `resume-upload-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getStatusBadge = (status: ParsedResumeResult['status']) => {
    switch (status) {
      case 'success':
        return <Badge className="bg-success text-success-foreground"><CheckCircle2 className="w-3 h-3 mr-1" /> Success</Badge>;
      case 'failed':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" /> Failed</Badge>;
      case 'duplicate':
        return <Badge variant="secondary"><AlertTriangle className="w-3 h-3 mr-1" /> Duplicate</Badge>;
    }
  };

  const successResults = results.filter(r => r.status === 'success' && r.magic_token);

  return (
    <>
      <Card className="shadow-soft border-border mt-6">
        <CardHeader className="border-b border-border">
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            Bulk Resume Upload (PDF Only)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          {/* Drop Zone */}
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${dragActive
                ? 'border-primary bg-primary/5'
                : 'border-border hover:border-primary/50'
              }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <Upload className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-lg font-medium text-foreground mb-2">
              Drag & drop PDF resumes here
            </p>
            <p className="text-sm text-muted-foreground mb-4">
              Supports up to 1000 PDFs per upload. Each candidate gets a unique QR code & login link.
            </p>
            <input
              ref={inputRef}
              type="file"
              accept=".pdf,application/pdf"
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />
            <Button onClick={() => inputRef.current?.click()} variant="outline">
              Browse Files
            </Button>
          </div>

          {/* Selected Files */}
          {files.length > 0 && (
            <div className="mt-6">
              <div className="flex justify-between items-center mb-3">
                <h4 className="font-medium text-foreground">
                  Selected Files ({files.length})
                </h4>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={clearAll} disabled={uploading}>
                    Clear All
                  </Button>
                  <Button size="sm" onClick={handleUpload} disabled={uploading}>
                    {uploading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 mr-2" />
                        Upload & Process
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {uploading && (
                <div className="mb-4">
                  <Progress value={progress} className="h-2" />
                  <p className="text-sm text-muted-foreground mt-1">
                    {progress < 80 ? 'Processing resumes in batches...' : 'Finalizing...'} {progress}%
                  </p>
                </div>
              )}

              <div className="max-h-48 overflow-y-auto border rounded-lg p-2 space-y-1">
                {files.map((file, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2 bg-muted/30 rounded"
                  >
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-primary" />
                      <span className="text-sm truncate max-w-[300px]">{file.name}</span>
                      <span className="text-xs text-muted-foreground">
                        ({(file.size / 1024).toFixed(1)} KB)
                      </span>
                    </div>
                    {!uploading && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6"
                        onClick={() => removeFile(idx)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Results Table */}
          {results.length > 0 && (
            <div className="mt-6">
              <div className="flex justify-between items-center mb-3">
                <h4 className="font-medium text-foreground">
                  Processing Results ({results.length} resumes)
                </h4>
                <div className="flex gap-2">
                  {successResults.length > 0 && (
                    <Button size="sm" variant="outline" onClick={downloadAllQRCodes}>
                      <QrCode className="w-4 h-4 mr-2" />
                      Export Login Links ({successResults.length})
                    </Button>
                  )}
                  <Button size="sm" variant="outline" onClick={downloadReport}>
                    <Download className="w-4 h-4 mr-2" />
                    Full Report
                  </Button>
                </div>
              </div>

              <div className="border rounded-lg overflow-hidden">
                <div className="max-h-[500px] overflow-y-auto">
                  <Table>
                    <TableHeader className="sticky top-0 bg-muted">
                      <TableRow>
                        <TableHead>Candidate</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead className="text-center">Status</TableHead>
                        <TableHead className="text-center">QR / Login</TableHead>
                        <TableHead>Error</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {results.map((result, idx) => (
                        <TableRow key={idx}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{result.candidate_name || '-'}</p>
                              <p className="text-xs text-muted-foreground truncate max-w-[120px]">{result.filename}</p>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm">{result.email || '-'}</TableCell>
                          <TableCell className="text-center">
                            <div className="flex flex-col items-center gap-1">
                              {getStatusBadge(result.status)}
                              {result.email_sent && (
                                <span className="text-[10px] text-success">✉ Email sent</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            {result.status === 'success' && result.magic_token ? (
                              <div className="flex items-center justify-center gap-1">
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-7 w-7"
                                  title="View QR Code"
                                  onClick={() => showQRCode(result.candidate_name || 'Candidate', result.magic_token!)}
                                >
                                  <QrCode className="w-4 h-4 text-primary" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-7 w-7"
                                  title="Copy Login Link"
                                  onClick={() => copyToClipboard(getLoginUrl(result.magic_token!))}
                                >
                                  <Copy className="w-4 h-4 text-muted-foreground" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-7 w-7"
                                  title="Open Login Link"
                                  onClick={() => window.open(getLoginUrl(result.magic_token!), '_blank')}
                                >
                                  <ExternalLink className="w-4 h-4 text-muted-foreground" />
                                </Button>
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-xs">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-destructive text-sm max-w-[200px] truncate">
                            {result.error || '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Summary Stats */}
              <div className="flex gap-4 mt-4 p-4 bg-muted/30 rounded-lg">
                <div className="text-center">
                  <p className="text-2xl font-bold text-success">
                    {results.filter((r) => r.status === 'success').length}
                  </p>
                  <p className="text-sm text-muted-foreground">Created</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-warning">
                    {results.filter((r) => r.status === 'duplicate').length}
                  </p>
                  <p className="text-sm text-muted-foreground">Duplicates</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-destructive">
                    {results.filter((r) => r.status === 'failed').length}
                  </p>
                  <p className="text-sm text-muted-foreground">Failed</p>
                </div>
                <div className="text-center ml-auto">
                  <p className="text-2xl font-bold text-primary">
                    {results.filter((r) => r.email_sent).length}
                  </p>
                  <p className="text-sm text-muted-foreground">Emails Sent</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-primary">
                    {successResults.length}
                  </p>
                  <p className="text-sm text-muted-foreground">QR Codes</p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* QR Code Dialog */}
      <Dialog open={qrDialogOpen} onOpenChange={setQrDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <QrCode className="w-5 h-5 text-primary" />
              QR Code - {selectedQR?.name}
            </DialogTitle>
          </DialogHeader>
          {selectedQR && (
            <div className="flex flex-col items-center gap-4 py-4">
              <div id="qr-code-svg" className="bg-white p-4 rounded-lg border">
                <QRCodeSVG
                  value={selectedQR.url}
                  size={250}
                  level="H"
                  includeMargin
                />
              </div>
              <p className="text-sm text-muted-foreground text-center break-all max-w-[300px]">
                {selectedQR.url}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(selectedQR.url)}
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Copy Link
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    const svgEl = document.querySelector('#qr-code-svg svg') as SVGSVGElement;
                    if (svgEl) {
                      const svgData = new XMLSerializer().serializeToString(svgEl);
                      const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
                      const downloadUrl = URL.createObjectURL(svgBlob);
                      const a = document.createElement('a');
                      a.href = downloadUrl;
                      a.download = `qr-${selectedQR.name.replace(/\s+/g, '-')}.svg`;
                      a.click();
                      URL.revokeObjectURL(downloadUrl);
                    }
                  }}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download QR
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
