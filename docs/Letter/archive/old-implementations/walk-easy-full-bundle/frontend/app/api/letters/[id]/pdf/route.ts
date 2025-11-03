// frontend/app/api/letters/[id]/pdf/route.ts
import { NextRequest } from 'next/server';
import puppeteer from 'puppeteer';

export const POST = async (req: NextRequest, { params }: { params: { id: string } }) => {
  const { html } = await req.json();

  const finalHtml = `
  <!DOCTYPE html>
  <html>
    <head>
      <meta charset="utf-8" />
      <style>
        @page { size: A4; margin: 0; }
        :root {
          --we-page-width: 210mm;
          --we-page-height: 297mm;
          --we-pad-top: 60mm;
          --we-pad-right: 18mm;
          --we-pad-bottom: 45mm;
          --we-pad-left: 22mm;
          --we-content-width: calc(var(--we-page-width) - var(--we-pad-left) - var(--we-pad-right));
        }
        body { margin: 0; font-family: system-ui, sans-serif; }
        .letterhead-bg {
          position: fixed;
          inset: 0;
          width: 210mm;
          height: 297mm;
          background: url('https://example.com/path/to/letterhead.png') no-repeat 0 0 / 210mm 297mm;
          z-index: -1;
        }
        .pdf-content {
          padding: var(--we-pad-top) var(--we-pad-right) var(--we-pad-bottom) var(--we-pad-left);
          max-width: var(--we-content-width);
          font-size: 14px;
          line-height: 1.6;
        }
        hr[data-page-break] { break-before: page; border: 0; height: 0; }
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

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const page = await browser.newPage();
  await page.setContent(finalHtml, { waitUntil: 'networkidle0' });

  const pdfBuffer = await page.pdf({
    format: 'A4',
    printBackground: true,
    preferCSSPageSize: true,
  });

  await browser.close();

  return new Response(pdfBuffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="letter-${params.id}.pdf"`,
    },
  });
};
