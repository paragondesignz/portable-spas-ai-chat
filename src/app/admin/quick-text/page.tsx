'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Upload, RefreshCw, AlertCircle, Lock, Info } from 'lucide-react';
import { AdminNav } from '@/components/admin-nav';
import { useAdminAuth } from '@/hooks/use-admin-auth';

export default function QuickTextPage() {
  const router = useRouter();
  const { isAuthenticated, isChecking, handleLogout, refreshSession } = useAdminAuth();
  const [quickText, setQuickText] = useState('');
  const [quickTextTitle, setQuickTextTitle] = useState('');
  const [isUploadingText, setIsUploadingText] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleQuickTextUpload = async () => {
    if (!quickText.trim()) {
      setError('Please enter some text');
      return;
    }

    if (!quickTextTitle.trim()) {
      setError('Please enter a title');
      return;
    }

    setIsUploadingText(true);
    setError('');
    setSuccess('');

    try {
      const markdown = `# ${quickTextTitle}\n\n${quickText}`;
      const blob = new Blob([markdown], { type: 'text/markdown' });
      const fileName = `${quickTextTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.md`;

      const formData = new FormData();
      formData.append('file', blob, fileName);

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
        throw new Error(data.error || 'Upload failed');
      }

      const data = await response.json();
      setSuccess(`Text uploaded successfully as "${fileName}"!`);
      setQuickText('');
      setQuickTextTitle('');

    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsUploadingText(false);
    }
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
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Quick Text Entry</h1>
          <p className="text-gray-600">Quickly add information without creating a file first</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6 flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded mb-6">
            {success}
          </div>
        )}

        <Card className="p-6 mb-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Title <span className="text-red-500">*</span>
              </label>
              <Input
                type="text"
                value={quickTextTitle}
                onChange={(e) => setQuickTextTitle(e.target.value)}
                placeholder="e.g., Delivery Information or Holiday Hours"
                className="w-full"
              />
              <p className="text-xs text-gray-500 mt-1">
                This will be used as the heading and filename
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Content <span className="text-red-500">*</span>
              </label>
              <textarea
                value={quickText}
                onChange={(e) => setQuickText(e.target.value)}
                placeholder="Enter any important information you want the AI to know about..."
                rows={12}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-y"
              />
              <p className="text-xs text-gray-500 mt-1">
                You can use Markdown formatting if you like
              </p>
            </div>

            <Button
              onClick={handleQuickTextUpload}
              disabled={!quickText.trim() || !quickTextTitle.trim() || isUploadingText}
              className="w-full"
              size="lg"
            >
              {isUploadingText ? (
                <>
                  <RefreshCw className="h-5 w-5 mr-2 animate-spin" />
                  Uploading to Pinecone...
                </>
              ) : (
                <>
                  <Upload className="h-5 w-5 mr-2" />
                  Upload to Pinecone
                </>
              )}
            </Button>
          </div>
        </Card>

        <Card className="p-4 bg-blue-50 border-blue-200">
          <div className="flex gap-3">
            <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-900">
              <p className="font-semibold mb-1">Quick Text Entry</p>
              <p className="mb-2">
                This tool is perfect for adding short pieces of information that don't require
                creating a separate file. Examples:
              </p>
              <ul className="list-disc list-inside space-y-1 text-blue-800">
                <li>Store hours or holiday schedules</li>
                <li>Delivery information or shipping policies</li>
                <li>Warranty details or return policies</li>
                <li>Quick FAQ answers</li>
              </ul>
              <p className="mt-2 text-blue-800">
                The text will be automatically saved as a Markdown file and uploaded to Pinecone.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
