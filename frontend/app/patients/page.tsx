'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Container, Title, Paper, Text, Loader, Center } from '@mantine/core';
import Navigation from '../components/Navigation';

type ContactType = 'patients' | 'referrers' | 'coordinator' | 'ndis-lac' | 'contacts' | 'companies' | 'clinics';

export default function ContactsPage() {
  const searchParams = useSearchParams();
  const [activeType, setActiveType] = useState<ContactType>('patients');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const type = searchParams.get('type') as ContactType;
    if (type) {
      setActiveType(type);
    }
  }, [searchParams]);

  const renderContent = () => {
    switch (activeType) {
      case 'patients':
        return (
          <Paper p="xl" shadow="sm" radius="md">
            <Title order={2} mb="md">👥 Patients</Title>
            <Text c="dimmed" mb="lg">
              Manage your patient database - view, add, edit patient records and contact information.
            </Text>
            <Text size="sm" c="dimmed">
              • Patient demographics and contact details
              <br />• Medical history and appointment records
              <br />• Insurance and billing information
              <br />• Patient documents and files
            </Text>
          </Paper>
        );
      
      case 'referrers':
        return (
          <Paper p="xl" shadow="sm" radius="md">
            <Title order={2} mb="md">🩺 Referrers</Title>
            <Text c="dimmed" mb="lg">
              Medical referrer contacts including GPs, specialists, and other healthcare providers.
            </Text>
            <Text size="sm" c="dimmed">
              • General Practitioners (GPs)
              <br />• Medical specialists
              <br />• Allied health professionals
              <br />• Referring organizations
            </Text>
          </Paper>
        );
      
      case 'coordinator':
        return (
          <Paper p="xl" shadow="sm" radius="md">
            <Title order={2} mb="md">👤 Coordinators</Title>
            <Text c="dimmed" mb="lg">
              Care coordinators and case managers who help manage patient care plans.
            </Text>
            <Text size="sm" c="dimmed">
              • NDIS plan coordinators
              <br />• Care coordinators
              <br />• Case managers
              <br />• Support workers
            </Text>
          </Paper>
        );
      
      case 'ndis-lac':
        return (
          <Paper p="xl" shadow="sm" radius="md">
            <Title order={2} mb="md">♿ NDIS Local Area Coordinators</Title>
            <Text c="dimmed" mb="lg">
              NDIS Local Area Coordinators (LACs) who assist with NDIS plans and support.
            </Text>
            <Text size="sm" c="dimmed">
              • Local Area Coordinators
              <br />• NDIS planners
              <br />• Support coordination contacts
              <br />• NDIS agency contacts
            </Text>
          </Paper>
        );
      
      case 'contacts':
        return (
          <Paper p="xl" shadow="sm" radius="md">
            <Title order={2} mb="md">✋ General Contacts</Title>
            <Text c="dimmed" mb="lg">
              Other contacts and relationships not covered by other categories.
            </Text>
            <Text size="sm" c="dimmed">
              • Emergency contacts
              <br />• Family members
              <br />• Carers and support persons
              <br />• Other professional contacts
            </Text>
          </Paper>
        );
      
      case 'companies':
        return (
          <Paper p="xl" shadow="sm" radius="md">
            <Title order={2} mb="md">🏢 Companies</Title>
            <Text c="dimmed" mb="lg">
              Corporate clients, organizations, and business contacts.
            </Text>
            <Text size="sm" c="dimmed">
              • Corporate clients
              <br />• Insurance companies
              <br />• Funding organizations
              <br />• Business partners and suppliers
            </Text>
          </Paper>
        );
      
      case 'clinics':
        return (
          <Paper p="xl" shadow="sm" radius="md">
            <Title order={2} mb="md">🏥 Clinics</Title>
            <Text c="dimmed" mb="lg">
              Your clinic locations and facility details.
            </Text>
            <Text size="sm" c="dimmed">
              • Newcastle clinic
              <br />• Tamworth clinic
              <br />• Clinic contact information
              <br />• Operating hours and staff
            </Text>
          </Paper>
        );
      
      default:
        return null;
    }
  };

  const getPageTitle = () => {
    const titles: Record<ContactType, string> = {
      'patients': 'Patients',
      'referrers': 'Referrers',
      'coordinator': 'Coordinators',
      'ndis-lac': 'NDIS LAC',
      'contacts': 'General Contacts',
      'companies': 'Companies',
      'clinics': 'Clinics',
    };
    return titles[activeType] || 'Contacts';
  };

  return (
    <Navigation>
      <Container size="xl" py="xl">
        <Title order={1} mb="xl">{getPageTitle()}</Title>
        
        {loading ? (
          <Center h={400}>
            <Loader size="lg" />
          </Center>
        ) : (
          renderContent()
        )}
      </Container>
    </Navigation>
  );
}

