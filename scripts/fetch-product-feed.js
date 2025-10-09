#!/usr/bin/env node

/**
 * Fetches the Shopify Atom feed and converts it to markdown for Pinecone upload
 * Run: node scripts/fetch-product-feed.js
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const FEED_URL = 'https://portablespas.co.nz/collections/all.atom';
const OUTPUT_FILE = path.join(__dirname, '..', 'product-catalog.md');

function fetchFeed() {
  return new Promise((resolve, reject) => {
    https.get(FEED_URL, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        resolve(data);
      });
    }).on('error', (err) => {
      reject(err);
    });
  });
}

function parseAtomFeed(xml) {
  const products = [];

  // Simple XML parsing - extract entry elements
  const entryRegex = /<entry>(.*?)<\/entry>/gs;
  const entries = xml.match(entryRegex) || [];

  entries.forEach(entry => {
    // Extract fields
    const title = (entry.match(/<title>(.*?)<\/title>/s) || [])[1]?.trim();
    const link = (entry.match(/<link[^>]*href="([^"]*)"/) || [])[1];
    const summary = (entry.match(/<summary[^>]*>(.*?)<\/summary>/s) || [])[1];
    const productType = (entry.match(/<s:type>(.*?)<\/s:type>/) || [])[1];
    const vendor = (entry.match(/<s:vendor>(.*?)<\/s:vendor>/) || [])[1];

    // Extract price
    const priceMatch = entry.match(/\$([0-9,]+\.[0-9]{2})/);
    const price = priceMatch ? priceMatch[0] : null;

    // Extract description from summary (remove HTML tags)
    let description = '';
    if (summary) {
      description = summary
        .replace(/<[^>]*>/g, '') // Remove HTML tags
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .trim();
    }

    if (title && link) {
      products.push({
        title,
        link,
        price,
        productType,
        vendor,
        description
      });
    }
  });

  return products;
}

function convertToMarkdown(products) {
  let markdown = `# Portable Spas Product Catalog\n\n`;
  markdown += `*Last updated: ${new Date().toISOString().split('T')[0]}*\n\n`;
  markdown += `This document contains the current product catalog for Portable Spas New Zealand.\n\n`;
  markdown += `---\n\n`;

  // Group by product type
  const grouped = {};
  products.forEach(product => {
    const type = product.productType || 'Other';
    if (!grouped[type]) {
      grouped[type] = [];
    }
    grouped[type].push(product);
  });

  // Output by category
  Object.keys(grouped).sort().forEach(type => {
    markdown += `## ${type}\n\n`;

    grouped[type].forEach(product => {
      markdown += `### ${product.title}\n\n`;

      if (product.price) {
        markdown += `**Price:** ${product.price} NZD\n\n`;
      }

      markdown += `**Product Page:** ${product.link}\n\n`;

      if (product.description) {
        markdown += `**Description:** ${product.description}\n\n`;
      }

      markdown += `---\n\n`;
    });
  });

  return markdown;
}

async function main() {
  try {
    console.log('Fetching product feed from Shopify...');
    const xml = await fetchFeed();

    console.log('Parsing feed...');
    const products = parseAtomFeed(xml);

    console.log(`Found ${products.length} products`);

    console.log('Converting to markdown...');
    const markdown = convertToMarkdown(products);

    console.log(`Writing to ${OUTPUT_FILE}...`);
    fs.writeFileSync(OUTPUT_FILE, markdown, 'utf8');

    console.log('✅ Done! Product catalog saved to product-catalog.md');
    console.log('\nYou can now upload this file to Pinecone via the admin interface at:');
    console.log('https://portable-spas-ai-chat.vercel.app/admin');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main();
