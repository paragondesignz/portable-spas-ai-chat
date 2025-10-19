'use client';

import { useState, useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCw, FileText, MessageSquare, Upload, Type, ShoppingCart, Globe, TrendingUp, Clock, Users, Database, Eye, X, FileDown } from 'lucide-react';
import { AdminNav } from '@/components/admin-nav';
import { useAdminAuth } from '@/hooks/use-admin-auth';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface DashboardStats {
  totalFiles: number;
  totalChats: number;
  recentChats: number;
  lastSync?: string;
}

interface ChatLog {
  id: string;
  session_id: string;
  user_name: string;
  created_at: string;
  updated_at: string;
}

interface ChatMessage {
  id: string;
  chat_log_id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const { password, isAuthenticated, isChecking, handleLogout } = useAdminAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalFiles: 0,
    totalChats: 0,
    recentChats: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [recentChatLogs, setRecentChatLogs] = useState<ChatLog[]>([]);
  const [viewingLog, setViewingLog] = useState<ChatLog | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const chatContentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isAuthenticated) {
      loadStats();
    }
  }, [isAuthenticated]);

  const loadStats = async () => {
    setIsLoading(true);
    try {
      // Load file count
      const filesResponse = await fetch('/api/admin/files', {
        headers: { 'Authorization': `Bearer ${password}` }
      });
      if (filesResponse.ok) {
        const filesData = await filesResponse.json();
        setStats(prev => ({ ...prev, totalFiles: filesData.files?.length || 0 }));
      }

      // Load chat logs count and recent chats
      const chatsResponse = await fetch('/api/admin/chat-logs?page=1&limit=10', {
        headers: { 'Authorization': `Bearer ${password}` }
      });
      if (chatsResponse.ok) {
        const chatsData = await chatsResponse.json();
        setStats(prev => ({
          ...prev,
          totalChats: chatsData.total || 0,
          recentChats: chatsData.logs?.length || 0
        }));
        setRecentChatLogs(chatsData.logs || []);
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewLog = async (log: ChatLog) => {
    setIsLoadingMessages(true);
    setError('');
    setViewingLog(log);

    try {
      const response = await fetch(`/api/admin/chat-logs/${log.id}`, {
        headers: {
          'Authorization': `Bearer ${password}`
        }
      });

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

  const handleDownloadPDF = async () => {
    if (!chatContentRef.current || !viewingLog) return;

    setIsGeneratingPdf(true);
    setError('');

    try {
      const element = chatContentRef.current;
      const clone = element.cloneNode(true) as HTMLElement;

      clone.style.backgroundColor = 'white';
      clone.style.padding = '20px';
      clone.style.width = element.offsetWidth + 'px';

      document.body.appendChild(clone);

      const canvas = await html2canvas(clone, {
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        scale: 2
      } as any);

      document.body.removeChild(clone);

      const imgWidth = 190;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const imgData = canvas.toDataURL('image/png');
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
      heightLeft -= 297;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
        heightLeft -= 297;
      }

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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
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

  const quickLinks = [
    {
      title: 'Upload File',
      description: 'Upload documents to Pinecone',
      icon: Upload,
      href: '/admin/upload',
      color: 'blue'
    },
    {
      title: 'Quick Text',
      description: 'Add information quickly',
      icon: Type,
      href: '/admin/quick-text',
      color: 'green'
    },
    {
      title: 'Sync Products',
      description: 'Update product catalog',
      icon: ShoppingCart,
      href: '/admin/products',
      color: 'purple'
    },
    {
      title: 'Scrape Website',
      description: 'Extract website content',
      icon: Globe,
      href: '/admin/scraper',
      color: 'orange'
    },
    {
      title: 'View Files',
      description: 'Manage uploaded files',
      icon: FileText,
      href: '/admin/files',
      color: 'indigo'
    },
    {
      title: 'Chat Logs',
      description: 'View customer conversations',
      icon: MessageSquare,
      href: '/admin/chats',
      color: 'pink'
    },
  ];

  const helpfulTips = [
    {
      title: 'Regular Maintenance',
      description: 'Sync your product catalog weekly to keep information current.',
      icon: Clock
    },
    {
      title: 'Monitor Conversations',
      description: 'Check chat logs regularly to identify common questions and improve responses.',
      icon: Users
    },
    {
      title: 'Keep Content Fresh',
      description: 'Update help center content by re-scraping when you make changes to your website.',
      icon: TrendingUp
    },
    {
      title: 'Backup Your Files',
      description: 'Remember that Pinecone only stores processed knowledge - keep original files backed up.',
      icon: Database
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNav onLogout={handleLogout} />

      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard</h1>
          <p className="text-gray-600">Welcome to the Portable Spas AI Assistant admin panel</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Files</p>
                <p className="text-3xl font-bold text-gray-900">
                  {isLoading ? '...' : stats.totalFiles}
                </p>
              </div>
              <FileText className="h-12 w-12 text-blue-500 opacity-20" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Chats</p>
                <p className="text-3xl font-bold text-gray-900">
                  {isLoading ? '...' : stats.totalChats}
                </p>
              </div>
              <MessageSquare className="h-12 w-12 text-green-500 opacity-20" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Recent Activity</p>
                <p className="text-3xl font-bold text-gray-900">
                  {isLoading ? '...' : stats.recentChats}
                </p>
                <p className="text-xs text-gray-500 mt-1">Last 50 chats</p>
              </div>
              <TrendingUp className="h-12 w-12 text-purple-500 opacity-20" />
            </div>
          </Card>
        </div>

        {/* Quick Links */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {quickLinks.map((link) => {
              const Icon = link.icon;
              return (
                <Link key={link.href} href={link.href}>
                  <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer group">
                    <div className="flex items-start gap-4">
                      <div className={`p-3 rounded-lg bg-${link.color}-50 group-hover:bg-${link.color}-100 transition-colors`}>
                        <Icon className={`h-6 w-6 text-${link.color}-600`} />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 mb-1">{link.title}</h3>
                        <p className="text-sm text-gray-600">{link.description}</p>
                      </div>
                    </div>
                  </Card>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Recent Chats */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Recent Chats</h2>
            <Link href="/admin/chats">
              <Button variant="outline" size="sm">
                View All Chats
              </Button>
            </Link>
          </div>
          <Card className="p-6">
            {isLoading ? (
              <div className="text-center py-8">
                <RefreshCw className="h-8 w-8 animate-spin mx-auto text-gray-400 mb-2" />
                <p className="text-gray-600">Loading chats...</p>
              </div>
            ) : recentChatLogs.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded">
                <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-600">No recent chats</p>
                <p className="text-sm text-gray-500 mt-1">
                  Chat logs will appear here as customers interact with the chatbot
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentChatLogs.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                    onClick={() => handleViewLog(log)}
                  >
                    <div className="flex items-center gap-3">
                      <MessageSquare className="h-5 w-5 text-gray-400 flex-shrink-0" />
                      <div>
                        <p className="font-medium text-gray-900">{log.user_name}</p>
                        <p className="text-sm text-gray-500">
                          Started: {formatDate(log.created_at)}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Helpful Tips */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Helpful Tips</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {helpfulTips.map((tip, index) => {
              const Icon = tip.icon;
              return (
                <Card key={index} className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="p-2 rounded-lg bg-gray-100">
                      <Icon className="h-5 w-5 text-gray-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-1">{tip.title}</h3>
                      <p className="text-sm text-gray-600">{tip.description}</p>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>

        {/* System Info */}
        <Card className="mt-8 p-6 bg-blue-50 border-blue-200">
          <div className="flex gap-3">
            <Database className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-900">
              <p className="font-semibold mb-1">About the Knowledge Base</p>
              <p className="mb-2">
                Your AI assistant is powered by Pinecone, which stores and retrieves information using semantic search.
                This means it can understand context and meaning, not just keywords.
              </p>
              <p className="text-blue-800">
                💡 The more accurate and comprehensive your knowledge base, the better your assistant performs.
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Chat View Modal */}
      {viewingLog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
            <div ref={chatContentRef}>
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                      <MessageSquare className="h-6 w-6" />
                      Chat with {viewingLog.user_name}
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Session started: {formatDate(viewingLog.created_at)}
                    </p>
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

              <div className="flex-1 overflow-y-auto p-6">
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
                    {messages.map((message) => (
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
                                      <code {...props} className="bg-gray-700 px-1 rounded text-xs" />
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

            <div className="p-6 border-t border-gray-200 bg-gray-50 print:hidden">
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
  );
}
