// src/lib/api/mock-services.ts
// Mock Services für Build-Zeit und Tests

export const mockContactsService = {
  getContacts: async (orgId: string, userId?: string, params?: any) => ({
    contacts: [],
    total: 0
  }),
  getContactById: async (id: string, orgId: string) => null,
  createContact: async (data: any, orgId: string) => ({ id: 'mock-contact', ...data }),
  updateContact: async (id: string, data: any, orgId: string) => ({ id, ...data }),
  deleteContact: async (id: string, orgId: string) => undefined
};

export const mockCompanyService = {
  getCompanies: async (orgId: string, params?: any) => ({
    companies: [],
    total: 0
  }),
  getCompanyById: async (id: string, orgId: string) => null,
  createCompany: async (data: any, orgId: string) => ({ id: 'mock-company', ...data }),
  updateCompany: async (id: string, data: any, orgId: string) => ({ id, ...data }),
  deleteCompany: async (id: string, orgId: string) => undefined
};

export const mockPublicationsService = {
  getPublications: async (orgId: string, params?: any) => ({
    publications: [],
    total: 0
  }),
  getPublicationById: async (id: string, orgId: string) => null,
  createPublication: async (data: any, orgId: string, userId: string) => ({ id: 'mock-pub', ...data }),
  updatePublication: async (id: string, data: any, orgId: string, userId: string) => ({ id, ...data }),
  deletePublication: async (id: string, orgId: string, userId: string) => undefined,
  getMediaAssets: async (orgId: string, params?: any) => ({
    assets: [],
    total: 0
  })
};

export const mockWebhookService = {
  getWebhooks: async (orgId: string, params?: any) => ({
    webhooks: [],
    total: 0
  })
};

export const mockEventManager = {
  triggerEvent: async () => undefined,
  triggerContactEvent: async () => undefined,
  triggerCompanyEvent: async () => undefined,
  triggerPublicationEvent: async () => undefined
};

// Legacy validateAPIKey Mock f\u00fcr bestehende API Routes
export const validateAPIKey = async (request: any) => ({
  success: true,
  organizationId: 'mock-org',
  userId: 'mock-user',
  apiKeyId: 'mock-api-key',
  error: null
});

export const mockValidateAPIKey = validateAPIKey;