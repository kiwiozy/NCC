/**
 * Centralized API Configuration
 * 
 * Uses environment variables for different environments:
 * - Development: NEXT_PUBLIC_API_URL (defaults to https://localhost:8000)
 * - Production: NEXT_PUBLIC_API_URL (set to production backend URL)
 */

const getApiUrl = (): string => {
  // Check if we're in the browser
  if (typeof window === 'undefined') {
    // Server-side: use environment variable or default
    return process.env.NEXT_PUBLIC_API_URL || 'https://localhost:8000';
  }
  
  // Client-side: use environment variable or default
  return process.env.NEXT_PUBLIC_API_URL || 'https://localhost:8000';
};

export const API_BASE_URL = getApiUrl();

/**
 * Helper function to build API endpoints
 */
export const apiUrl = (endpoint: string): string => {
  // Remove leading slash if present (we'll add it)
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${API_BASE_URL}${cleanEndpoint}`;
};

/**
 * Common API endpoints
 */
export const API_ENDPOINTS = {
  // Auth
  auth: {
    user: apiUrl('/api/auth/user/'),
    login: apiUrl('/api/auth/login/'),
    logout: apiUrl('/api/auth/logout/'),
  },
  
  // Patients
  patients: apiUrl('/api/patients/'),
  patient: (id: string) => apiUrl(`/api/patients/${id}/`),
  
  // Referrers
  referrers: apiUrl('/api/referrers/'),
  referrer: (id: string) => apiUrl(`/api/referrers/${id}/`),
  
  // Appointments
  appointments: apiUrl('/api/appointments/'),
  appointment: (id: string) => apiUrl(`/api/appointments/${id}/`),
  
  // Documents
  documents: apiUrl('/api/documents/'),
  document: (id: string) => apiUrl(`/api/documents/${id}/`),
  documentDownload: (id: string) => apiUrl(`/api/documents/${id}/download_url/`),
  
  // Gmail
  gmail: {
    connectedAccounts: apiUrl('/gmail/connected-accounts/'),
    sendEmail: apiUrl('/gmail/send-email/'),
  },
  
  // Xero
  xero: {
    connect: apiUrl('/xero/oauth/connect/'),
    callback: apiUrl('/xero/oauth/callback'),
    contacts: apiUrl('/xero/contacts/'),
  },
  
  // SMS
  sms: {
    send: apiUrl('/api/sms/send/'),
    history: apiUrl('/api/sms/history/'),
  },
};

