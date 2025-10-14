'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { RefreshCw, AlertCircle, Lock, Info, Globe } from 'lucide-react';
import { AdminNav } from '@/components/admin-nav';

export default function ScraperPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isScraping, setIsScraping] = useState(false);
  const [scrapeUrl, setScrapeUrl] = useState('https://portablespas.co.nz');
  const [maxPages, setMaxPages] = useState(200);
  const [scrapeFileName, setScrapeFileName] = useState('');
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
      let message = `Successfully scraped ${data.stats.pagesScraped} pages and uploaded to Pinecone! File: ${data.stats.fileName}`;
      if (data.stats.oldScrapesDeleted > 0) {
        message += ` (Removed ${data.stats.oldScrapesDeleted} old scrape${data.stats.oldScrapesDeleted > 1 ? 's' : ''})`;
      }
      setSuccess(message);

    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsScraping(false);
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
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Website Scraper</h1>
          <p className="text-gray-600">Crawl and extract content from websites</p>
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

        <Card className="p-6 mb-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Website URL <span className="text-red-500">*</span>
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

            <div className="bg-blue-50 border border-blue-200 rounded p-4">
              <div className="flex gap-2">
                <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-900">
                  <p className="font-semibold mb-2">How Website Scraping Works</p>
                  <ul className="list-disc list-inside space-y-1 text-blue-800 mb-3">
                    <li>Crawls the website and follows internal links</li>
                    <li>Extracts all text content from each page</li>
                    <li>Converts HTML to clean Markdown format</li>
                    <li>Uploads as a single document to Pinecone</li>
                    <li>Process may take several minutes depending on site size</li>
                  </ul>
                  <p className="text-blue-800 font-medium">
                    <strong>Version Control:</strong> When scraping dated URLs (like /a/docs), old scrapes are automatically deleted when a new one is uploaded, keeping only the most recent version.
                  </p>
                </div>
              </div>
            </div>

            <Button
              onClick={handleScrapeWebsite}
              disabled={!scrapeUrl || isScraping}
              className="w-full"
              size="lg"
            >
              {isScraping ? (
                <>
                  <RefreshCw className="h-5 w-5 mr-2 animate-spin" />
                  Scraping Website... This may take a few minutes
                </>
              ) : (
                <>
                  <Globe className="h-5 w-5 mr-2" />
                  Scrape & Upload to Pinecone
                </>
              )}
            </Button>
          </div>
        </Card>

        <Card className="p-4 bg-amber-50 border-amber-200">
          <div className="flex gap-3">
            <Info className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-amber-900">
              <p className="font-semibold mb-1">Best Practices</p>
              <ul className="list-disc list-inside space-y-1 text-amber-800">
                <li>Test with a specific directory first (lower max pages)</li>
                <li>Use descriptive file names to track different scrapes</li>
                <li>Re-scrape when website content is significantly updated</li>
                <li>Be patient - scraping large sites takes time</li>
              </ul>
              <p className="mt-2 text-amber-800">
                💡 For help centers, re-scraping replaces old versions automatically
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
