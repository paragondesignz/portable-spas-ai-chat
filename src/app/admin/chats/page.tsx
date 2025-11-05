'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { MessageSquare, Trash2, RefreshCw, Lock, Search, Eye, X, ChevronLeft, ChevronRight, Download, FileDown, Phone, Mail, Clock, Filter } from 'lucide-react';
import { AdminNav } from '@/components/admin-nav';
import ReactMarkdown from 'react-markdown';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { useAdminAuth } from '@/hooks/use-admin-auth';

interface ChatLog {
  id: string;
  session_id: string;
  user_name: string;
  created_at: string;
  updated_at: string;
  contact_email?: string;
  contact_phone?: string;
  callback_requested?: boolean;
  callback_requested_at?: string;
  callback_notes?: string;
  contacted?: boolean;
}

interface ChatMessage {
  id: string;
  chat_log_id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

export default function ChatLogsPage() {
  const router = useRouter();
  const { isAuthenticated, isChecking, handleLogout, refreshSession } = useAdminAuth();
  const [logs, setLogs] = useState<ChatLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [viewingLog, setViewingLog] = useState<ChatLog | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [selectedLogs, setSelectedLogs] = useState<Set<string>>(new Set());
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const chatContentRef = useRef<HTMLDivElement>(null);
  const [showCallbacksOnly, setShowCallbacksOnly] = useState(false);

  const loadLogs = useCallback(async (page: number = 1, query: string = '') => {
    setIsLoading(true);
    setError('');

    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '50'
      });

      if (query) {
        params.append('query', query);
      }

      const response = await fetch(`/api/admin/chat-logs?${params}`, {
        credentials: 'include'
      });

      if (response.status === 401) {
        await refreshSession();
        throw new Error('Unauthorized');
      }

      if (!response.ok) {
        throw new Error('Failed to load chat logs');
      }

      const data = await response.json();
      setLogs(data.logs || []);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 1);
      setCurrentPage(page);
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [refreshSession]);

  useEffect(() => {
    if (isAuthenticated) {
      loadLogs(1, '');
    } else {
      setLogs([]);
    }
  }, [isAuthenticated, loadLogs]);

  const handleSearch = () => {
    setSelectedLogs(new Set());
    loadLogs(1, searchQuery);
  };

  const handleViewLog = async (log: ChatLog) => {
    setIsLoadingMessages(true);
    setError('');
    setViewingLog(log);

    try {
      const response = await fetch(`/api/admin/chat-logs/${log.id}`, {
        credentials: 'include'
      });

      if (response.status === 401) {
        await refreshSession();
        throw new Error('Unauthorized');
      }

      if (!response.ok) {
        throw new Error('Failed to load chat messages');
      }

      const data = await response.json();
      setMessages(data.messages || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoadingMessages(false);
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedLogs.size === 0) {
      setError('Please select at least one chat log to delete');
      return;
    }

    if (!confirm(`Are you sure you want to delete ${selectedLogs.size} chat log(s)?`)) {
      return;
    }

    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/admin/chat-logs', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ ids: Array.from(selectedLogs) })
      });

      if (response.status === 401) {
        await refreshSession();
        throw new Error('Unauthorized');
      }

      if (!response.ok) {
        throw new Error('Delete failed');
      }

      const data = await response.json();
      setSuccess(data.message);
      setSelectedLogs(new Set());
      await loadLogs();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleExportSelected = async () => {
    if (selectedLogs.size === 0) {
      setError('Please select at least one chat log to export');
      return;
    }

    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/admin/chat-logs/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ ids: Array.from(selectedLogs) })
      });

      if (response.status === 401) {
        await refreshSession();
        throw new Error('Unauthorized');
      }

      if (!response.ok) {
        throw new Error('Export failed');
      }

      // Download the CSV file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `chat-logs-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setSuccess(`Successfully exported ${selectedLogs.size} chat log(s)`);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleExportAll = async () => {
    if (logs.length === 0) {
      setError('No chat logs to export');
      return;
    }

    if (!confirm(`Export all ${total} chat log(s)?`)) {
      return;
    }

    setError('');
    setSuccess('');
    setIsLoading(true);

    try {
      // Get all log IDs (not just current page)
      const allLogsResponse = await fetch(`/api/admin/chat-logs?page=1&limit=${total}`, {
        credentials: 'include'
      });

      if (allLogsResponse.status === 401) {
        await refreshSession();
        throw new Error('Unauthorized');
      }

      if (!allLogsResponse.ok) {
        throw new Error('Failed to fetch all logs');
      }

      const allLogsData = await allLogsResponse.json();
      const allIds = allLogsData.logs.map((log: ChatLog) => log.id);

      const response = await fetch('/api/admin/chat-logs/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ ids: allIds })
      });

      if (response.status === 401) {
        await refreshSession();
        throw new Error('Unauthorized');
      }

      if (!response.ok) {
        throw new Error('Export failed');
      }

      // Download the CSV file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `chat-logs-all-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setSuccess(`Successfully exported ${allIds.length} chat log(s)`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleSelectLog = (logId: string) => {
    const newSelection = new Set(selectedLogs);
    if (newSelection.has(logId)) {
      newSelection.delete(logId);
    } else {
      newSelection.add(logId);
    }
    setSelectedLogs(newSelection);
  };

  const toggleSelectAll = () => {
    if (selectedLogs.size === logs.length) {
      setSelectedLogs(new Set());
    } else {
      setSelectedLogs(new Set(logs.map(log => log.id)));
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const handleDownloadPDF = async () => {
    if (!chatContentRef.current || !viewingLog) return;

    setIsGeneratingPdf(true);
    setError('');

    try {
      // Create a clone of the chat content to modify for PDF
      const element = chatContentRef.current;
      const clone = element.cloneNode(true) as HTMLElement;

      // Add white background to ensure proper rendering
      clone.style.backgroundColor = 'white';
      clone.style.padding = '20px';
      clone.style.width = element.offsetWidth + 'px';

      // Temporarily add clone to document
      document.body.appendChild(clone);

      // Generate canvas from the HTML content
      const canvas = await html2canvas(clone, {
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        scale: 2 // Higher quality
      } as any);

      // Remove the clone
      document.body.removeChild(clone);

      // Calculate PDF dimensions
      const imgWidth = 190; // A4 width in mm minus margins
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      // Create PDF
      const pdf = new jsPDF({
        orientation: imgHeight > 280 ? 'portrait' : 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      // Add image to PDF
      const imgData = canvas.toDataURL('image/png');
      let heightLeft = imgHeight;
      let position = 0;

      // Add first page
      pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
      heightLeft -= 297; // A4 height

      // Add additional pages if needed
      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
        heightLeft -= 297;
      }

      // Download the PDF
      const fileName = `chat-${viewingLog.user_name}-${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(fileName);

      setSuccess(`PDF downloaded successfully: ${fileName}`);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      console.error('PDF generation error:', err);
      setError('Failed to generate PDF. Please try again.');
    } finally {
      setIsGeneratingPdf(false);
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

      <div className="max-w-7xl mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Chat Logs</h1>
          <p className="text-gray-600">View and manage customer chat conversations</p>
        </div>

        {/* Search and Actions */}
        <Card className="p-6 mb-6">
          <div className="space-y-4">
            <div className="flex gap-3">
              <div className="flex-1">
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="Search by name or message content..."
                  className="w-full"
                />
              </div>
              <Button onClick={handleSearch} disabled={isLoading}>
                <Search className="h-4 w-4 mr-2" />
                Search
              </Button>
              <Button onClick={() => loadLogs()} disabled={isLoading} variant="outline">
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              </Button>
            </div>

            {selectedLogs.size > 0 && (
              <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded p-3">
                <span className="text-sm text-blue-900">
                  {selectedLogs.size} chat log(s) selected
                </span>
                <div className="flex gap-2">
                  <Button
                    onClick={handleExportSelected}
                    variant="outline"
                    size="sm"
                    className="text-green-600 hover:text-green-700 hover:bg-green-50"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export CSV
                  </Button>
                  <Button
                    onClick={handleDeleteSelected}
                    variant="outline"
                    size="sm"
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Selected
                  </Button>
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Messages */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded mb-6">
            {success}
          </div>
        )}

        {/* Logs List */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Chat Logs ({total})
              </h2>
              <button
                onClick={() => setShowCallbacksOnly(!showCallbacksOnly)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  showCallbacksOnly
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Phone className="h-3 w-3 inline mr-1" />
                {showCallbacksOnly ? 'Showing Callbacks Only' : 'Show Callbacks Only'}
              </button>
            </div>
            {total > 0 && (
              <Button
                onClick={handleExportAll}
                disabled={isLoading}
                variant="outline"
                size="sm"
                className="text-green-600 hover:text-green-700 hover:bg-green-50"
              >
                <Download className="h-4 w-4 mr-2" />
                Export All
              </Button>
            )}
          </div>

          {isLoading ? (
            <div className="text-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto text-gray-400 mb-2" />
              <p className="text-gray-600">Loading chat logs...</p>
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded">
              <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-600">No chat logs found</p>
              <p className="text-sm text-gray-500 mt-1">
                {searchQuery ? 'Try a different search query' : 'Chat logs will appear here as customers interact with the chatbot'}
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 w-12">
                        <input
                          type="checkbox"
                          checked={selectedLogs.size === logs.length && logs.length > 0}
                          onChange={toggleSelectAll}
                          className="rounded border-gray-300"
                        />
                      </th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">User Name</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Contact Info</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Started</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Last Updated</th>
                      <th className="text-right py-3 px-4 font-semibold text-gray-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.filter(log => !showCallbacksOnly || log.callback_requested).map((log) => (
                      <tr
                        key={log.id}
                        className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                          log.callback_requested && !log.contacted ? 'bg-blue-50' : ''
                        }`}
                      >
                        <td className="py-3 px-4">
                          <input
                            type="checkbox"
                            checked={selectedLogs.has(log.id)}
                            onChange={() => toggleSelectLog(log.id)}
                            className="rounded border-gray-300"
                          />
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <MessageSquare className="h-4 w-4 text-gray-400 flex-shrink-0" />
                            <span className="font-medium text-gray-900">{log.user_name}</span>
                            {log.callback_requested && !log.contacted && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-600 text-white">
                                <Phone className="h-3 w-3 mr-1" />
                                Callback
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-sm">
                          {log.callback_requested ? (
                            <div className="flex flex-col gap-1">
                              {log.contact_email && (
                                <a href={`mailto:${log.contact_email}`} className="flex items-center gap-1 text-blue-600 hover:text-blue-700">
                                  <Mail className="h-3 w-3" />
                                  <span className="text-xs">{log.contact_email}</span>
                                </a>
                              )}
                              {log.contact_phone && (
                                <a href={`tel:${log.contact_phone}`} className="flex items-center gap-1 text-blue-600 hover:text-blue-700">
                                  <Phone className="h-3 w-3" />
                                  <span className="text-xs">{log.contact_phone}</span>
                                </a>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-400 text-xs">—</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-600">
                          {formatDate(log.created_at)}
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-600">
                          {formatDate(log.updated_at)}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              onClick={() => handleViewLog(log)}
                              variant="outline"
                              size="sm"
                              className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              View
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-6 pt-6 border-t border-gray-200">
                  <p className="text-sm text-gray-600">
                    Page {currentPage} of {totalPages}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => loadLogs(currentPage - 1, searchQuery)}
                      disabled={currentPage === 1 || isLoading}
                      variant="outline"
                      size="sm"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>
                    <Button
                      onClick={() => loadLogs(currentPage + 1, searchQuery)}
                      disabled={currentPage === totalPages || isLoading}
                      variant="outline"
                      size="sm"
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </Card>

        {/* Chat View Modal */}
        {viewingLog && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <Card className="w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
              <div ref={chatContentRef} className="flex flex-col flex-1 min-h-0">
                <div className="p-6 border-b border-gray-200 flex-shrink-0">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                        <MessageSquare className="h-6 w-6" />
                        Chat with {viewingLog.user_name}
                      </h3>
                      <p className="text-sm text-gray-600 mt-1">
                        Session started: {formatDate(viewingLog.created_at)}
                      </p>
                      {viewingLog.callback_requested && (
                        <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                          <div className="flex items-center gap-2 mb-2">
                            <Phone className="h-4 w-4 text-blue-600" />
                            <span className="text-sm font-semibold text-blue-900">Callback Requested</span>
                            {viewingLog.callback_requested_at && (
                              <span className="text-xs text-blue-600">
                                {formatDate(viewingLog.callback_requested_at)}
                              </span>
                            )}
                          </div>
                          <div className="space-y-1 text-sm">
                            {viewingLog.contact_email && (
                              <div className="flex items-center gap-2">
                                <Mail className="h-3 w-3 text-blue-600" />
                                <a href={`mailto:${viewingLog.contact_email}`} className="text-blue-600 hover:text-blue-700 hover:underline">
                                  {viewingLog.contact_email}
                                </a>
                              </div>
                            )}
                            {viewingLog.contact_phone && (
                              <div className="flex items-center gap-2">
                                <Phone className="h-3 w-3 text-blue-600" />
                                <a href={`tel:${viewingLog.contact_phone}`} className="text-blue-600 hover:text-blue-700 hover:underline">
                                  {viewingLog.contact_phone}
                                </a>
                              </div>
                            )}
                            {viewingLog.callback_notes && (
                              <div className="flex items-start gap-2">
                                <Clock className="h-3 w-3 text-blue-600 mt-0.5" />
                                <span className="text-blue-700">Best time: {viewingLog.callback_notes}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 print:hidden">
                      <Button
                        onClick={handleDownloadPDF}
                        disabled={isGeneratingPdf || isLoadingMessages || messages.length === 0}
                        variant="outline"
                        size="sm"
                        className="text-green-600 hover:text-green-700 hover:bg-green-50"
                      >
                        <FileDown className="h-4 w-4 mr-2" />
                        {isGeneratingPdf ? 'Generating...' : 'Download PDF'}
                      </Button>
                      <button
                        onClick={() => {
                          setViewingLog(null);
                          setMessages([]);
                        }}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <X className="h-6 w-6" />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6 min-h-0">
                  {isLoadingMessages ? (
                    <div className="text-center py-12">
                      <RefreshCw className="h-8 w-8 animate-spin mx-auto text-gray-400 mb-2" />
                      <p className="text-gray-600">Loading messages...</p>
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="text-center py-12">
                      <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                      <p className="text-gray-600">No messages in this chat</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                    {messages.map((message, index) => (
                      <div
                        key={message.id}
                        className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[75%] rounded-lg px-4 py-3 ${
                            message.role === 'user'
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-100 text-gray-900'
                          }`}
                        >
                          <div className="text-xs font-medium mb-1 opacity-75">
                            {message.role === 'user' ? viewingLog.user_name : 'Assistant'}
                          </div>
                          <div className="text-sm">
                            {message.role === 'user' ? (
                              <p className="whitespace-pre-wrap break-words">{message.content}</p>
                            ) : (
                              <div className="prose prose-sm max-w-none prose-invert">
                                <ReactMarkdown
                                  components={{
                                    a: ({ node, href, children, ...props }) => (
                                      <a
                                        href={href}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-blue-400 hover:text-blue-300 underline font-medium"
                                        {...props}
                                      >
                                        {children}
                                      </a>
                                    ),
                                    p: ({ node, ...props }) => (
                                      <p {...props} className="mb-2 last:mb-0" />
                                    ),
                                    ul: ({ node, ...props }) => (
                                      <ul {...props} className="list-disc ml-4 mb-2 space-y-1" />
                                    ),
                                    ol: ({ node, ...props }) => (
                                      <ol {...props} className="list-decimal ml-4 mb-2 space-y-1" />
                                    ),
                                    li: ({ node, ...props }) => (
                                      <li {...props} className="ml-0" />
                                    ),
                                    strong: ({ node, ...props }) => (
                                      <strong {...props} className="font-semibold" />
                                    ),
                                    code: ({ node, ...props }) => (
                                      <code {...props} className="bg-gray-200 px-1 rounded text-xs" />
                                    ),
                                  }}
                                >
                                  {message.content}
                                </ReactMarkdown>
                              </div>
                            )}
                          </div>
                          <div className="text-xs mt-1 opacity-60">
                            {new Date(message.created_at).toLocaleTimeString()}
                          </div>
                        </div>
                      </div>
                    ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="p-6 border-t border-gray-200 bg-gray-50 flex-shrink-0 print:hidden">
                <Button
                  onClick={() => {
                    setViewingLog(null);
                    setMessages([]);
                  }}
                  className="w-full"
                >
                  Close
                </Button>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
