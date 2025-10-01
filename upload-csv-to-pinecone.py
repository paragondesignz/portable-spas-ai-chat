#!/usr/bin/env python3
"""
Convert CSV documentation to text format and upload to Pinecone Assistant
"""

import csv
import re
from pinecone import Pinecone

# Configuration
API_KEY = "pcsk_3aSats_Nb8yfU9GyE8KcPmup68ryxkCkLhPSippTQfHAXXDZVPjrwCCuAcfyuEzwrAT6kj"
ASSISTANT_NAME = "portable-spas"
CSV_FILE = "/Users/marksteven/coding/portable-spas-AI-chat/docs/Betterdocs_docs2025-10-01 03_29_40.csv"
OUTPUT_FILE = "/Users/marksteven/coding/portable-spas-AI-chat/docs/portable-spas-documentation.txt"

def strip_html(html_text):
    """Remove HTML tags from text"""
    if not html_text:
        return ""
    
    # Remove HTML tags
    text = re.sub(r'<[^>]+>', '', html_text)
    
    # Decode common HTML entities
    text = text.replace('&nbsp;', ' ')
    text = text.replace('&amp;', '&')
    text = text.replace('&lt;', '<')
    text = text.replace('&gt;', '>')
    text = text.replace('&quot;', '"')
    text = text.replace('&#39;', "'")
    text = text.replace('&rsquo;', "'")
    text = text.replace('&rdquo;', '"')
    text = text.replace('&ldquo;', '"')
    
    # Clean up multiple spaces and newlines
    text = re.sub(r'\s+', ' ', text)
    text = text.strip()
    
    return text

def convert_csv_to_text():
    """Convert CSV to clean text format"""
    print(f"📖 Reading CSV file: {CSV_FILE}")
    
    with open(CSV_FILE, 'r', encoding='utf-8') as csvfile:
        reader = csv.DictReader(csvfile)
        
        with open(OUTPUT_FILE, 'w', encoding='utf-8') as txtfile:
            txtfile.write("PORTABLE SPAS NEW ZEALAND - DOCUMENTATION AND FAQ\n")
            txtfile.write("=" * 80 + "\n\n")
            
            doc_count = 0
            for row in reader:
                # Only include published documents
                if row.get('docs_status', '').lower() != 'published':
                    continue
                
                doc_count += 1
                title = row.get('docs_title', 'Untitled')
                category = row.get('category_title', 'General')
                description = strip_html(row.get('docs_description', ''))
                meta_desc = strip_html(row.get('docs_seo_meta_description', ''))
                
                # Write formatted document
                txtfile.write(f"\n{'=' * 80}\n")
                txtfile.write(f"Title: {title}\n")
                txtfile.write(f"Category: {category}\n")
                txtfile.write(f"{'-' * 80}\n\n")
                
                if meta_desc:
                    txtfile.write(f"Summary: {meta_desc}\n\n")
                
                if description:
                    txtfile.write(f"{description}\n")
                
                txtfile.write(f"\n{'=' * 80}\n")
    
    print(f"✅ Converted {doc_count} documents to: {OUTPUT_FILE}")
    return OUTPUT_FILE

def upload_to_pinecone(file_path):
    """Upload the converted file to Pinecone Assistant"""
    print(f"\n🚀 Uploading to Pinecone Assistant: {ASSISTANT_NAME}")
    
    pc = Pinecone(api_key=API_KEY)
    assistant = pc.assistant.Assistant(assistant_name=ASSISTANT_NAME)
    
    try:
        response = assistant.upload_file(
            file_path=file_path,
            metadata={
                "source": "betterdocs_csv",
                "type": "documentation",
                "upload_date": "2025-10-01"
            },
            timeout=None
        )
        
        print(f"✅ File uploaded successfully!")
        print(f"   Status: {response.get('status', 'Uploaded')}")
        print(f"   File ID: {response.get('id', 'N/A')}")
        
        return True
    except Exception as e:
        print(f"❌ Error uploading file: {e}")
        return False

def list_all_files():
    """List all files in the assistant"""
    print(f"\n📚 All files in assistant '{ASSISTANT_NAME}':")
    
    pc = Pinecone(api_key=API_KEY)
    assistant = pc.assistant.Assistant(assistant_name=ASSISTANT_NAME)
    
    try:
        files = assistant.list_files()
        print(f"\nTotal files: {len(files)}\n")
        for i, file in enumerate(files, 1):
            status = file.get('status', 'Unknown')
            name = file.get('name', 'Unknown')
            size = file.get('size', 0)
            size_kb = size / 1024 if size else 0
            print(f"{i}. {name}")
            print(f"   Status: {status}, Size: {size_kb:.1f}KB")
        
    except Exception as e:
        print(f"❌ Error listing files: {e}")

def main():
    """Main execution"""
    print("=" * 80)
    print("🌊 Portable Spas - CSV to Pinecone Upload")
    print("=" * 80)
    print()
    
    # Step 1: Convert CSV to text
    text_file = convert_csv_to_text()
    
    # Step 2: Upload to Pinecone
    success = upload_to_pinecone(text_file)
    
    if success:
        print("\n⏳ Waiting for file to be processed (this may take a minute)...")
        import time
        time.sleep(10)
    
    # Step 3: List all files
    list_all_files()
    
    print("\n" + "=" * 80)
    print("✅ Upload complete! Your documentation is now available in the chat.")
    print("🌐 Test it at: http://localhost:3000")
    print("=" * 80)

if __name__ == "__main__":
    main()

