'use client';

import { useState, useEffect } from 'react';
import { Container } from '@mantine/core';
import Navigation from '../../components/Navigation';

// Import the Xero Integration component
import XeroIntegration from '../../components/settings/XeroIntegration';

export default function XeroSettingsPage() {
  return (
    <Navigation>
      <Container size="xl" py="xl">
        <XeroIntegration />
      </Container>
    </Navigation>
  );
}

