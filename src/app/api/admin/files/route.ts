import { NextRequest, NextResponse } from 'next/server';
import { authorizeAdminRequest } from '@/lib/admin-auth';

export const runtime = 'nodejs';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

// List all files
export async function GET(req: NextRequest) {
  try {
    const authStatus = authorizeAdminRequest(req);

    if (authStatus === 'misconfigured') {
      return NextResponse.json(
        { error: 'Server configuration error. ADMIN_PASSWORD and ADMIN_SESSION_SECRET must be set.' },
        { status: 500, headers: corsHeaders }
      );
    }

    if (authStatus !== 'authorized') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401, headers: corsHeaders }
      );
    }

    const apiKey = process.env.PINECONE_API_KEY;
    const assistantName = process.env.PINECONE_ASSISTANT_NAME || 'portable-spas';

    if (!apiKey) {
      throw new Error('PINECONE_API_KEY is not defined');
    }

    // Call Pinecone Assistant API directly
    const response = await fetch(`https://prod-1-data.ke.pinecone.io/assistant/files/${assistantName}`, {
      method: 'GET',
      headers: {
        'Api-Key': apiKey,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Pinecone API Error:', response.status, errorData);
      throw new Error(`Pinecone API error: ${response.status}`);
    }

    const data = await response.json();

    return NextResponse.json({
      files: data.files?.map((file: any) => ({
        id: file.id,
        name: file.name,
        status: file.status,
        size: file.size,
        createdOn: file.created_on,
        updatedOn: file.updated_on
      })) || [],
      total: data.files?.length || 0
    }, { headers: corsHeaders });

  } catch (error: any) {
    console.error('List files error:', error);
    return NextResponse.json(
      { error: 'Failed to list files', details: error.message },
      { status: 500, headers: corsHeaders }
    );
  }
}

// Delete a file
export async function DELETE(req: NextRequest) {
  try {
    const authStatus = authorizeAdminRequest(req);

    if (authStatus === 'misconfigured') {
      return NextResponse.json(
        { error: 'Server configuration error. ADMIN_PASSWORD and ADMIN_SESSION_SECRET must be set.' },
        { status: 500, headers: corsHeaders }
      );
    }

    if (authStatus !== 'authorized') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401, headers: corsHeaders }
      );
    }

    const { fileId } = await req.json();

    if (!fileId) {
      return NextResponse.json(
        { error: 'File ID is required' },
        { status: 400, headers: corsHeaders }
      );
    }

    const apiKey = process.env.PINECONE_API_KEY;
    const assistantName = process.env.PINECONE_ASSISTANT_NAME || 'portable-spas';

    if (!apiKey) {
      throw new Error('PINECONE_API_KEY is not defined');
    }

    // Call Pinecone Assistant API directly
    const response = await fetch(`https://prod-1-data.ke.pinecone.io/assistant/files/${assistantName}/${fileId}`, {
      method: 'DELETE',
      headers: {
        'Api-Key': apiKey,
      },
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Pinecone API Error:', response.status, errorData);
      throw new Error(`Pinecone API error: ${response.status}`);
    }

    return NextResponse.json({
      success: true,
      message: 'File deleted successfully'
    }, { headers: corsHeaders });

  } catch (error: any) {
    console.error('Delete file error:', error);
    return NextResponse.json(
      { error: 'Failed to delete file', details: error.message },
      { status: 500, headers: corsHeaders }
    );
  }
}

