import { NextRequest, NextResponse } from 'next/server';
import { getNZDateString } from '@/lib/timezone';
import { authorizeAdminRequest } from '@/lib/admin-auth';

export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes for processing

interface ShopifyProduct {
  id: number;
  title: string;
  handle: string;
  body_html: string;
  vendor: string;
  product_type: string;
  tags: string | string[]; // Can be string or array
  status?: 'active' | 'draft' | 'archived';
  published_at?: string | null;
  variants: Array<{
    id: number;
    title: string;
    price: string;
    sku: string;
    available?: boolean;
    inventory_quantity?: number | null;
    inventory_policy?: 'deny' | 'continue';
    inventory_management?: string | null;
  }>;
}

interface Product {
  title: string;
  link: string;
  price: string | null;
  sku: string | null;
  type: string;
  vendor: string;
  description: string;
  tags: string[];
  variants?: Array<{
    title: string;
    price: string;
    sku: string;
  }>;
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

async function fetchAllProducts(): Promise<ShopifyProduct[]> {
  const allProducts: ShopifyProduct[] = [];
  let page = 1;
  const limit = 250; // Max allowed by Shopify

  while (true) {
    const url = `https://portablespas.co.nz/products.json?limit=${limit}&page=${page}`;
    console.log(`Fetching page ${page}...`);

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch products (page ${page})`);
    }

    const data = await response.json();
    const products = data.products || [];

    if (products.length === 0) {
      break; // No more products
    }

    allProducts.push(...products);

    if (products.length < limit) {
      break; // Last page
    }

    page++;
  }

  return allProducts;
}

function convertShopifyProducts(shopifyProducts: ShopifyProduct[]): Product[] {
  const filteredProducts = shopifyProducts
    .filter(sp => {
      const status = sp.status ?? 'active';
      const publishedAt = sp.published_at ?? null;
      return status === 'active' && publishedAt !== null;
    })
    .map(sp => ({
      ...sp,
      variants: sp.variants.filter(variant =>
        variant.available ||
        variant.inventory_policy === 'continue' ||
        variant.inventory_management == null ||
        (variant.inventory_quantity != null && variant.inventory_quantity > 0)
      )
    }))
    .filter(sp => sp.variants.length > 0);

  return filteredProducts.map(sp => {
    // Get primary variant (usually the first one, or cheapest)
    const primaryVariant = sp.variants[0];

    // Get all variant info for products with multiple variants
    const variants = sp.variants.length > 1
      ? sp.variants.map(v => ({
          title: v.title !== 'Default Title' ? v.title : '',
          price: v.price,
          sku: v.sku
        }))
      : undefined;

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
      link: `https://portablespas.co.nz/products/${sp.handle}`,
      price: primaryVariant?.price || null,
      sku: primaryVariant?.sku || null,
      type: sp.product_type || 'Other',
      vendor: sp.vendor,
      description: stripHtml(sp.body_html),
      tags,
      variants
    };
  });
}

