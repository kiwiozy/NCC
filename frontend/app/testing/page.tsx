'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Container, rem } from '@mantine/core';
import Navigation from '../components/Navigation';
import TestingHeader from '../components/TestingHeader';

// Import testing components
import XeroIntegration from '../components/settings/XeroIntegration';
import SMSIntegration from '../components/settings/SMSIntegration';
import S3Integration from '../components/settings/S3Integration';
import NotesTest from '../components/settings/NotesTest';
import ATReport from '../components/settings/ATReport';
import GmailIntegration from '../components/settings/GmailIntegration';
import LetterComposer from '../components/settings/LetterComposer';

type TestingTab = 'gmail' | 'letters' | 'xero' | 'sms' | 's3' | 'notes' | 'at-report' | 'notifications';

export default function TestingPage() {
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<TestingTab>('gmail');

  useEffect(() => {
    const tab = searchParams.get('tab') as TestingTab;
    if (tab) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  const renderContent = () => {
    switch (activeTab) {
      case 'gmail':
        return <GmailIntegration />;
      case 'letters':
        return <LetterComposer />;
      case 'xero':
        return <XeroIntegration />;
      case 'sms':
        return <SMSIntegration />;
      case 's3':
        return <S3Integration />;
      case 'notes':
        return <NotesTest />;
      case 'at-report':
        return <ATReport />;
      case 'notifications':
        return (
          <div>
            <h3 style={{ marginBottom: rem(16) }}>Notification Testing</h3>
            <p>Coming soon...</p>
          </div>
        );
      default:
        return <GmailIntegration />;
    }
  };

  return (
    <Navigation>
      <TestingHeader />
      <Container size="xl" py="xl">
        {renderContent()}
      </Container>
    </Navigation>
  );
}

