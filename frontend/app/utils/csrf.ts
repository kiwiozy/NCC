/**
 * CSRF Token Helper
 * 
 * Provides utility functions for handling CSRF tokens in API requests.
 * Required for all POST, PUT, PATCH, DELETE requests to Django backend.
 */

/**
 * Get CSRF token from cookie or fetch from backend
 * 
 * @returns Promise<string> - CSRF token
 */
export const getCsrfToken = async (): Promise<string> => {
  // Try to get from cookie first
  const cookieValue = document.cookie
    .split('; ')
    .find(row => row.startsWith('csrftoken='))
    ?.split('=')[1];
  
  if (cookieValue) {
    return cookieValue;
  }
  
  // If not in cookie, fetch from backend
  try {
    const response = await fetch('https://localhost:8000/api/auth/csrf-token/', {
      credentials: 'include',
    });
    if (response.ok) {
      const data = await response.json();
      return data.csrfToken || '';
    }
  } catch (error) {
    console.error('Failed to fetch CSRF token:', error);
  }
  
  return '';
};

/**
 * Get headers with CSRF token for mutation requests
 * 
 * @returns Promise<Record<string, string>> - Headers object with CSRF token
 */
export const getCsrfHeaders = async (): Promise<Record<string, string>> => {
  const csrfToken = await getCsrfToken();
  return {
    'X-CSRFToken': csrfToken,
  };
};

/**
 * Get headers with CSRF token and Content-Type for JSON requests
 * 
 * @returns Promise<Record<string, string>> - Headers object with CSRF token and Content-Type
 */
export const getCsrfJsonHeaders = async (): Promise<Record<string, string>> => {
  const csrfToken = await getCsrfToken();
  return {
    'Content-Type': 'application/json',
    'X-CSRFToken': csrfToken,
  };
};

