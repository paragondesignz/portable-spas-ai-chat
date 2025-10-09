import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes for processing

interface Product {
  title: string;
  link: string;
  price: string | null;
  sku: string | null;
  type: string;
  vendor: string;
  description: string;
  tags: string[];
}

// XML namespaces
const NAMESPACES = {
  atom: 'http://www.w3.org/2005/Atom',
  s: 'http://jadedpixel.com/-/spec/shopify'
};

function stripHtml(text: string): string {
  if (!text) return '';

  // Remove CDATA
  text = text.replace(/<!\[CDATA\[(.*?)\]\]>/gs, '$1');
  // Remove HTML tags
  text = text.replace(/<[^>]+>/g, '');
  // Clean up entities
  text = text.replace(/&nbsp;/g, ' ');
  text = text.replace(/&amp;/g, '&');
  text = text.replace(/&lt;/g, '<');
  text = text.replace(/&gt;/g, '>');
  text = text.replace(/&quot;/g, '"');
  // Clean up whitespace
  text = text.replace(/\s+/g, ' ');
  return text.trim();
}

function extractDescription(summary: string): string {
  if (!summary) return '';

  // Try to extract text from the second table cell (description area)
  const match = summary.match(/<td colspan="2">(.*?)<\/td>/s);
  if (match) {
    let desc = stripHtml(match[1]);
    // Remove "Vendor:", "Type:", "Price:" lines if present
    desc = desc.replace(/(Vendor:|Type:|Price:).*?(\n|$)/g, '');
    return desc.trim();
  }

  return stripHtml(summary);
}

function parseAtomFeed(xml: string): Product[] {
  const products: Product[] = [];

  // Extract all entry elements using regex (simple XML parsing)
  const entryMatches = xml.matchAll(/<entry>(.*?)<\/entry>/gs);

  for (const match of entryMatches) {
    const entry = match[1];

    // Extract fields
    const titleMatch = entry.match(/<title>(.*?)<\/title>/s);
    const linkMatch = entry.match(/<link[^>]*href="([^"]*)"/);
    const summaryMatch = entry.match(/<summary[^>]*>(.*?)<\/summary>/s);
    const typeMatch = entry.match(/<s:type>(.*?)<\/s:type>/);
    const vendorMatch = entry.match(/<s:vendor>(.*?)<\/s:vendor>/);

    // Extract variant info (price and SKU)
    const variantMatch = entry.match(/<s:variant>(.*?)<\/s:variant>/s);
    let price = null;
    let sku = null;

    if (variantMatch) {
      const variant = variantMatch[1];
      const priceMatch = variant.match(/<s:price[^>]*>(.*?)<\/s:price>/);
      const skuMatch = variant.match(/<s:sku>(.*?)<\/s:sku>/);

      if (priceMatch) price = priceMatch[1].trim();
      if (skuMatch && skuMatch[1].trim()) sku = skuMatch[1].trim();
    }

    // Extract tags
    const tags: string[] = [];
    const tagMatches = entry.matchAll(/<s:tag>(.*?)<\/s:tag>/g);
    for (const tagMatch of tagMatches) {
      tags.push(tagMatch[1].trim());
    }

    const product: Product = {
      title: titleMatch ? titleMatch[1].trim() : 'Unknown',
      link: linkMatch ? linkMatch[1] : '',
      price,
      sku,
      type: typeMatch ? typeMatch[1].trim() : 'Other',
      vendor: vendorMatch ? vendorMatch[1].trim() : '',
      description: summaryMatch ? extractDescription(summaryMatch[1]) : '',
      tags
    };

    products.push(product);
  }

  return products;
}

function convertToMarkdown(products: Product[]): string {
  const today = new Date().toISOString().split('T')[0];

  let md = `# Portable Spas Product Catalog\n\n`;
  md += `*Last updated: ${today}*\n\n`;
  md += `This document contains the current product catalog for Portable Spas New Zealand.\n\n`;
  md += `Total products: ${products.length}\n\n`;
  md += `---\n\n`;

  // Group by type
  const byType: { [key: string]: Product[] } = {};
  for (const product of products) {
    if (!byType[product.type]) {
      byType[product.type] = [];
    }
    byType[product.type].push(product);
  }

  // Sort types and output
  const sortedTypes = Object.keys(byType).sort();

  for (const type of sortedTypes) {
    md += `## ${type}\n\n`;

    for (const product of byType[type]) {
      md += `### ${product.title}\n\n`;

      if (product.price) {
        md += `**Price:** $${product.price} NZD\n\n`;
      }

      md += `**Product Page:** ${product.link}\n\n`;

      if (product.sku) {
        md += `**SKU:** ${product.sku}\n\n`;
      }

      if (product.tags.length > 0) {
        md += `**Tags:** ${product.tags.join(', ')}\n\n`;
      }

      if (product.description) {
        md += `${product.description}\n\n`;
      }

      md += `---\n\n`;
    }
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

    // Fetch the product feed
    console.log('Fetching product feed from Shopify...');
    const feedResponse = await fetch('https://portablespas.co.nz/collections/all.atom');

    if (!feedResponse.ok) {
      throw new Error('Failed to fetch product feed');
    }

    const feedXml = await feedResponse.text();

    // Parse the feed
    console.log('Parsing product feed...');
    const products = parseAtomFeed(feedXml);
    console.log(`Found ${products.length} products`);

    // Convert to markdown
    console.log('Converting to markdown...');
    const markdown = convertToMarkdown(products);

    // Upload to Pinecone
    console.log('Uploading to Pinecone...');
    const fileName = `product-catalog-${new Date().toISOString().split('T')[0]}.md`;

    const uploadResponse = await fetch(
      `https://prod-1-data.ke.pinecone.io/assistant/files/${assistantName}`,
      {
        method: 'POST',
        headers: {
          'Api-Key': apiKey,
          'Content-Type': 'text/plain',
          'X-Pinecone-Filename': fileName,
        },
        body: markdown,
      }
    );

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      console.error('Pinecone upload error:', errorText);
      throw new Error(`Failed to upload to Pinecone: ${uploadResponse.status}`);
    }

    const result = await uploadResponse.json();

    return NextResponse.json({
      success: true,
      message: 'Product catalog synced successfully',
      stats: {
        productsFound: products.length,
        fileName: fileName,
        fileId: result.id
      }
    });

  } catch (error: any) {
    console.error('Product sync error:', error);
    return NextResponse.json(
      {
        error: 'Failed to sync product catalog',
        details: error.message
      },
      { status: 500 }
    );
  }
}
