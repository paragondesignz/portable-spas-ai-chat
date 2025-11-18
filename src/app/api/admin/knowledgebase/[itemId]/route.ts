import { NextRequest, NextResponse } from 'next/server';
import { authorizeAdminRequest } from '@/lib/admin-auth';
import {
  getKnowledgebaseItem,
  getKnowledgebaseItemContent,
  isSubmitted,
  removeKnowledgebaseItem,
  updateKnowledgebaseItemMetadata,
  updateTextItem,
} from '@/lib/knowledgebase-store';

export const runtime = 'nodejs';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

function ensureAuthorized(req: NextRequest) {
  const authStatus = authorizeAdminRequest(req);

  if (authStatus === 'misconfigured') {
    return {
      response: NextResponse.json(
        {
          error: 'Server configuration error. ADMIN_PASSWORD and ADMIN_SESSION_SECRET must be set.',
        },
        { status: 500, headers: corsHeaders }
      ),
      authorized: false,
    };
  }

  if (authStatus !== 'authorized') {
    return {
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders }),
      authorized: false,
    };
  }

  return { authorized: true as const };
}

async function deleteFromPinecone(fileId: string) {
  const apiKey = process.env.PINECONE_API_KEY;
  const assistantName = process.env.PINECONE_ASSISTANT_NAME || 'portable-spas';

  if (!apiKey) {
    throw new Error('PINECONE_API_KEY is not configured');
  }

  const response = await fetch(
    `https://prod-1-data.ke.pinecone.io/assistant/files/${assistantName}/${fileId}`,
    {
      method: 'DELETE',
      headers: {
        'Api-Key': apiKey,
      },
    }
  );

  if (response.status === 404) {
    // Already deleted remotely
    return true;
  }

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to delete file from Pinecone: ${response.status} ${text}`);
  }

  return true;
}

export async function GET(
  req: NextRequest,
  { params }: { params: { itemId: string } }
) {
  const authResult = ensureAuthorized(req);
  if (!authResult.authorized) {
    return authResult.response;
  }

  try {
    const item = await getKnowledgebaseItem(params.itemId);

    if (!item) {
      return NextResponse.json(
        { error: 'Knowledge base item not found' },
        { status: 404, headers: corsHeaders }
      );
    }

    const url = new URL(req.url);
    const includeContentParam = url.searchParams.get('includeContent');
    const includeContent =
      includeContentParam === '1' ||
      includeContentParam === 'true' ||
      (item.type === 'text' && includeContentParam !== '0');

    let content: string | null = null;
    if (includeContent && item.type === 'text') {
      content = await getKnowledgebaseItemContent(item.id);
    }

    return NextResponse.json(
      {
        item,
        ...(content !== null ? { content } : {}),
      },
      { headers: corsHeaders }
    );
  } catch (error: any) {
    console.error('Failed to get knowledge base item:', error);
    return NextResponse.json(
      { error: 'Failed to get knowledge base item', details: error?.message },
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { itemId: string } }
) {
  const authResult = ensureAuthorized(req);
  if (!authResult.authorized) {
    return authResult.response;
  }

  try {
    const item = await getKnowledgebaseItem(params.itemId);

    if (!item) {
      return NextResponse.json(
        { error: 'Knowledge base item not found' },
        { status: 404, headers: corsHeaders }
      );
    }

    if (item.type !== 'text') {
      return NextResponse.json(
        { error: 'Only text items can be updated via this endpoint' },
        { status: 400, headers: corsHeaders }
      );
    }

    const body = await req.json();
    const { title, content } = body;

    if (!title || typeof title !== 'string') {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400, headers: corsHeaders }
      );
    }

    if (typeof content !== 'string') {
      return NextResponse.json(
        { error: 'Content must be provided as a string' },
        { status: 400, headers: corsHeaders }
      );
    }

    const updatedItem = await updateTextItem(item.id, { title, content });

    if (!updatedItem) {
      return NextResponse.json(
        { error: 'Failed to update item' },
        { status: 500, headers: corsHeaders }
      );
    }

    return NextResponse.json(
      {
        success: true,
        item: updatedItem,
      },
      { headers: corsHeaders }
    );
  } catch (error: any) {
    console.error('Failed to update knowledge base item:', error);
    return NextResponse.json(
      { error: 'Failed to update knowledge base item', details: error?.message },
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { itemId: string } }
) {
  const authResult = ensureAuthorized(req);
  if (!authResult.authorized) {
    return authResult.response;
  }

  try {
    const item = await getKnowledgebaseItem(params.itemId);

    if (!item) {
      return NextResponse.json(
        { error: 'Knowledge base item not found' },
        { status: 404, headers: corsHeaders }
      );
    }

    const url = new URL(req.url);
    const skipPinecone = url.searchParams.get('skipPinecone') === '1';

    if (!skipPinecone && isSubmitted(item) && item.pineconeFileId) {
      try {
        await deleteFromPinecone(item.pineconeFileId);
      } catch (error: any) {
        console.error('Failed to delete file from Pinecone:', error);
        return NextResponse.json(
          {
            error: 'Failed to delete file from Pinecone. Item not removed locally.',
            details: error?.message,
          },
          { status: 502, headers: corsHeaders }
        );
      }
    }

    await removeKnowledgebaseItem(item.id);

    return NextResponse.json(
      {
        success: true,
        itemId: item.id,
      },
      { headers: corsHeaders }
    );
  } catch (error: any) {
    console.error('Failed to delete knowledge base item:', error);
    return NextResponse.json(
      { error: 'Failed to delete knowledge base item', details: error?.message },
      { status: 500, headers: corsHeaders }
    );
  }
}

