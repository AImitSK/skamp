// src/lib/api/contacts-api-service.ts
/**
 * Contacts API Service
 * Business Logic für Contacts API-Endpunkte
 * Nutzt bestehende CrmServiceEnhanced für Firestore-Operationen
 */

// Build-Safe Imports für API Services
let contactsEnhancedService: any;
let companyServiceEnhanced: any;

try {
  const crmModule = require('@/lib/firebase/crm-service-enhanced');
  const companyModule = require('@/lib/firebase/company-service-enhanced');
  
  contactsEnhancedService = crmModule.contactsEnhancedService;
  companyServiceEnhanced = companyModule.companyServiceEnhanced;
} catch (error) {
  // Mock services für Build-Zeit
  contactsEnhancedService = {
    getAll: async () => [],
    get: async () => null,
    create: async () => 'mock-id',
    update: async () => ({}),
    delete: async () => undefined
  };
  companyServiceEnhanced = {
    get: async () => null
  };
}
import { 
  ContactCreateRequest, 
  ContactUpdateRequest, 
  ContactListParams,
  ContactAPIResponse,
  BulkContactCreateRequest,
  BulkOperationResponse
} from '@/types/api-crm';
import { ContactEnhanced } from '@/types/crm-enhanced';
import { APIError, API_ERROR_CODES, APIResponse } from '@/types/api';
import { QueryOptions, FilterOptions } from '@/lib/firebase/service-base';

export class ContactsAPIService {
  
  /**
   * Hole Liste von Kontakten mit Filterung und Pagination
   */
  async getContacts(
    organizationId: string,
    userId: string,
    params: ContactListParams = {}
  ): Promise<{
    contacts: ContactAPIResponse[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      hasNext: boolean;
      hasPrevious: boolean;
    };
  }> {
    try {
      // Parse Pagination
      const page = Math.max(1, params.page || 1);
      const limit = Math.min(100, Math.max(1, params.limit || 25));
      const offset = (page - 1) * limit;

      // Build Filter Options
      const filterOptions: FilterOptions = {};
      
      if (params.search) {
        filterOptions.search = params.search;
      }
      
      if (params.tags) {
        filterOptions.tags = Array.isArray(params.tags) ? params.tags : [params.tags];
      }
      
      if (params.companyId) {
        filterOptions.companyId = params.companyId;
      }
      
      if (params.country) {
        filterOptions.country = params.country;
      }
      
      if (params.city) {
        filterOptions.city = params.city;
      }
      
      if (params.isActive !== undefined) {
        filterOptions.isActive = params.isActive;
      }
      
      // Date range filters
      if (params.createdAfter) {
        filterOptions.createdAfter = new Date(params.createdAfter);
      }
      
      if (params.createdBefore) {
        filterOptions.createdBefore = new Date(params.createdBefore);
      }

      // Query Options
      const queryOptions: QueryOptions = {
        limit,
        offset,
        sortBy: params.sortBy || 'updatedAt',
        sortOrder: params.sortOrder || 'desc',
        filters: filterOptions
      };

      // Get contacts from service
      const contacts = await contactsEnhancedService.getAll(
        organizationId,
        queryOptions
      );
      const total = contacts.length;

      // Transform to API Response format
      const apiContacts = await Promise.all(
        contacts.map(contact => this.transformContactToAPIResponse(contact, organizationId))
      );

      return {
        contacts: apiContacts,
        pagination: {
          page,
          limit,
          total,
          hasNext: offset + limit < total,
          hasPrevious: page > 1
        }
      };
    } catch (error) {
      console.error('Error getting contacts:', error);
      throw new APIError(
        500,
        API_ERROR_CODES.DATABASE_ERROR,
        'Failed to retrieve contacts'
      );
    }
  }

  /**
   * Hole spezifischen Kontakt
   */
  async getContact(
    contactId: string,
    organizationId: string,
    userId: string
  ): Promise<ContactAPIResponse> {
    try {
      const contact = await contactsEnhancedService.getById(contactId, organizationId);
      
      if (!contact) {
        throw new APIError(
          404,
          API_ERROR_CODES.RESOURCE_NOT_FOUND,
          'Contact not found'
        );
      }

      return await this.transformContactToAPIResponse(contact, organizationId);
    } catch (error) {
      if (error instanceof APIError) throw error;
      
      console.error('Error getting contact:', error);
      throw new APIError(
        500,
        API_ERROR_CODES.DATABASE_ERROR,
        'Failed to retrieve contact'
      );
    }
  }

