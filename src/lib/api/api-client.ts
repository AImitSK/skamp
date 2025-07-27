// src/lib/api/api-client.ts
import { auth } from '@/lib/firebase/client-init';
import { 
  EmailAddress, 
  EmailAddressFormData
} from '@/types/email-enhanced';

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

/**
 * E-Mail-Adressen API Endpoints
 */
export const emailAddressApi = {
  /**
   * Holt alle E-Mail-Adressen der Organisation
   */
  async getAll(): Promise<{ emailAddresses: EmailAddress[] }> {
    return apiClient.get<{ emailAddresses: EmailAddress[] }>('/api/email/addresses');
  },

  /**
   * Holt eine einzelne E-Mail-Adresse
   */
  async get(id: string): Promise<{ emailAddress: EmailAddress }> {
    return apiClient.get<{ emailAddress: EmailAddress }>(`/api/email/addresses/${id}`);
  },

  /**
   * Erstellt eine neue E-Mail-Adresse
   */
  async create(data: EmailAddressFormData): Promise<{ emailAddress: EmailAddress; message: string }> {
    return apiClient.post<{ emailAddress: EmailAddress; message: string }>('/api/email/addresses', data);
  },

  /**
   * Aktualisiert eine E-Mail-Adresse
   */
  async update(id: string, data: Partial<EmailAddressFormData>): Promise<{ emailAddress: EmailAddress; message: string }> {
    return apiClient.put<{ emailAddress: EmailAddress; message: string }>(`/api/email/addresses/${id}`, data);
  },

  /**
   * Löscht eine E-Mail-Adresse
   */
  async delete(id: string): Promise<{ message: string }> {
    return apiClient.delete<{ message: string }>(`/api/email/addresses/${id}`);
  },

  /**
   * Setzt eine E-Mail-Adresse als Standard
   */
  async setAsDefault(id: string): Promise<{ message: string }> {
    return apiClient.patch<{ message: string }>(`/api/email/addresses/${id}`, { 
      action: 'setDefault' 
    });
  },

  /**
   * Routing-Regeln API
   */
  routing: {
    /**
     * Holt alle Routing-Regeln einer E-Mail-Adresse
     */
    async getAll(emailId: string): Promise<{ routingRules: RoutingRule[]; count: number }> {
      return apiClient.get<{ routingRules: RoutingRule[]; count: number }>(
        `/api/email/addresses/${emailId}/routing-rules`
      );
    },

    /**
     * Fügt eine neue Routing-Regel hinzu
     */
    async create(emailId: string, rule: Omit<RoutingRule, 'id'>): Promise<{ rule: RoutingRule; message: string }> {
      return apiClient.post<{ rule: RoutingRule; message: string }>(
        `/api/email/addresses/${emailId}/routing-rules`,
        rule
      );
    },

    /**
     * Aktualisiert eine Routing-Regel
     */
    async update(emailId: string, ruleId: string, rule: Partial<RoutingRule>): Promise<{ rule: RoutingRule; message: string }> {
      return apiClient.put<{ rule: RoutingRule; message: string }>(
        `/api/email/addresses/${emailId}/routing-rules/${ruleId}`,
        rule
      );
    },

    /**
     * Löscht eine Routing-Regel
     */
    async delete(emailId: string, ruleId: string): Promise<{ message: string }> {
      return apiClient.delete<{ message: string }>(
        `/api/email/addresses/${emailId}/routing-rules/${ruleId}`
      );
    }
  },

  /**
   * Statistiken API
   */
  stats: {
    /**
     * Holt Statistiken einer E-Mail-Adresse
     */
    async get(emailId: string): Promise<{ stats: EmailAddressStats }> {
      return apiClient.get<{ stats: EmailAddressStats }>(`/api/email/addresses/${emailId}/stats`);
    },

    /**
     * Aktualisiert Statistiken (für interne Nutzung)
     */
    async update(emailId: string, type: 'sent' | 'received'): Promise<{ message: string }> {
      return apiClient.post<{ message: string }>(`/api/email/addresses/${emailId}/stats`, { type });
    }
  }
};

// Type für Routing Rule
interface RoutingRule {
  id: string;
  name: string;
  conditions: {
    subject?: string;
    from?: string;
    keywords?: string[];
  };
  actions: {
    assignTo?: string[];
    addTags?: string[];
    setPriority?: 'low' | 'normal' | 'high';
    autoReply?: string;
  };
}

// Type für EmailAddress Statistiken
interface EmailAddressStats {
  emailsSent: number;
  emailsReceived: number;
  lastUsedAt: string | null;
  isActive: boolean;
  createdAt: string;
}