// src/lib/api/api-client.ts
import { auth } from '@/lib/firebase/client-init';

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Authenticated fetch wrapper für API calls
 */
export async function authenticatedFetch(
  url: string, 
  options: RequestInit = {}
): Promise<Response> {
  const user = auth.currentUser;
  if (!user) {
    throw new ApiError('Not authenticated', 401, 'UNAUTHENTICATED');
  }
  
  // Get fresh token
  const token = await user.getIdToken();
  
  const response = await fetch(url, {
    ...options,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new ApiError(
      error.error || `Request failed with status ${response.status}`,
      response.status,
      error.code
    );
  }

  return response;
}

/**
 * Typed API methods
 */
export const apiClient = {
  async get<T>(url: string): Promise<T> {
    const response = await authenticatedFetch(url);
    return response.json();
  },

  async post<T>(url: string, data?: any): Promise<T> {
    const response = await authenticatedFetch(url, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
    return response.json();
  },

  async put<T>(url: string, data?: any): Promise<T> {
    const response = await authenticatedFetch(url, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
    return response.json();
  },

  async delete<T>(url: string): Promise<T> {
    const response = await authenticatedFetch(url, {
      method: 'DELETE',
    });
    return response.json();
  },

  async patch<T>(url: string, data?: any): Promise<T> {
    const response = await authenticatedFetch(url, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
    return response.json();
  }
};