import { NextRequest, NextResponse } from 'next/server';
import { authorizeAdminRequest } from '@/lib/admin-auth';
import {
  createTextDraft,
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

    const items = await listKnowledgebaseItems({
      type: typeParam ?? undefined,
      status: statusParam ?? undefined,
    });

    return NextResponse.json({ items }, { headers: corsHeaders });
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

