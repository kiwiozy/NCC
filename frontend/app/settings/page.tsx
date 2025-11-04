'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Container, rem } from '@mantine/core';
import Navigation from '../components/Navigation';
import SettingsHeader from '../components/SettingsHeader';

// We'll import these as separate components
import FundingSourcesSettings from '../components/settings/FundingSourcesSettings';
import ClinicsSettings from '../components/settings/ClinicsSettings';

type SettingsTab = 'general' | 'funding-sources' | 'clinics';

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
      case 'funding-sources':
        return <FundingSourcesSettings />;
      case 'clinics':
        return <ClinicsSettings />;
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

