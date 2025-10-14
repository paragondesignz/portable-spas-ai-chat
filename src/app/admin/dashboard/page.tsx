'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCw, FileText, MessageSquare, Upload, Type, ShoppingCart, Globe, TrendingUp, Clock, Users, Database } from 'lucide-react';
import { AdminNav } from '@/components/admin-nav';
import { useAdminAuth } from '@/hooks/use-admin-auth';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface DashboardStats {
  totalFiles: number;
  totalChats: number;
  recentChats: number;
  lastSync?: string;
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

      // Load chat logs count
      const chatsResponse = await fetch('/api/admin/chat-logs?page=1&limit=50', {
        headers: { 'Authorization': `Bearer ${password}` }
      });
      if (chatsResponse.ok) {
        const chatsData = await chatsResponse.json();
        setStats(prev => ({
          ...prev,
          totalChats: chatsData.total || 0,
          recentChats: chatsData.logs?.length || 0
        }));
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setIsLoading(false);
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
      href: '/admin',
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
    </div>
  );
}
