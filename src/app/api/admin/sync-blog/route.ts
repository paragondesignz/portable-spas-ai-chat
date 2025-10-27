import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes for processing

interface ShopifyBlogPost {
  id: number;
  title: string;
  handle: string;
  body_html: string;
  author: string;
  created_at: string;
  published_at: string;
  tags: string | string[];
}

interface BlogPost {
  title: string;
  author: string;
  date: string;
  content: string;
  tags: string[];
  url: string;
}

function stripHtml(text: string): string {
  if (!text) return '';

  // Remove HTML tags
  text = text.replace(/<[^>]+>/g, '');
  // Clean up entities
  text = text.replace(/&nbsp;/g, ' ');
  text = text.replace(/&amp;/g, '&');
  text = text.replace(/&lt;/g, '<');
  text = text.replace(/&gt;/g, '>');
  text = text.replace(/&quot;/g, '"');
  text = text.replace(/&#39;/g, "'");
  // Clean up whitespace
  text = text.replace(/\s+/g, ' ');
  return text.trim();
}

async function fetchAllBlogPosts(blogHandle: string): Promise<ShopifyBlogPost[]> {
  const allPosts: ShopifyBlogPost[] = [];

  // Shopify blogs use Atom feeds, not JSON
  const url = `https://portablespas.co.nz/blogs/${blogHandle}.atom`;
  console.log(`Fetching blog posts from Atom feed: ${url}`);

  const response = await fetch(url);
  if (!response.ok) {
    const errorText = await response.text();
    console.error(`Blog fetch error (${response.status}):`, errorText);
    throw new Error(`Failed to fetch blog posts from ${url}: ${response.status} ${response.statusText}`);
  }

  const atomXml = await response.text();

  // Parse Atom XML
  // Extract entries using regex (simple parsing for XML)
  const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
  const entries = atomXml.match(entryRegex) || [];

  console.log(`Found ${entries.length} entries in Atom feed`);

  for (const entry of entries) {
    // Extract fields from each entry
    const titleMatch = entry.match(/<title>(.*?)<\/title>/);
    const idMatch = entry.match(/<id>(.*?)<\/id>/);
    const publishedMatch = entry.match(/<published>(.*?)<\/published>/);
    const authorMatch = entry.match(/<author>[\s\S]*?<name>(.*?)<\/name>[\s\S]*?<\/author>/);
    const contentMatch = entry.match(/<content[^>]*>([\s\S]*?)<\/content>/);

    if (titleMatch && idMatch) {
      // Extract handle from URL (last part after /)
      const url = idMatch[1];
      const handle = url.split('/').pop() || '';

      // Extract content from CDATA if present
      let bodyHtml = contentMatch ? contentMatch[1] : '';
      const cdataMatch = bodyHtml.match(/<!\[CDATA\[([\s\S]*?)\]\]>/);
      if (cdataMatch) {
        bodyHtml = cdataMatch[1];
      }

      const post: ShopifyBlogPost = {
        id: Date.now() + Math.random(), // Generate a fake ID
        title: titleMatch[1],
        handle: handle,
        body_html: bodyHtml,
        author: authorMatch ? authorMatch[1] : 'Portable Spas',
        created_at: publishedMatch ? publishedMatch[1] : new Date().toISOString(),
        published_at: publishedMatch ? publishedMatch[1] : new Date().toISOString(),
        tags: [] // Atom feeds don't include tags
      };

      allPosts.push(post);
    }
  }

  return allPosts;
}

function convertShopifyBlogPosts(shopifyPosts: ShopifyBlogPost[], blogHandle: string): BlogPost[] {
  return shopifyPosts.map(sp => {
    // Handle tags - can be string or array
    let tags: string[] = [];
    if (sp.tags) {
      if (typeof sp.tags === 'string') {
        tags = sp.tags.split(',').map(t => t.trim()).filter(t => t.length > 0);
      } else if (Array.isArray(sp.tags)) {
        tags = sp.tags;
      }
    }

    return {
      title: sp.title,
      author: sp.author || 'Portable Spas',
      date: sp.published_at || sp.created_at,
      content: stripHtml(sp.body_html),
      tags,
      url: `https://portablespas.co.nz/blogs/${blogHandle}/${sp.handle}`
    };
  });
}

function convertToMarkdown(posts: BlogPost[]): string {
  const today = new Date().toISOString().split('T')[0];

  let md = `# Portable Spas Blog Posts\n\n`;
  md += `*Last updated: ${today}*\n\n`;
  md += `This document contains all published blog posts from Portable Spas New Zealand.\n\n`;
  md += `Total posts: ${posts.length}\n\n`;
  md += `---\n\n`;

  // Sort by date (newest first)
  const sortedPosts = [...posts].sort((a, b) =>
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  for (const post of sortedPosts) {
    const postDate = new Date(post.date).toLocaleDateString('en-NZ', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    md += `## ${post.title}\n\n`;
    md += `**Published:** ${postDate}\n\n`;
    md += `**Author:** ${post.author}\n\n`;
    md += `**URL:** ${post.url}\n\n`;

    if (post.tags.length > 0) {
      md += `**Tags:** ${post.tags.join(', ')}\n\n`;
    }

    if (post.content) {
      md += `${post.content}\n\n`;
    }

    md += `---\n\n`;
  }

  return md;
}

export async function POST(req: NextRequest) {
  try {
    // Verify admin password
    const authHeader = req.headers.get('authorization');
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminPassword) {
      return NextResponse.json(
        { error: 'Admin password not configured' },
        { status: 500 }
      );
    }

    const providedPassword = authHeader?.replace('Bearer ', '');
    if (providedPassword !== adminPassword) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const apiKey = process.env.PINECONE_API_KEY;
    const assistantName = process.env.PINECONE_ASSISTANT_NAME || 'portable-spas';

    if (!apiKey) {
      return NextResponse.json(
        { error: 'Pinecone API key not configured' },
        { status: 500 }
      );
    }

    // Get blog URL from request body
    const body = await req.json();
    const blogUrl = body.url || 'https://portablespas.co.nz/blogs/news';

    // Extract blog handle from URL (e.g., "news" from "/blogs/news")
    let blogHandle = 'news';
    try {
      const urlParts = blogUrl.split('/blogs/');
      if (urlParts.length > 1) {
        blogHandle = urlParts[1].split('?')[0].split('/')[0].replace(/\/$/, '') || 'news';
      }
    } catch (error) {
      console.error('Error parsing blog URL:', error);
    }

    console.log(`Blog URL: ${blogUrl}, Extracted handle: ${blogHandle}`);

    // Fetch all blog posts from Shopify
    console.log(`Fetching blog posts from ${blogHandle}...`);
    const shopifyPosts = await fetchAllBlogPosts(blogHandle);
    console.log(`Found ${shopifyPosts.length} blog posts`);

    if (shopifyPosts.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No blog posts found',
        stats: {
          postsFound: 0,
          fileName: null,
          fileId: null,
          oldBlogsDeleted: 0
        }
      });
    }

    // Convert to our format
    console.log('Converting blog posts...');
    const posts = convertShopifyBlogPosts(shopifyPosts, blogHandle);

    // Convert to markdown
    console.log('Converting to markdown...');
    const markdown = convertToMarkdown(posts);

    // Upload to Pinecone
    console.log('Uploading to Pinecone...');
    const fileName = `blog-posts-${new Date().toISOString().split('T')[0]}.md`;

    // Create FormData for Pinecone API
    const formData = new FormData();
    const blob = new Blob([markdown], { type: 'text/markdown' });
    formData.append('file', blob, fileName);

    const uploadResponse = await fetch(
      `https://prod-1-data.ke.pinecone.io/assistant/files/${assistantName}`,
      {
        method: 'POST',
        headers: {
          'Api-Key': apiKey,
        },
        body: formData,
      }
    );

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      console.error('Pinecone upload error:', errorText);
      throw new Error(`Failed to upload to Pinecone: ${uploadResponse.status}`);
    }

    const result = await uploadResponse.json();

    // Clean up old blog posts
    console.log('Checking for old blog posts to clean up...');
    let deletedCount = 0;
    try {
      // List all files
      const listResponse = await fetch(
        `https://prod-1-data.ke.pinecone.io/assistant/files/${assistantName}`,
        {
          method: 'GET',
          headers: {
            'Api-Key': apiKey,
            'Content-Type': 'application/json',
          },
        }
      );

      if (listResponse.ok) {
        const filesData = await listResponse.json();
        const files = filesData.files || [];

        // Pattern to match blog post files: blog-posts-YYYY-MM-DD.md
        const blogPattern = /^blog-posts-\d{4}-\d{2}-\d{2}\.md$/;

        // Find all blog post files except the one we just uploaded
        const oldBlogs = files.filter((file: any) =>
          blogPattern.test(file.name) && file.name !== fileName
        );

        console.log(`Found ${oldBlogs.length} old blog posts to delete`);

        // Delete each old blog post
        for (const oldFile of oldBlogs) {
          try {
            const deleteResponse = await fetch(
              `https://prod-1-data.ke.pinecone.io/assistant/files/${assistantName}/${oldFile.id}`,
              {
                method: 'DELETE',
                headers: {
                  'Api-Key': apiKey,
                },
              }
            );

            if (deleteResponse.ok) {
              console.log(`Deleted old blog: ${oldFile.name}`);
              deletedCount++;
            } else {
              console.error(`Failed to delete ${oldFile.name}: ${deleteResponse.status}`);
            }
          } catch (deleteError) {
            console.error(`Error deleting ${oldFile.name}:`, deleteError);
          }
        }
      }
    } catch (cleanupError) {
      console.error('Error during cleanup:', cleanupError);
      // Don't fail the whole operation if cleanup fails
    }

    return NextResponse.json({
      success: true,
      message: 'Blog posts synced successfully',
      stats: {
        postsFound: posts.length,
        fileName: fileName,
        fileId: result.id,
        oldBlogsDeleted: deletedCount
      }
    });

  } catch (error: any) {
    console.error('Blog sync error:', error);
    console.error('Error stack:', error.stack);
    return NextResponse.json(
      {
        error: 'Failed to sync blog posts',
        details: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}
