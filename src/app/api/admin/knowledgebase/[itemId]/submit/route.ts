import { NextRequest, NextResponse } from 'next/server';
import { authorizeAdminRequest } from '@/lib/admin-auth';
import {
  getKnowledgebaseItem,
  isSubmitted,
  updateKnowledgebaseItemMetadata,
} from '@/lib/knowledgebase-store';

export const runtime = 'nodejs';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
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

export async function POST(
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

    const apiKey = process.env.PINECONE_API_KEY;
    const assistantName = process.env.PINECONE_ASSISTANT_NAME || 'portable-spas';

    if (!apiKey) {
      return NextResponse.json(
        { error: 'Pinecone API key is not configured on the server' },
        { status: 500, headers: corsHeaders }
      );
    }

    if (isSubmitted(item) && item.status === 'submitted') {
      console.log(`Re-submitting knowledge base item ${item.id} to Pinecone`);
    }

    const fileResponse = await fetch(item.fileUrl);
    if (!fileResponse.ok) {
      return NextResponse.json(
        {
          error: 'Failed to read stored file for submission',
          details: `Status ${fileResponse.status}`,
        },
        { status: 500, headers: corsHeaders }
      );
    }

    const arrayBuffer = await fileResponse.arrayBuffer();
    const contentType =
      item.contentType ||
      fileResponse.headers.get('content-type') ||
      'application/octet-stream';

    const uploadBlob = new Blob([arrayBuffer], { type: contentType });
    const fileName = item.originalFileName || item.storedFileName;

    const formData = new FormData();
    formData.append('file', uploadBlob, fileName);

    const response = await fetch(
      `https://prod-1-data.ke.pinecone.io/assistant/files/${assistantName}`,
      {
        method: 'POST',
        headers: {
          'Api-Key': apiKey,
        },
        body: formData,
      }
    );

    if (!response.ok) {
      const errorPayload = await response.text();
      console.error(
        'Pinecone submission failed:',
        response.status,
        errorPayload || '<empty>'
      );

      await updateKnowledgebaseItemMetadata(item.id, (current) => ({
        ...current,
        status: 'error',
        lastSubmissionError:
          errorPayload || `Pinecone upload failed with status ${response.status}`,
        updatedAt: new Date().toISOString(),
      }));

      return NextResponse.json(
        {
          error: 'Pinecone upload failed',
          details: errorPayload || `Status ${response.status}`,
        },
        { status: 502, headers: corsHeaders }
      );
    }

    const pineconeData = await response.json();
    const now = new Date().toISOString();

    const updatedItem = await updateKnowledgebaseItemMetadata(item.id, (current) => ({
      ...current,
      status: 'submitted',
      submittedAt: now,
      pineconeFileId: pineconeData.id,
      pineconeFileName: pineconeData.name,
      pineconeStatus: pineconeData.status,
      lastSubmissionError: undefined,
      updatedAt: now,
    }));

    return NextResponse.json(
      {
        success: true,
        item: updatedItem,
        pinecone: pineconeData,
      },
      { headers: corsHeaders }
    );
  } catch (error: any) {
    console.error('Failed to submit knowledge base item:', error);
    return NextResponse.json(
      {
        error: 'Failed to submit knowledge base item',
        details: error?.message,
      },
      { status: 500, headers: corsHeaders }
    );
  }
}

