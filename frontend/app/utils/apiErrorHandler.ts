/**
 * Comprehensive API Error Handler
 * Provides detailed error logging and user notifications for all API calls
 */

import { notifications } from '@mantine/notifications';

interface ApiErrorDetails {
  url: string;
  method: string;
  status?: number;
  statusText?: string;
  error?: string;
  requestBody?: any;
  patientId?: string;
  fieldName?: string;
}

/**
 * Log API request details for debugging
 */
export function logApiRequest(details: {
  fieldName: string;
  url: string;
  method: string;
  body?: any;
  context?: any;
}) {
  console.group(`🔄 API Request: ${details.fieldName}`);
  console.log('Method:', details.method);
  console.log('URL:', details.url);
  if (details.body) {
    console.log('Body:', details.body);
  }
  if (details.context) {
    console.log('Context:', details.context);
  }
  console.groupEnd();
}

/**
 * Log API response details
 */
export function logApiResponse(details: {
  fieldName: string;
  status: number;
  statusText: string;
  data?: any;
}) {
  const emoji = details.status >= 200 && details.status < 300 ? '✅' : '❌';
  console.group(`${emoji} API Response: ${details.fieldName}`);
  console.log('Status:', details.status, details.statusText);
  if (details.data) {
    console.log('Data:', details.data);
  }
  console.groupEnd();
}

/**
 * Handle API errors with detailed logging and user notifications
 */
export async function handleApiError(
  error: any,
  context: ApiErrorDetails
): Promise<void> {
  console.group(`❌ API Error: ${context.fieldName || 'Unknown Field'}`);
  console.error('Error Details:', {
    url: context.url,
    method: context.method,
    status: context.status,
    statusText: context.statusText,
    error: context.error || error.message,
    requestBody: context.requestBody,
  });
  
  // Detailed error diagnosis
  if (context.status === 404) {
    console.error('🔴 404 NOT FOUND - Possible causes:');
    console.error('  1. Django server not running (check: ./status-dev.sh)');
    console.error('  2. Invalid patient/resource ID:', context.patientId);
    console.error('  3. URL routing issue - endpoint not registered');
    console.error('  4. Check URL:', context.url);
  } else if (context.status === 403) {
    console.error('🔴 403 FORBIDDEN - Possible causes:');
    console.error('  1. CSRF token missing or invalid');
    console.error('  2. User not authenticated');
    console.error('  3. Insufficient permissions');
  } else if (context.status === 400) {
    console.error('🔴 400 BAD REQUEST - Possible causes:');
    console.error('  1. Invalid data format');
    console.error('  2. Missing required fields');
    console.error('  3. Validation error');
    console.error('  4. Error message:', context.error);
  } else if (context.status === 500) {
    console.error('🔴 500 SERVER ERROR - Possible causes:');
    console.error('  1. Backend exception');
    console.error('  2. Database error');
    console.error('  3. Check Django logs');
  } else if (!context.status) {
    console.error('🔴 NETWORK ERROR - Possible causes:');
    console.error('  1. Django server not running');
    console.error('  2. HTTPS certificate not accepted');
    console.error('  3. CORS issue');
    console.error('  4. Network connectivity problem');
  }
  
  console.groupEnd();
  
  // User-friendly notification
  const userMessage = getUserFriendlyErrorMessage(context);
  notifications.show({
    title: 'Error',
    message: userMessage,
    color: 'red',
    autoClose: 5000,
  });
}

/**
 * Get user-friendly error message based on error type
 */
function getUserFriendlyErrorMessage(context: ApiErrorDetails): string {
  const fieldName = context.fieldName || 'field';
  
  if (context.status === 404) {
    return `Failed to save ${fieldName}: Server endpoint not found. Is Django running?`;
  } else if (context.status === 403) {
    return `Failed to save ${fieldName}: Permission denied. Please log in again.`;
  } else if (context.status === 400) {
    return `Failed to save ${fieldName}: ${context.error || 'Invalid data'}`;
  } else if (context.status === 500) {
    return `Failed to save ${fieldName}: Server error. Check logs.`;
  } else if (!context.status) {
    return `Failed to save ${fieldName}: Cannot connect to server. Is Django running?`;
  }
  
  return `Failed to save ${fieldName}: ${context.error || 'Unknown error'}`;
}

/**
 * Make an API request with comprehensive error handling
 */
