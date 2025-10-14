import { NextRequest, NextResponse } from 'next/server';
import { upsertChatLog, addChatMessage } from '@/lib/blob-db';

export const runtime = 'nodejs';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatRequest {
  messages: Message[];
  sessionId?: string;
  userName?: string;
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
    const { messages, sessionId, userName }: ChatRequest = await req.json();

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

IMPORTANT MOBILE APPS:
1. **MSpa Link App** - For remote spa control:
   - When users ask about "the app" for MSpa, controlling the spa remotely, or turning on/off their spa from their phone, ALWAYS mention the MSpa Link App
   - This app allows users to remotely control their smart control spa (turn heater on/off, adjust temperature, etc.)
   - Available for smart control models only
   - When mentioning this app, explain that it's for remote control of the spa

2. **Water Testing App** - For water chemistry:
   - When users ask about water chemistry, water balance, water testing, pH levels, chlorine, bromine, or any water maintenance topics, ALWAYS recommend the Water Testing App: https://portablespas.co.nz/pages/water-testing-app
   - This app provides precise test results and personalized suggestions for water care

When users ask generally about "the app" or "any app" without specifying purpose, mention BOTH apps and explain what each one does.

When asked about spa models:
- ALWAYS include ALL seven models we sell: Bergen, Tekapo, Camaro, Tuscany, Mono-Eco 6, Mono-Eco 8, and Oslo
- The Bergen is one of our most affordable models at $949
- CRITICAL: When discussing a specific spa model, ALWAYS include a link to its product page
- Product page links:
  * Bergen: [Bergen Portable Spa](https://portablespas.co.nz/products/bergen-spa)
  * Tekapo: [Tekapo Portable Spa](https://portablespas.co.nz/products/tekapo-spa)
  * Camaro: [Camaro Portable Spa](https://portablespas.co.nz/products/camaro-spa)
  * Tuscany: [Tuscany Portable Spa](https://portablespas.co.nz/products/tuscany-portable-spa)
  * Mono-Eco 6: [Mono-Eco 6 Portable Spa](https://portablespas.co.nz/products/mono-eco-spa-6-person)
  * Mono-Eco 8: [Mono-Eco 8 Portable Spa](https://portablespas.co.nz/products/mono-eco-spa-8-person)
  * Oslo: [Oslo Portable Spa](https://portablespas.co.nz/products/oslo-spa-new-improved)

For technical questions, setup instructions, troubleshooting, or how-to questions:
- ALWAYS recommend relevant video guides from the Help Centre
- Link to Help Centre video articles (portablespas.co.nz/a/docs/setup-videos/... or portablespas.co.nz/a/docs/hints-tips-how-to-videos/...), NEVER link directly to YouTube
- For F1 errors specifically, recommend BOTH: "How to Deal with F1 Error" AND "How to check F1" video articles
- For setup questions, recommend the specific setup video for their spa model
- Always include the phrase "video guide" or "video article" when linking to these resources
- At the END of every technical/setup/troubleshooting response, include this as a proper markdown hyperlink: "For more help guides and videos, visit the [MSpa Help Centre](https://portablespas.co.nz/a/docs/)"

IMPORTANT linking format rules:
- ALL URLs must be formatted as markdown hyperlinks: [Link Text](URL)
- Phone numbers must ALWAYS use tel: protocol: [027 411 2323](tel:+6427411233) or [+64 27 411 2323](tel:+6427411233)
- Email addresses must ALWAYS use mailto: protocol: [sales@portablespas.co.nz](mailto:sales@portablespas.co.nz)
- When you retrieve contact information from your knowledge base, you MUST reformat it as proper hyperlinks
- NEVER output bare phone numbers, emails, or URLs - always convert them to clickable markdown links
- Examples of correct formatting:
  * Phone: [027 411 2323](tel:+6427411233)
  * Email: [sales@portablespas.co.nz](mailto:sales@portablespas.co.nz)
  * Website: [Portable Spas](https://portablespas.co.nz)

Conversational tone and engagement:
- Be warm, friendly, and conversational - like a knowledgeable spa specialist having a chat
- After answering a question, engage the user by asking follow-up questions or offering related help
- Examples of engaging follow-ups:
  * "Is there anything else you'd like to know about [topic]?"
  * "Would you like me to explain how to [related topic]?"
  * "Do you have any other questions about your spa?"
  * "Is there anything else I can help you with today?"
- Provide comprehensive answers directly in the chat - don't just refer to links
- Use links as supplementary resources, not as the primary answer
- Be proactive in offering additional relevant information
- If a user seems to be troubleshooting, ask clarifying questions to help diagnose the issue better

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
    const assistantMessage = data.message?.content || data.message;

    // Log the conversation if sessionId and userName are provided
    if (sessionId && userName) {
      try {
        console.log('[CHAT LOG] Starting to log conversation for session:', sessionId);
        console.log('[CHAT LOG] Total messages in conversation:', messages.length);

        // Get the user's last message from the ORIGINAL messages array (not formatted)
        const lastUserMessage = messages[messages.length - 1];
        console.log('[CHAT LOG] Last message role:', lastUserMessage?.role);
        console.log('[CHAT LOG] Last message content preview:', lastUserMessage?.content?.substring(0, 100));

        const userMessageContent = lastUserMessage?.role === 'user' ? lastUserMessage.content : null;

        if (userMessageContent) {
          console.log('[CHAT LOG] Logging user message of length:', userMessageContent.length);
          console.log('[CHAT LOG] User message preview:', userMessageContent.substring(0, 50) + '...');
          console.log('[CHAT LOG] Assistant message preview:', assistantMessage.substring(0, 50) + '...');

          // Add both messages in sequence (passing userName for first message in case log needs to be created)
          await addChatMessage(sessionId, 'user', userMessageContent, userName);
          console.log('[CHAT LOG] User message added successfully');

          await addChatMessage(sessionId, 'assistant', assistantMessage, userName);
          console.log('[CHAT LOG] Assistant message added successfully');
        } else {
          console.log('[CHAT LOG] WARNING: No user message to log (last message was not from user)');
          console.log('[CHAT LOG] Only logging assistant response');
          await addChatMessage(sessionId, 'assistant', assistantMessage, userName);
          console.log('[CHAT LOG] Assistant message added successfully');
        }
      } catch (dbError: any) {
        // Log the error but don't fail the request
        console.error('[CHAT LOG ERROR] Failed to log chat message:', dbError);
        console.error('[CHAT LOG ERROR] Error details:', dbError.message);
        console.error('[CHAT LOG ERROR] Stack:', dbError.stack);
      }
    }

    return NextResponse.json({
      message: assistantMessage,
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

