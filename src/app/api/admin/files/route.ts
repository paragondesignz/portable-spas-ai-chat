import { NextRequest, NextResponse } from 'next/server';
import { Pinecone } from '@pinecone-database/pinecone';

export const runtime = 'nodejs';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// Simple password check
function checkAuth(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  const adminPassword = process.env.ADMIN_PASSWORD || 'change-me-in-production';
  
  if (!authHeader) return false;
  
  const password = authHeader.replace('Bearer ', '');
  return password === adminPassword;
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

// List all files
export async function GET(req: NextRequest) {
  try {
    if (!checkAuth(req)) {
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

    const pc = new Pinecone({ apiKey });
    const assistant = pc.assistant.Assistant(assistantName);
    
    const files = await assistant.listFiles();

    return NextResponse.json({
      files: files.files?.map((file: any) => ({
        id: file.id,
        name: file.name,
        status: file.status,
        size: file.size,
        createdOn: file.created_on,
        updatedOn: file.updated_on
      })) || [],
      total: files.files?.length || 0
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
    if (!checkAuth(req)) {
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

    const pc = new Pinecone({ apiKey });
    const assistant = pc.assistant.Assistant(assistantName);
    
    await assistant.deleteFile(fileId);

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

