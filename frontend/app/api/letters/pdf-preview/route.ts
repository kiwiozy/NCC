// PDF Preview Generation API Route - Saves PDF temporarily and returns URL
// Implements ChatGPT's recommended pattern for Safari compatibility
import { NextRequest, NextResponse } from 'next/server';
import puppeteer, { Browser } from 'puppeteer';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

// Temporary storage directory for PDFs
const TEMP_PDF_DIR = path.join(process.cwd(), 'tmp', 'pdfs');

// Ensure temp directory exists
if (!fs.existsSync(TEMP_PDF_DIR)) {
  fs.mkdirSync(TEMP_PDF_DIR, { recursive: true });
}

// Clean up old PDFs (older than 1 hour)
function cleanupOldPDFs() {
  const files = fs.readdirSync(TEMP_PDF_DIR);
  const now = Date.now();
  const ONE_HOUR = 60 * 60 * 1000;

  files.forEach(file => {
    const filePath = path.join(TEMP_PDF_DIR, file);
    const stats = fs.statSync(filePath);
    if (now - stats.mtimeMs > ONE_HOUR) {
      fs.unlinkSync(filePath);
      console.log(`Cleaned up old PDF: ${file}`);
    }
  });
}

/**
 * Split HTML content into multiple pages based on manual page break markers
 */
function splitContentIntoPages(html: string): string[] {
  const pageBreakRegex = /<hr\s+class="page-break"[^>]*>/gi;
  const pages = html.split(pageBreakRegex).map(page => page.trim()).filter(page => page.length > 0);
  return pages.length > 0 ? pages : [html];
}

export async function POST(request: NextRequest) {
  let browser: Browser | null = null;
  
  try {
    const { html } = await request.json();

    if (!html) {
      return NextResponse.json({ error: 'No HTML content provided' }, { status: 400 });
    }

    // Clean up old PDFs periodically
    cleanupOldPDFs();

    // Generate unique PDF ID
    const pdfId = crypto.randomBytes(16).toString('hex');
    const pdfPath = path.join(TEMP_PDF_DIR, `${pdfId}.pdf`);

    // Read the clean letterhead base64 string
    const letterheadPath = path.join(process.cwd(), 'public', 'Walk-Easy_Letterhead-base64.txt');
    const letterheadBase64 = fs.readFileSync(letterheadPath, 'utf-8').trim();

    // Launch Puppeteer
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
    
    // Split content into pages
    const pages = splitContentIntoPages(html);
    console.log(`Content split into ${pages.length} page(s)`);
    
    // Build page HTML for each page
    const pageElements = pages.map((pageHTML) => `
    <div class="we-page">
      <div class="we-page-content">
        ${pageHTML}
      </div>
    </div>`).join('\n');

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
      
      /* Page container */
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
      
      /* Fixed letterhead background (appears on ALL pages) */
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
      
      /* Content area with safe zones */
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

    // Save PDF to temporary file
    fs.writeFileSync(pdfPath, pdfBuffer);
    console.log(`PDF saved: ${pdfId}.pdf`);

    // Return PDF ID and URL
    return NextResponse.json({
      pdfId,
      pdfUrl: `/api/letters/pdf-preview/${pdfId}`,
    }, { status: 200 });

  } catch (error) {
    console.error('PDF generation error:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    
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

