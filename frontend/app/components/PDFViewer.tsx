'use client';

import { useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { Button, Group, Stack, Text, ActionIcon, Box } from '@mantine/core';
import { IconChevronLeft, IconChevronRight, IconDownload, IconExternalLink } from '@tabler/icons-react';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;

interface PDFViewerProps {
  url: string;
  onError?: (error: Error) => void;
}

export default function PDFViewer({ url, onError }: PDFViewerProps) {
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(true);

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
    setLoading(false);
  }

  function onDocumentLoadError(error: Error) {
    console.error('PDF load error:', error);
    setLoading(false);
    onError?.(error);
  }

  const goToPrevPage = () => setPageNumber(prev => Math.max(prev - 1, 1));
  const goToNextPage = () => setPageNumber(prev => Math.min(prev + 1, numPages));

  return (
    <Stack gap="md" style={{ height: '80vh' }}>
      {/* Controls */}
      <Group justify="space-between" wrap="nowrap">
        <Group gap="xs">
          <ActionIcon
            onClick={goToPrevPage}
            disabled={pageNumber <= 1}
            variant="light"
            size="lg"
          >
            <IconChevronLeft size={18} />
          </ActionIcon>
          
          <Text size="sm" style={{ minWidth: '80px', textAlign: 'center' }}>
            Page {pageNumber} of {numPages || '?'}
          </Text>
          
          <ActionIcon
            onClick={goToNextPage}
            disabled={pageNumber >= numPages}
            variant="light"
            size="lg"
          >
            <IconChevronRight size={18} />
          </ActionIcon>
        </Group>

        <Group gap="xs">
          <Button
            component="a"
            href={url}
            download
            leftSection={<IconDownload size={16} />}
            variant="light"
            size="compact-sm"
          >
            Download
          </Button>
          
          <Button
            component="a"
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            leftSection={<IconExternalLink size={16} />}
            variant="light"
            size="compact-sm"
          >
            Open in Tab
          </Button>
        </Group>
      </Group>

      {/* PDF Document */}
      <Box
        style={{
          flex: 1,
          overflow: 'auto',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'flex-start',
          backgroundColor: '#525659',
          borderRadius: '4px',
          padding: '20px',
        }}
      >
        {loading && <Text c="white">Loading PDF...</Text>}
        
        <Document
          file={url}
          onLoadSuccess={onDocumentLoadSuccess}
          onLoadError={onDocumentLoadError}
          loading={<Text c="white">Loading document...</Text>}
          error={
            <Stack align="center" gap="md" p="xl">
              <Text c="white">Failed to load PDF</Text>
              <Button
                component="a"
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                leftSection={<IconExternalLink size={16} />}
              >
                Open in New Tab
              </Button>
            </Stack>
          }
        >
          <Page
            pageNumber={pageNumber}
            renderTextLayer={true}
            renderAnnotationLayer={true}
            scale={1.2}
          />
        </Document>
      </Box>
    </Stack>
  );
}

