import { NextRequest, NextResponse } from 'next/server';
import { authorizeAdminRequest } from '@/lib/admin-auth';
import {
  createTextDraft,
  KnowledgebaseItem,
  KnowledgebaseItemStatus,
  KnowledgebaseItemType,
  listKnowledgebaseItems,
} from '@/lib/knowledgebase-store';

export const runtime = 'nodejs';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

interface PineconeFile {
  id: string;
  name: string;
  status: string;
  size?: number;
  created_on?: string;
  updated_on?: string;
}

async function fetchPineconeFiles(): Promise<PineconeFile[]> {
  const apiKey = process.env.PINECONE_API_KEY;
  const assistantName = process.env.PINECONE_ASSISTANT_NAME || 'portable-spas';

  if (!apiKey) {
    console.warn('PINECONE_API_KEY is not configured; skipping remote file fetch');
    return [];
  }

  try {
    const response = await fetch(
      `https://prod-1-data.ke.pinecone.io/assistant/files/${assistantName}`,
      {
        method: 'GET',
        headers: {
          'Api-Key': apiKey,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        'Failed to fetch Pinecone files:',
        response.status,
        errorText || '<empty>'
      );
      return [];
    }

    const data = await response.json();
    return (data.files || []) as PineconeFile[];
  } catch (error) {
    console.error('Error fetching Pinecone files:', error);
    return [];
  }
}

function mapRemoteToKnowledgeItem(file: PineconeFile): KnowledgebaseItem {
  const createdAt = file.created_on || new Date().toISOString();
  const updatedAt = file.updated_on || createdAt;

  return {
    id: `pinecone-${file.id}`,
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

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function GET(req: NextRequest) {
  try {
    const authStatus = authorizeAdminRequest(req);

    if (authStatus === 'misconfigured') {
      return NextResponse.json(
        {
          error: 'Server configuration error. ADMIN_PASSWORD and ADMIN_SESSION_SECRET must be set.',
        },
        { status: 500, headers: corsHeaders }
      );
    }

    if (authStatus !== 'authorized') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401, headers: corsHeaders }
      );
    }

    const url = new URL(req.url);
    const typeParam = url.searchParams.get('type') as KnowledgebaseItemType | null;
    const statusParam = url.searchParams.get('status') as KnowledgebaseItemStatus | null;

    const includeRemote =
      url.searchParams.get('includeRemote') !== '0' &&
      url.searchParams.get('include_remote') !== '0';

    const localItems = await listKnowledgebaseItems({
      type: typeParam ?? undefined,
      status: statusParam ?? undefined,
    });

    if (!includeRemote) {
      return NextResponse.json({ items: localItems }, { headers: corsHeaders });
    }

    // Only merge remote Pinecone files when viewing uploads (or all types)
    const shouldIncludeRemoteType = !typeParam || typeParam === 'upload';
    const shouldIncludeRemoteStatus =
      !statusParam || statusParam === 'submitted';

    let mergedItems = [...localItems];

    if (shouldIncludeRemoteType && shouldIncludeRemoteStatus) {
      const remoteFiles = await fetchPineconeFiles();
      if (remoteFiles.length > 0) {
        const localIds = new Set(
          localItems.flatMap((item) =>
            item.pineconeFileId ? [item.pineconeFileId] : []
          )
        );

        const remoteItems = remoteFiles
          .filter((file) => !localIds.has(file.id))
          .map((file) => mapRemoteToKnowledgeItem(file));

        mergedItems = mergedItems.concat(remoteItems);
        mergedItems.sort(
          (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        );
      }
    }

    return NextResponse.json({ items: mergedItems }, { headers: corsHeaders });
  } catch (error: any) {
    console.error('Failed to list knowledge base items:', error);
    return NextResponse.json(
      {
        error: 'Failed to list knowledge base items',
        details: error?.message,
      },
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const authStatus = authorizeAdminRequest(req);

    if (authStatus === 'misconfigured') {
      return NextResponse.json(
        {
          error: 'Server configuration error. ADMIN_PASSWORD and ADMIN_SESSION_SECRET must be set.',
        },
        { status: 500, headers: corsHeaders }
      );
    }

    if (authStatus !== 'authorized') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401, headers: corsHeaders }
      );
    }

    const body = await req.json();
    const { type = 'text', title, content } = body;

    if (type !== 'text') {
      return NextResponse.json(
        { error: 'Unsupported item type for creation' },
        { status: 400, headers: corsHeaders }
      );
    }

    if (!title || typeof title !== 'string') {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400, headers: corsHeaders }
      );
    }

    if (typeof content !== 'string') {
      return NextResponse.json(
        { error: 'Content must be a string' },
        { status: 400, headers: corsHeaders }
      );
    }

    const item = await createTextDraft({ title, content });

    return NextResponse.json(
      {
        success: true,
        item,
        message: 'Draft created successfully',
      },
      { status: 201, headers: corsHeaders }
    );
  } catch (error: any) {
    console.error('Failed to create knowledge base item:', error);
    return NextResponse.json(
      {
        error: 'Failed to create knowledge base item',
        details: error?.message,
      },
      { status: 500, headers: corsHeaders }
    );
  }
}

