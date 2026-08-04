const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export const api = {
  get: async (endpoint: string) => {
    const token = localStorage.getItem('token');
    if (!token) throw new Error('No authentication token');
    
    const response = await fetch(`${API_URL}${endpoint}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'API request failed' }));
      throw new Error(error.error || 'API request failed');
    }
    return response.json();
  },

  post: async (endpoint: string, data: any) => {
    const token = localStorage.getItem('token');
    if (!token) throw new Error('No authentication token');
    
    const response = await fetch(`${API_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'API request failed' }));
      throw new Error(error.error || 'API request failed');
    }
    return response.json();
  },

  put: async (endpoint: string, data: any) => {
    const token = localStorage.getItem('token');
    if (!token) throw new Error('No authentication token');
    
    const response = await fetch(`${API_URL}${endpoint}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'API request failed' }));
      throw new Error(error.error || 'API request failed');
    }
    return response.json();
  },

  patch: async (endpoint: string, data?: any) => {
    const token = localStorage.getItem('token');
    if (!token) throw new Error('No authentication token');
    
    const response = await fetch(`${API_URL}${endpoint}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: data ? JSON.stringify(data) : undefined,
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'API request failed' }));
      throw new Error(error.error || 'API request failed');
    }
    return response.json();
  },

  del: async (endpoint: string) => {
    const token = localStorage.getItem('token');
    if (!token) throw new Error('No authentication token');
    
    const response = await fetch(`${API_URL}${endpoint}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'API request failed' }));
      throw new Error(error.error || 'API request failed');
    }
    return response.json();
  },
};