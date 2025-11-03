// PDF Generation API Route - Walk Easy Letterhead System
// Based on ChatGPT's recommendations
import { NextRequest, NextResponse } from 'next/server';
import puppeteer, { Browser, Page } from 'puppeteer';
import fs from 'fs';
import path from 'path';

/**
 * Split HTML content into multiple pages based on manual page break markers
 * User inserts <hr class="page-break" /> elements in the editor
 */
function splitContentIntoPages(html: string): string[] {
  // Split content by page break markers
  // The page break marker is: <hr class="page-break">
  const pageBreakRegex = /<hr\s+class="page-break"[^>]*>/gi;
  
  // Split the HTML by page breaks
  const pages = html.split(pageBreakRegex).map(page => page.trim()).filter(page => page.length > 0);
  
  // If no page breaks found, return the original HTML as a single page
  return pages.length > 0 ? pages : [html];
}

export async function POST(request: NextRequest) {
  let browser: Browser | null = null;
  
  try {
    const { html } = await request.json();

    if (!html) {
      return NextResponse.json({ error: 'No HTML content provided' }, { status: 400 });
    }

    // Read the clean letterhead (without red box) base64 string
    const letterheadPath = path.join(process.cwd(), 'public', 'Walk-Easy_Letterhead-base64.txt');
    const letterheadBase64 = fs.readFileSync(letterheadPath, 'utf-8').trim();

    // Launch Puppeteer with recommended settings
    browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--font-render-hinting=medium',
        '--disable-dev-shm-usage',
      ],
    });

    const page = await browser.newPage();
    
    // Split content into pages based on manual page break markers
    console.log('Splitting content into pages...');
    const pages = splitContentIntoPages(html);
    console.log(`Content split into ${pages.length} page(s)`);
    
    // Build page HTML for each page - each page gets its own letterhead background
    const pageElements = pages.map((pageHTML, index) => `
    <div class="we-page">
      <div class="letterhead-bg-page"></div>
      <div class="we-page-content">
        ${pageHTML}
      </div>
    </div>`).join('\n');

    // Build complete HTML with embedded letterhead (multi-page support per ChatGPT Approach A)
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
        overflow: hidden;
      }
      
      .we-page:last-child {
        page-break-after: auto;
      }
      
      /* Letterhead background for each page (position: absolute works better for PDF) */
      .letterhead-bg-page {
        position: absolute;
        top: 0;
        left: 0;
        width: 210mm;
        height: 297mm;
        background-image: url('data:image/png;base64,${letterheadBase64}');
        background-size: 210mm 297mm;
        background-repeat: no-repeat;
        background-position: 0 0;
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
    ${pageElements}
  </body>
</html>
    `;

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
    
    // Make sure browser is closed on error
    if (browser) {
      await browser.close();
    }
    
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