  /**
   * Erstelle neuen Kontakt
   */
  async createContact(
    data: ContactCreateRequest,
    organizationId: string,
    userId: string
  ): Promise<ContactAPIResponse> {
    try {
      // Validierung
      this.validateContactCreateRequest(data);
      
      // Prüfe ob E-Mail bereits existiert
      if (data.email) {
        const existingContact = await this.findContactByEmail(data.email, organizationId);
        if (existingContact) {
          throw new APIError(
            409,
            API_ERROR_CODES.RESOURCE_CONFLICT,
            'Contact with this email already exists'
          );
        }
      }
      
      // Transform API request zu CRM Service format
      const contactData = await this.transformAPIRequestToContact(data, organizationId, userId);
      
      // Erstelle Kontakt
      const createdContact = await contactsEnhancedService.create(
        contactData,
        { organizationId, userId }
      );

      return await this.transformContactToAPIResponse(createdContact, organizationId);
    } catch (error) {
      if (error instanceof APIError) throw error;
      
      console.error('Error creating contact:', error);
      throw new APIError(
        500,
        API_ERROR_CODES.DATABASE_ERROR,
        'Failed to create contact'
      );
    }
  }

  /**
   * Aktualisiere Kontakt
   */
  async updateContact(
    contactId: string,
    data: ContactUpdateRequest,
    organizationId: string,
    userId: string
  ): Promise<ContactAPIResponse> {
    try {
      // Prüfe ob Kontakt existiert
      const existingContact = await contactsEnhancedService.getById(contactId, organizationId);
      if (!existingContact) {
        throw new APIError(
          404,
          API_ERROR_CODES.RESOURCE_NOT_FOUND,
          'Contact not found'
        );
      }

      // Prüfe E-Mail-Duplikate (wenn E-Mail geändert wird)
      if (data.email && data.email !== existingContact.email) {
        const duplicateContact = await this.findContactByEmail(data.email, organizationId);
        if (duplicateContact && duplicateContact.id !== contactId) {
          throw new APIError(
            409,
            API_ERROR_CODES.RESOURCE_CONFLICT,
            'Another contact with this email already exists'
          );
        }
      }

      // Transform Update-Daten
      const updateData = await this.transformAPIUpdateToContact(data, organizationId, userId);
      
      // Update Kontakt
      const updatedContact = await contactsEnhancedService.update(
        contactId,
        updateData,
        { organizationId, userId }
      );

      return await this.transformContactToAPIResponse(updatedContact, organizationId);
    } catch (error) {
      if (error instanceof APIError) throw error;
      
      console.error('Error updating contact:', error);
      throw new APIError(
        500,
        API_ERROR_CODES.DATABASE_ERROR,
        'Failed to update contact'
      );
    }
  }

  /**
   * Lösche Kontakt
   */
  async deleteContact(
    contactId: string,
    organizationId: string,
    userId: string
  ): Promise<void> {
    try {
      // Prüfe ob Kontakt existiert
      const existingContact = await contactsEnhancedService.getById(contactId, organizationId);
      if (!existingContact) {
        throw new APIError(
          404,
          API_ERROR_CODES.RESOURCE_NOT_FOUND,
          'Contact not found'
        );
      }

      // Soft delete (in CRM Service implementiert)
      await contactsEnhancedService.softDelete(contactId, { organizationId, userId });
    } catch (error) {
      if (error instanceof APIError) throw error;
      
      console.error('Error deleting contact:', error);
      throw new APIError(
        500,
        API_ERROR_CODES.DATABASE_ERROR,
        'Failed to delete contact'
      );
    }
  }

