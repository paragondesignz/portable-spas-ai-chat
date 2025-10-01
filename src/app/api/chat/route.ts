import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatRequest {
  messages: Message[];
}

// CORS headers for widget embedding
const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // In production, replace with your specific domain
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

// Handle OPTIONS request for CORS
export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST(req: NextRequest) {
  try {
    const { messages }: ChatRequest = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: 'Invalid request: messages array is required' },
        { status: 400, headers: corsHeaders }
      );
    }

    const apiKey = process.env.PINECONE_API_KEY;
    const assistantName = process.env.PINECONE_ASSISTANT_NAME || 'portable-spas';

    if (!apiKey) {
      throw new Error('PINECONE_API_KEY is not defined');
    }

    // Format messages for Pinecone Assistant API
    const formattedMessages = messages.map(msg => ({
      role: msg.role,
      content: msg.content
    }));

    // Call Pinecone Assistant API directly via REST
    const response = await fetch(`https://prod-1-data.ke.pinecone.io/assistant/chat/${assistantName}`, {
      method: 'POST',
      headers: {
        'Api-Key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: formattedMessages,
        stream: false
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Pinecone API Error:', response.status, errorData);
      
      // If assistant doesn't exist, return a helpful message
      if (response.status === 404) {
        return NextResponse.json({
          error: 'Assistant not found',
          message: 'Please create the assistant first using the Pinecone console or API.',
          details: errorData
        }, { status: 404 });
      }
      
      throw new Error(`Pinecone API error: ${response.status} - ${errorData}`);
    }

    const data = await response.json();

    return NextResponse.json({
      message: data.message?.content || data.message,
      citations: data.citations || [],
      usage: data.usage
    }, { headers: corsHeaders });

  } catch (error: any) {
    console.error('Chat API Error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to process chat request',
        details: error.message 
      },
      { status: 500, headers: corsHeaders }
    );
  }
}

