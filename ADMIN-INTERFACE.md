# 🔐 Admin Interface - Pinecone File Management

A secure, password-protected interface to manage your Pinecone Assistant files directly from your Vercel deployment.

## 🎯 What It Does

Manage your Pinecone knowledge base files without Python or command line:

- ✅ **Upload Files**: Upload .txt, .pdf, .md, .csv, and more
- ✅ **List Files**: See all uploaded files with status and size
- ✅ **Delete Files**: Remove outdated or unwanted files
- ✅ **Secure**: Password-protected admin access
- ✅ **Web-Based**: Access from anywhere via browser

---

## 🚀 Access the Admin Interface

### URL:
```
https://portable-spas-ai-chat.vercel.app/admin
```

Or locally:
```
http://localhost:3000/admin
```

---

## 🔑 Setup Password

### 1. Set Admin Password in Vercel

Go to your Vercel project:

1. **Dashboard** → **portable-spas-ai-chat** → **Settings** → **Environment Variables**
2. Add new variable:
   - **Name**: `ADMIN_PASSWORD`
   - **Value**: Your secure password (e.g., `MySecurePass123!`)
   - **Environment**: Production, Preview, Development
3. Click **Save**
4. **Redeploy** your app

### 2. Or Set Locally

Add to `.env.local`:
```env
ADMIN_PASSWORD=your-secure-password-here
```

---

## 📋 How to Use

### Login

1. Navigate to `/admin`
2. Enter your admin password
3. Click **Login**
4. Password is saved in browser (localStorage)

### Upload a File

1. Click **"Select File"** button
2. Choose your file (.txt, .csv, .pdf, .md, etc.)
3. File info appears (name and size)
4. Click **"Upload to Pinecone"**
5. Wait for upload (can take 30s - 2min)
6. Success message appears
7. File list refreshes automatically

### View Files

- All uploaded files display automatically
- Shows:
  - File name
  - Status (Available, Processing)
  - Size
  - File ID
- Click refresh icon (🔄) to reload list

### Delete a File

1. Find the file in the list
2. Click the **trash icon** (🗑️)
3. Confirm deletion
4. File is removed from Pinecone
5. List refreshes automatically

---

## 🎨 Interface Overview

### Login Screen
```
┌─────────────────────────────────┐
│    🔒 Admin Login               │
│                                 │
│  Password: [______________]     │
│                                 │
│         [Login Button]          │
└─────────────────────────────────┘
```

### Main Interface
```
┌─────────────────────────────────────────┐
│  Pinecone File Manager     [Logout]     │
│  Manage your Portable Spas files        │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  📤 Upload File                         │
│  ┌─────────────────────────────────┐   │
│  │ [Choose File] example.txt       │   │
│  └─────────────────────────────────┘   │
│  [Upload to Pinecone]                   │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  📄 Uploaded Files (3)          🔄      │
│  ┌─────────────────────────────────┐   │
│  │ 📄 docs.txt    [Available] 🗑️   │   │
│  │    52.3 KB                      │   │
│  └─────────────────────────────────┘   │
│  ┌─────────────────────────────────┐   │
│  │ 📄 products.csv [Available] 🗑️  │   │
│  │    124 KB                       │   │
│  └─────────────────────────────────┘   │
└─────────────────────────────────────────┘
```

---

## 🔧 API Endpoints

The admin interface uses these API routes:

### 1. List Files
```
GET /api/admin/files
Headers: Authorization: Bearer YOUR_PASSWORD
```

Response:
```json
{
  "files": [
    {
      "id": "file-abc123",
      "name": "documentation.txt",
      "status": "Available",
      "size": 53456,
      "createdOn": "2025-01-01T12:00:00Z"
    }
  ],
  "total": 1
}
```

### 2. Upload File
```
POST /api/admin/upload
Headers: Authorization: Bearer YOUR_PASSWORD
Body: FormData with 'file' field
```

Response:
```json
{
  "success": true,
  "file": {
    "id": "file-xyz789",
    "name": "new-document.txt",
    "status": "Processing",
    "size": 12345
  }
}
```

### 3. Delete File
```
DELETE /api/admin/files
Headers: Authorization: Bearer YOUR_PASSWORD
Body: { "fileId": "file-abc123" }
```

Response:
```json
{
  "success": true,
  "message": "File deleted successfully"
}
```