  /**
   * Bulk Contact Creation
   */
  async createContactsBulk(
    request: BulkContactCreateRequest,
    organizationId: string,
    userId: string
  ): Promise<BulkOperationResponse<ContactAPIResponse>> {
    const startTime = Date.now();
    const results: BulkOperationResponse<ContactAPIResponse>['results'] = [];
    
    let successfulItems = 0;
    let failedItems = 0;

    for (let i = 0; i < request.contacts.length; i++) {
      const contactData = request.contacts[i];
      
      try {
        const createdContact = await this.createContact(contactData, organizationId, userId);
        results.push({
          index: i,
          success: true,
          data: createdContact
        });
        successfulItems++;
      } catch (error) {
        const errorResult = {
          index: i,
          success: false,
          error: {
            code: error instanceof APIError ? error.errorCode : API_ERROR_CODES.INTERNAL_SERVER_ERROR,
            message: error instanceof Error ? error.message : 'Unknown error'
          }
        };
        results.push(errorResult);
        failedItems++;

        // Stop processing if continueOnError is false
        if (!request.continueOnError) {
          break;
        }
      }
    }

    const endTime = Date.now();
    const duration = endTime - startTime;

    return {
      success: failedItems === 0,
      totalItems: request.contacts.length,
      processedItems: results.length,
      successfulItems,
      failedItems,
      results,
      summary: {
        duration,
        averageTimePerItem: duration / results.length
      }
    };
  }

  /**
   * Private Helper Methods
   */

