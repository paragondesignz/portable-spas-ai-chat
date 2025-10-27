'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { RefreshCw, AlertCircle, Lock, Info, ShoppingCart, BookOpen } from 'lucide-react';
import { AdminNav } from '@/components/admin-nav';
import { Input } from '@/components/ui/input';

export default function ContentImportPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isSyncingProducts, setIsSyncingProducts] = useState(false);
  const [isSyncingBlog, setIsSyncingBlog] = useState(false);
  const [blogUrl, setBlogUrl] = useState('https://portablespas.co.nz/blogs/news');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const savedPassword = localStorage.getItem('admin_password');
    if (savedPassword) {
      setPassword(savedPassword);
      setIsAuthenticated(true);
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('admin_password');
    setPassword('');
    setIsAuthenticated(false);
    router.push('/admin');
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
      let message = `Successfully synced ${data.stats.productsFound} products from Shopify! File: ${data.stats.fileName}`;
      if (data.stats.oldCatalogsDeleted > 0) {
        message += ` (Removed ${data.stats.oldCatalogsDeleted} old catalog${data.stats.oldCatalogsDeleted > 1 ? 's' : ''})`;
      }
      setSuccess(message);

    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSyncingProducts(false);
    }
  };

  const handleSyncBlog = async () => {
    if (!blogUrl) {
      setError('Please enter a blog URL');
      return;
    }

    setIsSyncingBlog(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/admin/sync-blog', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${password}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ url: blogUrl })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Blog sync failed');
      }

      const data = await response.json();
      let message = `Successfully synced ${data.stats.postsFound} blog posts! File: ${data.stats.fileName}`;
      if (data.stats.oldBlogsDeleted > 0) {
        message += ` (Removed ${data.stats.oldBlogsDeleted} old blog${data.stats.oldBlogsDeleted > 1 ? 's' : ''})`;
      }
      setSuccess(message);

    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSyncingBlog(false);
    }
  };

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
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Content Import</h1>
          <p className="text-gray-600">Import content from Shopify and your blog to Pinecone</p>
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

        {/* Shopify Products Section */}
        <Card className="p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <ShoppingCart className="h-6 w-6 text-purple-600" />
            <h2 className="text-xl font-semibold text-gray-900">Shopify Products</h2>
          </div>

          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded p-4">
              <div className="flex gap-2">
                <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-900">
                  <p className="font-semibold mb-2">How Product Sync Works</p>
                  <ul className="list-disc list-inside space-y-1 text-blue-800 mb-3">
                    <li>Fetches all published products from your Shopify store</li>
                    <li>Converts product data to a structured Markdown catalog</li>
                    <li>Includes product names, descriptions, prices, and variants</li>
                    <li>Uploads as a dated file: <code className="bg-blue-100 px-1 py-0.5 rounded">product-catalog-YYYY-MM-DD.md</code></li>
                  </ul>
                  <p className="text-blue-800 font-medium">
                    <strong>Version Control:</strong> Old product catalogs are automatically deleted when a new one is uploaded, keeping only the most recent version.
                  </p>
                </div>
              </div>
            </div>

            <Button
              onClick={handleSyncProducts}
              disabled={isSyncingProducts}
              className="w-full"
              size="lg"
            >
              {isSyncingProducts ? (
                <>
                  <RefreshCw className="h-5 w-5 mr-2 animate-spin" />
                  Syncing Products from Shopify...
                </>
              ) : (
                <>
                  <ShoppingCart className="h-5 w-5 mr-2" />
                  Sync Products from Shopify
                </>
              )}
            </Button>
          </div>
        </Card>

        <Card className="p-4 bg-green-50 border-green-200 mb-6">
          <div className="flex gap-3">
            <RefreshCw className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-green-900">
              <p className="font-semibold mb-1">Automatic Product Sync</p>
              <p className="text-green-800">
                <strong>Your product catalog is automatically imported every 48 hours at 2:00 AM.</strong> This ensures your chatbot always has up-to-date product information without any manual intervention.
              </p>
              <p className="mt-2 text-green-700">
                ✓ No manual syncing needed for regular updates
              </p>
            </div>
          </div>
        </Card>

        {/* Blog Posts Section */}
        <Card className="p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <BookOpen className="h-6 w-6 text-orange-600" />
            <h2 className="text-xl font-semibold text-gray-900">Blog Posts</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Blog URL <span className="text-red-500">*</span>
              </label>
              <Input
                type="url"
                value={blogUrl}
                onChange={(e) => setBlogUrl(e.target.value)}
                placeholder="https://portablespas.co.nz/blogs/news"
                className="w-full"
              />
              <p className="text-xs text-gray-500 mt-1">
                Enter your Shopify blog URL (e.g., /blogs/news or /blogs/help)
              </p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded p-4">
              <div className="flex gap-2">
                <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-900">
                  <p className="font-semibold mb-2">How Blog Sync Works</p>
                  <ul className="list-disc list-inside space-y-1 text-blue-800 mb-3">
                    <li>Fetches all published blog posts from your Shopify blog</li>
                    <li>Converts blog content to clean Markdown format</li>
                    <li>Includes post titles, content, and publication dates</li>
                    <li>Uploads as a dated file: <code className="bg-blue-100 px-1 py-0.5 rounded">blog-posts-YYYY-MM-DD.md</code></li>
                  </ul>
                  <p className="text-blue-800 font-medium">
                    <strong>Version Control:</strong> Old blog compilations are automatically deleted when a new one is uploaded, keeping only the most recent version.
                  </p>
                </div>
              </div>
            </div>

            <Button
              onClick={handleSyncBlog}
              disabled={!blogUrl || isSyncingBlog}
              className="w-full"
              size="lg"
            >
              {isSyncingBlog ? (
                <>
                  <RefreshCw className="h-5 w-5 mr-2 animate-spin" />
                  Syncing Blog Posts...
                </>
              ) : (
                <>
                  <BookOpen className="h-5 w-5 mr-2" />
                  Sync Blog Posts
                </>
              )}
            </Button>
          </div>
        </Card>

        <Card className="p-4 bg-amber-50 border-amber-200">
          <div className="flex gap-3">
            <Info className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-amber-900">
              <p className="font-semibold mb-1">Manual Sync</p>
              <p className="mb-2">
                Use the manual sync buttons above if you need immediate updates:
              </p>
              <ul className="list-disc list-inside space-y-1 text-amber-800">
                <li>Just added a new product or blog post and need it live right away</li>
                <li>Made urgent price or content changes</li>
                <li>Need to test the chatbot with the latest data</li>
              </ul>
              <p className="mt-2 text-amber-800">
                💡 Products automatically sync every 48 hours at 2 AM
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
