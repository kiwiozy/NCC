'use client';

import { Container } from '@mantine/core';
import ClinicCalendar from '../components/ClinicCalendar';
import Navigation from '../components/Navigation';

export default function CalendarPage() {
  return (
    <Navigation>
      <Container size="100%" fluid px="xl" style={{ height: 'calc(100vh - 80px)' }}>
        <ClinicCalendar />
      </Container>
    </Navigation>
  );
}