---

## 📁 Supported File Types

Pinecone Assistant supports:

- ✅ **Text**: .txt, .md
- ✅ **Documents**: .pdf, .docx
- ✅ **Data**: .csv, .json
- ✅ **Code**: .js, .py, .html, etc.

Max file size: **100MB** per file

---

## 🔒 Security

### Password Protection
- All API routes require password authentication
- Password sent via `Authorization` header
- Unauthorized requests return 401

### Best Practices
1. Use a **strong password** (12+ characters)
2. Don't share your admin password
3. Change password periodically
4. Use environment variables (never commit password to git)

### Password Storage
- **Server**: Environment variable only
- **Client**: localStorage (browser only, not accessible to others)
- **Network**: HTTPS encryption (Vercel provides SSL)

---

## 🧪 Testing

### Test Upload Flow

1. Create a test file:
   ```bash
   echo "Test content for Pinecone" > test-upload.txt
   ```

2. Navigate to `/admin`
3. Login with password
4. Upload `test-upload.txt`
5. Verify it appears in file list
6. Ask the chat a question about the test content
7. Delete test file when done

### Test Authentication

1. Try accessing `/admin` without login → Shows login form ✅
2. Enter wrong password → "Invalid password" error ✅
3. Enter correct password → Loads interface ✅
4. Refresh page → Still logged in ✅
5. Click logout → Returns to login ✅

---

## 🐛 Troubleshooting

### "Unauthorized" Error
- Check ADMIN_PASSWORD is set in Vercel
- Verify you're using the correct password
- Check environment is selected (Production)
- Redeploy after changing env vars

### Upload Fails
- Check file size (< 100MB)
- Verify file type is supported
- Check Pinecone API key is valid
- Look at Vercel logs for detailed error

### Files Not Appearing
- Wait 30-60 seconds after upload (processing time)
- Click refresh button (🔄)
- Check file status (might be "Processing")
- Verify Pinecone Assistant name is correct

### Can't Delete File
- Verify file ID is correct
- Check you have proper permissions
- Try refreshing and deleting again
- Check Vercel function logs

---

## 💡 Tips

### Organizing Files
- Use descriptive names: `product-catalog-2025.csv`
- Include dates: `faq-updated-oct-2025.txt`
- Separate by category: `warranty-info.pdf`

### Updating Content
1. Delete old version
2. Upload new version with same name
3. Wait for processing
4. Test in chat

### Bulk Updates
- Combine multiple documents into one file
- Or upload separately for better organization
- Pinecone merges all content for chat

---

## 🚀 Deployment

When you deploy to Vercel:

1. **Set Environment Variables**:
   ```
   PINECONE_API_KEY=your-key
   PINECONE_ASSISTANT_NAME=portable-spas
   ADMIN_PASSWORD=your-secure-password
   ```

2. **Deploy**:
   ```bash
   vercel --prod
   ```

3. **Access Admin**:
   ```
   https://your-app.vercel.app/admin
   ```

---

## 📊 Example Use Cases

### Initial Setup
1. Upload product catalog CSV
2. Upload FAQ document
3. Upload warranty information
4. Test chat with questions

### Regular Updates
1. Export updated products from Shopify
2. Delete old product file
3. Upload new product file
4. Verify chat has latest info

### Seasonal Updates
1. Upload holiday hours
2. Upload seasonal promotions
3. Upload special offers
4. Remove when season ends

---

## 🎯 Next Steps

After setting up the admin interface:

1. ✅ Set `ADMIN_PASSWORD` in Vercel
2. ✅ Deploy to production
3. ✅ Access `/admin` and login
4. ✅ Upload your knowledge base files
5. ✅ Test the chat with questions
6. ✅ Update files as needed

---

## 🆘 Support

If you need help:

1. Check Vercel logs: Dashboard → Deployments → Functions
2. Check browser console: F12 → Console tab
3. Verify environment variables are set
4. Test API routes directly (see API Endpoints section)

---

## ✨ Summary

You now have a complete file management system:

- 🌐 Web-based interface
- 🔐 Password-protected
- 📤 Upload files easily
- 📋 View all files
- 🗑️ Delete when needed
- ⚡ No Python or CLI required

**Perfect for managing your Portable Spas knowledge base!** 🎉

