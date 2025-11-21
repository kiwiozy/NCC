import '@mantine/core/styles.css';
import '@mantine/dates/styles.css';
import '@mantine/notifications/styles.css';
import './globals.css';

import './utils/consoleFilter';

import { ColorSchemeScript, MantineProvider, createTheme } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { ModalsProvider } from '@mantine/modals';
import { SMSProvider } from './contexts/SMSContext';
import { AuthProvider } from './contexts/AuthContext';

// Custom theme for Walk Easy with dark mode support
const theme = createTheme({
  primaryColor: 'blue',
  fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
  headings: {
    fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
  },
  colors: {
    dark: [
      '#C1C2C5',
      '#A6A7AB',
      '#909296',
      '#5c5f66',
      '#373A40',
      '#2C2E33',
      '#25262b',
      '#1A1B1E',
      '#141517',
      '#101113',
    ],
  },
  // Force dark mode colors to prevent white flash
  other: {
    defaultBackgroundColor: '#1A1B1E',
  },
});

export const metadata = {
  title: 'WalkEasy Nexus - Patient Management',
  description: 'Modern patient management system for Walk Easy Pedorthics',
  icons: {
    icon: '/favicon.svg',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning style={{ backgroundColor: '#1A1B1E' }}>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                document.documentElement.style.backgroundColor = '#1A1B1E';
                document.documentElement.setAttribute('data-mantine-color-scheme', 'dark');
              })();
            `,
          }}
        />
        <ColorSchemeScript defaultValue="dark" />
        <meta name="theme-color" content="#1A1B1E" />
        <meta name="color-scheme" content="dark" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <style dangerouslySetInnerHTML={{
          __html: `
            * {
              background-color: #1A1B1E !important;
              color: #C1C2C5;
            }
            html, body, #__next, [data-reactroot] {
              background-color: #1A1B1E !important;
            }
          `
        }} />
      </head>
      <body suppressHydrationWarning style={{ backgroundColor: '#1A1B1E' }}>
        <AuthProvider>
          <MantineProvider theme={theme} defaultColorScheme="dark" forceColorScheme="dark">
            <ModalsProvider>
              <SMSProvider>
                <Notifications />
                {children}
              </SMSProvider>
            </ModalsProvider>
          </MantineProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
