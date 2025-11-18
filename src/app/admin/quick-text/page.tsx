'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  AlertCircle,
  CheckCircle,
  FileText,
  Info,
  Lock,
  Plus,
  RefreshCw,
  Save,
  Send,
  Trash2,
} from 'lucide-react';
import { AdminNav } from '@/components/admin-nav';
import { useAdminAuth } from '@/hooks/use-admin-auth';

type KnowledgebaseStatus = 'draft' | 'submitted' | 'error';

interface TextItem {
  id: string;
  title: string;
  status: KnowledgebaseStatus;
  createdAt: string;
  updatedAt: string;
  submittedAt?: string;
  pineconeStatus?: string;
  lastSubmissionError?: string;
  content?: string;
}

export default function QuickTextPage() {
  const router = useRouter();
  const { isAuthenticated, isChecking, handleLogout, refreshSession } = useAdminAuth();

  const [items, setItems] = useState<TextItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [dirty, setDirty] = useState(false);

  const [isLoadingList, setIsLoadingList] = useState(false);
  const [isLoadingEntry, setIsLoadingEntry] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (isAuthenticated) {
      loadItems();
    }
  }, [isAuthenticated]);

  const loadItems = async () => {
    setIsLoadingList(true);
    setError('');

    try {
      const response = await fetch('/api/admin/knowledgebase?type=text', {
        credentials: 'include',
      });

      if (response.status === 401) {
        await refreshSession();
        throw new Error('Unauthorized');
      }

      if (!response.ok) {
        throw new Error('Failed to load text entries');
      }

      const data = await response.json();
      setItems((data.items || []) as TextItem[]);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoadingList(false);
    }
  };

  const selectedItem = useMemo(
    () => (selectedId ? items.find((item) => item.id === selectedId) ?? null : null),
    [items, selectedId]
  );

  const resetEditor = () => {
    setSelectedId(null);
    setTitle('');
    setContent('');
    setDirty(false);
    setSuccess('');
    setError('');
  };

  const handleNew = () => {
    resetEditor();
    setSuccess('');
  };

  const handleSelectItem = async (item: TextItem) => {
    if (dirty && !window.confirm('Discard unsaved changes?')) {
      return;
    }

    setSuccess('');
    setError('');
    setIsLoadingEntry(true);

    try {
      const response = await fetch(`/api/admin/knowledgebase/${item.id}?includeContent=1`, {
        credentials: 'include',
      });

      if (response.status === 401) {
        await refreshSession();
        throw new Error('Unauthorized');
      }

      if (!response.ok) {
        throw new Error('Failed to load entry');
      }

      const data = await response.json();
      const updatedItem = data.item as TextItem;

      setItems((prev) =>
        prev.map((entry) => (entry.id === updatedItem.id ? { ...entry, ...updatedItem } : entry))
      );

      setSelectedId(updatedItem.id);
      setTitle(updatedItem.title);
      setContent(data.content || '');
      setDirty(false);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoadingEntry(false);
    }
  };

  const saveDraft = async (options?: { suppressMessage?: boolean }) => {
    const suppressMessage = options?.suppressMessage ?? false;

    if (!title.trim()) {
      setError('Title is required');
      return null;
    }

    if (!content.trim()) {
      setError('Content cannot be empty');
      return null;
    }

    setIsSaving(true);
    setError('');
    if (!suppressMessage) {
      setSuccess('');
    }

    try {
      if (selectedId) {
        const response = await fetch(`/api/admin/knowledgebase/${selectedId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({ title, content }),
        });

        if (response.status === 401) {
          await refreshSession();
          throw new Error('Unauthorized');
        }

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to save updates');
        }

        const data = await response.json();
        const updatedItem = data.item as TextItem;

        setItems((prev) =>
          prev.map((entry) => (entry.id === updatedItem.id ? { ...entry, ...updatedItem } : entry))
        );
        setSelectedId(updatedItem.id);
        setDirty(false);

        if (!suppressMessage) {
          setSuccess(`"${updatedItem.title}" saved as draft.`);
        }

        return updatedItem;
      } else {
        const response = await fetch('/api/admin/knowledgebase', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({ type: 'text', title, content }),
        });

        if (response.status === 401) {
          await refreshSession();
          throw new Error('Unauthorized');
        }

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to create draft');
        }

        const data = await response.json();
        const newItem = data.item as TextItem;

        setItems((prev) => [newItem, ...prev]);
        setSelectedId(newItem.id);
        setDirty(false);

        if (!suppressMessage) {
          setSuccess(`"${newItem.title}" created as draft.`);
        }

        return newItem;
      }
    } catch (err: any) {
      setError(err.message);
      return null;
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedId && !dirty) {
      setError('Save the draft before submitting.');
      return;
    }

    let itemToSubmit: TextItem | null = selectedItem ?? null;

    if (!itemToSubmit || dirty) {
      const saved = await saveDraft({ suppressMessage: true });
      if (!saved) {
        return;
      }
      itemToSubmit = saved;
    }

    if (!itemToSubmit) {
      return;
    }

    setIsSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch(`/api/admin/knowledgebase/${itemToSubmit.id}/submit`, {
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
      const updatedItem = data.item as TextItem;

      setItems((prev) =>
        prev.map((entry) => (entry.id === updatedItem.id ? { ...entry, ...updatedItem } : entry))
      );
      setSelectedId(updatedItem.id);
      setDirty(false);
      setSuccess(`"${updatedItem.title}" submitted to the knowledge base.`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedId || !selectedItem) {
      setError('Select a draft to delete');
      return;
    }

    if (
      !window.confirm(
        `Delete "${selectedItem.title}"? This will remove the draft${
          selectedItem.status === 'submitted' ? ' and the Pinecone copy' : ''
        }.`
      )
    ) {
      return;
    }

    setIsDeleting(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch(`/api/admin/knowledgebase/${selectedItem.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (response.status === 401) {
        await refreshSession();
        throw new Error('Unauthorized');
      }

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete draft');
      }

      setItems((prev) => prev.filter((entry) => entry.id !== selectedItem.id));
      resetEditor();
      setSuccess('Draft deleted.');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  const statusLabel = (status: KnowledgebaseStatus) => {
    if (status === 'submitted') return 'Submitted';
    if (status === 'error') return 'Needs Attention';
    return 'Draft';
  };

  const statusBubbleClass = (status: KnowledgebaseStatus) => {
    if (status === 'submitted') return 'bg-green-100 text-green-700';
    if (status === 'error') return 'bg-red-100 text-red-700';
    return 'bg-yellow-100 text-yellow-700';
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

      <div className="max-w-6xl mx-auto p-6 space-y-6">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Text Knowledge Entries</h1>
            <p className="text-gray-600">
              Draft, review, and submit Markdown entries to control what the AI knows.
            </p>
          </div>
          <Button onClick={handleNew} variant="secondary" size="sm" className="self-start md:self-auto">
            <Plus className="h-4 w-4 mr-2" />
            New Entry
          </Button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded flex items-center gap-2">
            <CheckCircle className="h-5 w-5" />
            {success}
          </div>
        )}

        <Card className="p-4 bg-blue-50 border-blue-200">
          <div className="flex gap-3">
            <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-900">
              <p className="font-semibold mb-1">How text entries work</p>
              <ul className="list-disc list-inside space-y-1 text-blue-800">
                <li>Draft content in Markdown before sending it to Pinecone.</li>
                <li>Saving updates resets the entry to draft until you submit again.</li>
                <li>Submitted entries can be resubmitted after edits at any time.</li>
                <li>Use this for FAQs, policies, and other knowledge snippets.</li>
              </ul>
            </div>
          </div>
        </Card>

        <div className="grid gap-6 md:grid-cols-3">
          <Card className="p-4 space-y-4 md:col-span-1">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Existing Entries
              </h2>
              <Button
                onClick={loadItems}
                variant="ghost"
                size="icon"
                disabled={isLoadingList}
                title="Refresh entries"
              >
                <RefreshCw className={`h-4 w-4 ${isLoadingList ? 'animate-spin' : ''}`} />
              </Button>
            </div>

            <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
              {isLoadingList ? (
                <div className="flex items-center justify-center py-12 text-gray-500">
                  <RefreshCw className="h-5 w-5 animate-spin mr-2" />
                  Loading entries...
                </div>
              ) : items.length === 0 ? (
                <div className="rounded border border-dashed border-gray-300 py-12 text-center text-gray-500 text-sm">
                  No text entries yet. Create one to get started.
                </div>
              ) : (
                items.map((item) => {
                  const isActive = item.id === selectedId;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleSelectItem(item)}
                      className={`w-full text-left p-3 rounded border transition-colors ${
                        isActive
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-gray-200 hover:border-primary/50 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium line-clamp-1">{item.title}</span>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded ${statusBubbleClass(
                            item.status
                          )}`}
                        >
                          {statusLabel(item.status)}
                        </span>
                      </div>
                      <div className="mt-1 text-xs text-gray-500">
                        Updated {new Date(item.updatedAt).toLocaleString()}
                      </div>
                      {item.status === 'submitted' && item.submittedAt && (
                        <div className="mt-1 text-[11px] text-green-600">
                          Submitted {new Date(item.submittedAt).toLocaleDateString()}
                        </div>
                      )}
                      {item.status === 'error' && item.lastSubmissionError && (
                        <div className="mt-1 text-[11px] text-red-600 line-clamp-2">
                          {item.lastSubmissionError}
                        </div>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </Card>

          <Card className="p-6 space-y-4 md:col-span-2">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900">
                {selectedItem ? 'Edit Entry' : 'New Entry'}
              </h2>
              {selectedItem && (
                <span
                  className={`text-xs px-2 py-1 rounded ${statusBubbleClass(selectedItem.status)}`}
                >
                  {statusLabel(selectedItem.status)}
                </span>
              )}
            </div>

            {isLoadingEntry ? (
              <div className="flex items-center justify-center py-24 text-gray-500">
                <RefreshCw className="h-5 w-5 animate-spin mr-2" />
                Loading entry...
              </div>
            ) : (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Title <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="text"
                    value={title}
                    onChange={(e) => {
                      setTitle(e.target.value);
                      setDirty(true);
                    }}
                    placeholder="e.g., Delivery Information or Holiday Hours"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Markdown Content <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={content}
                    onChange={(e) => {
                      setContent(e.target.value);
                      setDirty(true);
                    }}
                    placeholder="Add important knowledge. Markdown is supported."
                    rows={16}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-y"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Example headings: <code># Section Title</code>, <code>- bullet point</code>,{' '}
                    <code>**bold text**</code>
                  </p>
                </div>

                <div className="flex flex-wrap gap-2 justify-end">
                  {selectedItem && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleDelete}
                      disabled={isDeleting}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      {isDeleting ? (
                        <>
                          <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                          Deleting...
                        </>
                      ) : (
                        <>
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </>
                      )}
                    </Button>
                  )}

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => saveDraft()}
                    disabled={isSaving || (!dirty && !title.trim())}
                  >
                    {isSaving ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Save Draft
                      </>
                    )}
                  </Button>

                  <Button
                    size="sm"
                    onClick={handleSubmit}
                    disabled={isSubmitting || (!selectedId && !dirty)}
                  >
                    {isSubmitting ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-2" />
                        Submit to Knowledge Base
                      </>
                    )}
                  </Button>
                </div>
              </>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
