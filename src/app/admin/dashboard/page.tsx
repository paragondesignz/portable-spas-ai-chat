'use client';

import { useState, useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCw, FileText, MessageSquare, Upload, Type, Package, TrendingUp, Clock, Users, Database, Eye, X, FileDown, Calendar, Zap, AlertCircle, Download } from 'lucide-react';
import { AdminNav } from '@/components/admin-nav';
import { useAdminAuth } from '@/hooks/use-admin-auth';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import UsageChart from '@/components/admin/usage-chart';
import { format } from 'date-fns';

interface DashboardStats {
  total: {
    total: number;
    last30Days: number;
    percentChange: number;
  };
  today: {
    today: number;
    yesterday: number;
    percentChange: number;
  };
  week: {
    thisWeek: number;
    lastWeek: number;
    percentChange: number;
  };
  knowledgeBase: {
    fileCount: number;
    lastProductSync: string | null;
    lastBlogSync: string | null;
    productSyncStatus: 'fresh' | 'warning' | 'stale';
    blogSyncStatus: 'fresh' | 'warning' | 'stale';
  };
  chatsOverTime: Array<{
    date: string;
    chats: number;
    messages: number;
    users: string[];
  }>;
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
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [chartRange, setChartRange] = useState(30);
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
  }, [isAuthenticated, chartRange]);

  const loadStats = async () => {
    setIsLoading(true);
    try {
      // Load enhanced stats from new API
      const statsResponse = await fetch(`/api/admin/stats?range=${chartRange}`, {
        headers: { 'Authorization': `Bearer ${password}` }
      });
      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStats(statsData);
      }

      // Load recent chats for the preview section
      const chatsResponse = await fetch('/api/admin/chat-logs?page=1&limit=5', {
        headers: { 'Authorization': `Bearer ${password}` }
      });
      if (chatsResponse.ok) {
        const chatsData = await chatsResponse.json();
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
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-8">
          <div className="flex flex-col items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 dark:text-gray-100">Admin Login Required</h1>
          </div>
          <p className="text-center text-gray-600 dark:text-gray-400 dark:text-gray-400 mb-4">
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
      title: 'Content Import',
      description: 'Import products and blog posts',
      icon: Package,
      href: '/admin/content-import',
      color: 'purple'
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
      title: 'Automated Product Sync',
      description: 'Products auto-sync every 72 hours at 2 AM. Check Knowledge Base status above for last sync.',
      icon: RefreshCw
    },
    {
      title: 'Weekly Blog Updates',
      description: 'Blog posts sync automatically every Monday. Use Content Import for manual syncs anytime.',
      icon: Calendar
    },
    {
      title: 'Monitor Chat Trends',
      description: 'Review the usage chart to identify peak times and popular topics to optimize support.',
      icon: TrendingUp
    },
    {
      title: 'Export & Analyze',
      description: 'Export chat logs to CSV for deeper analysis or backup. Available in Chat Logs section.',
      icon: Download
    },
    {
      title: 'Quick Content Updates',
      description: 'Use Quick Text for fast updates without files. Upload File for documents. Both update knowledge instantly.',
      icon: Zap
    },
    {
      title: 'Keep Knowledge Fresh',
      description: 'Green status = synced recently. Yellow/Red = stale. Re-sync in Content Import to stay current.',
      icon: AlertCircle
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <AdminNav onLogout={handleLogout} />

      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 dark:text-gray-100 mb-2">Dashboard</h1>
          <p className="text-gray-600 dark:text-gray-400 dark:text-gray-400">Welcome to the Portable Spas AI Assistant admin panel</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total Chats */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Chats</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                  {isLoading || !stats ? '...' : stats.total.total.toLocaleString()}
                </p>
              </div>
              <MessageSquare className="h-12 w-12 text-blue-500 opacity-20" />
            </div>
            {!isLoading && stats && (
              <div className={`flex items-center text-sm ${stats.total.percentChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                <TrendingUp className={`h-4 w-4 mr-1 ${stats.total.percentChange < 0 ? 'rotate-180' : ''}`} />
                <span className="font-medium">
                  {stats.total.percentChange >= 0 ? '+' : ''}{stats.total.percentChange.toFixed(1)}%
                </span>
                <span className="text-gray-500 dark:text-gray-400 ml-1">vs last 30 days</span>
              </div>
            )}
          </Card>

          {/* Chats Today */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Chats Today</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                  {isLoading || !stats ? '...' : stats.today.today}
                </p>
              </div>
              <Calendar className="h-12 w-12 text-green-500 opacity-20" />
            </div>
            {!isLoading && stats && (
              <div className={`flex items-center text-sm ${stats.today.percentChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                <TrendingUp className={`h-4 w-4 mr-1 ${stats.today.percentChange < 0 ? 'rotate-180' : ''}`} />
                <span className="font-medium">
                  {stats.today.percentChange >= 0 ? '+' : ''}{stats.today.percentChange.toFixed(1)}%
                </span>
                <span className="text-gray-500 dark:text-gray-400 ml-1">vs yesterday</span>
              </div>
            )}
          </Card>

          {/* Chats This Week */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Chats This Week</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                  {isLoading || !stats ? '...' : stats.week.thisWeek}
                </p>
              </div>
              <TrendingUp className="h-12 w-12 text-purple-500 opacity-20" />
            </div>
            {!isLoading && stats && (
              <div className={`flex items-center text-sm ${stats.week.percentChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                <TrendingUp className={`h-4 w-4 mr-1 ${stats.week.percentChange < 0 ? 'rotate-180' : ''}`} />
                <span className="font-medium">
                  {stats.week.percentChange >= 0 ? '+' : ''}{stats.week.percentChange.toFixed(1)}%
                </span>
                <span className="text-gray-500 dark:text-gray-400 ml-1">vs last week</span>
              </div>
            )}
          </Card>

          {/* Knowledge Base Status */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Knowledge Base</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                  {isLoading || !stats ? '...' : stats.knowledgeBase.fileCount}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">files</p>
              </div>
              <Database className="h-12 w-12 text-indigo-500 opacity-20" />
            </div>
            {!isLoading && stats && (
              <div className="flex gap-2 text-xs">
                <div className={`px-2 py-1 rounded-full ${
                  stats.knowledgeBase.productSyncStatus === 'fresh' ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300' :
                  stats.knowledgeBase.productSyncStatus === 'warning' ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300' :
                  'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300'
                }`}>
                  Products
                </div>
                <div className={`px-2 py-1 rounded-full ${
                  stats.knowledgeBase.blogSyncStatus === 'fresh' ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300' :
                  stats.knowledgeBase.blogSyncStatus === 'warning' ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300' :
                  'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300'
                }`}>
                  Blog
                </div>
              </div>
            )}
          </Card>
        </div>

        {/* Usage Chart */}
        {!isLoading && stats && (
          <div className="mb-8">
            <UsageChart
              data={stats.chatsOverTime}
              range={chartRange}
              onRangeChange={setChartRange}
            />
          </div>
        )}

        {/* Quick Links */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {quickLinks.map((link) => {
              const Icon = link.icon;
              const getColorClasses = () => {
                const colorMap = {
                  blue: { bg: 'bg-blue-50 dark:bg-blue-950 group-hover:bg-blue-100 dark:group-hover:bg-blue-900', icon: 'text-blue-600 dark:text-blue-400' },
                  green: { bg: 'bg-green-50 dark:bg-green-950 group-hover:bg-green-100 dark:group-hover:bg-green-900', icon: 'text-green-600 dark:text-green-400' },
                  purple: { bg: 'bg-purple-50 dark:bg-purple-950 group-hover:bg-purple-100 dark:group-hover:bg-purple-900', icon: 'text-purple-600 dark:text-purple-400' },
                  indigo: { bg: 'bg-indigo-50 dark:bg-indigo-950 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900', icon: 'text-indigo-600 dark:text-indigo-400' },
                  pink: { bg: 'bg-pink-50 dark:bg-pink-950 group-hover:bg-pink-100 dark:group-hover:bg-pink-900', icon: 'text-pink-600 dark:text-pink-400' },
                };
                return colorMap[link.color as keyof typeof colorMap] || colorMap.blue;
              };
              const colors = getColorClasses();

              return (
                <Link key={link.href} href={link.href}>
                  <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer group">
                    <div className="flex items-start gap-4">
                      <div className={`p-3 rounded-lg ${colors.bg} transition-colors`}>
                        <Icon className={`h-6 w-6 ${colors.icon}`} />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">{link.title}</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{link.description}</p>
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
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Recent Chats</h2>
          <Card className="p-6">
            {isLoading ? (
              <div className="text-center py-8">
                <RefreshCw className="h-8 w-8 animate-spin mx-auto text-gray-400 mb-2" />
                <p className="text-gray-600 dark:text-gray-400">Loading chats...</p>
              </div>
            ) : recentChatLogs.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 dark:bg-gray-800 rounded">
                <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-600 dark:text-gray-400">No recent chats</p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Chat logs will appear here as customers interact with the chatbot
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentChatLogs.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors cursor-pointer"
                    onClick={() => handleViewLog(log)}
                  >
                    <div className="flex items-center gap-3">
                      <MessageSquare className="h-5 w-5 text-gray-400 flex-shrink-0" />
                      <div>
                        <p className="font-medium text-gray-900 dark:text-gray-100">{log.user_name}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Started: {formatDate(log.created_at)}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-blue-600 hover:text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:bg-blue-950"
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </Card>
          {!isLoading && recentChatLogs.length > 0 && (
            <div className="mt-4 flex justify-center">
              <Link href="/admin/chats">
                <Button variant="outline">
                  <MessageSquare className="h-4 w-4 mr-2" />
                  View All Chat Logs
                </Button>
              </Link>
            </div>
          )}
        </div>

        {/* Helpful Tips */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Helpful Tips</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {helpfulTips.map((tip, index) => {
              const Icon = tip.icon;
              return (
                <Card key={index} className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700">
                      <Icon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">{tip.title}</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{tip.description}</p>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>

        {/* System Info */}
        <Card className="mt-8 p-6 bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-900">
          <div className="flex gap-3">
            <Database className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-900 dark:text-blue-100">
              <p className="font-semibold mb-1">About the Knowledge Base</p>
              <p className="mb-2">
                Your AI assistant is powered by Pinecone, which stores and retrieves information using semantic search.
                This means it can understand context and meaning, not just keywords.
              </p>
              <p className="text-blue-800 dark:text-blue-200">
                💡 The more accurate and comprehensive your knowledge base, the better your assistant performs.
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Chat View Modal */}
      {viewingLog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
            <div ref={chatContentRef} className="flex flex-col flex-1 min-h-0">
              <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                      <MessageSquare className="h-6 w-6" />
                      Chat with {viewingLog.user_name}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      Session started: {formatDate(viewingLog.created_at)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 print:hidden">
                    <Button
                      onClick={handleDownloadPDF}
                      disabled={isGeneratingPdf || isLoadingMessages || messages.length === 0}
                      variant="outline"
                      size="sm"
                      className="text-green-600 hover:text-green-700 dark:text-green-300 hover:bg-green-50"
                    >
                      <FileDown className="h-4 w-4 mr-2" />
                      {isGeneratingPdf ? 'Generating...' : 'Download PDF'}
                    </Button>
                    <button
                      onClick={() => {
                        setViewingLog(null);
                        setMessages([]);
                      }}
                      className="text-gray-400 hover:text-gray-600 dark:text-gray-400"
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
                    <p className="text-gray-600 dark:text-gray-400">Loading messages...</p>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="text-center py-12">
                    <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-600 dark:text-gray-400">No messages in this chat</p>
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
                              : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100'
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

            <div className="p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 flex-shrink-0 print:hidden">
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
