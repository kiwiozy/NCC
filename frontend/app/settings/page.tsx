'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Container, rem } from '@mantine/core';
import Navigation from '../components/Navigation';
import SettingsHeader from '../components/SettingsHeader';

// We'll import these as separate components
import XeroIntegration from '../components/settings/XeroIntegration';
import SMSIntegration from '../components/settings/SMSIntegration';
import S3Integration from '../components/settings/S3Integration';
import NotesTest from '../components/settings/NotesTest';
import ATReport from '../components/settings/ATReport';
import GmailIntegration from '../components/settings/GmailIntegration';

type SettingsTab = 'general' | 'gmail' | 'xero' | 'sms' | 's3' | 'notes' | 'at-report' | 'notifications';

export default function SettingsPage() {
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');

  useEffect(() => {
    const tab = searchParams.get('tab') as SettingsTab;
    if (tab) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  const renderContent = () => {
    switch (activeTab) {
      case 'gmail':
        return <GmailIntegration />;
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
            <h3 style={{ marginBottom: rem(16) }}>Notification Settings</h3>
            <p>Coming soon...</p>
          </div>
        );
      case 'general':
      default:
        return (
          <div>
            <h3 style={{ marginBottom: rem(16) }}>General Settings</h3>
            <p>Coming soon...</p>
          </div>
        );
    }
  };

  return (
    <Navigation>
      <SettingsHeader />
      <Container size="xl" py="xl">
        {renderContent()}
      </Container>
    </Navigation>
  );
}

