# 🎨 Mantine UI Setup Guide — Walk Easy Patient Platform

This guide covers **Mantine UI** integration for the Walk Easy Patient Platform frontend. Mantine is a React component library that provides accessible, customizable UI components ideal for clinical applications.

**Reference:** [Mantine Getting Started](https://mantine.dev/getting-started/)

---

## 📦 Quick Start

### Option 1: Use Mantine Next.js Template (Recommended)

The easiest way to get started is using the official Mantine Next.js template:

1. **Visit:** https://github.com/mantinedev/next-app-template
2. **Click:** "Use this template" button
3. **Clone** your new repository
4. **Install dependencies:**
   ```bash
   npm install
   ```

This template includes:
- ✅ Next.js App Router
- ✅ TypeScript
- ✅ Mantine core setup
- ✅ PostCSS configuration
- ✅ Jest & Storybook (in full template)
- ✅ ESLint

### Option 2: Add Mantine to Existing Next.js Project

If you already have a Next.js project, add Mantine:

```bash
# Install core packages
npm install @mantine/core @mantine/hooks

# Install additional packages (as needed)
npm install @mantine/form          # Form management
npm install @mantine/dates dayjs   # Date pickers, calendars
npm install @mantine/notifications # Toast notifications
npm install @mantine/modals        # Modal management
npm install @mantine/dropzone      # File uploads
npm install @mantine/tables        # Data tables

# Install PostCSS dependencies (required)
npm install --save-dev postcss postcss-preset-mantine postcss-simple-vars
```

---

## ⚙️ Configuration

### 1. PostCSS Configuration

Create `postcss.config.cjs` in the root of your project:

```javascript
module.exports = {
  plugins: {
    'postcss-preset-mantine': {},
    'postcss-simple-vars': {
      variables: {
        'mantine-breakpoint-xs': '36em',
        'mantine-breakpoint-sm': '48em',
        'mantine-breakpoint-md': '62em',
        'mantine-breakpoint-lg': '75em',
        'mantine-breakpoint-xl': '88em',
      },
    },
  },
};
```

### 2. Next.js App Router Setup

Update your `app/layout.tsx`:

```tsx
import '@mantine/core/styles.css';
import '@mantine/dates/styles.css';
import '@mantine/notifications/styles.css';
import '@mantine/dropzone/styles.css';
import { ColorSchemeScript, MantineProvider, createTheme } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { ModalsProvider } from '@mantine/modals';

// Custom theme (optional)
const theme = createTheme({
  /** Your theme customizations */
  primaryColor: 'blue',
  // See: https://mantine.dev/theming/theme-object/
});

export const metadata = {
  title: 'Walk Easy Patient Platform',
  description: 'Patient management system',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <ColorSchemeScript />
      </head>
      <body>
        <MantineProvider theme={theme}>
          <ModalsProvider>
            <Notifications />
            {children}
          </ModalsProvider>
        </MantineProvider>
      </body>
    </html>
  );
}
```

### 3. Next.js Pages Router Setup

If using Pages Router, update `_app.tsx`:

```tsx
import '@mantine/core/styles.css';
import '@mantine/dates/styles.css';
import '@mantine/notifications/styles.css';
import { MantineProvider, createTheme } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { ModalsProvider } from '@mantine/modals';
import type { AppProps } from 'next/app';

const theme = createTheme({
  primaryColor: 'blue',
});

export default function App({ Component, pageProps }: AppProps) {
  return (
    <MantineProvider theme={theme}>
      <ModalsProvider>
        <Notifications />
        <Component {...pageProps} />
      </ModalsProvider>
    </MantineProvider>
  );
}
```

And update `_document.tsx`:

```tsx
import { ColorSchemeScript } from '@mantine/core';
import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <ColorSchemeScript />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
```

---

## 🎨 Theming

### Custom Theme Colors

Perfect for your clinic branding:

```tsx
import { createTheme } from '@mantine/core';

const theme = createTheme({
  primaryColor: 'blue',
  colors: {
    // Custom clinic colors
    clinic: [
      '#e7f5ff',
      '#d0ebff',
      '#a5d8ff',
      '#74c0fc',
      '#4dabf7',
      '#339af0',
      '#228be6',
      '#1c7ed6',
      '#1971c2',
      '#1864ab',
    ],
  },
});
```

### Dark Mode Support

Mantine supports dark mode out of the box:

```tsx
import { MantineProvider, ColorSchemeScript } from '@mantine/core';

// The ColorSchemeScript handles system preference
// Users can toggle via theme switching
```

---

## 📝 Common Components for Patient Platform

### Forms (Patient Entry)

```tsx
import { useForm } from '@mantine/form';
import { TextInput, Button, Stack } from '@mantine/core';

function PatientForm() {
  const form = useForm({
    initialValues: {
      firstName: '',
      lastName: '',
      email: '',
      mobile: '',
    },
    validate: {
      email: (value) => (/^\S+@\S+$/.test(value) ? null : 'Invalid email'),
      mobile: (value) => (value.length < 10 ? 'Invalid mobile' : null),
    },
  });

  return (
    <form onSubmit={form.onSubmit((values) => console.log(values))}>
      <Stack gap="md">
        <TextInput
          label="First Name"
          placeholder="John"
          {...form.getInputProps('firstName')}
        />
        <TextInput
          label="Last Name"
          placeholder="Doe"
          {...form.getInputProps('lastName')}
        />
        <TextInput
          label="Email"
          placeholder="john@example.com"
          {...form.getInputProps('email')}
        />
        <TextInput
          label="Mobile"
          placeholder="0412 345 678"
          {...form.getInputProps('mobile')}
        />
        <Button type="submit">Save Patient</Button>
      </Stack>
    </form>
  );
}
```

### Date Pickers (Appointments)

```tsx
import { DatePickerInput, TimeInput } from '@mantine/dates';
import dayjs from 'dayjs';

function AppointmentForm() {
  const [value, setValue] = useState<Date | null>(null);
  
  return (
    <Stack gap="md">
      <DatePickerInput
        label="Appointment Date"
        placeholder="Pick date"
        value={value}
        onChange={setValue}
        minDate={new Date()}
      />
      <TimeInput label="Start Time" />
    </Stack>
  );
}
```

### Data Tables (Patient List)

```tsx
import { Table } from '@mantine/core';

function PatientList({ patients }) {
  const rows = patients.map((patient) => (
    <Table.Tr key={patient.id}>
      <Table.Td>{patient.firstName}</Table.Td>
      <Table.Td>{patient.lastName}</Table.Td>
      <Table.Td>{patient.email}</Table.Td>
      <Table.Td>
        <Button variant="subtle">View</Button>
      </Table.Td>
    </Table.Tr>
  ));

  return (
    <Table>
      <Table.Thead>
        <Table.Tr>
          <Table.Th>First Name</Table.Th>
          <Table.Th>Last Name</Table.Th>
          <Table.Th>Email</Table.Th>
          <Table.Th>Actions</Table.Th>
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>{rows}</Table.Tbody>
    </Table>
  );
}
```

### File Uploads (Document Management)

```tsx
import { Dropzone } from '@mantine/dropzone';
import { IconUpload } from '@tabler/icons-react';

function DocumentUpload({ patientId }) {
  return (
    <Dropzone
      onDrop={(files) => {
        // Upload to S3 via presigned URL
        files.forEach((file) => uploadToS3(file, patientId));
      }}
      accept={['application/pdf', 'image/jpeg', 'image/png']}
      maxSize={25 * 1024 * 1024} // 25MB
    >
      <Group justify="center" gap="xl" style={{ minHeight: 220, pointerEvents: 'none' }}>
        <Dropzone.Accept>
          <IconUpload size={52} stroke={1.5} />
        </Dropzone.Accept>
        <Dropzone.Reject>File rejected</Dropzone.Reject>
        <Dropzone.Idle>
          <IconUpload size={52} stroke={1.5} />
        </Dropzone.Idle>
        <div>
          <Text size="xl" inline>
            Drag documents here or click to select
          </Text>
          <Text size="sm" c="dimmed" inline mt={7}>
            PDF, JPEG, or PNG up to 25MB
          </Text>
        </div>
      </Group>
    </Dropzone>
  );
}
```

### Notifications (Feedback)

```tsx
import { notifications } from '@mantine/notifications';

// Success notification
notifications.show({
  title: 'Patient Saved',
  message: 'Patient record has been created successfully',
  color: 'green',
});

// Error notification
notifications.show({
  title: 'Error',
  message: 'Failed to save patient',
  color: 'red',
});
```

### Modals (Confirmation Dialogs)

```tsx
import { modals } from '@mantine/modals';

function ConfirmCancel() {
  modals.openConfirmModal({
    title: 'Cancel Appointment',
    children: 'Are you sure you want to cancel this appointment?',
    labels: { confirm: 'Yes, cancel', cancel: 'No' },
    onConfirm: () => {
      // Cancel appointment
    },
  });
}
```

---

## 🗓️ FullCalendar Integration with Mantine

Mantine components work seamlessly alongside FullCalendar:

```tsx
import { Paper, Button } from '@mantine/core';
import FullCalendar from '@fullcalendar/react';
import resourceTimeGridPlugin from '@fullcalendar/resource-timegrid';

function CalendarView() {
  return (
    <Paper p="md" shadow="xs">
      <FullCalendar
        plugins={[resourceTimeGridPlugin]}
        headerToolbar={{
          left: 'prev,next today',
          center: 'title',
          right: 'resourceTimeGridDay,resourceTimeGridWeek',
        }}
        // ... FullCalendar props
      />
    </Paper>
  );
}
```

---

## 📱 Responsive Design

Mantine has built-in responsive utilities:

```tsx
import { Stack, Grid } from '@mantine/core';

function ResponsiveLayout() {
  return (
    <Grid>
      <Grid.Col span={{ base: 12, md: 6, lg: 4 }}>
        {/* Mobile: full width, Tablet: half, Desktop: third */}
      </Grid.Col>
    </Grid>
  );
}
```

---

## ♿ Accessibility

Mantine components are **accessible by default**:
- ✅ Keyboard navigation
- ✅ Screen reader support
- ✅ ARIA attributes
- ✅ Focus management

Critical for healthcare applications with compliance requirements.

---

## 🔧 VS Code Setup

### Install Extensions

1. **PostCSS Intellisense and Highlighting**
   - Enables PostCSS syntax highlighting

2. **CSS Variable Autocomplete**
   - Autocomplete for Mantine CSS variables

### Configure Settings

Create `.vscode/settings.json`:

```json
{
  "cssVariables.lookupFiles": [
    "**/*.css",
    "**/*.scss",
    "**/*.sass",
    "**/*.less",
    "node_modules/@mantine/core/styles.css"
  ]
}
```

---

## 📚 Key Mantine Packages for Your Platform

| Package | Purpose | Install |
|---------|---------|---------|
| `@mantine/core` | Core components (buttons, inputs, cards) | ✅ Required |
| `@mantine/hooks` | React hooks (useForm, useDebounce) | ✅ Required |
| `@mantine/form` | Form state management | ✅ Recommended |
| `@mantine/dates` | Date/time pickers, calendars | ✅ Recommended |
| `@mantine/notifications` | Toast notifications | ✅ Recommended |
| `@mantine/modals` | Modal management | ⚙️ Optional |
| `@mantine/dropzone` | File uploads | ⚙️ For documents |
| `@mantine/tables` | Advanced data tables | ⚙️ Optional |

---

## 🎯 Integration with Your Stack

### With Django/DRF Backend

```tsx
import { useForm } from '@mantine/form';
import { TextInput, Button } from '@mantine/core';

function PatientForm() {
  const form = useForm({ /* ... */ });

  const handleSubmit = async (values) => {
    const response = await fetch('/api/patients/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(values),
    });
    
    if (response.ok) {
      notifications.show({
        title: 'Success',
        message: 'Patient created',
        color: 'green',
      });
    }
  };

  return (
    <form onSubmit={form.onSubmit(handleSubmit)}>
      {/* form fields */}
    </form>
  );
}
```

### With S3 File Uploads

See `S3_Integration.md` for presigned URL flow. Use Mantine's `Dropzone` component for the UI:

```tsx
<Dropzone
  onDrop={async (files) => {
    // 1. Request presigned URL from backend
    const { url, key } = await requestPresignedUpload();
    
    // 2. Upload directly to S3
    await fetch(url, { method: 'PUT', body: files[0] });
    
    // 3. Confirm with backend
    await confirmUpload(key);
  }}
>
  {/* Dropzone content */}
</Dropzone>
```

---

## 🚀 Next Steps

1. ✅ **Set up Mantine** using template or manual installation
2. ✅ **Configure theme** with your clinic colors
3. ✅ **Build first form** (Patient registration)
4. ✅ **Integrate with Django API** endpoints
5. ✅ **Add FullCalendar** for scheduling (see `Calendar_Spec_FullCalendar.md`)
6. ✅ **Implement file uploads** with S3 integration
7. ✅ **Add notifications** for user feedback

---

## 📖 Resources

- **Official Docs:** https://mantine.dev/
- **Next.js Guide:** https://mantine.dev/guides/next/
- **Components:** https://mantine.dev/components/
- **Theming:** https://mantine.dev/theming/theme-object/
- **GitHub:** https://github.com/mantinedev/mantine

---

## ✅ Checklist

- [ ] Mantine installed (`@mantine/core`, `@mantine/hooks`)
- [ ] PostCSS configured (`postcss.config.cjs`)
- [ ] Styles imported in `layout.tsx` or `_app.tsx`
- [ ] `MantineProvider` wrapping app
- [ ] `ColorSchemeScript` in `<head>`
- [ ] VS Code extensions installed
- [ ] First component built and tested

---

**You're ready to build a beautiful, accessible, and professional patient management UI with Mantine!** 🎨

