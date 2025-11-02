// PDF Preview GET Route - Serves saved PDF files
// Implements ChatGPT's recommended pattern for Safari compatibility
import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const TEMP_PDF_DIR = path.join(process.cwd(), 'tmp', 'pdfs');

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    
    // Validate PDF ID (hex string only for security)
    if (!/^[a-f0-9]{32}$/.test(id)) {
      return NextResponse.json({ error: 'Invalid PDF ID' }, { status: 400 });
    }

    const pdfPath = path.join(TEMP_PDF_DIR, `${id}.pdf`);

    // Check if file exists
    if (!fs.existsSync(pdfPath)) {
      return NextResponse.json({ error: 'PDF not found' }, { status: 404 });
    }

    // Read PDF file
    const pdfBuffer = fs.readFileSync(pdfPath);

    // Return PDF with proper headers for Safari compatibility
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="letter-${id}.pdf"`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });

  } catch (error) {
    console.error('PDF retrieval error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to retrieve PDF', 
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

