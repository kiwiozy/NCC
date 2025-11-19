'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Container, rem } from '@mantine/core';
import Navigation from '../components/Navigation';

// We'll import these as separate components
import FundingSourcesSettings from '../components/settings/FundingSourcesSettings';
import ClinicsSettings from '../components/settings/ClinicsSettings';
import DataManagementSettings from '../components/settings/DataManagementSettings';
import UserProfiles from '../components/settings/UserProfiles';
import EmailTemplateManager from '../components/settings/EmailTemplateManager';

type SettingsTab = 'general' | 'funding-sources' | 'clinics' | 'data-management' | 'users' | 'email-templates';

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
      case 'data-management':
        return <DataManagementSettings />;
      case 'users':
        return <UserProfiles />;
      case 'email-templates':
        return <EmailTemplateManager />;
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
      <Container size="xl" py="xl">
        {renderContent()}
      </Container>
    </Navigation>
  );
}

