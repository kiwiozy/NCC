import { Container, Stack } from '@mantine/core';
import ClinicCalendar from './components/ClinicCalendar';
import Navigation from './components/Navigation';

export default function Home() {
  return (
    <Navigation activeTab="calendar">
      <Container size="xl" style={{ height: 'calc(100vh - 140px)' }}>
        <Stack gap="lg" style={{ height: '100%' }}>
          <ClinicCalendar />
        </Stack>
      </Container>
    </Navigation>
  );
}

