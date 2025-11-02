'use client';

import { Button, Group, Stack, Box } from '@mantine/core';
import { IconDownload, IconExternalLink } from '@tabler/icons-react';

interface PDFViewerProps {
  url: string;
}

export default function PDFViewer({ url }: PDFViewerProps) {
  return (
    <Stack gap="md" style={{ height: '80vh' }}>
      {/* Controls */}
      <Group justify="flex-end" wrap="nowrap">
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
          Open in New Tab
        </Button>
      </Group>

      {/* PDF Display using object tag (better Safari support than iframe) */}
      <Box
        style={{
          flex: 1,
          overflow: 'hidden',
          backgroundColor: '#525659',
          borderRadius: '4px',
        }}
      >
        <object
          data={url}
          type="application/pdf"
          width="100%"
          height="100%"
          style={{
            border: 'none',
            display: 'block',
          }}
        >
          {/* Fallback for browsers that can't display PDFs */}
          <Stack align="center" justify="center" style={{ height: '100%', padding: '40px' }}>
            <p style={{ color: 'white', marginBottom: '20px' }}>
              PDF preview not available in this browser.
            </p>
            <Group>
              <Button
                component="a"
                href={url}
                download
                leftSection={<IconDownload size={16} />}
              >
                Download PDF
              </Button>
              <Button
                component="a"
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                leftSection={<IconExternalLink size={16} />}
                variant="light"
              >
                Open in New Tab
              </Button>
            </Group>
          </Stack>
        </object>
      </Box>
    </Stack>
  );
}
