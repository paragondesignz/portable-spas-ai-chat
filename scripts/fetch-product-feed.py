#!/usr/bin/env python3

"""
Fetches the Shopify Atom feed and converts it to markdown for Pinecone upload
Run: python3 scripts/fetch-product-feed.py
"""

import xml.etree.ElementTree as ET
import urllib.request
import re
from datetime import date

FEED_URL = 'https://portablespas.co.nz/collections/all.atom'
OUTPUT_FILE = 'product-catalog.md'

# XML namespaces
NAMESPACES = {
    'atom': 'http://www.w3.org/2005/Atom',
    's': 'http://jadedpixel.com/-/spec/shopify'
}

def fetch_feed():
    """Fetch the Atom feed from Shopify"""
    print('Fetching product feed from Shopify...')
    with urllib.request.urlopen(FEED_URL) as response:
        return response.read().decode('utf-8')

def strip_html(text):
    """Remove HTML tags and clean up text"""
    if not text:
        return ''
    # Remove CDATA
    text = re.sub(r'<!\[CDATA\[(.*?)\]\]>', r'\1', text, flags=re.DOTALL)
    # Remove HTML tags
    text = re.sub(r'<[^>]+>', '', text)
    # Clean up entities
    text = text.replace('&nbsp;', ' ')
    text = text.replace('&amp;', '&')
    text = text.replace('&lt;', '<')
    text = text.replace('&gt;', '>')
    text = text.replace('&quot;', '"')
    # Clean up whitespace
    text = re.sub(r'\s+', ' ', text)
    return text.strip()

def extract_description(summary):
    """Extract clean description from summary HTML"""
    if not summary:
        return ''

    # Try to extract text from the second table cell (description area)
    match = re.search(r'<td colspan="2">(.*?)</td>', summary, re.DOTALL)
    if match:
        desc = strip_html(match.group(1))
        # Remove "Vendor:", "Type:", "Price:" lines if present
        desc = re.sub(r'(Vendor:|Type:|Price:).*?(\n|$)', '', desc)
        return desc.strip()

    return strip_html(summary)

def parse_feed(xml_content):
    """Parse the Atom feed and extract product information"""
    print('Parsing feed...')
    root = ET.fromstring(xml_content)

    products = []

    for entry in root.findall('atom:entry', NAMESPACES):
        title = entry.find('atom:title', NAMESPACES)
        link = entry.find('atom:link[@rel="alternate"]', NAMESPACES)
        summary = entry.find('atom:summary', NAMESPACES)
        product_type = entry.find('s:type', NAMESPACES)
        vendor = entry.find('s:vendor', NAMESPACES)

        # Get variant info (price)
        variant = entry.find('s:variant', NAMESPACES)
        price = None
        sku = None
        if variant is not None:
            price_elem = variant.find('s:price', NAMESPACES)
            sku_elem = variant.find('s:sku', NAMESPACES)
            if price_elem is not None:
                price = price_elem.text
            if sku_elem is not None and sku_elem.text:
                sku = sku_elem.text

        # Get tags
        tags = [tag.text for tag in entry.findall('s:tag', NAMESPACES)]

        product = {
            'title': title.text if title is not None else 'Unknown',
            'link': link.get('href') if link is not None else '',
            'price': price,
            'sku': sku,
            'type': product_type.text if product_type is not None else 'Other',
            'vendor': vendor.text if vendor is not None else '',
            'description': extract_description(summary.text if summary is not None else ''),
            'tags': tags
        }

        products.append(product)

    return products

def convert_to_markdown(products):
    """Convert products to markdown format"""
    print('Converting to markdown...')

    md = f"# Portable Spas Product Catalog\n\n"
    md += f"*Last updated: {date.today().isoformat()}*\n\n"
    md += f"This document contains the current product catalog for Portable Spas New Zealand.\n\n"
    md += f"Total products: {len(products)}\n\n"
    md += f"---\n\n"

    # Group by type
    by_type = {}
    for product in products:
        ptype = product['type']
        if ptype not in by_type:
            by_type[ptype] = []
        by_type[ptype].append(product)

    # Sort types
    for ptype in sorted(by_type.keys()):
        md += f"## {ptype}\n\n"

        for product in by_type[ptype]:
            md += f"### {product['title']}\n\n"

            if product['price']:
                md += f"**Price:** ${product['price']} NZD\n\n"

            md += f"**Product Page:** {product['link']}\n\n"

            if product['sku']:
                md += f"**SKU:** {product['sku']}\n\n"

            if product['tags']:
                md += f"**Tags:** {', '.join(product['tags'])}\n\n"

            if product['description']:
                md += f"{product['description']}\n\n"

            md += f"---\n\n"

    return md

def main():
    try:
        # Fetch and parse
        xml_content = fetch_feed()
        products = parse_feed(xml_content)

        print(f"Found {len(products)} products")

        # Convert to markdown
        markdown = convert_to_markdown(products)

        # Write to file
        print(f'Writing to {OUTPUT_FILE}...')
        with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
            f.write(markdown)

        print('✅ Done! Product catalog saved to product-catalog.md')
        print('\nYou can now upload this file to Pinecone via the admin interface at:')
        print('https://portable-spas-ai-chat.vercel.app/admin')

    except Exception as e:
        print(f'❌ Error: {e}')
        import traceback
        traceback.print_exc()
        exit(1)

if __name__ == '__main__':
    main()
