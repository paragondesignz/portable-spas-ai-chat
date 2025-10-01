'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Upload, Trash2, RefreshCw, Lock, FileText, AlertCircle } from 'lucide-react';

interface FileInfo {
  id: string;
  name: string;
  status: string;
  size: number;
  createdOn?: string;
  updatedOn?: string;
}

export default function AdminPage() {
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Check if already authenticated
  useEffect(() => {
    const savedPassword = localStorage.getItem('admin_password');
    if (savedPassword) {
      setPassword(savedPassword);
      setIsAuthenticated(true);
      loadFiles(savedPassword);
    }
  }, []);

  const handleLogin = async () => {
    setError('');
    if (!password) {
      setError('Please enter a password');
      return;
    }

    // Try to load files to verify password
    try {
      await loadFiles(password);
      localStorage.setItem('admin_password', password);
      setIsAuthenticated(true);
    } catch (err: any) {
      setError('Invalid password');
      setIsAuthenticated(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('admin_password');
    setPassword('');
    setIsAuthenticated(false);
    setFiles([]);
  };

  const loadFiles = async (pwd: string = password) => {
    setIsLoading(true);
    setError('');
    
    try {
      const response = await fetch('/api/admin/files', {
        headers: {
          'Authorization': `Bearer ${pwd}`
        }
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Unauthorized');
        }
        throw new Error('Failed to load files');
      }

      const data = await response.json();
      setFiles(data.files || []);
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
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
        headers: {
          'Authorization': `Bearer ${password}`
        },
        body: formData
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Upload failed');
      }

      const data = await response.json();
      setSuccess(`File "${data.file.name}" uploaded successfully!`);
      setSelectedFile(null);
      
      // Reset file input
      const fileInput = document.getElementById('file-input') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
      
      // Reload files
      await loadFiles();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (fileId: string, fileName: string) => {
    if (!confirm(`Are you sure you want to delete "${fileName}"?`)) {
      return;
    }

    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/admin/files', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${password}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ fileId })
      });

      if (!response.ok) {
        throw new Error('Delete failed');
      }

      setSuccess(`File "${fileName}" deleted successfully!`);
      await loadFiles();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-8">
          <div className="flex flex-col items-center mb-6">
            <Lock className="h-12 w-12 text-gray-400 mb-4" />
            <h1 className="text-2xl font-bold text-gray-900">Admin Login</h1>
            <p className="text-sm text-gray-600 mt-2">
              Pinecone File Management
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                placeholder="Enter admin password"
                className="w-full"
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">
                {error}
              </div>
            )}

            <Button
              onClick={handleLogin}
              className="w-full"
              disabled={!password}
            >
              Login
            </Button>

            <p className="text-xs text-gray-500 text-center mt-4">
              Set ADMIN_PASSWORD in your Vercel environment variables
            </p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Pinecone File Manager
              </h1>
              <p className="text-gray-600 mt-1">
                Manage your Portable Spas assistant files
              </p>
            </div>
            <Button onClick={handleLogout} variant="outline">
              Logout
            </Button>
          </div>
        </div>

        {/* Upload Section */}
        <Card className="p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload File
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select File (.txt, .pdf, .md, .csv, etc.)
              </label>
              <input
                id="file-input"
                type="file"
                onChange={handleFileSelect}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-white hover:file:bg-primary/90 cursor-pointer"
              />
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
            >
              {isUploading ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload to Pinecone
                </>
              )}
            </Button>
          </div>
        </Card>

        {/* Messages */}
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

        {/* Files List */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Uploaded Files ({files.length})
            </h2>
            <Button
              onClick={() => loadFiles()}
              variant="outline"
              size="sm"
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>

          {isLoading ? (
            <div className="text-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto text-gray-400 mb-2" />
              <p className="text-gray-600">Loading files...</p>
            </div>
          ) : files.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-600">No files uploaded yet</p>
              <p className="text-sm text-gray-500 mt-1">
                Upload a file to get started
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {files.map((file) => (
                <div
                  key={file.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <FileText className="h-5 w-5 text-gray-400" />
                      <p className="font-medium text-gray-900">{file.name}</p>
                      <span className={`text-xs px-2 py-1 rounded ${
                        file.status === 'Available' 
                          ? 'bg-green-100 text-green-700'
                          : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {file.status}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      {formatBytes(file.size)} • ID: {file.id}
                    </p>
                  </div>
                  <Button
                    onClick={() => handleDelete(file.id, file.name)}
                    variant="outline"
                    size="sm"
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

