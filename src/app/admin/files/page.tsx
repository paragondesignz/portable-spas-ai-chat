'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Trash2,
  RefreshCw,
  Lock,
  FileText,
  AlertCircle,
  Eye,
  X,
  Info,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Download,
  Send,
} from 'lucide-react';
import { AdminNav } from '@/components/admin-nav';
import { useAdminAuth } from '@/hooks/use-admin-auth';

type KnowledgebaseStatus = 'draft' | 'submitted' | 'error';
type KnowledgebaseType = 'upload' | 'text';
type SortColumn = 'title' | 'createdAt' | 'status';

interface KnowledgebaseItem {
  id: string;
  title: string;
  type: KnowledgebaseType;
  originalFileName: string;
  storedFileName: string;
  fileUrl: string;
  size: number;
  status: KnowledgebaseStatus;
  createdAt: string;
  updatedAt: string;
  submittedAt?: string;
  pineconeFileId?: string;
  pineconeStatus?: string;
  lastSubmissionError?: string;
  notes?: string;
  remoteOnly?: boolean;
}

interface KnowledgebaseItemDetail extends KnowledgebaseItem {
  content?: string;
}

export default function FilesPage() {
  const router = useRouter();
  const { isAuthenticated, isChecking, handleLogout, refreshSession } = useAdminAuth();

  const [items, setItems] = useState<KnowledgebaseItem[]>([]);
  const [detailItem, setDetailItem] = useState<KnowledgebaseItemDetail | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [sortBy, setSortBy] = useState<SortColumn>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthenticated) {
      loadItems();
    }
  }, [isAuthenticated]);

  const loadItems = async () => {
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/admin/knowledgebase', {
        credentials: 'include',
      });

      if (!response.ok) {
        if (response.status === 401) {
          await refreshSession();
          throw new Error('Unauthorized');
        }
        throw new Error('Failed to load knowledge base items');
      }

      const data = await response.json();
      setItems((data.items || []) as KnowledgebaseItem[]);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (item: KnowledgebaseItem) => {
    setSubmittingId(item.id);
    setError('');
    setSuccess('');

    try {
      const response = await fetch(`/api/admin/knowledgebase/${item.id}/submit`, {
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
      const updatedItem = data.item as KnowledgebaseItem;

      setItems((prev) => prev.map((entry) => (entry.id === item.id ? updatedItem : entry)));
      setSuccess(`"${updatedItem.title}" submitted to the knowledge base.`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmittingId(null);
    }
  };

  const handleDelete = async (item: KnowledgebaseItem) => {
    const confirmationMessage = item.remoteOnly
      ? `Remove "${item.title}" from Pinecone? This will delete the remote knowledge entry.`
      : `Delete "${item.title}"? This removes the draft${
          item.status === 'submitted' ? ' and the Pinecone knowledge entry' : ''
        }.`;

    if (!window.confirm(confirmationMessage)) {
      return;
    }

    setDeletingId(item.id);
    setError('');
    setSuccess('');

    try {
      const response = await fetch(`/api/admin/knowledgebase/${item.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (response.status === 401) {
        await refreshSession();
        throw new Error('Unauthorized');
      }

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Delete failed');
      }

      setItems((prev) => prev.filter((entry) => entry.id !== item.id));
      setDetailItem((current) => (current?.id === item.id ? null : current));
      setSuccess(
        item.remoteOnly
          ? `"${item.title}" removed from Pinecone.`
          : `"${item.title}" deleted successfully.`
      );
    } catch (err: any) {
      setError(err.message);
    } finally {
      setDeletingId(null);
    }
  };

  const handleView = async (item: KnowledgebaseItem) => {
    try {
      const response = await fetch(`/api/admin/knowledgebase/${item.id}?includeContent=1`, {
        credentials: 'include',
      });

      if (response.status === 401) {
        await refreshSession();
        throw new Error('Unauthorized');
      }

      if (!response.ok) {
        throw new Error('Failed to load item details');
      }

      const data = await response.json();
      setDetailItem({
        ...(data.item as KnowledgebaseItem),
        content: data.content,
      });
    } catch (err: any) {
      setError(err.message);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${Math.round((bytes / Math.pow(k, i)) * 100) / 100} ${sizes[i]}`;
  };

  const formatDate = (iso?: string) => {
    if (!iso) return 'N/A';
    return new Date(iso).toLocaleString();
  };

  const handleSort = (column: SortColumn) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder(column === 'createdAt' ? 'desc' : 'asc');
    }
  };

  const sortedItems = useMemo(() => {
    const sorted = [...items];
    sorted.sort((a, b) => {
      if (sortBy === 'title') {
        const comparison = a.title.localeCompare(b.title);
        return sortOrder === 'asc' ? comparison : -comparison;
      }

      if (sortBy === 'status') {
        const value = (status: KnowledgebaseStatus) => {
          if (status === 'submitted') return 3;
          if (status === 'draft') return 2;
          return 1;
        };
        const comparison = value(a.status) - value(b.status);
        return sortOrder === 'asc' ? comparison : -comparison;
      }

      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      const comparison = dateA - dateB;
      return sortOrder === 'asc' ? comparison : -comparison;
    });
    return sorted;
  }, [items, sortBy, sortOrder]);

  const SortIcon = ({ column }: { column: SortColumn }) => {
    if (sortBy !== column) {
      return <ArrowUpDown className="h-4 w-4" />;
    }
    return sortOrder === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />;
  };

  const statusBadgeClass = (status: KnowledgebaseStatus) => {
    if (status === 'submitted') return 'bg-green-100 text-green-700';
    if (status === 'error') return 'bg-red-100 text-red-700';
    return 'bg-yellow-100 text-yellow-700';
  };

  const statusLabel = (item: KnowledgebaseItem) => {
    if (item.status === 'submitted') return 'Submitted';
    if (item.status === 'error') return 'Needs Attention';
    return 'Draft';
  };

  const typeLabel = (item: KnowledgebaseItem) => {
    if (item.remoteOnly) {
      return 'Uploaded File (Pinecone)';
    }
    return item.type === 'text' ? 'Text Entry' : 'Uploaded File';
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

      <div className="max-w-7xl mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Knowledge Base Drafts</h1>
          <p className="text-gray-600">
            Review, submit, and maintain the files and text entries that feed the AI knowledge base.
          </p>
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

        <Card className="p-4 mb-6 bg-blue-50 border-blue-200">
          <div className="flex gap-3">
            <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-900">
              <p className="font-semibold mb-1">Two-Step Knowledge Base Workflow</p>
              <ul className="list-disc list-inside space-y-1 text-blue-800 ml-1">
                <li>Uploads and text entries are saved as drafts for review.</li>
                <li>Admins can download, edit, or delete drafts before submission.</li>
                <li>Submitting a draft uploads the content to Pinecone for AI search.</li>
                <li>Changes to submitted text entries reset them to draft until resubmitted.</li>
              </ul>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Knowledge Items ({items.length})
            </h2>
            <Button onClick={loadItems} variant="outline" size="sm" disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>

          {isLoading ? (
            <div className="text-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto text-gray-400 mb-2" />
              <p className="text-gray-600">Loading knowledge items...</p>
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-600">No drafts yet</p>
              <p className="text-sm text-gray-500 mt-1">
                Upload a file or create a text entry to populate the knowledge base.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4">
                      <button
                        onClick={() => handleSort('title')}
                        className="flex items-center gap-2 font-semibold text-gray-700 hover:text-gray-900 transition-colors"
                      >
                        Title
                        <SortIcon column="title" />
                      </button>
                    </th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Type</th>
                    <th className="text-left py-3 px-4">
                      <button
                        onClick={() => handleSort('createdAt')}
                        className="flex items-center gap-2 font-semibold text-gray-700 hover:text-gray-900 transition-colors"
                      >
                        Created
                        <SortIcon column="createdAt" />
                      </button>
                    </th>
                    <th className="text-left py-3 px-4">
                      <button
                        onClick={() => handleSort('status')}
                        className="flex items-center gap-2 font-semibold text-gray-700 hover:text-gray-900 transition-colors"
                      >
                        Status
                        <SortIcon column="status" />
                      </button>
                    </th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Size</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedItems.map((item) => (
                    <tr
                      key={item.id}
                      className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                    >
                      <td className="py-3 px-4">
                        <div className="flex flex-col">
                          <span className="font-medium text-gray-900 flex items-center gap-2">
                            {item.title}
                            {item.remoteOnly && (
                              <span className="text-[10px] font-semibold text-blue-600 uppercase tracking-wide">
                                Remote
                              </span>
                            )}
                          </span>
                          <span className="text-xs text-gray-500">{item.originalFileName}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">{typeLabel(item)}</td>
                      <td className="py-3 px-4 text-sm text-gray-600">{formatDate(item.createdAt)}</td>
                      <td className="py-3 px-4">
                        <div className="flex flex-col gap-1">
                          <span
                            className={`text-xs px-2 py-1 rounded self-start ${statusBadgeClass(
                              item.status
                            )}`}
                          >
                            {statusLabel(item)}
                          </span>
                          {item.status === 'submitted' && item.submittedAt && (
                            <span className="text-xs text-gray-500">
                              Submitted {formatDate(item.submittedAt)}
                            </span>
                          )}
                          {item.status === 'error' && item.lastSubmissionError && (
                            <span className="text-xs text-red-600">
                              {item.lastSubmissionError}
                            </span>
                          )}
                          {item.remoteOnly && (
                            <span className="text-xs text-blue-600">
                              Remote Pinecone entry (original file unavailable)
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">{formatBytes(item.size)}</td>
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap justify-end gap-2">
                          <Button
                            onClick={() => handleView(item)}
                            variant="outline"
                            size="sm"
                            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            title="View details"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {item.fileUrl ? (
                            <Button variant="outline" size="sm" asChild title="Download">
                              <a
                                href={item.fileUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 text-gray-600 hover:text-gray-800"
                              >
                                <Download className="h-4 w-4" />
                              </a>
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              disabled
                              title="Original file not available"
                            >
                              <Download className="h-4 w-4 opacity-40" />
                            </Button>
                          )}
                          {!item.remoteOnly && item.status !== 'submitted' && (
                            <Button
                              onClick={() => handleSubmit(item)}
                              size="sm"
                              disabled={submittingId === item.id}
                              className="bg-primary text-white hover:bg-primary/90"
                              title="Submit to knowledge base"
                            >
                              {submittingId === item.id ? (
                                <>
                                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                  Submitting...
                                </>
                              ) : (
                                <>
                                  <Send className="h-4 w-4 mr-2" />
                                  Submit
                                </>
                              )}
                            </Button>
                          )}
                          <Button
                            onClick={() => handleDelete(item)}
                            variant="outline"
                            size="sm"
                            disabled={deletingId === item.id}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50 flex items-center gap-2"
                            title={item.remoteOnly ? 'Remove from Pinecone' : 'Delete draft'}
                          >
                            {deletingId === item.id ? (
                              <RefreshCw className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <Trash2 className="h-4 w-4" />
                                <span>
                                  {item.remoteOnly ? 'Remove' : 'Delete'}
                                </span>
                              </>
                            )}
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

        {detailItem && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <Card className="w-full max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                <div className="flex items-center gap-2 text-gray-900">
                  <FileText className="h-5 w-5" />
                  <h3 className="text-lg font-semibold">Knowledge Item Details</h3>
                </div>
                <button
                  onClick={() => setDetailItem(null)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="px-6 py-4 overflow-y-auto space-y-6">
                <div className="grid md:grid-cols-2 gap-4 bg-gray-50 rounded p-4">
                  <div>
                    <label className="text-xs text-gray-500 uppercase tracking-wide">Title</label>
                    <p className="text-sm text-gray-900 font-medium">{detailItem.title}</p>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 uppercase tracking-wide">Type</label>
                    <p className="text-sm text-gray-900">{typeLabel(detailItem)}</p>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 uppercase tracking-wide">Location</label>
                    <p className="text-sm text-gray-900">
                      {detailItem.remoteOnly ? 'Pinecone (remote only)' : 'Draft storage'}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 uppercase tracking-wide">
                      Original Filename
                    </label>
                    <p className="text-sm text-gray-900 break-all">{detailItem.originalFileName}</p>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 uppercase tracking-wide">Status</label>
                    <p className="text-sm text-gray-900">{statusLabel(detailItem)}</p>
                    {detailItem.status === 'submitted' && detailItem.pineconeStatus && (
                      <p className="text-xs text-gray-500 mt-1">
                        Pinecone status: {detailItem.pineconeStatus}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 uppercase tracking-wide">Size</label>
                    <p className="text-sm text-gray-900">{formatBytes(detailItem.size)}</p>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 uppercase tracking-wide">Created</label>
                    <p className="text-sm text-gray-900">{formatDate(detailItem.createdAt)}</p>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 uppercase tracking-wide">Updated</label>
                    <p className="text-sm text-gray-900">{formatDate(detailItem.updatedAt)}</p>
                  </div>
                  {detailItem.submittedAt && (
                    <div>
                      <label className="text-xs text-gray-500 uppercase tracking-wide">
                        Submitted
                      </label>
                      <p className="text-sm text-gray-900">{formatDate(detailItem.submittedAt)}</p>
                    </div>
                  )}
                  {detailItem.notes && (
                    <div className="md:col-span-2">
                      <label className="text-xs text-gray-500 uppercase tracking-wide">Notes</label>
                      <p className="text-sm text-gray-900">{detailItem.notes}</p>
                    </div>
                  )}
                  {detailItem.lastSubmissionError && (
                    <div className="md:col-span-2">
                      <label className="text-xs text-red-600 uppercase tracking-wide">
                        Submission Error
                      </label>
                      <p className="text-sm text-red-600">{detailItem.lastSubmissionError}</p>
                    </div>
                  )}
                </div>

                {detailItem.type === 'text' && detailItem.content && (
                  <div className="bg-white border border-gray-200 rounded">
                    <div className="px-4 py-2 border-b border-gray-100 bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                      Markdown Preview
                    </div>
                    <pre className="px-4 py-4 text-sm text-gray-800 whitespace-pre-wrap break-words max-h-64 overflow-y-auto">
                      {detailItem.content}
                    </pre>
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  {detailItem.fileUrl ? (
                    <Button variant="outline" size="sm" asChild>
                      <a
                        href={detailItem.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2"
                      >
                        <Download className="h-4 w-4" />
                        Download File
                      </a>
                    </Button>
                  ) : (
                    <Button variant="outline" size="sm" disabled>
                      <Download className="h-4 w-4 opacity-40" />
                      Download Unavailable
                    </Button>
                  )}
                  {!detailItem.remoteOnly && detailItem.status !== 'submitted' && (
                    <Button
                      size="sm"
                      onClick={() => handleSubmit(detailItem)}
                      disabled={submittingId === detailItem.id}
                      className="flex items-center gap-2"
                    >
                      {submittingId === detailItem.id ? (
                        <>
                          <RefreshCw className="h-4 w-4 animate-spin" />
                          Submitting...
                        </>
                      ) : (
                        <>
                          <Send className="h-4 w-4" />
                          Submit Item
                        </>
                      )}
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(detailItem)}
                    disabled={deletingId === detailItem.id}
                    className="flex items-center gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    {deletingId === detailItem.id ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Trash2 className="h-4 w-4" />
                        {detailItem.remoteOnly ? 'Remove from Pinecone' : 'Delete'}
                      </>
                    )}
                  </Button>
                  <div className="flex-1" />
                  <Button variant="ghost" size="sm" onClick={() => setDetailItem(null)}>
                    Close
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
