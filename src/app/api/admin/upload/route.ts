import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
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

export async function POST(req: NextRequest) {
  try {
    if (!checkAuth(req)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401, headers: corsHeaders }
      );
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Upload to Pinecone
    const apiKey = process.env.PINECONE_API_KEY;
    const assistantName = process.env.PINECONE_ASSISTANT_NAME || 'portable-spas';

    if (!apiKey) {
      console.error('Missing PINECONE_API_KEY environment variable');
      return NextResponse.json(
        { error: 'Server configuration error: Missing API key' },
        { status: 500, headers: corsHeaders }
      );
    }

    console.log(`Uploading file "${file.name}" (${file.size} bytes) to Pinecone assistant "${assistantName}"`);

    // Convert File to Blob for Pinecone API
    const fileBuffer = await file.arrayBuffer();
    const blob = new Blob([fileBuffer], { type: file.type });

    // Create FormData for Pinecone API
    const pineconeFormData = new FormData();
    pineconeFormData.append('file', blob, file.name);

    // Call Pinecone Assistant API directly
    const response = await fetch(`https://prod-1-data.ke.pinecone.io/assistant/files/${assistantName}`, {
      method: 'POST',
      headers: {
        'Api-Key': apiKey,
      },
      body: pineconeFormData,
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Pinecone API Error:', response.status, errorData);
      return NextResponse.json(
        {
          error: `Pinecone upload failed (${response.status})`,
          details: errorData || 'No error details available'
        },
        { status: 500, headers: corsHeaders }
      );
    }

    const data = await response.json();
    console.log('File uploaded successfully:', data);

    return NextResponse.json({
      success: true,
      file: {
        id: data.id,
        name: data.name,
        status: data.status,
        size: data.size
      },
      message: 'File uploaded successfully'
    }, { headers: corsHeaders });

  } catch (error: any) {
    console.error('Upload file error:', error);

    return NextResponse.json(
      {
        error: 'Failed to upload file',
        details: error.message || 'Unknown error occurred'
      },
      { status: 500, headers: corsHeaders }
    );
  }
}

