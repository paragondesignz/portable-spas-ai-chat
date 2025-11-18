'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Upload, RefreshCw, AlertCircle, Lock, Info, Send, CheckCircle } from 'lucide-react';
import { AdminNav } from '@/components/admin-nav';
import { useAdminAuth } from '@/hooks/use-admin-auth';

interface KnowledgebaseItem {
  id: string;
  title: string;
  type: 'upload' | 'text';
  originalFileName: string;
  storedFileName: string;
  fileUrl: string;
  status: 'draft' | 'submitted' | 'error';
  size: number;
  createdAt: string;
  updatedAt: string;
  submittedAt?: string;
  pineconeFileId?: string;
  pineconeStatus?: string;
  lastSubmissionError?: string;
}

export default function UploadPage() {
  const router = useRouter();
  const { isAuthenticated, isChecking, handleLogout, refreshSession } = useAdminAuth();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [draftItem, setDraftItem] = useState<KnowledgebaseItem | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const allowedExtensions = ['.txt', '.pdf', '.md', '.docx', '.json', '.csv'];
      const fileName = file.name.toLowerCase();
      const isValidType = allowedExtensions.some(ext => fileName.endsWith(ext));

      if (!isValidType) {
        setError(`Unsupported file type. Please upload: ${allowedExtensions.join(', ')}`);
        setSelectedFile(null);
        setDraftItem(null);
        setSuccess('');
        e.target.value = '';
        return;
      }

      setSelectedFile(file);
      setDraftItem(null);
      setError('');
      setSuccess('');
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setError('Please select a file');
      return;
    }

    setIsUploading(true);
    setError('');
    setSuccess('');

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const response = await fetch('/api/admin/upload', {
        method: 'POST',
        credentials: 'include',
        body: formData
      });

      if (response.status === 401) {
        await refreshSession();
        throw new Error('Unauthorized');
      }

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Saving draft failed');
      }

      const data = await response.json();
      setDraftItem(data.item);
      setSuccess(`File saved as draft. Review and submit when ready.`);
      setSelectedFile(null);

      const fileInput = document.getElementById('file-input') as HTMLInputElement;
      if (fileInput) fileInput.value = '';

    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmitDraft = async () => {
    if (!draftItem) return;

    setIsSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch(`/api/admin/knowledgebase/${draftItem.id}/submit`, {
        method: 'POST',
        credentials: 'include',
      });

      if (response.status === 401) {
        await refreshSession();
        throw new Error('Unauthorized');
      }

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Submission failed');
      }

      const data = await response.json();
      setDraftItem(data.item);
      setSuccess(`"${draftItem.title}" submitted to the knowledge base successfully!`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  if (isChecking) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-8">
          <div className="flex flex-col items-center mb-6">
            <Lock className="h-12 w-12 text-gray-400 mb-4" />
            <h1 className="text-2xl font-bold text-gray-900">Admin Login Required</h1>
          </div>
          <p className="text-center text-gray-600 mb-4">
            Please login from the main admin page
          </p>
          <Button onClick={() => router.push('/admin')} className="w-full">
            Go to Login
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNav onLogout={handleLogout} />

      <div className="max-w-4xl mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Upload File</h1>
          <p className="text-gray-600">
            Save files as drafts, then submit them to the knowledge base when ready.
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6 flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            {error}
          </div>
        )}

        {(success || draftItem) && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded mb-6 flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              <span>{success || 'Draft saved successfully.'}</span>
            </div>
            {draftItem && (
              <div className="flex flex-col gap-2 text-sm text-green-800">
                <div>
                  <strong>Title:</strong> {draftItem.title}
                </div>
                <div>
                  <strong>Status:</strong>{' '}
                  {draftItem.status === 'submitted' ? 'Submitted to knowledge base' : 'Draft'}
                </div>
                {draftItem.status !== 'submitted' && (
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Button
                      onClick={handleSubmitDraft}
                      disabled={isSubmitting}
                      className="sm:w-auto"
                      size="sm"
                    >
                      {isSubmitting ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          Submitting...
                        </>
                      ) : (
                        <>
                          <Send className="h-4 w-4 mr-2" />
                          Submit to Knowledge Base
                        </>
                      )}
                    </Button>
                    <Button
                      onClick={() => router.push('/admin/files')}
                      variant="outline"
                      size="sm"
                      className="sm:w-auto"
                    >
                      Manage Drafts
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <Card className="p-6 mb-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select File
              </label>
              <input
                id="file-input"
                type="file"
                accept=".txt,.pdf,.md,.docx,.json,.csv"
                onChange={handleFileSelect}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-white hover:file:bg-primary/90 cursor-pointer"
              />
              <p className="text-xs text-gray-500 mt-2">
                Supported formats: TXT, PDF, Markdown, DOCX, JSON, CSV
              </p>
            </div>

            {selectedFile && (
              <div className="bg-blue-50 border border-blue-200 rounded p-3">
                <p className="text-sm text-blue-900">
                  <strong>Selected:</strong> {selectedFile.name} ({formatBytes(selectedFile.size)})
                </p>
              </div>
            )}

            <Button
              onClick={handleUpload}
              disabled={!selectedFile || isUploading}
              className="w-full"
              size="lg"
            >
              {isUploading ? (
                <>
                  <RefreshCw className="h-5 w-5 mr-2 animate-spin" />
                  Saving draft...
                </>
              ) : (
                <>
                  <Upload className="h-5 w-5 mr-2" />
                  Save Draft
                </>
              )}
            </Button>
          </div>
        </Card>

        <Card className="p-4 bg-blue-50 border-blue-200">
          <div className="flex gap-3">
            <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-900">
              <p className="font-semibold mb-1">How File Processing Works</p>
              <ul className="list-disc list-inside space-y-1 text-blue-800">
                <li>Uploaded files are saved as drafts for review</li>
                <li>Admins can download, edit, or delete drafts before submission</li>
                <li>When submitted, files are converted to Pinecone knowledge entries</li>
                <li>CSV files are automatically converted to Markdown format</li>
              </ul>
              <p className="mt-2 text-blue-800">
                💡 <strong>Keep backups</strong> - Original files are not stored by Pinecone
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
