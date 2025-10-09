'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Upload, Trash2, RefreshCw, Lock, FileText, AlertCircle, Eye, X, Info, Globe, ShoppingCart } from 'lucide-react';

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
  const [viewingFile, setViewingFile] = useState<FileInfo | null>(null);
  const [isLoadingFile, setIsLoadingFile] = useState(false);
  const [isScraping, setIsScraping] = useState(false);
  const [scrapeUrl, setScrapeUrl] = useState('https://portablespas.co.nz');
  const [maxPages, setMaxPages] = useState(200);
  const [scrapeFileName, setScrapeFileName] = useState('');
  const [isSyncingProducts, setIsSyncingProducts] = useState(false);
  const [quickText, setQuickText] = useState('');
  const [quickTextTitle, setQuickTextTitle] = useState('');
  const [isUploadingText, setIsUploadingText] = useState(false);

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
      // Validate file type
      const allowedExtensions = ['.txt', '.pdf', '.md', '.docx', '.json', '.csv'];
      const fileName = file.name.toLowerCase();
      const isValidType = allowedExtensions.some(ext => fileName.endsWith(ext));

      if (!isValidType) {
        setError(`Unsupported file type. Please upload: ${allowedExtensions.join(', ')}`);
        setSelectedFile(null);
        setSuccess('');
        // Reset file input
        e.target.value = '';
        return;
      }

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

  const handleViewFile = async (file: FileInfo) => {
    setIsLoadingFile(true);
    setError('');

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
    } finally {
      setIsLoadingFile(false);
    }
  };

  const handleScrapeWebsite = async () => {
    if (!scrapeUrl) {
      setError('Please enter a URL to scrape');
      return;
    }

    setIsScraping(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/admin/scrape', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${password}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          url: scrapeUrl,
          maxPages,
          fileName: scrapeFileName
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Scraping failed');
      }

      const data = await response.json();
      setSuccess(`Successfully scraped ${data.stats.pagesScraped} pages and uploaded to Pinecone! File: ${data.stats.fileName}`);

      // Reload files
      await loadFiles();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsScraping(false);
    }
  };

  const handleSyncProducts = async () => {
    setIsSyncingProducts(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/admin/sync-products', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${password}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Product sync failed');
      }

      const data = await response.json();
      setSuccess(`Successfully synced ${data.stats.productsFound} products from Shopify! File: ${data.stats.fileName}`);

      // Reload files
      await loadFiles();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSyncingProducts(false);
    }
  };

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
      // Create markdown content
      const markdown = `# ${quickTextTitle}\n\n${quickText}`;
      const blob = new Blob([markdown], { type: 'text/markdown' });
      const fileName = `${quickTextTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.md`;

      const formData = new FormData();
      formData.append('file', blob, fileName);

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
      setSuccess(`Text uploaded successfully as "${fileName}"!`);
      setQuickText('');
      setQuickTextTitle('');

      // Reload files
      await loadFiles();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsUploadingText(false);
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
                Select File (.txt, .pdf, .md, .docx, .json, .csv)
              </label>
              <input
                id="file-input"
                type="file"
                accept=".txt,.pdf,.md,.docx,.json,.csv"
                onChange={handleFileSelect}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-white hover:file:bg-primary/90 cursor-pointer"
              />
              <p className="text-xs text-gray-500 mt-1">
                Supported: TXT, PDF, Markdown, DOCX, JSON, CSV (CSV auto-converts to Markdown)
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

        {/* Quick Text Entry Section */}
        <Card className="p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Quick Text Entry
          </h2>

          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded p-3">
              <div className="flex gap-2">
                <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-900">
                  <p className="font-semibold mb-1">Add Quick Information</p>
                  <p>
                    Quickly add important information to Pinecone without creating a file first.
                    The text will be saved as a Markdown file and uploaded automatically.
                  </p>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Title
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
                Content
              </label>
              <textarea
                value={quickText}
                onChange={(e) => setQuickText(e.target.value)}
                placeholder="Enter any important information you want the AI to know about..."
                rows={6}
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
            >
              {isUploadingText ? (
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

        {/* Product Catalog Sync Section */}
        <Card className="p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Sync Product Catalog
          </h2>

          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded p-3">
              <div className="flex gap-2">
                <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-900">
                  <p className="font-semibold mb-1">Shopify Product Feed</p>
                  <p>
                    This will fetch your current published products from Shopify (https://portablespas.co.nz/collections/all.atom),
                    convert them to a structured markdown catalog, and upload to Pinecone. Only active/published products are included.
                  </p>
                </div>
              </div>
            </div>

            <Button
              onClick={handleSyncProducts}
              disabled={isSyncingProducts}
              className="w-full"
            >
              {isSyncingProducts ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Syncing Products...
                </>
              ) : (
                <>
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  Sync Products from Shopify
                </>
              )}
            </Button>
          </div>
        </Card>

        {/* Website Scraper Section */}
        <Card className="p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Scrape Website
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Website URL
              </label>
              <Input
                type="url"
                value={scrapeUrl}
                onChange={(e) => setScrapeUrl(e.target.value)}
                placeholder="https://portablespas.co.nz or https://portablespas.co.nz/spas"
                className="w-full"
              />
              <p className="text-xs text-gray-500 mt-1">
                Enter full site URL or specific directory (e.g., /spas, /accessories) to scrape only that section
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                File Name (Optional)
              </label>
              <Input
                type="text"
                value={scrapeFileName}
                onChange={(e) => setScrapeFileName(e.target.value)}
                placeholder="e.g., spas-catalog or accessories-info"
                className="w-full"
              />
              <p className="text-xs text-gray-500 mt-1">
                Custom name to identify this content in Pinecone (auto-generated if blank)
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Max Pages to Scrape
              </label>
              <Input
                type="number"
                value={maxPages}
                onChange={(e) => setMaxPages(parseInt(e.target.value) || 200)}
                min="1"
                max="1000"
                className="w-full"
              />
              <p className="text-xs text-gray-500 mt-1">
                Limit the number of pages to scrape (recommended: 200-500 for full site coverage)
              </p>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
              <div className="flex gap-2">
                <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-yellow-900">
                  <p className="font-semibold mb-1">Scraping Info</p>
                  <p>
                    This will crawl the website, extract all text content, convert it to Markdown,
                    and automatically upload it to Pinecone. The process may take several minutes.
                  </p>
                </div>
              </div>
            </div>

            <Button
              onClick={handleScrapeWebsite}
              disabled={!scrapeUrl || isScraping}
              className="w-full"
            >
              {isScraping ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Scraping... This may take a few minutes
                </>
              ) : (
                <>
                  <Globe className="h-4 w-4 mr-2" />
                  Scrape & Upload to Pinecone
                </>
              )}
            </Button>
          </div>
        </Card>

        {/* Info Box */}
        <Card className="p-4 mb-6 bg-blue-50 border-blue-200">
          <div className="flex gap-3">
            <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-900">
              <p className="font-semibold mb-1">About Pinecone Assistant File Processing</p>
              <p className="mb-2">
                When you upload a file, Pinecone processes it for AI-powered search:
              </p>
              <ul className="list-disc list-inside space-y-1 text-blue-800 ml-2">
                <li>Content is extracted and split into chunks</li>
                <li>Chunks are converted to vectors (embeddings)</li>
                <li>Vectors are stored for semantic search</li>
                <li><strong>Original files are not stored</strong> - only processed knowledge</li>
              </ul>
              <p className="mt-2 text-blue-800">
                💡 <strong>Keep your original files backed up</strong> - they cannot be downloaded from Pinecone.
              </p>
            </div>
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
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={() => handleViewFile(file)}
                      variant="outline"
                      size="sm"
                      className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                      title="View file metadata"
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </Button>
                    <Button
                      onClick={() => handleDelete(file.id, file.name)}
                      variant="outline"
                      size="sm"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      title="Delete from Pinecone"
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* File View Modal */}
        {viewingFile && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <Card className="w-full max-w-2xl max-h-[80vh] overflow-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                    <FileText className="h-6 w-6" />
                    File Details
                  </h3>
                  <button
                    onClick={() => setViewingFile(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="bg-gray-50 rounded p-4 space-y-3">
                    <div>
                      <label className="text-sm font-medium text-gray-600">Name</label>
                      <p className="text-gray-900 font-mono text-sm">{viewingFile.name}</p>
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium text-gray-600">File ID</label>
                      <p className="text-gray-900 font-mono text-xs break-all">{viewingFile.id}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-600">Status</label>
                        <p className={`text-sm font-medium ${
                          viewingFile.status === 'Available' 
                            ? 'text-green-600' 
                            : 'text-yellow-600'
                        }`}>
                          {viewingFile.status}
                        </p>
                      </div>
                      
                      <div>
                        <label className="text-sm font-medium text-gray-600">Size</label>
                        <p className="text-gray-900 text-sm">{formatBytes(viewingFile.size)}</p>
                      </div>
                    </div>

                    {viewingFile.createdOn && (
                      <div>
                        <label className="text-sm font-medium text-gray-600">Created</label>
                        <p className="text-gray-900 text-sm">
                          {new Date(viewingFile.createdOn).toLocaleString()}
                        </p>
                      </div>
                    )}

                    {viewingFile.updatedOn && (
                      <div>
                        <label className="text-sm font-medium text-gray-600">Last Updated</label>
                        <p className="text-gray-900 text-sm">
                          {new Date(viewingFile.updatedOn).toLocaleString()}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="bg-amber-50 border border-amber-200 rounded p-4">
                    <div className="flex gap-2">
                      <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0" />
                      <div className="text-sm text-amber-900">
                        <p className="font-semibold mb-1">Original File Not Available</p>
                        <p className="mb-2">
                          Pinecone processes files for AI search and doesn't store the original file. 
                          Only the extracted knowledge exists as vectors in your knowledge base.
                        </p>
                        <p className="text-amber-800">
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

