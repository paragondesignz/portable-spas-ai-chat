import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes for scraping

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// Simple password check
function checkAuth(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  const adminPassword = process.env.ADMIN_PASSWORD || 'change-me-in-production';

  if (!authHeader) return false;

  const password = authHeader.replace('Bearer ', '');
  return password === adminPassword;
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST(req: NextRequest) {
  try {
    if (!checkAuth(req)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401, headers: corsHeaders }
      );
    }

    const apifyApiToken = process.env.APIFY_API_TOKEN;
    const pineconeApiKey = process.env.PINECONE_API_KEY;
    const assistantName = process.env.PINECONE_ASSISTANT_NAME || 'portable-spas';

    if (!apifyApiToken) {
      return NextResponse.json(
        { error: 'APIFY_API_TOKEN not configured' },
        { status: 500, headers: corsHeaders }
      );
    }

    if (!pineconeApiKey) {
      return NextResponse.json(
        { error: 'PINECONE_API_KEY not configured' },
        { status: 500, headers: corsHeaders }
      );
    }

    const { url, maxPages = 200, fileName } = await req.json();

    if (!url) {
      return NextResponse.json(
        { error: 'URL is required' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Parse URL to determine if we're scraping a specific directory
    let startUrl = url;
    let crawlPattern = url;

    // If URL has a path (e.g., /spas), only crawl under that path
    try {
      const urlObj = new URL(url);
      const baseDomain = `${urlObj.protocol}//${urlObj.hostname}`;
      crawlPattern = url.endsWith('/') ? url + '*' : url + '/*';

      console.log(`Starting scrape of ${url} with max ${maxPages} pages...`);
      console.log(`Crawl pattern: ${crawlPattern}`);
    } catch (e) {
      console.log(`Starting scrape of ${url} with max ${maxPages} pages...`);
    }

    // Step 1: Run Apify Website Content Crawler
    const actorInput: any = {
      startUrls: [{ url: startUrl }],
      crawlerType: 'cheerio', // Fast HTTP crawler
      maxCrawlPages: maxPages,
      excludeUrlGlobs: [
        '**/checkout/**',
        '**/cart/**',
        '**/account/**',
        '**/login/**',
        '**/*.pdf',
        '**/*.jpg',
        '**/*.png',
      ],
    };

    // If scraping a specific directory, only include pages matching that pattern
    try {
      const urlObj = new URL(url);
      if (urlObj.pathname !== '/' && urlObj.pathname !== '') {
        // Only crawl URLs that start with this path
        actorInput.includeUrlGlobs = [crawlPattern];
        console.log(`Restricting crawl to pattern: ${crawlPattern}`);
      }
    } catch (e) {
      // Invalid URL, continue without restriction
    }

    const actorResponse = await fetch(
      `https://api.apify.com/v2/acts/apify~website-content-crawler/runs?token=${apifyApiToken}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(actorInput),
      }
    );

    if (!actorResponse.ok) {
      const errorText = await actorResponse.text();
      console.error('Apify actor run failed:', errorText);
      return NextResponse.json(
        { error: 'Failed to start scraper', details: errorText },
        { status: 500, headers: corsHeaders }
      );
    }

    const actorRun = await actorResponse.json();
    const runId = actorRun.data.id;
    const defaultDatasetId = actorRun.data.defaultDatasetId;

    console.log(`Scraper started, run ID: ${runId}`);

    // Step 2: Wait for the actor to finish (with timeout)
    let status = 'RUNNING';
    let attempts = 0;
    const maxAttempts = 60; // 5 minutes max wait

    while (status === 'RUNNING' && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds

      const statusResponse = await fetch(
        `https://api.apify.com/v2/actor-runs/${runId}?token=${apifyApiToken}`
      );

      const statusData = await statusResponse.json();
      status = statusData.data.status;
      attempts++;

      console.log(`Scraper status: ${status} (attempt ${attempts}/${maxAttempts})`);
    }

    if (status !== 'SUCCEEDED') {
      return NextResponse.json(
        { error: `Scraper did not complete successfully. Status: ${status}` },
        { status: 500, headers: corsHeaders }
      );
    }

    console.log('Scraper completed successfully, fetching results...');

    // Step 3: Get the scraped data
    const datasetResponse = await fetch(
      `https://api.apify.com/v2/datasets/${defaultDatasetId}/items?token=${apifyApiToken}`
    );

    if (!datasetResponse.ok) {
      const errorText = await datasetResponse.text();
      console.error('Failed to fetch dataset:', errorText);
      return NextResponse.json(
        { error: 'Failed to fetch scraped data', details: errorText },
        { status: 500, headers: corsHeaders }
      );
    }

    const scrapedData = await datasetResponse.json();
    console.log(`Fetched ${scrapedData.length} pages of content`);

    if (scrapedData.length === 0) {
      return NextResponse.json(
        { error: 'No content was scraped from the website' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Step 4: Convert to Markdown
    let markdown = `# Website Content: ${url}\n\n`;
    markdown += `*Scraped on ${new Date().toISOString()}*\n\n`;
    markdown += `---\n\n`;

    for (const page of scrapedData) {
      if (page.text && page.text.trim()) {
        markdown += `## ${page.metadata?.title || page.url || 'Page'}\n\n`;
        markdown += `**URL:** ${page.url}\n\n`;
        markdown += page.text.trim() + '\n\n';
        markdown += `---\n\n`;
      }
    }

    console.log(`Generated markdown file (${markdown.length} bytes)`);

    // Step 5: Upload to Pinecone
    const blob = new Blob([markdown], { type: 'text/markdown' });

    // Generate filename - use custom name if provided, otherwise generate one
    let finalFileName: string;
    if (fileName && fileName.trim()) {
      // Clean the filename
      finalFileName = fileName.trim().replace(/[^a-zA-Z0-9_-]/g, '-');
      if (!finalFileName.endsWith('.md')) {
        finalFileName += '.md';
      }
    } else {
      // Generate default filename with date
      const dateStr = new Date().toISOString().split('T')[0];
      try {
        const urlObj = new URL(url);
        const pathPart = urlObj.pathname.replace(/\//g, '-').replace(/^-|-$/g, '') || 'home';
        finalFileName = `scrape-${pathPart}-${dateStr}.md`;
      } catch (e) {
        finalFileName = `website-scrape-${dateStr}.md`;
      }
    }

    const formData = new FormData();
    formData.append('file', blob, finalFileName);

    const uploadResponse = await fetch(
      `https://prod-1-data.ke.pinecone.io/assistant/files/${assistantName}`,
      {
        method: 'POST',
        headers: {
          'Api-Key': pineconeApiKey,
        },
        body: formData,
      }
    );

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      console.error('Pinecone upload failed:', errorText);
      return NextResponse.json(
        { error: 'Failed to upload to Pinecone', details: errorText },
        { status: 500, headers: corsHeaders }
      );
    }

    const uploadData = await uploadResponse.json();
    console.log('Successfully uploaded to Pinecone:', uploadData);

    return NextResponse.json({
      success: true,
      message: 'Website scraped and uploaded to Pinecone successfully',
      stats: {
        pagesScraped: scrapedData.length,
        contentSize: markdown.length,
        pineconeFileId: uploadData.id,
        fileName: finalFileName,
      },
    }, { headers: corsHeaders });

  } catch (error: any) {
    console.error('Scrape and upload error:', error);
    return NextResponse.json(
      {
        error: 'Failed to scrape and upload',
        details: error.message || 'Unknown error occurred',
      },
      { status: 500, headers: corsHeaders }
    );
  }
}
