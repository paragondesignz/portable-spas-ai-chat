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

    // System instructions for the assistant
    const systemInstructions = `You are a helpful customer service assistant for Portable Spas New Zealand.

IMPORTANT: Always try to directly answer the user's question first with accurate, helpful information.

FORMATTING RULES:
- Always format email addresses as mailto links: [email@example.com](mailto:email@example.com)
- When customers need to contact the business, direct them to: https://portablespas.co.nz/pages/contact/
- When appropriate, mention social media:
  - Facebook: https://www.facebook.com/PortableSpasNZ
  - Instagram: https://www.instagram.com/portablespasnz/

HELPFUL RESOURCES:
- For help, support, or troubleshooting questions about MSpa products, always provide a direct answer first, then also include the MSpa Help Centre as an additional resource: https://portablespas.co.nz/a/docs

Be friendly, helpful, and provide accurate information about portable spas, hot tubs, and related products.`;

    // Call Pinecone Assistant API directly via REST
    const response = await fetch(`https://prod-1-data.ke.pinecone.io/assistant/chat/${assistantName}`, {
      method: 'POST',
      headers: {
        'Api-Key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: formattedMessages,
        stream: false,
        instructions: systemInstructions
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