function convertToMarkdown(products: Product[]): string {
  const today = getNZDateString();

  let md = `# Portable Spas Product Catalog\n\n`;
  md += `*Last updated: ${today}*\n\n`;
  md += `This document contains the current product catalog for Portable Spas New Zealand.\n\n`;
  md += `Total products: ${products.length}\n\n`;
  md += `---\n\n`;

  // List of common MSpa models for universal products
  const commonModels = [
    'Bergen', 'Tekapo', 'Oslo', 'Camaro', 'Aurora', 'Carlton', 'Mono',
    'Tuscany', 'Duet', 'Naval', 'Tribeca', 'Silver Cloud', 'Ottoman', 'SoHo'
  ];

  // Group by type
  const byType: { [key: string]: Product[] } = {};
  for (const product of products) {
    const type = product.type || 'Other';
    if (!byType[type]) {
      byType[type] = [];
    }
    byType[type].push(product);
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

      // Show variants if product has multiple options
      if (product.variants && product.variants.length > 0) {
        md += `**Variants:**\n`;
        for (const variant of product.variants) {
          const variantName = variant.title || 'Standard';
          md += `- ${variantName}: $${variant.price} NZD`;
          if (variant.sku) {
            md += ` (SKU: ${variant.sku})`;
          }
          md += `\n`;
        }
        md += `\n`;
      }

      if (product.tags.length > 0) {
        md += `**Tags:** ${product.tags.join(', ')}\n\n`;
      }

      if (product.description) {
        let description = product.description;

        // Check if this is a universal product that fits all models
        const isUniversal = description.toLowerCase().includes('fits all') ||
                           description.toLowerCase().includes('all mspa') ||
                           description.toLowerCase().includes('all models') ||
                           description.toLowerCase().includes('all sizes');

        if (isUniversal) {
          // Add explicit model compatibility list for better search matching
          description += `\n\n**Compatible Models:** ${commonModels.join(', ')}`;
        }

        md += `${description}\n\n`;
      }

      md += `---\n\n`;
    }
  }

  return md;
}

export async function POST(req: NextRequest) {
  try {
    // Verify admin password or Vercel Cron
    const authHeader = req.headers.get('authorization');
    const vercelCronHeader = req.headers.get('x-vercel-cron');

    // Check if request is from Vercel Cron
    const isFromCron = vercelCronHeader === '1';

    // Check if request is from admin with password
    if (!isFromCron) {
      const authStatus = authorizeAdminRequest(req);

      if (authStatus === 'misconfigured') {
        return NextResponse.json(
          { error: 'Server configuration error. ADMIN_PASSWORD and ADMIN_SESSION_SECRET must be set.' },
          { status: 500 }
        );
      }

      if (authStatus !== 'authorized') {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      }
    }

    const apiKey = process.env.PINECONE_API_KEY;
    const assistantName = process.env.PINECONE_ASSISTANT_NAME || 'portable-spas';

    if (!apiKey) {
      return NextResponse.json(
        { error: 'Pinecone API key not configured' },
        { status: 500 }
      );
    }

    // Fetch all products from Shopify JSON API
    console.log('Fetching products from Shopify...');
    const shopifyProducts = await fetchAllProducts();
    console.log(`Found ${shopifyProducts.length} products from Shopify`);

    // Convert to our format
    console.log('Converting products...');
    const products = convertShopifyProducts(shopifyProducts);
    console.log(`Converted ${products.length} products`);

    // Convert to markdown
    console.log('Converting to markdown...');
    const markdown = convertToMarkdown(products);

    // Upload to Pinecone
    console.log('Uploading to Pinecone...');
    const fileName = `product-catalog-${getNZDateString()}.md`;

    // Create FormData for Pinecone API (same format as upload endpoint)
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

    // Clean up old product catalogs
    console.log('Checking for old product catalogs to clean up...');
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

        // Pattern to match product catalog files: product-catalog-YYYY-MM-DD.md
        const catalogPattern = /^product-catalog-\d{4}-\d{2}-\d{2}\.md$/;

        // Find all product catalog files except the one we just uploaded
        const oldCatalogs = files.filter((file: any) =>
          catalogPattern.test(file.name) && file.name !== fileName
        );

        console.log(`Found ${oldCatalogs.length} old product catalogs to delete`);

        // Delete each old catalog
        for (const oldFile of oldCatalogs) {
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
              console.log(`Deleted old catalog: ${oldFile.name}`);
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
      message: 'Product catalog synced successfully',
      stats: {
        productsFound: products.length,
        fileName: fileName,
        fileId: result.id,
        oldCatalogsDeleted: deletedCount
      }
    });

  } catch (error: any) {
    console.error('Product sync error:', error);
    console.error('Error stack:', error.stack);
    return NextResponse.json(
      {
        error: 'Failed to sync product catalog',
        details: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}
