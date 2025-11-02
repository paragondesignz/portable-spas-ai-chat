'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Trash2, RefreshCw, Lock, FileText, AlertCircle, Eye, X, Info, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { AdminNav } from '@/components/admin-nav';

interface FileInfo {
  id: string;
  name: string;
  status: string;
  size: number;
  createdOn?: string;
  updatedOn?: string;
}

export default function AdminPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [viewingFile, setViewingFile] = useState<FileInfo | null>(null);
  const [sortBy, setSortBy] = useState<'name' | 'date'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    const savedPassword = localStorage.getItem('admin_password');
    if (savedPassword) {
      // User is already authenticated, redirect to dashboard
      router.push('/admin/dashboard');
    }
  }, [router]);

  const handleLogin = async () => {
    setError('');
    if (!password) {
      setError('Please enter a password');
      return;
    }

    try {
      // Verify password by attempting to load files
      const response = await fetch('/api/admin/files', {
        headers: {
          'Authorization': `Bearer ${password}`
        }
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Invalid password');
        }
        throw new Error('Login failed');
      }

      // Password is valid, save it and redirect to dashboard
      localStorage.setItem('admin_password', password);
      router.push('/admin/dashboard');
    } catch (err: any) {
      setError(err.message || 'Invalid password');
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

  const handleViewFile = async (file: FileInfo) => {
    try {
      const response = await fetch(`/api/admin/files/${file.id}`, {
        headers: {
          'Authorization': `Bearer ${password}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to load file details');
      }

      const data = await response.json();
      setViewingFile(data.file);
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

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString();
  };

  const handleSort = (column: 'name' | 'date') => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder(column === 'date' ? 'desc' : 'asc');
    }
  };

  const sortedFiles = [...files].sort((a, b) => {
    if (sortBy === 'name') {
      const comparison = a.name.localeCompare(b.name);
      return sortOrder === 'asc' ? comparison : -comparison;
    } else {
      const dateA = a.createdOn ? new Date(a.createdOn).getTime() : 0;
      const dateB = b.createdOn ? new Date(b.createdOn).getTime() : 0;
      const comparison = dateA - dateB;
      return sortOrder === 'asc' ? comparison : -comparison;
    }
  });

  const SortIcon = ({ column }: { column: 'name' | 'date' }) => {
    if (sortBy !== column) {
      return <ArrowUpDown className="h-4 w-4" />;
    }
    return sortOrder === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />;
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-800 dark:bg-gray-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-8">
          <div className="flex flex-col items-center mb-6">
            <Lock className="h-12 w-12 text-gray-400 mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Admin Login</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
              Portable Spas AI Assistant
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
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
              <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 px-4 py-3 rounded text-sm">
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

            <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-4">
              Set ADMIN_PASSWORD in your Vercel environment variables
            </p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-800 dark:bg-gray-900">
      <AdminNav onLogout={handleLogout} />

      <div className="max-w-7xl mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">File Management</h1>
          <p className="text-gray-600 dark:text-gray-400">View and manage files in your Pinecone knowledge base</p>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 px-4 py-3 rounded mb-6 flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-900 text-green-700 dark:text-green-300 px-4 py-3 rounded mb-6">
            {success}
          </div>
        )}

        <Card className="p-4 mb-6 bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-900">
          <div className="flex gap-3">
            <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-900 dark:text-blue-100">
              <p className="font-semibold mb-1">About Pinecone File Processing</p>
              <p className="mb-2">
                When you upload a file, Pinecone processes it for AI-powered search:
              </p>
              <ul className="list-disc list-inside space-y-1 text-blue-800 dark:text-blue-200 ml-2">
                <li>Content is extracted and split into chunks</li>
                <li>Chunks are converted to vectors (embeddings)</li>
                <li>Vectors are stored for semantic search</li>
                <li><strong>Original files are not stored</strong> - only processed knowledge</li>
              </ul>
              <p className="mt-2 text-blue-800 dark:text-blue-200">
                💡 <strong>Keep your original files backed up</strong> - they cannot be downloaded from Pinecone.
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
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
              <p className="text-gray-600 dark:text-gray-400">Loading files...</p>
            </div>
          ) : files.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-600 dark:text-gray-400">No files uploaded yet</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Use the Upload page to add files
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left py-3 px-4">
                      <button
                        onClick={() => handleSort('name')}
                        className="flex items-center gap-2 font-semibold text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:text-gray-100 transition-colors"
                      >
                        Name
                        <SortIcon column="name" />
                      </button>
                    </th>
                    <th className="text-left py-3 px-4">
                      <button
                        onClick={() => handleSort('date')}
                        className="flex items-center gap-2 font-semibold text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:text-gray-100 transition-colors"
                      >
                        Date Added
                        <SortIcon column="date" />
                      </button>
                    </th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">Status</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">Size</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedFiles.map((file) => (
                    <tr
                      key={file.id}
                      className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:bg-gray-800 transition-colors"
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-gray-400 flex-shrink-0" />
                          <span className="font-medium text-gray-900 dark:text-gray-100">{file.name}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">
                        {formatDate(file.createdOn)}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`text-xs px-2 py-1 rounded ${
                          file.status === 'Available'
                            ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300'
                            : 'bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300'
                        }`}>
                          {file.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">
                        {formatBytes(file.size)}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            onClick={() => handleViewFile(file)}
                            variant="outline"
                            size="sm"
                            className="text-blue-600 dark:text-blue-400 hover:text-blue-700 hover:bg-blue-50 dark:bg-blue-950"
                            title="View file metadata"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            onClick={() => handleDelete(file.id, file.name)}
                            variant="outline"
                            size="sm"
                            className="text-red-600 hover:text-red-700 dark:text-red-300 hover:bg-red-50 dark:bg-red-950"
                            title="Delete from Pinecone"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* File View Modal */}
        {viewingFile && (
          <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center p-4 z-50">
            <Card className="w-full max-w-2xl max-h-[80vh] overflow-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                    <FileText className="h-6 w-6" />
                    File Details
                  </h3>
                  <button
                    onClick={() => setViewingFile(null)}
                    className="text-gray-400 hover:text-gray-600 dark:text-gray-400"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="bg-gray-50 dark:bg-gray-800 rounded p-4 space-y-3">
                    <div>
                      <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Name</label>
                      <p className="text-gray-900 dark:text-gray-100 font-mono text-sm">{viewingFile.name}</p>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-gray-600 dark:text-gray-400">File ID</label>
                      <p className="text-gray-900 dark:text-gray-100 font-mono text-xs break-all">{viewingFile.id}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Status</label>
                        <p className={`text-sm font-medium ${
                          viewingFile.status === 'Available'
                            ? 'text-green-600'
                            : 'text-yellow-600'
                        }`}>
                          {viewingFile.status}
                        </p>
                      </div>

                      <div>
                        <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Size</label>
                        <p className="text-gray-900 dark:text-gray-100 text-sm">{formatBytes(viewingFile.size)}</p>
                      </div>
                    </div>

                    {viewingFile.createdOn && (
                      <div>
                        <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Created</label>
                        <p className="text-gray-900 dark:text-gray-100 text-sm">
                          {new Date(viewingFile.createdOn).toLocaleString()}
                        </p>
                      </div>
                    )}

                    {viewingFile.updatedOn && (
                      <div>
                        <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Last Updated</label>
                        <p className="text-gray-900 dark:text-gray-100 text-sm">
                          {new Date(viewingFile.updatedOn).toLocaleString()}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-900 rounded p-4">
                    <div className="flex gap-2">
                      <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                      <div className="text-sm text-amber-900 dark:text-amber-100">
                        <p className="font-semibold mb-1">Original File Not Available</p>
                        <p className="mb-2">
                          Pinecone processes files for AI search and doesn't store the original file.
                          Only the extracted knowledge exists as vectors in your knowledge base.
                        </p>
                        <p className="text-amber-800 dark:text-amber-200">
                          💡 Keep backups of your original files if you need them later.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={() => setViewingFile(null)}
                      className="flex-1"
                    >
                      Close
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
