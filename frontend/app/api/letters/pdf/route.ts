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

    // Build complete HTML with embedded letterhead (multi-page support)
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
      
      /* Page container (multi-page support per ChatGPT Approach A) */
      .we-page {
        position: relative;
        width: 210mm;
        height: 297mm;
        background: #fff;
        page-break-after: always;
      }
      
      .we-page:last-child {
        page-break-after: auto;
      }
      
      /* Fixed letterhead background (appears on ALL pages per ChatGPT) */
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
        print-color-adjust: exact;
        -webkit-print-color-adjust: exact;
      }
      
      /* Content area with safe zones (absolute positioning per ChatGPT) */
      .we-page-content {
        position: absolute;
        top: 60mm;
        left: 22mm;
        right: 18mm;
        bottom: 45mm;
        overflow: hidden;
        font-family: 'Helvetica Neue', Arial, sans-serif;
        font-size: 14px;
        line-height: 1.6;
        color: #000;
        z-index: 1;
      }
      
      /* Remove borders/outlines */
      * {
        border: none !important;
        outline: none !important;
      }
      
      /* Typography */
      .we-page-content p {
        margin: 0 0 8px 0;
      }
      
      .we-page-content ul,
      .we-page-content ol {
        padding-left: 24px;
        margin: 8px 0;
      }
      
      .we-page-content li {
        margin: 4px 0;
      }
      
      .we-page-content h1,
      .we-page-content h2,
      .we-page-content h3 {
        margin: 16px 0 8px 0;
        font-weight: bold;
      }
      
      .we-page-content h1 { font-size: 18px; }
      .we-page-content h2 { font-size: 16px; }
      .we-page-content h3 { font-size: 14px; }
      
      /* Prevent orphans and widows */
      .we-page-content p,
      .we-page-content ul,
      .we-page-content ol,
      .we-page-content h1,
      .we-page-content h2,
      .we-page-content h3 {
        break-inside: avoid;
        orphans: 3;
        widows: 3;
      }
    </style>
  </head>
  <body>
    <div class="letterhead-bg"></div>
    <!-- For now, single page - multi-page logic will be added later -->
    <div class="we-page">
      <div class="we-page-content">
        ${html}
      </div>
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

