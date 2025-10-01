# Portable Spas New Zealand - AI Customer Service Chat

A modern AI-powered customer service chat interface for Portable Spas New Zealand, built with Next.js and Pinecone Assistant.

## 🌐 Live Deployment

**Production URL:** https://portable-spas-ai-chat.vercel.app
**API Endpoint:** https://portable-spas-ai-chat.vercel.app/api/chat

## Features

- 🤖 AI-powered customer service using Pinecone Assistant
- 💬 Real-time chat interface with personalization
- 📚 Vector-based knowledge retrieval (RAG)
- 🎨 Clean, minimalist UI with shadcn/ui components
- 📱 Responsive design
- 👤 Name collection and chat history persistence
- 🔗 Smart link behavior (internal vs external)
- 🔐 Admin interface for file management

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui
- **AI/Vector DB**: Pinecone Assistant
- **Icons**: Lucide React

## Getting Started

### Prerequisites

- Node.js 18+ installed
- A Pinecone account with API key
- npm or yarn package manager

### Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd portable-spas-AI-chat
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp env.example .env.local
```

Edit `.env.local` and add your credentials:
```
PINECONE_API_KEY=your_pinecone_api_key_here
PINECONE_ASSISTANT_NAME=portable-spas
ADMIN_PASSWORD=your-secure-admin-password
```

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Pinecone Setup

### Quick Setup with Python Script

We've included a setup script to make it easy to create and configure your assistant:

1. **Install Python dependencies:**
```bash
pip install -r requirements.txt
```

2. **Run the setup script:**
```bash
python setup-assistant.py
```

This will:
- Create the Pinecone Assistant
- Show existing files in the knowledge base
- Test the assistant with a sample question

3. **Upload knowledge base files:**
```bash
python setup-assistant.py --upload path/to/your-file.pdf
```

### What Files to Upload

Upload documents that contain information about:
- **Product Catalogs** - Spa models, features, specifications
- **FAQs** - Common customer questions and answers
- **Installation Guides** - Setup instructions
- **Maintenance Manuals** - Care and maintenance information
- **Warranty Information** - Terms and coverage
- **Pricing Sheets** - Current pricing and packages

Supported formats: PDF, DOCX, TXT, MD, and more.

### Manual Setup (Alternative)

You can also create the assistant manually using Python:

```python
from pinecone import Pinecone

pc = Pinecone(api_key="your_api_key")

assistant = pc.assistant.create_assistant(
    assistant_name="portable-spas-assistant",
    instructions="You are a helpful customer service representative for Portable Spas New Zealand.",
    region="us"
)

# Upload files
assistant.upload_file(
    file_path="path/to/product-catalog.pdf",
    metadata={"type": "product_info"}
)
```

## Project Structure

```
portable-spas-AI-chat/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   └── chat/
│   │   │       └── route.ts       # Chat API endpoint
│   │   ├── globals.css            # Global styles
│   │   ├── layout.tsx             # Root layout
│   │   └── page.tsx               # Home page
│   ├── components/
│   │   ├── ui/                    # shadcn/ui components
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── input.tsx
│   │   │   └── scroll-area.tsx
│   │   └── chat-interface.tsx     # Main chat component
│   └── lib/
│       ├── pinecone.ts            # Pinecone client setup
│       └── utils.ts               # Utility functions
├── .env.local                     # Environment variables
├── next.config.js                 # Next.js configuration
├── package.json                   # Dependencies
├── tailwind.config.ts             # Tailwind configuration
└── tsconfig.json                  # TypeScript configuration
```

## Usage

1. **Start a conversation**: The chat interface loads with a welcome message
2. **Ask questions**: Type your question about portable spas and press Send
3. **Get AI responses**: The assistant will respond using knowledge from your uploaded documents
4. **View sources**: Citations will be shown when the AI references specific documents

## 🔐 Admin File Management

Access the web-based admin interface to manage your Pinecone knowledge base files:

**URL:** `https://portable-spas-ai-chat.vercel.app/admin` (or `/admin` locally)

### Features:
- **Upload Files**: Drag & drop or select .txt, .pdf, .csv, .md files
- **List Files**: View all uploaded files with status and size
- **Delete Files**: Remove outdated or unwanted files
- **Secure**: Password-protected access

### Setup:
1. Set `ADMIN_PASSWORD` in your `.env.local` or Vercel environment variables
2. Navigate to `/admin`
3. Login with your password
4. Manage your knowledge base files

See **[ADMIN-INTERFACE.md](./ADMIN-INTERFACE.md)** for complete documentation.

## Customization

### Branding

Update the branding in `src/app/page.tsx`:
- Company name
- Header text
- Footer information

### AI Instructions

Modify the assistant's behavior in `src/app/api/chat/route.ts`:
```typescript
instructions: 'Your custom instructions here...'
```

### Styling

The app uses a light, minimalist design. To customize:
- Colors: Edit `src/app/globals.css` CSS variables
- Components: Modify shadcn/ui components in `src/components/ui/`
- Layout: Update `src/app/page.tsx` and `src/components/chat-interface.tsx`

## Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Import the project in [Vercel](https://vercel.com)
3. Add environment variables in Vercel dashboard
4. Deploy

### Other Platforms

The app can be deployed to any platform that supports Next.js:
- Netlify
- AWS Amplify
- Docker container
- Self-hosted

## API Reference

### POST /api/chat

Send a message to the AI assistant.

**Request Body:**
```json
{
  "messages": [
    {
      "role": "user",
      "content": "What portable spas do you offer?"
    }
  ]
}
```

**Response:**
```json
{
  "message": "We offer a variety of portable spas...",
  "citations": [...],
  "usage": {
    "prompt_tokens": 100,
    "completion_tokens": 50,
    "total_tokens": 150
  }
}
```

## Learn More

- [Pinecone Assistant Documentation](https://docs.pinecone.io/guides/assistant/quickstart)
- [Next.js Documentation](https://nextjs.org/docs)
- [shadcn/ui Documentation](https://ui.shadcn.com)

## License

This project is proprietary software for Portable Spas New Zealand.

## Support

For issues or questions, please contact your development team.