  private validateContactCreateRequest(data: ContactCreateRequest): void {
    if (!data.firstName?.trim()) {
      throw new APIError(
        400,
        API_ERROR_CODES.REQUIRED_FIELD_MISSING,
        'firstName is required'
      );
    }

    if (!data.lastName?.trim()) {
      throw new APIError(
        400,
        API_ERROR_CODES.REQUIRED_FIELD_MISSING,
        'lastName is required'
      );
    }

    if (data.email && !this.isValidEmail(data.email)) {
      throw new APIError(
        400,
        API_ERROR_CODES.VALIDATION_ERROR,
        'Invalid email format'
      );
    }
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private async findContactByEmail(
    email: string, 
    organizationId: string
  ): Promise<ContactEnhanced | null> {
    try {
      const contacts = await contactsEnhancedService.getAll(
        organizationId,
        {
          filters: { 
            search: email 
          },
          limit: 1
        }
      );
      
      return contacts.find(c => c.email?.toLowerCase() === email.toLowerCase()) || null;
    } catch (error) {
      return null;
    }
  }

  private async transformContactToAPIResponse(
    contact: ContactEnhanced, 
    organizationId: string
  ): Promise<ContactAPIResponse> {
    // Populate company if companyId exists
    let companyInfo;
    if (contact.companyId) {
      try {
        const company = await companyServiceEnhanced.get(contact.companyId, organizationId);
        if (company) {
          companyInfo = {
            id: company.id!,
            name: company.name,
            domain: company.website ? new URL(company.website).hostname : undefined,
            industry: company.industry
          };
        }
      } catch (error) {
        // Company not found or error - continue without company info
      }
    }

    return {
      id: contact.id!,
      firstName: contact.name?.firstName,
      lastName: contact.name?.lastName,
      fullName: `${contact.name?.firstName || ''} ${contact.name?.lastName || ''}`.trim(),
      email: contact.email,
      phone: contact.phone,
      jobTitle: contact.jobTitle,
      department: contact.department,
      
      company: companyInfo,
      
      address: contact.address ? {
        ...contact.address,
        formatted: this.formatAddress(contact.address)
      } : undefined,
      
      linkedinUrl: contact.linkedinUrl,
      twitterHandle: contact.twitterHandle,
      website: contact.website,
      
      mediaOutlets: contact.mediaOutlets || [],
      expertise: contact.expertise || [],
      tags: (contact.tags || []).map(tag => ({
        name: typeof tag === 'string' ? tag : tag.name,
        color: typeof tag === 'object' && tag.color ? tag.color : undefined
      })),
      
      preferredContactMethod: contact.preferredContactMethod,
      communicationFrequency: contact.communicationFrequency,
      lastContactAt: contact.lastContactAt?.toDate?.()?.toISOString(),
      
      notes: contact.notes,
      
      isActive: contact.isActive !== false,
      createdAt: contact.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
      updatedAt: contact.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
      
      // Computed fields
      contactScore: this.calculateContactScore(contact),
      recentActivity: [] // TODO: Implement activity tracking
    };
  }

  private async transformAPIRequestToContact(
    data: ContactCreateRequest,
    organizationId: string,
    userId: string
  ): Promise<Omit<ContactEnhanced, 'id' | 'createdAt' | 'updatedAt'>> {
    return {
      name: {
        firstName: data.firstName.trim(),
        lastName: data.lastName.trim()
      },
      email: data.email?.trim(),
      phone: data.phone?.trim(),
      jobTitle: data.jobTitle?.trim(),
      department: data.department?.trim(),
      
      companyId: data.companyId,
      
      address: data.address,
      
      linkedinUrl: data.linkedinUrl?.trim(),
      twitterHandle: data.twitterHandle?.trim(),
      website: data.website?.trim(),
      
      mediaOutlets: data.mediaOutlets || [],
      expertise: data.expertise || [],
      tags: data.tags?.map(tag => ({ name: tag })) || [],
      
      preferredContactMethod: data.preferredContactMethod,
      communicationFrequency: data.communicationFrequency,
      
      notes: data.notes?.trim(),
      internalNotes: data.internalNotes?.trim(),
      
      isActive: true,
      organizationId,
      userId
    };
  }

  private async transformAPIUpdateToContact(
    data: ContactUpdateRequest,
    organizationId: string,
    userId: string
  ): Promise<Partial<ContactEnhanced>> {
    const updateData: Partial<ContactEnhanced> = {};

    // Name-Objekt korrekt strukturieren für ContactEnhanced
    if (data.firstName !== undefined && data.firstName !== null) {
      if (!updateData.name) updateData.name = {};
      updateData.name.firstName = data.firstName.trim() || '';
    }
    if (data.lastName !== undefined && data.lastName !== null) {
      if (!updateData.name) updateData.name = {};
      updateData.name.lastName = data.lastName.trim() || '';
    }
    if (data.email !== undefined && data.email !== null) {
      updateData.email = data.email.trim();
    }
    if (data.phone !== undefined && data.phone !== null) {
      updateData.phone = data.phone.trim();
    }
    if (data.jobTitle !== undefined && data.jobTitle !== null) {
      updateData.jobTitle = data.jobTitle.trim();
    }
    if (data.department !== undefined && data.department !== null) {
      updateData.department = data.department.trim();
    }
    if (data.companyId !== undefined && data.companyId !== null) {
      updateData.companyId = data.companyId;
    }
    if (data.address !== undefined && data.address !== null) {
      updateData.address = data.address;
    }
    if (data.linkedinUrl !== undefined && data.linkedinUrl !== null) {
      updateData.linkedinUrl = data.linkedinUrl.trim();
    }
    if (data.twitterHandle !== undefined && data.twitterHandle !== null) {
      updateData.twitterHandle = data.twitterHandle.trim();
    }
    if (data.website !== undefined && data.website !== null) {
      updateData.website = data.website.trim();
    }
    if (data.mediaOutlets !== undefined && data.mediaOutlets !== null) {
      updateData.mediaOutlets = data.mediaOutlets;
    }
    if (data.expertise !== undefined && data.expertise !== null) {
      updateData.expertise = data.expertise;
    }
    if (data.tags !== undefined && data.tags !== null) {
      updateData.tags = data.tags.map(tag => ({ name: tag }));
    }
    if (data.preferredContactMethod !== undefined && data.preferredContactMethod !== null) {
      updateData.preferredContactMethod = data.preferredContactMethod;
    }
    if (data.communicationFrequency !== undefined && data.communicationFrequency !== null) {
      updateData.communicationFrequency = data.communicationFrequency;
    }
    if (data.notes !== undefined && data.notes !== null) {
      updateData.notes = data.notes.trim();
    }
    if (data.internalNotes !== undefined && data.internalNotes !== null) {
      updateData.internalNotes = data.internalNotes.trim();
    }
    if (data.isActive !== undefined && data.isActive !== null) {
      updateData.isActive = data.isActive;
    }

    return updateData;
  }

  private formatAddress(address: any): string {
    const parts = [];
    if (address.street) parts.push(address.street);
    if (address.city) parts.push(address.city);
    if (address.postalCode) parts.push(address.postalCode);
    if (address.country) parts.push(address.country);
    return parts.join(', ');
  }

  private calculateContactScore(contact: ContactEnhanced): number {
    let score = 0;
    
    // Basic info completeness
    if (contact.email) score += 20;
    if (contact.phone) score += 15;
    if (contact.jobTitle) score += 10;
    if (contact.companyId) score += 15;
    
    // Social presence
    if (contact.linkedinUrl) score += 15;
    if (contact.twitterHandle) score += 10;
    if (contact.website) score += 5;
    
    // Professional info
    if (contact.mediaOutlets && contact.mediaOutlets.length > 0) score += 10;
    if (contact.expertise && contact.expertise.length > 0) score += 10;
    
    return Math.min(100, score);
  }
}

// Singleton Export
export const contactsAPIService = new ContactsAPIService();