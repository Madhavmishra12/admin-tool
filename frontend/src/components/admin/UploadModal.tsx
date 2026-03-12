"use client";

import React, { useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Upload, FileSpreadsheet, X, CheckCircle, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import * as XLSX from 'xlsx';

interface UploadModalProps {
  open: boolean;
  onClose: () => void;
  onUploadComplete: () => void;
}

interface PreviewRow {
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  [key: string]: unknown;
}

export default function UploadModal({ open, onClose, onUploadComplete }: UploadModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<PreviewRow[]>([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const { toast } = useToast();

  const parseFile = async (f: File) => {
    try {
      const buffer = await f.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json<PreviewRow>(worksheet);
      setPreview(data.slice(0, 5));
      setFile(f);
    } catch {
      toast({
        title: 'Parse Error',
        description: 'Could not parse the file. Ensure it is a valid Excel/CSV file.',
        variant: 'destructive',
      });
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f && (f.name.endsWith('.xlsx') || f.name.endsWith('.xls') || f.name.endsWith('.csv'))) {
      parseFile(f);
    } else {
      toast({
        title: 'Invalid File',
        description: 'Please upload an Excel (.xlsx, .xls) or CSV file.',
        variant: 'destructive',
      });
    }
  }, [toast]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) parseFile(f);
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setProgress(0);

    // Simulate upload progress (replace with actual API call)
    const interval = setInterval(() => {
      setProgress((p) => {
        if (p >= 90) {
          clearInterval(interval);
          return p;
        }
        return p + 10;
      });
    }, 200);

    // Mock API call delay
    await new Promise((r) => setTimeout(r, 2000));
    clearInterval(interval);
    setProgress(100);

    // In production, use: await apiUpload('/users/upload', file, setProgress);

    toast({
      title: 'Upload Complete',
      description: `Successfully processed ${preview.length}+ records.`,
    });

    setTimeout(() => {
      setUploading(false);
      setFile(null);
      setPreview([]);
      setProgress(0);
      onUploadComplete();
      onClose();
    }, 500);
  };

  const handleClose = () => {
    if (!uploading) {
      setFile(null);
      setPreview([]);
      setProgress(0);
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5" />
            Upload Users
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          {!file ? (
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              className={`
                border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer
                ${dragOver ? 'border-primary bg-primary/5' : 'border-border hover:border-muted-foreground'}
              `}
              onClick={() => document.getElementById('file-input')?.click()}
            >
              <input
                id="file-input"
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileSelect}
                className="hidden"
              />
              <Upload className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-foreground font-medium mb-1">
                Drop your file here or click to browse
              </p>
              <p className="text-sm text-muted-foreground">
                Supports .xlsx, .xls, and .csv files
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-3">
                  <FileSpreadsheet className="w-8 h-8 text-primary" />
                  <div>
                    <p className="font-medium text-foreground">{file.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {(file.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                </div>
                {!uploading && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => { setFile(null); setPreview([]); }}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>

              {preview.length > 0 && (
                <div className="border rounded-lg overflow-hidden">
                  <div className="bg-muted px-4 py-2 border-b">
                    <p className="text-sm font-medium text-foreground">
                      Preview (first {preview.length} rows)
                    </p>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50">
                        <tr>
                          {Object.keys(preview[0]).slice(0, 4).map((key) => (
                            <th key={key} className="px-4 py-2 text-left font-medium text-muted-foreground">
                              {key}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {preview.map((row, i) => (
                          <tr key={i} className="border-t border-border">
                            {Object.values(row).slice(0, 4).map((val, j) => (
                              <td key={j} className="px-4 py-2 text-foreground">
                                {String(val ?? '')}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {uploading && (
                <div className="space-y-2">
                  <Progress value={progress} className="h-2" />
                  <p className="text-sm text-center text-muted-foreground">
                    {progress < 100 ? 'Uploading...' : 'Processing complete!'}
                  </p>
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={handleClose} disabled={uploading}>
              Cancel
            </Button>
            <Button onClick={handleUpload} disabled={!file || uploading}>
              {uploading ? 'Uploading...' : 'Upload'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
