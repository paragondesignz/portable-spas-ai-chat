import { NextRequest, NextResponse } from 'next/server';
import { authorizeAdminRequest } from '@/lib/admin-auth';
import { createUploadDraft } from '@/lib/knowledgebase-store';

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

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST(req: NextRequest) {
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

    // Convert CSV to Markdown if needed
    let uploadBlob: Blob;
    let uploadFileName: string;
    let notes: string | undefined;

    if (fileName.endsWith('.csv')) {
      console.log(`Converting CSV file "${file.name}" to Markdown format...`);
      const converted = await convertCsvToMarkdown(file);
      uploadBlob = converted.blob;
      uploadFileName = converted.name;
      console.log(`Converted to "${uploadFileName}"`);
      notes = 'Converted from CSV to Markdown';
    } else {
      const fileBuffer = await file.arrayBuffer();
      uploadBlob = new Blob([fileBuffer], { type: file.type });
      uploadFileName = file.name;
    }

    console.log(
      `Saving file "${uploadFileName}" (${uploadBlob.size} bytes) as knowledge base draft`
    );

    const draft = await createUploadDraft({
      file: uploadBlob,
      originalFileName: uploadFileName,
      contentType: uploadBlob.type || file.type,
      notes,
    });

    return NextResponse.json(
      {
        success: true,
        item: draft,
        message: 'File saved as draft. Submit to the knowledge base when ready.',
      },
      { headers: corsHeaders }
    );

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

