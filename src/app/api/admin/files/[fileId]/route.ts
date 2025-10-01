import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
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

// Get file content/metadata
export async function GET(
  req: NextRequest,
  { params }: { params: { fileId: string } }
) {
  try {
    if (!checkAuth(req)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401, headers: corsHeaders }
      );
    }

    const fileId = params.fileId;
    const apiKey = process.env.PINECONE_API_KEY;
    const assistantName = process.env.PINECONE_ASSISTANT_NAME || 'portable-spas';

    if (!apiKey) {
      throw new Error('PINECONE_API_KEY is not defined');
    }

    // Get file metadata
    const response = await fetch(`https://prod-1-data.ke.pinecone.io/assistant/files/${assistantName}/${fileId}`, {
      method: 'GET',
      headers: {
        'Api-Key': apiKey,
      },
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Pinecone API Error:', response.status, errorData);
      throw new Error(`Pinecone API error: ${response.status}`);
    }

    const fileData = await response.json();

    return NextResponse.json({
      file: {
        id: fileData.id,
        name: fileData.name,
        status: fileData.status,
        size: fileData.size,
        createdOn: fileData.created_on,
        updatedOn: fileData.updated_on,
        metadata: fileData.metadata
      }
    }, { headers: corsHeaders });

  } catch (error: any) {
    console.error('Get file error:', error);
    return NextResponse.json(
      { error: 'Failed to get file', details: error.message },
      { status: 500, headers: corsHeaders }
    );
  }
}

