/**
 * API Service
 * Handles API requests and responses
 */

// Use environment variable for API URL
export const API_URL = import.meta.env.VITE_API_URL || 'https://16.171.112.40/api';
console.log('Using API URL:', API_URL);

// Function to ensure HTTPS in production
function getSecureUrl(url) {
  const isProduction = import.meta.env.PROD;
  if (isProduction && url.startsWith('http:')) {
    return url.replace('http:', 'https:');
  }
  return url;
}

// Generic fetch function with error handling
export const fetchApi = async (url, options = {}) => {
  try {
    const secureUrl = getSecureUrl(url);
    console.log('Fetching API:', {
      originalUrl: url,
      secureUrl,
      method: options.method || 'GET'
    });
    
    const fetchOptions = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      // Bypass SSL certificate verification (only for development)
      mode: 'cors',
      credentials: 'include',
      rejectUnauthorized: false,
    };
    
    const response = await fetch(secureUrl, fetchOptions);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('API request failed:', error);
    throw error;
  }
};

// Export a configured fetch function that includes the API URL
export const apiFetch = async (path, options = {}) => {
  const url = path.startsWith('http') ? path : `${API_URL}${path}`;
  return fetchApi(url, options);
};

/**
 * Custom fetch wrapper with interceptors
 */
const api = {
  async request(url, options = {}) {
    // Set default headers
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    // Add auth token if available
    const token = localStorage.getItem('token');
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    // Prepare the request options
    const fetchOptions = {
      ...options,
      headers,
      // Bypass SSL certificate verification (only for development)
      mode: 'cors',
      credentials: 'include',
      rejectUnauthorized: false,
    };

    try {
      const response = await fetch(`${API_URL}${url}`, fetchOptions);
      
      // Handle response
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const customError = {
          status: response.status,
          message: errorData.message || 'Something went wrong',
          data: errorData,
        };
        
        // Log errors in development
        if (import.meta.env.DEV) {
          console.error('API Error:', customError);
        }
        
        throw customError;
      }
      
      // Check if response is empty
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return response.json();
      }
      
      return response.text();
    } catch (error) {
      // Log errors in development
      if (import.meta.env.DEV && !error.status) {
        console.error('API Error:', error);
      }
      
      throw error;
    }
  },

  // GET request
  get(url, options = {}) {
    return this.request(url, { ...options, method: 'GET' });
  },

  // POST request
  post(url, data, options = {}) {
    return this.request(url, {
      ...options,
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // PUT request
  put(url, data, options = {}) {
    return this.request(url, {
      ...options,
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  // PATCH request
  patch(url, data, options = {}) {
    return this.request(url, {
      ...options,
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  // DELETE request
  delete(url, options = {}) {
    return this.request(url, { ...options, method: 'DELETE' });
  },
};

export default api;