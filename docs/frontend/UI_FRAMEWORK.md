# 🎨 WalkEasy Nexus - UI Framework Specification

## Overview

This document defines the complete UI framework for the WalkEasy Nexus patient management system. It establishes the structure, components, navigation, layouts, and design patterns that will be used throughout the application.

---

## 📋 Table of Contents

1. [Application Structure](#application-structure)
2. [Navigation & Layout](#navigation--layout)
3. [Core Pages & Views](#core-pages--views)
4. [Component Library](#component-library)
5. [Design System](#design-system)
6. [Data Flow & State Management](#data-flow--state-management)
7. [Responsive Design](#responsive-design)
8. [Accessibility](#accessibility)
9. [Implementation Roadmap](#implementation-roadmap)

---

## 1. Application Structure

### 1.1 Technology Stack

- **Framework**: Next.js 14+ (App Router)
- **UI Library**: Mantine UI v7
- **Language**: TypeScript
- **Styling**: Mantine + Custom CSS
- **State Management**: React Context / Zustand (TBD)
- **Form Management**: Mantine Forms / React Hook Form
- **Calendar**: FullCalendar
- **Data Fetching**: Native fetch / SWR / React Query (TBD)

### 1.2 Folder Structure

```
frontend/
├── app/
│   ├── layout.tsx              # Root layout with Navigation
│   ├── page.tsx                # Dashboard/Home
│   ├── calendar/
│   │   └── page.tsx            # Calendar view
│   ├── patients/
│   │   ├── page.tsx            # Patient list
│   │   ├── [id]/
│   │   │   ├── page.tsx        # Patient detail/edit
│   │   │   ├── encounters/     # Patient encounters
│   │   │   ├── documents/      # Patient documents
│   │   │   └── invoices/       # Patient invoices
│   │   └── new/
│   │       └── page.tsx        # New patient form
│   ├── appointments/
│   │   ├── page.tsx            # Appointment list
│   │   └── [id]/
│   │       └── page.tsx        # Appointment detail
│   ├── clinicians/
│   │   ├── page.tsx            # Clinician list
│   │   └── [id]/
│   │       └── page.tsx        # Clinician detail/schedule
│   ├── clinics/
│   │   ├── page.tsx            # Clinic list
│   │   └── [id]/
│   │       └── page.tsx        # Clinic detail/settings
│   ├── xero/
│   │   └── page.tsx            # Xero integration
│   ├── sms/
│   │   └── page.tsx            # SMS management
│   ├── reports/
│   │   └── page.tsx            # Reports & analytics
│   └── settings/
│       └── page.tsx            # Application settings
├── components/
│   ├── layout/
│   │   ├── Navigation.tsx
│   │   ├── AppHeader.tsx
│   │   ├── Sidebar.tsx
│   │   └── Footer.tsx
│   ├── calendar/
│   │   ├── ClinicCalendar.tsx
│   │   ├── AppointmentModal.tsx
│   │   └── CalendarFilters.tsx
│   ├── patients/
│   │   ├── PatientCard.tsx
│   │   ├── PatientForm.tsx
│   │   ├── PatientList.tsx
│   │   └── PatientSearch.tsx
│   ├── appointments/
│   │   ├── AppointmentCard.tsx
│   │   ├── AppointmentForm.tsx
│   │   └── AppointmentList.tsx
│   ├── encounters/
│   │   ├── EncounterForm.tsx
│   │   ├── EncounterList.tsx
│   │   └── EncounterNotes.tsx
│   ├── ui/
│   │   ├── DarkModeToggle.tsx
│   │   ├── EmptyState.tsx
│   │   ├── LoadingSpinner.tsx
│   │   ├── ErrorBoundary.tsx
│   │   └── ConfirmDialog.tsx
│   └── shared/
│       ├── DataTable.tsx
│       ├── SearchBar.tsx
│       ├── FilterPanel.tsx
│       └── StatusBadge.tsx
├── lib/
│   ├── api.ts              # API client
│   ├── constants.ts        # Constants
│   ├── utils.ts            # Utility functions
│   └── types.ts            # TypeScript types
├── hooks/
│   ├── usePatients.ts
│   ├── useAppointments.ts
│   ├── useClinics.ts
│   └── useAuth.ts
└── styles/
    ├── globals.css
    └── theme.ts
```

---

## 2. Navigation & Layout

### 2.1 Main Navigation Structure

**Top-Level Navigation:**
- Dashboard (Home)
- Calendar
- Patients
- Appointments
- Clinicians
- Clinics
- Reports
- Integrations (Xero, SMS)
- Settings

### 2.2 Layout Patterns

#### A. AppShell Layout (Current)
- **Header**: Logo, Navigation tabs, User menu, Dark mode toggle
- **Main Content**: Page content
- **No Sidebar**: Clean, focused interface

#### B. Sidebar Layout (Alternative)
- **Left Sidebar**: Collapsible navigation
- **Header**: Page title, Actions, User menu
- **Main Content**: Page content

**Decision**: Start with AppShell (tabs), add optional sidebar for complex views

### 2.3 Navigation Component Requirements

```typescript
interface NavigationItem {
  label: string;
  href: string;
  icon?: React.ReactNode;
  badge?: number | string;
  children?: NavigationItem[];
  requiredRole?: string[];
}
```

---

## 3. Core Pages & Views

### 3.1 Dashboard (Home)

**Purpose**: Quick overview and shortcuts

**Widgets:**
- Today's Appointments (count, list)
- Upcoming Appointments (next 7 days)
- Recent Patients
- Quick Actions (New Patient, New Appointment, View Calendar)
- Notifications/Alerts
- System Status (Xero connected, SMS balance)

**Layout**: Grid of cards (responsive)

### 3.2 Calendar View

**Current Implementation**: ✅ Completed
- Multi-clinic timeline view
- Sidebar with clinic toggles
- Drag-and-drop appointments
- Click to view/edit appointment

**Future Enhancements**:
- Quick add appointment
- Recurring appointments
- Availability blocking
- Print view

### 3.3 Patient Management

#### A. Patient List
**Features:**
- Searchable table (name, MRN, DOB, phone)
- Filters (clinic, status, flags)
- Sortable columns
- Pagination
- Quick actions (View, Edit, New Appointment)
- Bulk actions (Export, SMS)

#### B. Patient Detail
**Layout**: Tabs or Sections
- **Overview**: Demographics, contact, emergency contact, flags
- **Appointments**: History and upcoming
- **Encounters**: Clinical notes
- **Documents**: Uploaded files (S3)
- **Invoices**: Xero integration
- **SMS History**: Messages sent/received
- **Activity Log**: Audit trail

**Actions**: Edit, Delete, New Appointment, Send SMS, Create Invoice

#### C. Patient Form (New/Edit)
**Sections:**
1. Personal Information (name, DOB, sex, MRN)
2. Contact Information (mobile, email, address)
3. Emergency Contact
4. Flags/Alerts (JSON)
5. Notes

**Validation**: Required fields, format validation, duplicate checking

### 3.4 Appointment Management

#### A. Appointment List
- Table view with filters (date range, clinic, clinician, status)
- Calendar mini-view
- Quick status updates
- Export functionality

#### B. Appointment Detail/Form
**Fields:**
- Patient (searchable dropdown)
- Clinic (dropdown)
- Clinician (dropdown)
- Date & Time
- Duration
- Appointment Type
- Status (scheduled, confirmed, completed, cancelled, no-show)
- Notes
- Reminders (auto-SMS)

### 3.5 Clinician Management

#### A. Clinician List
- Table with active/inactive status
- Role filter
- Contact information

#### B. Clinician Detail
- Profile information
- Schedule/availability
- Appointment history
- Performance metrics

### 3.6 Clinic Management

#### A. Clinic List
- Cards or table view
- Active/inactive status
- Location, contact info

#### B. Clinic Detail
- Settings
- Operating hours
- Staff assigned
- Appointment types
- Equipment/resources

### 3.7 Reports & Analytics

**Report Types:**
- Appointment statistics (by clinic, clinician, date range)
- Patient statistics (new patients, active patients)
- Revenue reports (via Xero)
- SMS usage
- No-show rates

**Features:**
- Date range picker
- Filters
- Export (CSV, PDF)
- Charts/graphs

### 3.8 Integrations

#### A. Xero Integration
**Current**: ✅ OAuth connected
**UI Needs:**
- Connection status
- Sync controls (contacts, invoices)
- Sync logs
- Settings (default tracking categories, accounts)

#### B. SMS Management
**Current**: ✅ Sending working
**UI Needs:**
- Template management
- Send ad-hoc messages
- Message history
- Balance/usage monitoring
- Automated reminders configuration

### 3.9 Settings

**Sections:**
- User Profile
- Clinic Settings
- Appointment Settings (default duration, types, statuses)
- Integration Settings (Xero, SMS)
- Notification Preferences
- System Preferences (timezone, date format)

---

## 4. Component Library

### 4.1 Core UI Components (Mantine)

**Already Available:**
- AppShell, Header, Footer
- Button, ActionIcon
- TextInput, Select, Textarea, Checkbox, Radio
- Table, Pagination
- Modal, Drawer
- Tabs, Accordion
- Card, Paper
- Group, Stack, Grid
- Title, Text
- Badge, Avatar
- Notifications
- DatePicker, DateTimePicker
- Menu, Dropdown

### 4.2 Custom Components to Build

#### High Priority
1. **DataTable** - Enhanced Mantine Table with:
   - Sorting
   - Filtering
   - Pagination
   - Row selection
   - Actions menu
   - Empty state
   - Loading state

2. **SearchBar** - Unified search component:
   - Debounced input
   - Clear button
   - Search suggestions
   - Keyboard shortcuts

3. **StatusBadge** - Appointment/encounter status:
   - Color-coded
   - Icons
   - Tooltips

4. **ConfirmDialog** - Action confirmation:
   - Customizable message
   - Danger variants
   - Async handling

5. **EmptyState** - No data placeholder:
   - Icon
   - Message
   - Action button

6. **PatientSearch** - Autocomplete patient selector:
   - Fuzzy search (name, MRN)
   - Quick patient info preview
   - Create new patient option

7. **AppointmentModal** - Quick appointment view/edit:
   - Read-only view
   - Edit mode
   - Status updates
   - Notes

#### Medium Priority
8. **FilterPanel** - Reusable filter sidebar
9. **DateRangePicker** - Custom date range selector
10. **FileUpload** - S3 document upload
11. **ActivityTimeline** - Audit log display
12. **QuickActions** - Floating action button
13. **NotificationCenter** - In-app notifications

### 4.3 Form Components

**Strategy**: Use Mantine Forms or React Hook Form

**Common Patterns:**
- Form validation
- Error display
- Loading states
- Success feedback
- Dirty state tracking
- Auto-save (optional)

---

## 5. Design System

### 5.1 Color Palette

#### Brand Colors
```typescript
const colors = {
  primary: '#1971C2',    // Blue (Mantine blue.7)
  secondary: '#4DABF7',  // Light Blue
  success: '#51CF66',    // Green
  warning: '#FFA94D',    // Orange
  danger: '#FF6B6B',     // Red
  info: '#748FFC',       // Indigo
};
```

#### Clinic Colors (for Calendar)
```typescript
const clinicColors = [
  '#e74c3c', // Red
  '#3498db', // Blue
  '#2ecc71', // Green
  '#f39c12', // Orange
  '#9b59b6', // Purple
  '#1abc9c', // Teal
  '#34495e', // Dark Gray
];
```

#### Status Colors
```typescript
const statusColors = {
  scheduled: 'blue',
  confirmed: 'green',
  completed: 'gray',
  cancelled: 'red',
  'no-show': 'orange',
};
```

### 5.2 Typography

**Mantine Default Font Stack** (already configured):
- System fonts for performance
- Readable line heights
- Responsive font sizes

**Hierarchy:**
- `h1`: Page titles
- `h2`: Section headings
- `h3`: Subsections
- `body`: Content
- `caption`: Helper text

### 5.3 Spacing

**Mantine Spacing Scale**: `xs`, `sm`, `md`, `lg`, `xl`
- Consistent padding/margins
- Grid gaps

### 5.4 Dark Mode

**Current**: ✅ Implemented
- System preference detection
- Manual toggle
- Persistent preference (localStorage)
- FullCalendar dark mode styles

**Standards:**
- Light background: `#FFFFFF`
- Dark background: `#1A1B1E`
- Always test components in both modes

### 5.5 Icons

**Library**: Tabler Icons (Mantine default)
- Consistent style
- 24px default size
- Semantic usage

### 5.6 Shadows & Borders

- Use Mantine's `shadow` prop (`xs`, `sm`, `md`, `lg`, `xl`)
- Border radius: `sm` (default)
- Border colors: theme-aware

---

## 6. Data Flow & State Management

### 6.1 Server State (API Data)

**Options:**
1. **SWR** (Recommended for Next.js)
   - Built-in caching
   - Automatic revalidation
   - Optimistic updates

2. **React Query** (Alternative)
   - More features
   - DevTools

**API Client Pattern:**
```typescript
// lib/api.ts
const API_BASE = 'https://localhost:8000/api';

export const api = {
  patients: {
    list: () => fetch(`${API_BASE}/patients/`),
    get: (id) => fetch(`${API_BASE}/patients/${id}/`),
    create: (data) => fetch(`${API_BASE}/patients/`, { method: 'POST', ... }),
    update: (id, data) => fetch(`${API_BASE}/patients/${id}/`, { method: 'PATCH', ... }),
    delete: (id) => fetch(`${API_BASE}/patients/${id}/`, { method: 'DELETE' }),
  },
  // ... appointments, clinics, etc.
};
```

### 6.2 Client State (UI State)

**Simple cases**: React `useState`, `useContext`

**Complex cases**: Consider Zustand
- Dark mode preference
- User settings
- Filter states
- Modal states

### 6.3 Form State

**Mantine Form** (already integrated with Mantine UI)
- Form validation
- Error handling
- Field management

---

## 7. Responsive Design

### 7.1 Breakpoints (Mantine defaults)

- `xs`: 36em (576px)
- `sm`: 48em (768px)
- `md`: 62em (992px)
- `lg`: 75em (1200px)
- `xl`: 88em (1408px)

### 7.2 Mobile Considerations

**Priority Pages for Mobile:**
1. Calendar (view only, simplified)
2. Patient list & search
3. Patient detail (read-only)
4. Appointment list

**Desktop-First:**
- Complex forms (patient edit, encounter forms)
- Reports & analytics
- Multi-panel views

### 7.3 Responsive Patterns

- Stack on mobile, Grid on desktop
- Collapsible sidebar
- Mobile navigation (hamburger menu)
- Touch-friendly buttons (min 44px)

---

## 8. Accessibility

### 8.1 Standards

**Target**: WCAG 2.1 Level AA

**Key Requirements:**
- Keyboard navigation
- Screen reader support
- Color contrast (4.5:1 for normal text)
- Focus indicators
- ARIA labels
- Semantic HTML

### 8.2 Mantine Accessibility

**Built-in**:
- Accessible components
- Focus trap (modals)
- Keyboard shortcuts
- Proper ARIA attributes

**Our Responsibility:**
- Alt text for images
- Form labels
- Error announcements
- Skip links

---

## 9. Implementation Roadmap

### Phase 1: Foundation (Current)
✅ Project setup (Next.js, Mantine)
✅ Navigation component
✅ Dark mode
✅ Calendar module
✅ Basic API integration

### Phase 2: Core Components (Next)
🎯 **DataTable component**
🎯 **Patient list page**
🎯 **Patient detail page**
🎯 **Patient form (new/edit)**
🎯 **Dashboard page**

### Phase 3: Appointment Management
- Appointment list page
- Appointment form
- Appointment modal (quick view)
- Calendar integration

### Phase 4: Clinical Features
- Encounter form
- Encounter list
- Clinical notes
- Document upload (S3)

### Phase 5: Administration
- Clinician management
- Clinic settings
- User management
- Reports

### Phase 6: Integrations UI
- Xero sync UI
- SMS templates
- Automated reminders
- Invoice generation

### Phase 7: Polish
- Error boundaries
- Loading states
- Empty states
- Animations
- Performance optimization

---

## 10. Design Decisions & Questions

### To Decide:

1. **State Management**:
   - [ ] SWR vs React Query?
   - [ ] Need Zustand or just Context?

2. **Form Library**:
   - [ ] Mantine Form (simpler, integrated)
   - [ ] React Hook Form (more powerful)

3. **Table Component**:
   - [ ] Build custom on Mantine Table?
   - [ ] Use library (react-table, ag-grid)?

4. **Patient Detail Layout**:
   - [ ] Tabs (horizontal/vertical)?
   - [ ] Accordion?
   - [ ] Separate pages?

5. **Mobile Strategy**:
   - [ ] Responsive web app?
   - [ ] Separate mobile views?
   - [ ] Progressive Web App (PWA)?

6. **Authentication UI**:
   - [ ] Firebase UI widgets?
   - [ ] Custom login forms?
   - [ ] Magic links?

---

## 11. File Naming & Code Conventions

### 11.1 File Naming
- **Components**: PascalCase (e.g., `PatientCard.tsx`)
- **Pages**: lowercase (e.g., `page.tsx`, `[id]/page.tsx`)
- **Utils/Hooks**: camelCase (e.g., `usePatients.ts`, `formatDate.ts`)
- **Types**: PascalCase (e.g., `Patient.ts`)

### 11.2 Code Style
- **TypeScript**: Strict mode
- **Formatting**: Prettier (auto-format on save)
- **Linting**: ESLint
- **Props**: Interfaces for component props
- **Exports**: Named exports preferred (except pages)

### 11.3 Component Structure
```typescript
// 1. Imports
import { FC } from 'react';
import { Button } from '@mantine/core';

// 2. Types
interface MyComponentProps {
  title: string;
  onSubmit: () => void;
}

// 3. Component
export const MyComponent: FC<MyComponentProps> = ({ title, onSubmit }) => {
  // 4. Hooks
  const [state, setState] = useState();

  // 5. Handlers
  const handleClick = () => { /* ... */ };

  // 6. Render
  return (
    <div>
      {/* JSX */}
    </div>
  );
};
```

---

## 12. Performance Considerations

### 12.1 Optimization Strategies
- Code splitting (Next.js dynamic imports)
- Image optimization (next/image)
- Lazy loading (tables, images)
- Memoization (React.memo, useMemo, useCallback)
- Debounced search
- Virtualized lists (for large datasets)

### 12.2 Bundle Size
- Tree shaking
- Import only needed Mantine components
- Analyze bundle with `next/bundle-analyzer`

---

## 13. Testing Strategy

### 13.1 Testing Levels
1. **Unit Tests**: Components, utilities
2. **Integration Tests**: Page flows
3. **E2E Tests**: Critical user journeys

### 13.2 Tools (To Be Added)
- Jest + React Testing Library
- Playwright or Cypress (E2E)
- Storybook (component documentation)

---

## Next Steps

1. **Review & Approve** this framework
2. **Make key decisions** (Section 10)
3. **Start Phase 2**: Build core components
4. **Create component examples** in Storybook (optional)
5. **Build patient management UI** (highest priority)

---

**Last Updated**: October 30, 2025
**Status**: 🟡 Draft - Awaiting Review
**Owner**: Development Team

