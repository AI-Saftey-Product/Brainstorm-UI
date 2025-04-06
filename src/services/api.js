// API service using native fetch instead of axios

// Use environment variable for API URL
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

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
        
        throw customError;
      }
      
      // Check if response is empty
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return response.json();
      }
      
      return response.text();
    } catch (error) {
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