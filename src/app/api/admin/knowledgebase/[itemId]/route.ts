import { NextRequest, NextResponse } from 'next/server';
import { authorizeAdminRequest } from '@/lib/admin-auth';
import {
  getKnowledgebaseItem,
  getKnowledgebaseItemContent,
  isSubmitted,
  KnowledgebaseItem,
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

const REMOTE_ID_PREFIX = 'pinecone-';

interface PineconeFile {
  id: string;
  name: string;
  status: string;
  size?: number;
  created_on?: string;
  updated_on?: string;
}

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

function isRemoteId(id: string) {
  return id.startsWith(REMOTE_ID_PREFIX);
}

function getPineconeIdFromItemId(itemId: string) {
  return itemId.replace(REMOTE_ID_PREFIX, '');
}

function mapRemoteToKnowledgeItem(file: PineconeFile): KnowledgebaseItem {
  const createdAt = file.created_on || new Date().toISOString();
  const updatedAt = file.updated_on || createdAt;

  return {
    id: `${REMOTE_ID_PREFIX}${file.id}`,
    type: 'upload',
    title: file.name,
    originalFileName: file.name,
    storedFileName: file.name,
    filePath: '',
    fileUrl: '',
    contentType: 'application/octet-stream',
    size: file.size ?? 0,
    status: 'submitted',
    createdAt,
    updatedAt,
    submittedAt: file.created_on,
    pineconeFileId: file.id,
    pineconeFileName: file.name,
    pineconeStatus: file.status,
    lastSubmissionError: undefined,
    notes: 'Remote file stored in Pinecone (original file not available)',
    remoteOnly: true,
  };
}

async function fetchPineconeFile(pineconeId: string): Promise<PineconeFile | null> {
  const apiKey = process.env.PINECONE_API_KEY;
  const assistantName = process.env.PINECONE_ASSISTANT_NAME || 'portable-spas';

  if (!apiKey) {
    console.warn('PINECONE_API_KEY is not configured; cannot fetch Pinecone file');
    return null;
  }

  try {
    const response = await fetch(
      `https://prod-1-data.ke.pinecone.io/assistant/files/${assistantName}/${pineconeId}`,
      {
        method: 'GET',
        headers: {
          'Api-Key': apiKey,
        },
      }
    );

    if (!response.ok) {
      if (response.status !== 404) {
        const text = await response.text();
        console.error(
          'Failed to fetch Pinecone file:',
          response.status,
          text || '<empty>'
        );
      }
      return null;
    }

    return (await response.json()) as PineconeFile;
  } catch (error) {
    console.error('Error fetching Pinecone file:', error);
    return null;
  }
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
    let item = await getKnowledgebaseItem(params.itemId);

    if (!item && isRemoteId(params.itemId)) {
      const pineconeId = getPineconeIdFromItemId(params.itemId);
      const remote = await fetchPineconeFile(pineconeId);
      if (remote) {
        item = mapRemoteToKnowledgeItem(remote);
      }
    }

    if (!item) {
      return NextResponse.json(
        { error: 'Knowledge base item not found' },
        { status: 404, headers: corsHeaders }
      );
    }

    const url = req.nextUrl;
    const includeContentParam = url.searchParams.get('includeContent');
    const includeContent =
      includeContentParam === '1' ||
      includeContentParam === 'true' ||
      (item.type === 'text' && includeContentParam !== '0');

    let content: string | null = null;
    if (includeContent && item.type === 'text' && !item.remoteOnly) {
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
    let item = await getKnowledgebaseItem(params.itemId);
    let remoteDeletionOnly = false;
    let pineconeId: string | null = null;

    if (!item && isRemoteId(params.itemId)) {
      pineconeId = getPineconeIdFromItemId(params.itemId);
      remoteDeletionOnly = true;
    } else if (item?.pineconeFileId) {
      pineconeId = item.pineconeFileId;
    }

    if (!item && !remoteDeletionOnly) {
      return NextResponse.json(
        { error: 'Knowledge base item not found' },
        { status: 404, headers: corsHeaders }
      );
    }

    const url = req.nextUrl;
    const skipPinecone = url.searchParams.get('skipPinecone') === '1';

    if (!skipPinecone && pineconeId) {
      try {
        await deleteFromPinecone(pineconeId);
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

    if (item && !remoteDeletionOnly) {
      await removeKnowledgebaseItem(item.id);
    }

    return NextResponse.json(
      {
        success: true,
        itemId: item?.id ?? params.itemId,
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

