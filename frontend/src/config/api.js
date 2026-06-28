/**
 * API Configuration
 * 
 * The backend URL can be configured via environment variable:
 * - NEXT_PUBLIC_API_URL: Full backend URL (e.g., http://localhost:8000)
 * 
 * Default: http://localhost:8000
 */

const getApiUrl = () => {
  // Check for explicit API URL
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  
  // Fallback to REACT_APP_BACKEND_URL for backward compatibility
  if (process.env.REACT_APP_BACKEND_URL) {
    return process.env.REACT_APP_BACKEND_URL;
  }
  
  // Default URL
  return 'http://localhost:8000';
};

export const API_URL = getApiUrl();

// Export a function to get the API URL (useful for dynamic access)
export const getApiBaseUrl = () => API_URL;

