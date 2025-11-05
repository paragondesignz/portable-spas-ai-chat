# Chat Logging System Setup Guide (Vercel Blob)

This system logs all customer chat conversations with timestamps and user names, making it easy to review interactions and provide better customer support. Chat logs are stored in **Vercel Blob** storage - a simple, scalable solution with no database setup required.

## Features

✅ **User Name Collection** - Asks for the user's name at the start of each chat
✅ **Complete Conversation Logging** - Stores all messages with timestamps
✅ **Admin Dashboard** - View, search, and manage chat logs
✅ **Bulk Management** - Select and delete multiple chat logs at once
✅ **Search Functionality** - Search by user name or message content
✅ **Pagination** - Handle large volumes of chat logs efficiently
✅ **No Database Setup** - Uses Vercel Blob for simple JSON storage

## Setup Instructions

### 1. Set up Vercel Blob Storage

Setting up Vercel Blob is much simpler than a database - just one click!

1. Go to your Vercel project dashboard
2. Navigate to the **Storage** tab
3. Click **Create Database**
4. Select **Blob**
5. Click **Create**

That's it! Vercel will automatically add the required environment variable:
- `BLOB_READ_WRITE_TOKEN`

No tables to create, no schema to manage - Blob storage is ready to use immediately.

### 2. Verify the Setup

That's all the setup required! Now test it:

1. Deploy your application (the changes are already committed)
2. Navigate to your chatbot: `https://your-app.vercel.app`
3. Enter your name when prompted
4. Send a few test messages
5. Go to the admin dashboard: `https://your-app.vercel.app/admin/chats`
6. Login with your admin password
7. You should see your test conversation listed

## How It Works

### Storage Structure

Chat logs are stored as JSON files in Vercel Blob with the structure:
- **Key**: `chatlogs/{session_id}.json`
- **Content**: Complete chat log with all messages

Each JSON file contains:
```json
{
  "id": "unique-id",
  "session_id": "session_xyz",
  "user_name": "John Doe",
  "created_at": "2025-10-14T10:30:00Z",
  "updated_at": "2025-10-14T10:35:00Z",
  "messages": [
    {
      "id": "msg-1",
      "role": "user",
      "content": "How do I clean my spa?",
      "created_at": "2025-10-14T10:30:00Z"
    },
    {
      "id": "msg-2",
      "role": "assistant",
      "content": "Here's how to clean your spa...",
      "created_at": "2025-10-14T10:30:15Z"
    }
  ]
}
```

### Why Blob Storage?

**Advantages over Postgres:**
- ✅ No database setup or schema management
- ✅ No connection pooling issues
- ✅ Simpler deployment - works immediately
- ✅ Perfect for append-only chat logs
- ✅ Free tier: 1GB storage included
- ✅ Automatic scaling

**Perfect for:**
- Small to medium chat volumes (< 10,000 chats)
- Simple read/write patterns
- No complex queries needed

## Using the Chat Logs Dashboard

### Accessing the Dashboard

1. Navigate to: `https://your-app.vercel.app/admin/chats`
2. Login with your `ADMIN_PASSWORD` (ensure `ADMIN_SESSION_SECRET` is configured for secure sessions)

### Features

#### View All Chats
- See all chat conversations in a sortable table
- Shows user name, start time, and last updated time
- Pagination for handling large volumes

#### Search Chats
- Search by user name or message content
- Real-time search across all chat logs

#### View Chat Details
- Click "View" on any chat log
- See the complete conversation
- Messages are displayed in chronological order
- User messages appear on the right (blue)
- Assistant messages appear on the left (gray)

#### Bulk Delete
- Select multiple chats using checkboxes
- Click "Delete Selected" to remove them
- Useful for cleaning up test conversations or old chats

### Navigation

- **File Manager**: Click "Back to File Manager" to manage knowledge base files
- **Chat Logs**: Click "View Chat Logs" from the File Manager

## API Endpoints

### GET `/api/admin/chat-logs`
Get all chat logs with pagination and search

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 50)
- `query` (optional): Search query

**Authentication:**
- Preferred: Login via the `/admin` interface and reuse the session cookie (send requests with `credentials: 'include'`)
- Alternate: Add the header `Authorization: Bearer YOUR_ADMIN_PASSWORD`

**Response:**
```json
{
  "logs": [...],
  "total": 150,
  "page": 1,
  "limit": 50,
  "totalPages": 3
}
```

### GET `/api/admin/chat-logs/[id]`
Get a specific chat log with all messages

**Authentication:** Same as above.

**Response:**
```json
{
  "log": {...},
  "messages": [...]
}
```

### DELETE `/api/admin/chat-logs`
Delete multiple chat logs

**Authentication:** Same as above.
- `Content-Type: application/json`

**Body:**
```json
{
  "ids": ["log-id-1", "log-id-2", "log-id-3"]
}
```

**Response:**
```json
{
  "success": true,
  "deletedCount": 3,
  "message": "Successfully deleted 3 chat log(s)"
}
```

## Troubleshooting

### "Blob storage not configured" Errors

If you see errors about Blob storage:

1. Check that `BLOB_READ_WRITE_TOKEN` is set in Vercel environment variables
2. Verify Blob storage is created in your Vercel project
3. Redeploy your application after adding the environment variable

### Chat Logs Not Appearing

1. Verify users are entering their name when prompted
2. Check that the chat session is generating a session ID
3. Look at server logs in Vercel for any errors
4. Try sending a test message and check immediately

### "Unauthorized" Errors

Make sure you're using the correct `ADMIN_PASSWORD` environment variable value.

### Slow Search Performance

Blob storage searches all files sequentially. If you have > 10,000 chat logs and experience slow searches, consider:
- Implementing a separate search index
- Archiving old chats periodically
- Upgrading to a database solution

## Performance Considerations

**Vercel Blob is great for:**
- Up to ~10,000 chat logs
- Simple search queries
- Low-medium traffic sites

**Consider upgrading to Postgres if:**
- You have > 10,000 chat logs
- You need complex filtering/analytics
- Search performance becomes slow
- You need real-time reporting

## Privacy Considerations

- Chat logs contain customer names and conversation history
- Ensure compliance with privacy regulations (GDPR, etc.)
- Consider implementing data retention policies
- Add disclaimers about data collection to users
- Implement proper access controls for the admin dashboard

## Cost Estimation

**Vercel Blob Free Tier:**
- 1GB storage (sufficient for ~50,000 chat conversations)
- Unlimited reads
- 1,000 writes per day

**Example calculations:**
- Average chat: ~20KB (10 messages)
- 1GB = ~50,000 chats
- 100 chats/day = ~500 days of free storage

## Migration Path to Database

If you outgrow Blob storage, migration is straightforward:

1. Export all chat logs from Blob
2. Set up Vercel Postgres
3. Import logs into database
4. Switch to database-based utilities

The admin UI and API endpoints remain the same - only the storage layer changes.

## Future Enhancements

Potential improvements for the chat logging system:

- Export chat logs to CSV/JSON
- Filter by date range
- Chat analytics dashboard
- Email notifications for new chats
- Customer sentiment analysis
- Automatic tagging/categorization
- Integration with CRM systems
- Automatic archiving of old chats

## Support

For issues or questions about the chat logging system:
- Vercel Blob documentation: https://vercel.com/docs/storage/vercel-blob
- Report issues at your project repository
