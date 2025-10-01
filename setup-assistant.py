#!/usr/bin/env python3
"""
Setup script for Portable Spas AI Assistant
This script creates the Pinecone Assistant and allows you to upload knowledge base files.
"""

import os
from pinecone import Pinecone
from pinecone_plugins.assistant.models.chat import Message

# Configuration
API_KEY = "pcsk_3aSats_Nb8yfU9GyE8KcPmup68ryxkCkLhPSippTQfHAXXDZVPjrwCCuAcfyuEzwrAT6kj"
ASSISTANT_NAME = "portable-spas-assistant"

def create_assistant():
    """Create the Pinecone Assistant"""
    print("🚀 Creating Pinecone Assistant...")
    
    pc = Pinecone(api_key=API_KEY)
    
    try:
        # Try to get existing assistant
        assistant = pc.assistant.Assistant(assistant_name=ASSISTANT_NAME)
        print(f"✅ Assistant '{ASSISTANT_NAME}' already exists!")
        return assistant
    except Exception as e:
        print(f"📝 Creating new assistant '{ASSISTANT_NAME}'...")
        
        # Create new assistant
        assistant = pc.assistant.create_assistant(
            assistant_name=ASSISTANT_NAME,
            instructions=(
                "You are a helpful and friendly customer service representative for Portable Spas New Zealand. "
                "Provide accurate, professional, and warm assistance to customers. "
                "Answer questions about products, features, pricing, installation, maintenance, and policies. "
                "Use the knowledge base documents to provide accurate information. "
                "If you don't know something, admit it and offer to help the customer find the answer. "
                "Always maintain a positive, helpful tone."
            ),
            region="us",  # or "eu" if preferred
            timeout=30
        )
        print(f"✅ Assistant '{ASSISTANT_NAME}' created successfully!")
        return assistant

def upload_file(assistant, file_path, metadata=None):
    """Upload a file to the assistant"""
    if not os.path.exists(file_path):
        print(f"❌ File not found: {file_path}")
        return False
    
    print(f"📤 Uploading {file_path}...")
    
    try:
        response = assistant.upload_file(
            file_path=file_path,
            metadata=metadata or {},
            timeout=None
        )
        print(f"✅ File uploaded successfully! Status: {response.get('status', 'Uploaded')}")
        return True
    except Exception as e:
        print(f"❌ Error uploading file: {e}")
        return False

def list_files(assistant):
    """List all files in the assistant"""
    try:
        files = assistant.list_files()
        if files:
            print("\n📚 Knowledge Base Files:")
            for file in files:
                print(f"  - {file.get('name', 'Unknown')} (Status: {file.get('status', 'Unknown')})")
        else:
            print("\n📚 No files uploaded yet.")
    except Exception as e:
        print(f"❌ Error listing files: {e}")

def test_chat(assistant):
    """Test the assistant with a sample question"""
    print("\n🧪 Testing assistant...")
    
    try:
        msg = Message(role="user", content="What services does Portable Spas New Zealand offer?")
        resp = assistant.chat(messages=[msg])
        
        print("\n💬 Test Response:")
        print(resp.get('message', {}).get('content', 'No response'))
        print("\n✅ Assistant is working!")
    except Exception as e:
        print(f"❌ Error testing assistant: {e}")

def main():
    """Main setup function"""
    print("=" * 60)
    print("🌊 Portable Spas New Zealand - AI Assistant Setup")
    print("=" * 60)
    print()
    
    # Create assistant
    assistant = create_assistant()
    
    # List existing files
    list_files(assistant)
    
    # Upload files (examples - uncomment and modify as needed)
    print("\n📁 To upload knowledge base files, use:")
    print("   python setup-assistant.py --upload path/to/your/file.pdf")
    print("\nExample files to upload:")
    print("  - Product catalogs")
    print("  - FAQ documents")
    print("  - Installation guides")
    print("  - Maintenance manuals")
    print("  - Warranty information")
    print("  - Pricing sheets")
    
    # Uncomment to upload files:
    # upload_file(assistant, "path/to/product-catalog.pdf", {"type": "catalog"})
    # upload_file(assistant, "path/to/faq.pdf", {"type": "faq"})
    
    # Test the assistant
    test_chat(assistant)
    
    print("\n" + "=" * 60)
    print("✅ Setup complete! Your assistant is ready.")
    print("🌐 Start your Next.js app with: npm run dev")
    print("=" * 60)

if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1 and sys.argv[1] == "--upload" and len(sys.argv) > 2:
        # Quick upload mode
        pc = Pinecone(api_key=API_KEY)
        assistant = pc.assistant.Assistant(assistant_name=ASSISTANT_NAME)
        file_path = sys.argv[2]
        metadata = {"uploaded_via": "setup_script"}
        upload_file(assistant, file_path, metadata)
    else:
        main()

