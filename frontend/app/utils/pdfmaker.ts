/**
 * PDF Generation using pdfmake for Letter Composer
 * Provides client-side PDF generation with perfect WYSIWYG accuracy
 */

import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';
import htmlToPdfmake from 'html-to-pdfmake';

// Register fonts
pdfMake.addVirtualFileSystem(pdfFonts);

// A4 page dimensions in points (1 point = 1/72 inch)
const A4_WIDTH = 595;
const A4_HEIGHT = 842;

// Margins in points (matching ReportLab)
const MARGINS = {
  left: 105,
  top: 190,
  right: 105,
  bottom: 140,
};

/**
 * Convert an image URL to base64 data URL
 * @param url - Image URL
 * @returns Promise with base64 data URL
 */
async function imageToBase64(url: string): Promise<string> {
  const response = await fetch(url);
  const blob = await response.blob();
  
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Create background definition for letterhead
 * @param letterheadDataUrl - Base64 data URL of letterhead image
 * @returns pdfmake background definition
 */
function createLetterheadBackground(letterheadDataUrl: string) {
  return function(currentPage: number, pageSize: any) {
    return {
      image: letterheadDataUrl,
      width: pageSize.width,
      height: pageSize.height,
      absolutePosition: { x: 0, y: 0 },
    };
  };
}

/**
 * Generate and download a PDF from HTML content
 * @param html - HTML content from TipTap editor
 * @param filename - Name of the PDF file to download
 */
export async function generateLetterPDF(html: string, filename: string = 'letter.pdf'): Promise<void> {
  // Clean HTML: Replace unsupported fonts with 'Roboto'
  const cleanedHtml = html
    .replace(/font-family:\s*-apple-system[^;"]*/gi, 'font-family: Roboto')
    .replace(/font-family:\s*BlinkMacSystemFont[^;"]*/gi, 'font-family: Roboto')
    .replace(/font-family:\s*"SF Pro[^"]*"/gi, 'font-family: Roboto')
    .replace(/font-family:\s*system-ui[^;"]*/gi, 'font-family: Roboto');
  
  // Convert HTML to pdfmake format
  // The third parameter allows us to customize the conversion
  const content = htmlToPdfmake(cleanedHtml, {
    defaultStyles: {
      p: {
        margin: [0, 0, 0, 5], // [left, top, right, bottom] - small bottom margin for paragraph spacing
      },
      h1: {
        margin: [0, 5, 0, 5], // Add spacing around headings
      },
      h2: {
        margin: [0, 5, 0, 5],
      },
      h3: {
        margin: [0, 5, 0, 5],
      },
    },
  });
  
  // Load letterhead image
  const letterheadUrl = '/images/Walk-Easy_Letterhead-Pad-Final.png';
  const letterheadDataUrl = await imageToBase64(letterheadUrl);
  
  // Define PDF document
  const docDefinition: any = {
    content,
    pageSize: 'A4',
    pageMargins: [MARGINS.left, MARGINS.top, MARGINS.right, MARGINS.bottom],
    
    // Add letterhead background to all pages
    background: createLetterheadBackground(letterheadDataUrl),
    
    // Default styles - preserves user's font sizes from HTML
    defaultStyle: {
      font: 'Roboto', // pdfmake default font
      // fontSize removed - preserves user's chosen font sizes
      lineHeight: 1.4,
    },
    
    // Custom styles for different elements
    styles: {
      header: {
        fontSize: 18,
        bold: true,
        margin: [0, 0, 0, 10],
      },
      subheader: {
        fontSize: 15,
        bold: true,
        margin: [0, 10, 0, 5],
      },
    },
  };
  
  // Generate and download PDF
  pdfMake.createPdf(docDefinition).download(filename);
}

/**
 * Generate PDF and open in new tab
 * @param html - HTML content from TipTap editor
 */
export async function openLetterPDF(html: string): Promise<void> {
  // Clean HTML: Replace unsupported fonts with 'Roboto'
  const cleanedHtml = html
    .replace(/font-family:\s*-apple-system[^;"]*/gi, 'font-family: Roboto')
    .replace(/font-family:\s*BlinkMacSystemFont[^;"]*/gi, 'font-family: Roboto')
    .replace(/font-family:\s*"SF Pro[^"]*"/gi, 'font-family: Roboto')
    .replace(/font-family:\s*system-ui[^;"]*/gi, 'font-family: Roboto');
  
  const content = htmlToPdfmake(cleanedHtml, {
    defaultStyles: {
      p: {
        margin: [0, 0, 0, 5], // Small bottom margin for paragraph spacing
      },
      h1: {
        margin: [0, 5, 0, 5],
      },
      h2: {
        margin: [0, 5, 0, 5],
      },
      h3: {
        margin: [0, 5, 0, 5],
      },
    },
  });
  
  // Load letterhead image
  const letterheadUrl = '/images/Walk-Easy_Letterhead-Pad-Final.png';
  const letterheadDataUrl = await imageToBase64(letterheadUrl);
  
  const docDefinition: any = {
    content,
    pageSize: 'A4',
    pageMargins: [MARGINS.left, MARGINS.top, MARGINS.right, MARGINS.bottom],
    background: createLetterheadBackground(letterheadDataUrl),
    defaultStyle: {
      font: 'Roboto',
      // fontSize removed - preserves user's chosen font sizes
      lineHeight: 1.4,
    },
  };
  
  pdfMake.createPdf(docDefinition).open();
}

/**
 * Generate PDF and print directly
 * @param html - HTML content from TipTap editor
 */
export async function printLetterPDF(html: string): Promise<void> {
  // Clean HTML: Replace unsupported fonts with 'Roboto'
  const cleanedHtml = html
    .replace(/font-family:\s*-apple-system[^;"]*/gi, 'font-family: Roboto')
    .replace(/font-family:\s*BlinkMacSystemFont[^;"]*/gi, 'font-family: Roboto')
    .replace(/font-family:\s*"SF Pro[^"]*"/gi, 'font-family: Roboto')
    .replace(/font-family:\s*system-ui[^;"]*/gi, 'font-family: Roboto');
  
  const content = htmlToPdfmake(cleanedHtml, {
    defaultStyles: {
      p: {
        margin: [0, 0, 0, 5], // Small bottom margin for paragraph spacing
      },
      h1: {
        margin: [0, 5, 0, 5],
      },
      h2: {
        margin: [0, 5, 0, 5],
      },
      h3: {
        margin: [0, 5, 0, 5],
      },
    },
  });
  
  // Load letterhead image
  const letterheadUrl = '/images/Walk-Easy_Letterhead-Pad-Final.png';
  const letterheadDataUrl = await imageToBase64(letterheadUrl);
  
  const docDefinition: any = {
    content,
    pageSize: 'A4',
    pageMargins: [MARGINS.left, MARGINS.top, MARGINS.right, MARGINS.bottom],
    background: createLetterheadBackground(letterheadDataUrl),
    defaultStyle: {
      font: 'Roboto',
      // fontSize removed - preserves user's chosen font sizes
      lineHeight: 1.4,
    },
  };
  
  pdfMake.createPdf(docDefinition).print();
}

/**
 * Generate PDF and return as blob URL for preview
 * @param html - HTML content from TipTap editor
 * @returns Promise with blob URL
 */
export async function generateLetterPDFPreview(html: string): Promise<string> {
  // Clean HTML: Replace unsupported fonts with 'Roboto'
  const cleanedHtml = html
    .replace(/font-family:\s*-apple-system[^;"]*/gi, 'font-family: Roboto')
    .replace(/font-family:\s*BlinkMacSystemFont[^;"]*/gi, 'font-family: Roboto')
    .replace(/font-family:\s*"SF Pro[^"]*"/gi, 'font-family: Roboto')
    .replace(/font-family:\s*system-ui[^;"]*/gi, 'font-family: Roboto');
  
  const content = htmlToPdfmake(cleanedHtml, {
    defaultStyles: {
      p: {
        margin: [0, 0, 0, 5], // Small bottom margin for paragraph spacing
      },
      h1: {
        margin: [0, 5, 0, 5],
      },
      h2: {
        margin: [0, 5, 0, 5],
      },
      h3: {
        margin: [0, 5, 0, 5],
      },
    },
  });
  
  // Load letterhead image
  const letterheadUrl = '/images/Walk-Easy_Letterhead-Pad-Final.png';
  const letterheadDataUrl = await imageToBase64(letterheadUrl);
  
  const docDefinition: any = {
    content,
    pageSize: 'A4',
    pageMargins: [MARGINS.left, MARGINS.top, MARGINS.right, MARGINS.bottom],
    background: createLetterheadBackground(letterheadDataUrl),
    defaultStyle: {
      font: 'Roboto',
      // fontSize removed - preserves user's chosen font sizes
      lineHeight: 1.4,
    },
  };
  
  // Generate PDF and return as blob URL
  return new Promise((resolve) => {
    pdfMake.createPdf(docDefinition).getBlob((blob: Blob) => {
      const url = URL.createObjectURL(blob);
      resolve(url);
    });
  });
}

