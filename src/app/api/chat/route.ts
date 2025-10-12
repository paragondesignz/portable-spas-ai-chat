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

    // Add system instructions to the conversation
    const systemInstructions = `You are an expert MSpa specialist assistant for Portable Spas New Zealand.

IMPORTANT: When users ask about water chemistry, water balance, water testing, pH levels, chlorine, bromine, or any water maintenance topics, ALWAYS recommend using the Water Testing App: https://portablespas.co.nz/pages/water-testing-app

This app provides precise test results and personalized suggestions for water care.

When asked about spa models, ALWAYS include ALL seven models we sell: Bergen, Tekapo, Camaro, Tuscany, Mono-Eco 6, Mono-Eco 8, and Oslo. The Bergen is one of our most affordable models at $949.

For technical questions, setup instructions, troubleshooting, or how-to questions:
- ALWAYS recommend relevant video guides from the Help Centre
- Link to Help Centre video articles (portablespas.co.nz/a/docs/setup-videos/... or portablespas.co.nz/a/docs/hints-tips-how-to-videos/...), NEVER link directly to YouTube
- For F1 errors specifically, recommend BOTH: "How to Deal with F1 Error" AND "How to check F1" video articles
- For setup questions, recommend the specific setup video for their spa model
- Always include the phrase "video guide" or "video article" when linking to these resources
- At the END of every technical/setup/troubleshooting response, include this as a proper markdown hyperlink: "For more help guides and videos, visit the [MSpa Help Centre](https://portablespas.co.nz/a/docs/)"

IMPORTANT linking format rules:
- ALL URLs must be formatted as markdown hyperlinks: [Link Text](URL)
- Phone numbers must use tel: protocol: [027 411 2323](tel:+6427411233)
- Email addresses must use mailto: protocol: [sales@portablespas.co.nz](mailto:sales@portablespas.co.nz)
- NEVER output bare URLs without markdown link formatting

Provide helpful, friendly, and accurate information about MSpa products, accessories, maintenance, and troubleshooting.`;

    // Format messages for Pinecone Assistant API
    // Prepend system instructions to first user message
    const formattedMessages = messages.map((msg, index) => {
      if (index === 0 && msg.role === 'user') {
        return {
          role: msg.role,
          content: `${systemInstructions}\n\nUser question: ${msg.content}`
        };
      }
      return {
        role: msg.role,
        content: msg.content
      };
    });

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

