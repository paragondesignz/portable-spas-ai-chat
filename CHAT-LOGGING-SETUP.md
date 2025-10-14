# Chat Logging System Setup Guide

This system logs all customer chat conversations with timestamps and user names, making it easy to review interactions and provide better customer support.

## Features

✅ **User Name Collection** - Asks for the user's name at the start of each chat
✅ **Complete Conversation Logging** - Stores all messages with timestamps
✅ **Admin Dashboard** - View, search, and manage chat logs
✅ **Bulk Management** - Select and delete multiple chat logs at once
✅ **Search Functionality** - Search by user name or message content
✅ **Pagination** - Handle large volumes of chat logs efficiently

## Setup Instructions

### 1. Set up Vercel Postgres Database

1. Go to your Vercel project dashboard
2. Navigate to the **Storage** tab
3. Click **Create Database**
4. Select **Postgres**
5. Give it a name (e.g., "portable-spas-db")
6. Select your region
7. Click **Create**

Vercel will automatically add the database environment variables to your project:
- `POSTGRES_URL`
- `POSTGRES_PRISMA_URL`
- `POSTGRES_URL_NON_POOLING`
- etc.

### 2. Initialize the Database Schema

Once your Vercel Postgres database is set up, you need to create the tables:

#### Method 1: Via API (Recommended)

1. Deploy your application with the new code
2. Navigate to: `https://your-app.vercel.app/api/admin/init-db`
3. Make a POST request with your admin password:

```bash
curl -X POST https://portable-spas-ai-chat.vercel.app/api/admin/init-db \
  -H "Authorization: Bearer YOUR_ADMIN_PASSWORD" \
  -H "Content-Type: application/json"
```

Or use an API client like Postman, Insomnia, or Thunder Client.

You should receive a success response:
```json
{
  "success": true,
  "message": "Database initialized successfully"
}
```

#### Method 2: Via Vercel Dashboard

1. Go to your Vercel project
2. Navigate to **Storage** → Your Postgres database
3. Go to the **Query** tab
4. Run the following SQL:

```sql
-- Create chat_logs table
CREATE TABLE IF NOT EXISTS chat_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id VARCHAR(255) UNIQUE NOT NULL,
  user_name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create chat_messages table
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_log_id UUID NOT NULL REFERENCES chat_logs(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_chat_logs_session_id ON chat_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_chat_log_id ON chat_messages(chat_log_id);
CREATE INDEX IF NOT EXISTS idx_chat_logs_created_at ON chat_logs(created_at DESC);
```

### 3. Verify the Setup

1. Navigate to your chatbot: `https://your-app.vercel.app`
2. Enter your name when prompted
3. Send a few test messages
4. Go to the admin dashboard: `https://your-app.vercel.app/admin/chats`
5. Login with your admin password
6. You should see your test conversation listed

## Using the Chat Logs Dashboard

### Accessing the Dashboard

1. Navigate to: `https://your-app.vercel.app/admin/chats`
2. Login with your `ADMIN_PASSWORD`

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

## Database Schema

### `chat_logs` Table

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| session_id | VARCHAR(255) | Unique session identifier |
| user_name | VARCHAR(255) | Customer's name |
| created_at | TIMESTAMP | When the chat started |
| updated_at | TIMESTAMP | Last message time |

### `chat_messages` Table

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| chat_log_id | UUID | Foreign key to chat_logs |
| role | VARCHAR(20) | 'user' or 'assistant' |
| content | TEXT | Message content |
| created_at | TIMESTAMP | When the message was sent |

## API Endpoints

### GET `/api/admin/chat-logs`
Get all chat logs with pagination and search

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 50)
- `query` (optional): Search query

**Headers:**
- `Authorization: Bearer YOUR_ADMIN_PASSWORD`

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

**Headers:**
- `Authorization: Bearer YOUR_ADMIN_PASSWORD`

**Response:**
```json
{
  "log": {...},
  "messages": [...]
}
```

### DELETE `/api/admin/chat-logs`
Delete multiple chat logs

**Headers:**
- `Authorization: Bearer YOUR_ADMIN_PASSWORD`
- `Content-Type: application/json`

**Body:**
```json
{
  "ids": ["uuid1", "uuid2", "uuid3"]
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

### Database Connection Errors

If you see "Failed to connect to database" errors:

1. Check that Vercel Postgres environment variables are set
2. Verify the database is created and running in Vercel dashboard
3. Run the initialization script again

### Chat Logs Not Appearing

1. Verify the database tables were created successfully
2. Check that users are entering their name when prompted
3. Look at server logs in Vercel for any errors
4. Try sending a test message and check the logs immediately

### "Unauthorized" Errors

Make sure you're using the correct `ADMIN_PASSWORD` environment variable value.

## Privacy Considerations

- Chat logs contain customer names and conversation history
- Ensure compliance with privacy regulations (GDPR, etc.)
- Consider implementing data retention policies
- Add disclaimers about data collection to users
- Implement proper access controls for the admin dashboard

## Future Enhancements

Potential improvements for the chat logging system:

- Export chat logs to CSV/JSON
- Filter by date range
- Chat analytics dashboard
- Email notifications for new chats
- Customer sentiment analysis
- Automatic tagging/categorization
- Integration with CRM systems

## Support

For issues or questions about the chat logging system, please contact your development team or refer to the Vercel Postgres documentation at https://vercel.com/docs/storage/vercel-postgres
