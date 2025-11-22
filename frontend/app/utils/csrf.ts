/**
 * Fetch CSRF token from Django backend
 * Used for authenticated POST/PUT/PATCH/DELETE requests
 */
export async function getCsrfToken(): Promise<string> {
  try {
    const response = await fetch('https://localhost:8000/api/auth/csrf-token/', {
      credentials: 'include',
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch CSRF token');
    }
    
    const data = await response.json();
    return data.csrfToken || '';
  } catch (error) {
    console.error('Error fetching CSRF token:', error);
    return '';
  }
}
