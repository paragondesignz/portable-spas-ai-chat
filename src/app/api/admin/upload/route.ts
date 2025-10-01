import { NextRequest, NextResponse } from 'next/server';
import { Pinecone } from '@pinecone-database/pinecone';
import { writeFile, unlink } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';

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
  let tempFilePath: string | null = null;

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

    // Save file temporarily
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    
    tempFilePath = join(tmpdir(), `pinecone-upload-${Date.now()}-${file.name}`);
    await writeFile(tempFilePath, buffer);

    // Upload to Pinecone
    const apiKey = process.env.PINECONE_API_KEY;
    const assistantName = process.env.PINECONE_ASSISTANT_NAME || 'portable-spas';

    if (!apiKey) {
      throw new Error('PINECONE_API_KEY is not defined');
    }

    const pc = new Pinecone({ apiKey });
    const assistant = pc.assistant.Assistant(assistantName);
    
    const response = await assistant.uploadFile({
      filePath: tempFilePath,
      timeout: 300000, // 5 minutes
    });

    // Clean up temp file
    await unlink(tempFilePath);
    tempFilePath = null;

    return NextResponse.json({
      success: true,
      file: {
        id: response.id,
        name: response.name,
        status: response.status,
        size: response.size
      },
      message: 'File uploaded successfully'
    }, { headers: corsHeaders });

  } catch (error: any) {
    console.error('Upload file error:', error);
    
    // Clean up temp file on error
    if (tempFilePath) {
      try {
        await unlink(tempFilePath);
      } catch (e) {
        console.error('Failed to clean up temp file:', e);
      }
    }

    return NextResponse.json(
      { error: 'Failed to upload file', details: error.message },
      { status: 500, headers: corsHeaders }
    );
  }
}

