// PDF Generation API Route - Walk Easy Letterhead System
// Based on ChatGPT's recommendations
import { NextRequest, NextResponse } from 'next/server';
import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    const { html } = await request.json();

    if (!html) {
      return NextResponse.json({ error: 'No HTML content provided' }, { status: 400 });
    }

    // Read and encode letterhead as base64
    // Read the clean letterhead (without red box) base64 string
    const letterheadPath = path.join(process.cwd(), 'public', 'Walk-Easy_Letterhead-base64.txt');
    const letterheadBase64 = fs.readFileSync(letterheadPath, 'utf-8').trim();

    // Build complete HTML with embedded letterhead
    const fullHTML = `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>
      @page {
        size: A4;
        margin: 0;
      }
      
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }
      
      html, body {
        margin: 0;
        padding: 0;
      }
      
      /* Fixed letterhead background (z-index: 0 per ChatGPT recommendation) */
      .letterhead-bg {
        position: fixed;
        top: 0;
        left: 0;
        width: 210mm;
        height: 297mm;
        background-image: url('data:image/png;base64,${letterheadBase64}');
        background-size: 210mm 297mm;
        background-repeat: no-repeat;
        z-index: 0;
        pointer-events: none;
      }
      
      /* Content with safe zone padding - text constrained to red box */
      .pdf-content {
        position: relative;
        z-index: 1;
        padding: 60mm 18mm 45mm 22mm; /* top, right, bottom, left */
        font-family: 'Helvetica Neue', Arial, sans-serif;
        font-size: 14px;
        line-height: 1.6;
        color: #000;
        min-height: 297mm;
        max-height: 297mm;  /* Prevent content from exceeding one page */
        overflow: hidden;    /* Hide text that exceeds the red box */
        box-sizing: border-box;
      }
      
      /* Remove any borders from all elements */
      .pdf-content *,
      .pdf-content *::before,
      .pdf-content *::after {
        border: none !important;
        outline: none !important;
      }
      
      /* Typography */
      .pdf-content p {
        margin: 0 0 8px 0;
      }
      
      .pdf-content ul,
      .pdf-content ol {
        padding-left: 24px;
        margin: 8px 0;
      }
      
      .pdf-content li {
        margin: 4px 0;
      }
      
      .pdf-content h1,
      .pdf-content h2,
      .pdf-content h3 {
        margin: 16px 0 8px 0;
        font-weight: bold;
      }
      
      .pdf-content h1 { font-size: 18px; }
      .pdf-content h2 { font-size: 16px; }
      .pdf-content h3 { font-size: 14px; }
      
      /* Prevent orphans and widows */
      .pdf-content p,
      .pdf-content ul,
      .pdf-content ol,
      .pdf-content h1,
      .pdf-content h2,
      .pdf-content h3 {
        break-inside: avoid;
        orphans: 3;
        widows: 3;
      }
    </style>
  </head>
  <body>
    <div class="letterhead-bg"></div>
    <div class="pdf-content">
      ${html}
    </div>
  </body>
</html>
    `;

    // Launch Puppeteer with recommended settings
    const browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--font-render-hinting=medium',
        '--disable-dev-shm-usage',
      ],
    });

    const page = await browser.newPage();
    
    // Set content and wait for network idle
    await page.setContent(fullHTML, { 
      waitUntil: 'networkidle0',
      timeout: 30000,
    });
    
    // Small delay for font rendering
    await new Promise(resolve => setTimeout(resolve, 300));

    // Generate PDF
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
    });

    await browser.close();

    // Return PDF
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="letter-${Date.now()}.pdf"`,
      },
    });

  } catch (error) {
    console.error('PDF generation error:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return NextResponse.json(
      { 
        error: 'Failed to generate PDF', 
        details: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

