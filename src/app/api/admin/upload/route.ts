import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

// Convert CSV to Markdown table format
async function convertCsvToMarkdown(file: File): Promise<{ blob: Blob; name: string }> {
  const text = await file.text();
  const lines = text.split('\n').filter(line => line.trim());

  if (lines.length === 0) {
    throw new Error('CSV file is empty');
  }

  let markdown = '# ' + file.name.replace('.csv', '') + '\n\n';

  // Parse CSV (simple parser, handles basic cases)
  const rows = lines.map(line => {
    // Simple CSV parsing - split by comma, handle quotes
    const cells: string[] = [];
    let currentCell = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        cells.push(currentCell.trim());
        currentCell = '';
      } else {
        currentCell += char;
      }
    }
    cells.push(currentCell.trim());

    return cells;
  });

  // Create markdown table
  const headers = rows[0];
  markdown += '| ' + headers.join(' | ') + ' |\n';
  markdown += '| ' + headers.map(() => '---').join(' | ') + ' |\n';

  for (let i = 1; i < rows.length; i++) {
    markdown += '| ' + rows[i].join(' | ') + ' |\n';
  }

  const blob = new Blob([markdown], { type: 'text/markdown' });
  const mdFileName = file.name.replace('.csv', '.md');

  return { blob, name: mdFileName };
}

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

    // Validate file type
    const supportedExtensions = ['.txt', '.pdf', '.md', '.docx', '.json', '.csv'];
    const fileName = file.name.toLowerCase();
    const isValidType = supportedExtensions.some(ext => fileName.endsWith(ext));

    if (!isValidType) {
      return NextResponse.json(
        {
          error: 'Unsupported file type',
          details: `Supported file types: ${supportedExtensions.join(', ')}`
        },
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

    // Convert CSV to Markdown if needed
    let uploadBlob: Blob;
    let uploadFileName: string;

    if (fileName.endsWith('.csv')) {
      console.log(`Converting CSV file "${file.name}" to Markdown format...`);
      const converted = await convertCsvToMarkdown(file);
      uploadBlob = converted.blob;
      uploadFileName = converted.name;
      console.log(`Converted to "${uploadFileName}"`);
    } else {
      const fileBuffer = await file.arrayBuffer();
      uploadBlob = new Blob([fileBuffer], { type: file.type });
      uploadFileName = file.name;
    }

    console.log(`Uploading file "${uploadFileName}" (${uploadBlob.size} bytes) to Pinecone assistant "${assistantName}"`);

    // Create FormData for Pinecone API
    const pineconeFormData = new FormData();
    pineconeFormData.append('file', uploadBlob, uploadFileName);

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