export async function makeApiRequest<T = any>(
  url: string,
  options: RequestInit & {
    fieldName?: string;
    context?: any;
    showSuccessNotification?: boolean;
    successMessage?: string;
  }
): Promise<{ success: boolean; data?: T; error?: string }> {
  const fieldName = options.fieldName || 'Unknown';
  
  try {
    // Log request
    logApiRequest({
      fieldName,
      url,
      method: options.method || 'GET',
      body: options.body ? JSON.parse(options.body as string) : undefined,
      context: options.context,
    });
    
    // Make request
    const response = await fetch(url, options);
    
    // Log response
    logApiResponse({
      fieldName,
      status: response.status,
      statusText: response.statusText,
    });
    
    // Handle response
    if (response.ok) {
      const data = await response.json().catch(() => null);
      
      // Show success notification if requested
      if (options.showSuccessNotification !== false) {
        notifications.show({
          title: 'Success',
          message: options.successMessage || `${fieldName} saved`,
          color: 'green',
          autoClose: 2000,
        });
      }
      
      return { success: true, data };
    } else {
      // Handle error response
      const errorText = await response.text().catch(() => 'Unknown error');
      
      await handleApiError(new Error(errorText), {
        url,
        method: options.method || 'GET',
        status: response.status,
        statusText: response.statusText,
        error: errorText,
        fieldName,
        requestBody: options.body ? JSON.parse(options.body as string) : undefined,
      });
      
      return { success: false, error: errorText };
    }
  } catch (error: any) {
    // Handle network errors
    await handleApiError(error, {
      url,
      method: options.method || 'GET',
      error: error.message,
      fieldName,
      requestBody: options.body ? JSON.parse(options.body as string) : undefined,
    });
    
    return { success: false, error: error.message };
  }
}

/**
 * Quick helper for PATCH requests
 */
export async function patchRequest<T = any>(
  url: string,
  data: any,
  options?: {
    fieldName?: string;
    csrfToken?: string;
    showSuccessNotification?: boolean;
    successMessage?: string;
  }
): Promise<{ success: boolean; data?: T; error?: string }> {
  return makeApiRequest<T>(url, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...(options?.csrfToken && { 'X-CSRFToken': options.csrfToken }),
    },
    credentials: 'include',
    body: JSON.stringify(data),
    fieldName: options?.fieldName,
    showSuccessNotification: options?.showSuccessNotification,
    successMessage: options?.successMessage,
  });
}

/**
 * Quick helper for POST requests
 */
export async function postRequest<T = any>(
  url: string,
  data: any,
  options?: {
    fieldName?: string;
    csrfToken?: string;
    showSuccessNotification?: boolean;
    successMessage?: string;
  }
): Promise<{ success: boolean; data?: T; error?: string }> {
  return makeApiRequest<T>(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(options?.csrfToken && { 'X-CSRFToken': options.csrfToken }),
    },
    credentials: 'include',
    body: JSON.stringify(data),
    fieldName: options?.fieldName,
    showSuccessNotification: options?.showSuccessNotification,
    successMessage: options?.successMessage,
  });
}

/**
 * Quick helper for PUT requests
 */
export async function putRequest<T = any>(
  url: string,
  data: any,
  options?: {
    fieldName?: string;
    csrfToken?: string;
    showSuccessNotification?: boolean;
    successMessage?: string;
  }
): Promise<{ success: boolean; data?: T; error?: string }> {
  return makeApiRequest<T>(url, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...(options?.csrfToken && { 'X-CSRFToken': options.csrfToken }),
    },
    credentials: 'include',
    body: JSON.stringify(data),
    fieldName: options?.fieldName,
    showSuccessNotification: options?.showSuccessNotification,
    successMessage: options?.successMessage,
  });
}

/**
 * Quick helper for DELETE requests
 */
export async function deleteRequest(
  url: string,
  options?: {
    fieldName?: string;
    csrfToken?: string;
    showSuccessNotification?: boolean;
    successMessage?: string;
  }
): Promise<{ success: boolean; error?: string }> {
  return makeApiRequest(url, {
    method: 'DELETE',
    headers: {
      ...(options?.csrfToken && { 'X-CSRFToken': options.csrfToken }),
    },
    credentials: 'include',
    fieldName: options?.fieldName,
    showSuccessNotification: options?.showSuccessNotification,
    successMessage: options?.successMessage,
  });
}

