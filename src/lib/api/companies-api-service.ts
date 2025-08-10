// src/lib/api/companies-api-service.ts
/**
 * Companies API Service
 * Business Logic für Companies API-Endpunkte
 */

import { companyServiceEnhanced } from '@/lib/firebase/company-service-enhanced';
import { contactsEnhancedService } from '@/lib/firebase/crm-service-enhanced';
import { 
  CompanyCreateRequest, 
  CompanyUpdateRequest, 
  CompanyListParams,
  CompanyAPIResponse,
  BulkCompanyCreateRequest,
  BulkOperationResponse
} from '@/types/api-crm';
import { CompanyEnhanced } from '@/types/crm-enhanced';
import { APIError, API_ERROR_CODES } from '@/types/api';
import { QueryOptions, FilterOptions } from '@/lib/firebase/service-base';

export class CompaniesAPIService {
  
  /**
   * Hole Liste von Firmen mit Filterung und Pagination
   */
  async getCompanies(
    organizationId: string,
    userId: string,
    params: CompanyListParams = {}
  ): Promise<{
    companies: CompanyAPIResponse[];
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
      
      if (params.industry) {
        filterOptions.industry = Array.isArray(params.industry) ? params.industry : [params.industry];
      }
      
      if (params.companyType) {
        filterOptions.companyType = Array.isArray(params.companyType) ? params.companyType : [params.companyType];
      }
      
      if (params.mediaType) {
        filterOptions.mediaType = Array.isArray(params.mediaType) ? params.mediaType : [params.mediaType];
      }
      
      if (params.coverage) {
        filterOptions.coverage = Array.isArray(params.coverage) ? params.coverage : [params.coverage];
      }
      
      if (params.country) {
        filterOptions.country = params.country;
      }
      
      if (params.city) {
        filterOptions.city = params.city;
      }
      
      if (params.tags) {
        filterOptions.tags = Array.isArray(params.tags) ? params.tags : [params.tags];
      }
      
      if (params.isActive !== undefined) {
        filterOptions.isActive = params.isActive;
      }
      
      // Size filters
      if (params.circulationMin !== undefined) {
        filterOptions.circulationMin = params.circulationMin;
      }
      
      if (params.circulationMax !== undefined) {
        filterOptions.circulationMax = params.circulationMax;
      }
      
      if (params.audienceSizeMin !== undefined) {
        filterOptions.audienceSizeMin = params.audienceSizeMin;
      }
      
      if (params.audienceSizeMax !== undefined) {
        filterOptions.audienceSizeMax = params.audienceSizeMax;
      }

      // Query Options
      const queryOptions: QueryOptions = {
        limit,
        offset,
        sortBy: params.sortBy || 'updatedAt',
        sortOrder: params.sortOrder || 'desc',
        filters: filterOptions
      };

      // Get companies from service
      const { companies, total } = await companyServiceEnhanced.getAllWithPagination(
        organizationId,
        queryOptions
      );

      // Transform to API Response format
      const apiCompanies = await Promise.all(
        companies.map(company => this.transformCompanyToAPIResponse(company, organizationId))
      );

      return {
        companies: apiCompanies,
        pagination: {
          page,
          limit,
          total,
          hasNext: offset + limit < total,
          hasPrevious: page > 1
        }
      };
    } catch (error) {
      console.error('Error getting companies:', error);
      throw new APIError(
        500,
        API_ERROR_CODES.DATABASE_ERROR,
        'Failed to retrieve companies'
      );
    }
  }

  /**
   * Hole spezifische Firma
   */
  async getCompany(
    companyId: string,
    organizationId: string,
    userId: string
  ): Promise<CompanyAPIResponse> {
    try {
      const company = await companyServiceEnhanced.get(companyId, organizationId);
      
      if (!company) {
        throw new APIError(
          404,
          API_ERROR_CODES.RESOURCE_NOT_FOUND,
          'Company not found'
        );
      }

      return await this.transformCompanyToAPIResponse(company, organizationId);
    } catch (error) {
      if (error instanceof APIError) throw error;
      
      console.error('Error getting company:', error);
      throw new APIError(
        500,
        API_ERROR_CODES.DATABASE_ERROR,
        'Failed to retrieve company'
      );
    }
  }

  /**
   * Erstelle neue Firma
   */
  async createCompany(
    data: CompanyCreateRequest,
    organizationId: string,
    userId: string
  ): Promise<CompanyAPIResponse> {
    try {
      // Validierung
      this.validateCompanyCreateRequest(data);
      
      // Prüfe ob Firma bereits existiert (basierend auf Name + Domain)
      const existingCompany = await this.findCompanyByNameOrDomain(
        data.name, 
        data.website, 
        organizationId
      );
      
      if (existingCompany) {
        throw new APIError(
          409,
          API_ERROR_CODES.RESOURCE_CONFLICT,
          'Company with this name or domain already exists'
        );
      }
      
      // Transform API request zu Company Service format
      const companyData = await this.transformAPIRequestToCompany(data, organizationId, userId);
      
      // Erstelle Firma
      const createdCompanyId = await companyServiceEnhanced.create(
        companyData,
        { organizationId, userId }
      );

      // Hole die erstellte Firma
      const createdCompany = await companyServiceEnhanced.get(createdCompanyId, organizationId);
      if (!createdCompany) {
        throw new APIError(500, API_ERROR_CODES.DATABASE_ERROR, 'Failed to retrieve created company');
      }

      return await this.transformCompanyToAPIResponse(createdCompany, organizationId);
    } catch (error) {
      if (error instanceof APIError) throw error;
      
      console.error('Error creating company:', error);
      throw new APIError(
        500,
        API_ERROR_CODES.DATABASE_ERROR,
        'Failed to create company'
      );
    }
  }

  /**
   * Aktualisiere Firma
   */
  async updateCompany(
    companyId: string,
    data: CompanyUpdateRequest,
    organizationId: string,
    userId: string
  ): Promise<CompanyAPIResponse> {
    try {
      // Prüfe ob Firma existiert
      const existingCompany = await companyServiceEnhanced.get(companyId, organizationId);
      if (!existingCompany) {
        throw new APIError(
          404,
          API_ERROR_CODES.RESOURCE_NOT_FOUND,
          'Company not found'
        );
      }

      // Prüfe Duplikate (wenn Name oder Website geändert wird)
      if (data.name || data.website) {
        const duplicateCompany = await this.findCompanyByNameOrDomain(
          data.name || existingCompany.name,
          data.website || existingCompany.website,
          organizationId
        );
        
        if (duplicateCompany && duplicateCompany.id !== companyId) {
          throw new APIError(
            409,
            API_ERROR_CODES.RESOURCE_CONFLICT,
            'Another company with this name or domain already exists'
          );
        }
      }

      // Transform Update-Daten
      const updateData = await this.transformAPIUpdateToCompany(data, organizationId, userId);
      
      // Update Firma
      await companyServiceEnhanced.update(
        companyId,
        updateData,
        { organizationId, userId }
      );

      // Hole aktualisierte Firma
      const updatedCompany = await companyServiceEnhanced.get(companyId, organizationId);
      if (!updatedCompany) {
        throw new APIError(500, API_ERROR_CODES.DATABASE_ERROR, 'Failed to retrieve updated company');
      }

      return await this.transformCompanyToAPIResponse(updatedCompany, organizationId);
    } catch (error) {
      if (error instanceof APIError) throw error;
      
      console.error('Error updating company:', error);
      throw new APIError(
        500,
        API_ERROR_CODES.DATABASE_ERROR,
        'Failed to update company'
      );
    }
  }

  /**
   * Lösche Firma
   */
  async deleteCompany(
    companyId: string,
    organizationId: string,
    userId: string
  ): Promise<void> {
    try {
      // Prüfe ob Firma existiert
      const existingCompany = await companyServiceEnhanced.get(companyId, organizationId);
      if (!existingCompany) {
        throw new APIError(
          404,
          API_ERROR_CODES.RESOURCE_NOT_FOUND,
          'Company not found'
        );
      }

      // Prüfe ob Firma noch mit Kontakten verknüpft ist
      const { items: contacts } = await contactsEnhancedService.getAllWithPagination(
        organizationId,
        {
          filters: { companyId },
          limit: 1
        }
      );

      if (contacts.length > 0) {
        throw new APIError(
          409,
          API_ERROR_CODES.RESOURCE_CONFLICT,
          'Cannot delete company with associated contacts. Remove contacts first.'
        );
      }

      // Soft delete (in Company Service implementiert)
      await companyServiceEnhanced.delete(companyId, { organizationId, userId });
    } catch (error) {
      if (error instanceof APIError) throw error;
      
      console.error('Error deleting company:', error);
      throw new APIError(
        500,
        API_ERROR_CODES.DATABASE_ERROR,
        'Failed to delete company'
      );
    }
  }

  /**
   * Bulk Company Creation
   */
  async createCompaniesBulk(
    request: BulkCompanyCreateRequest,
    organizationId: string,
    userId: string
  ): Promise<BulkOperationResponse<CompanyAPIResponse>> {
    const startTime = Date.now();
    const results: BulkOperationResponse<CompanyAPIResponse>['results'] = [];
    
    let successfulItems = 0;
    let failedItems = 0;

    for (let i = 0; i < request.companies.length; i++) {
      const companyData = request.companies[i];
      
      try {
        const createdCompany = await this.createCompany(companyData, organizationId, userId);
        results.push({
          index: i,
          success: true,
          data: createdCompany
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
      totalItems: request.companies.length,
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

  private validateCompanyCreateRequest(data: CompanyCreateRequest): void {
    if (!data.name?.trim()) {
      throw new APIError(
        400,
        API_ERROR_CODES.REQUIRED_FIELD_MISSING,
        'name is required'
      );
    }

    if (data.website && !this.isValidURL(data.website)) {
      throw new APIError(
        400,
        API_ERROR_CODES.VALIDATION_ERROR,
        'Invalid website URL format'
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

  private isValidURL(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private async findCompanyByNameOrDomain(
    name: string,
    website: string | undefined,
    organizationId: string
  ): Promise<CompanyEnhanced | null> {
    try {
      const { companies } = await companyServiceEnhanced.getAllWithPagination(
        organizationId,
        {
          filters: { 
            search: name 
          },
          limit: 10
        }
      );
      
      // Check for name match
      const nameMatch = companies.find(c => 
        c.name.toLowerCase() === name.toLowerCase() ||
        c.tradingName?.toLowerCase() === name.toLowerCase()
      );
      
      if (nameMatch) return nameMatch;
      
      // Check for domain match if website provided
      if (website) {
        try {
          const domain = new URL(website).hostname.toLowerCase();
          const domainMatch = companies.find(c => {
            if (!c.website) return false;
            try {
              const companyDomain = new URL(c.website).hostname.toLowerCase();
              return companyDomain === domain;
            } catch {
              return false;
            }
          });
          
          if (domainMatch) return domainMatch;
        } catch {
          // Invalid URL, skip domain check
        }
      }
      
      return null;
    } catch (error) {
      return null;
    }
  }

  private async transformCompanyToAPIResponse(
    company: CompanyEnhanced, 
    organizationId: string
  ): Promise<CompanyAPIResponse> {
    
    // Get contact count for this company
    let contactCount = 0;
    try {
      const { total } = await contactsEnhancedService.getAllWithPagination(
        organizationId,
        {
          filters: { companyId: company.id! },
          limit: 0 // Just get count
        }
      );
      contactCount = total;
    } catch (error) {
      // Continue without contact count
    }

    // Extract domain from website
    let domain: string | undefined;
    if (company.website) {
      try {
        domain = new URL(company.website).hostname;
      } catch {
        // Invalid URL, continue without domain
      }
    }

    return {
      id: company.id!,
      name: company.name,
      tradingName: company.tradingName,
      legalName: company.legalName,
      displayName: company.tradingName || company.name,
      
      industry: company.industry,
      companySize: company.companySize,
      companyType: company.companyType as any,
      founded: company.founded,
      
      website: company.website,
      domain,
      phone: company.phone,
      email: company.email,
      
      address: company.address ? {
        ...company.address,
        formatted: this.formatAddress(company.address)
      } : undefined,
      
      mediaType: company.mediaType as any,
      coverage: company.coverage as any,
      circulation: company.circulation,
      audienceSize: company.audienceSize,
      
      linkedinUrl: company.linkedinUrl,
      twitterHandle: company.twitterHandle,
      facebookUrl: company.facebookUrl,
      instagramHandle: company.instagramHandle,
      
      vatNumber: company.vatNumber,
      registrationNumber: company.registrationNumber,
      
      tags: (company.tags || []).map(tag => ({
        name: typeof tag === 'string' ? tag : tag.name,
        color: typeof tag === 'object' && tag.color ? tag.color : undefined
      })),
      
      contactCount,
      publicationCount: 0, // TODO: Implement if needed
      
      notes: company.notes,
      
      isActive: company.isActive !== false,
      createdAt: company.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
      updatedAt: company.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
      
      // Computed fields
      lastContactAt: undefined, // TODO: Implement based on contact interactions
      activityScore: this.calculateActivityScore(company, contactCount),
      recentActivity: [] // TODO: Implement activity tracking
    };
  }

  private async transformAPIRequestToCompany(
    data: CompanyCreateRequest,
    organizationId: string,
    userId: string
  ): Promise<Omit<CompanyEnhanced, 'id' | 'createdAt' | 'updatedAt'>> {
    return {
      name: data.name.trim(),
      tradingName: data.tradingName?.trim(),
      legalName: data.legalName?.trim(),
      
      industry: data.industry?.trim(),
      companySize: data.companySize?.trim(),
      companyType: data.companyType,
      founded: data.founded,
      
      website: data.website?.trim(),
      phone: data.phone?.trim(),
      email: data.email?.trim(),
      
      address: data.address,
      
      mediaType: data.mediaType,
      coverage: data.coverage,
      circulation: data.circulation,
      audienceSize: data.audienceSize,
      
      linkedinUrl: data.linkedinUrl?.trim(),
      twitterHandle: data.twitterHandle?.trim(),
      facebookUrl: data.facebookUrl?.trim(),
      instagramHandle: data.instagramHandle?.trim(),
      
      vatNumber: data.vatNumber?.trim(),
      registrationNumber: data.registrationNumber?.trim(),
      
      tags: data.tags?.map(tag => ({ name: tag })) || [],
      
      notes: data.notes?.trim(),
      internalNotes: data.internalNotes?.trim(),
      
      isActive: true,
      organizationId,
      userId
    };
  }

  private async transformAPIUpdateToCompany(
    data: CompanyUpdateRequest,
    organizationId: string,
    userId: string
  ): Promise<Partial<CompanyEnhanced>> {
    const updateData: Partial<CompanyEnhanced> = {};

    if (data.name !== undefined) updateData.name = data.name.trim();
    if (data.tradingName !== undefined) updateData.tradingName = data.tradingName?.trim();
    if (data.legalName !== undefined) updateData.legalName = data.legalName?.trim();
    if (data.industry !== undefined) updateData.industry = data.industry?.trim();
    if (data.companySize !== undefined) updateData.companySize = data.companySize?.trim();
    if (data.companyType !== undefined) updateData.companyType = data.companyType;
    if (data.founded !== undefined) updateData.founded = data.founded;
    if (data.website !== undefined) updateData.website = data.website?.trim();
    if (data.phone !== undefined) updateData.phone = data.phone?.trim();
    if (data.email !== undefined) updateData.email = data.email?.trim();
    if (data.address !== undefined) updateData.address = data.address;
    if (data.mediaType !== undefined) updateData.mediaType = data.mediaType;
    if (data.coverage !== undefined) updateData.coverage = data.coverage;
    if (data.circulation !== undefined) updateData.circulation = data.circulation;
    if (data.audienceSize !== undefined) updateData.audienceSize = data.audienceSize;
    if (data.linkedinUrl !== undefined) updateData.linkedinUrl = data.linkedinUrl?.trim();
    if (data.twitterHandle !== undefined) updateData.twitterHandle = data.twitterHandle?.trim();
    if (data.facebookUrl !== undefined) updateData.facebookUrl = data.facebookUrl?.trim();
    if (data.instagramHandle !== undefined) updateData.instagramHandle = data.instagramHandle?.trim();
    if (data.vatNumber !== undefined) updateData.vatNumber = data.vatNumber?.trim();
    if (data.registrationNumber !== undefined) updateData.registrationNumber = data.registrationNumber?.trim();
    if (data.tags !== undefined) updateData.tags = data.tags?.map(tag => ({ name: tag }));
    if (data.notes !== undefined) updateData.notes = data.notes?.trim();
    if (data.internalNotes !== undefined) updateData.internalNotes = data.internalNotes?.trim();
    if (data.isActive !== undefined) updateData.isActive = data.isActive;

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

  private calculateActivityScore(company: CompanyEnhanced, contactCount: number): number {
    let score = 0;
    
    // Basic info completeness
    if (company.website) score += 20;
    if (company.email) score += 15;
    if (company.phone) score += 10;
    if (company.industry) score += 10;
    
    // Social presence
    if (company.linkedinUrl) score += 15;
    if (company.twitterHandle) score += 10;
    if (company.facebookUrl) score += 5;
    
    // Business completeness
    if (company.address) score += 10;
    if (company.founded) score += 5;
    
    // Relationship strength
    score += Math.min(20, contactCount * 2);
    
    return Math.min(100, score);
  }
}

// Singleton Export
export const companiesAPIService = new CompaniesAPIService();