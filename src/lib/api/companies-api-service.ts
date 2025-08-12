// src/lib/api/companies-api-service.ts
/**
 * Companies API Service
 * Business Logic für Companies API-Endpunkte
 */

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
      console.log('DEBUG: Using safe companies service with organizationId:', organizationId);
      
      let companies, total;
      try {
        // Use completely isolated service
        const { safeCompaniesService } = await import('@/lib/api/safe-companies-service');
        console.log('DEBUG: Safe service imported successfully');
        
        const result = await safeCompaniesService.getCompanies(organizationId);
        console.log('DEBUG: Company service result:', result);
        
        if (Array.isArray(result)) {
          companies = result;
          total = result.length;
        } else if (result && Array.isArray(result.items)) {
          companies = result.items;
          total = result.total || result.items.length;
        } else {
          companies = [];
          total = 0;
        }
      } catch (serviceError) {
        console.error('DEBUG: Company service error:', serviceError);
        throw serviceError;
      }

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
      const { safeCompaniesService } = await import('@/lib/api/safe-companies-service');
      const company = await safeCompaniesService.getCompanyById(companyId, organizationId);
      
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
      
      // Transform API request zu Company Service format
      const companyData = await this.transformAPIRequestToCompany(data, organizationId, userId);
      
      // Erstelle Firma
      const { safeCompaniesService } = await import('@/lib/api/safe-companies-service');
      const createdCompanyId = await safeCompaniesService.createCompany(companyData);

      // Hole die erstellte Firma
      const createdCompany = await safeCompaniesService.getCompanyById(createdCompanyId, organizationId);
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
    throw new APIError(501, API_ERROR_CODES.NOT_IMPLEMENTED, 'updateCompany not implemented with safe service yet');
  }

  /**
   * Lösche Firma
   */
  async deleteCompany(
    companyId: string,
    organizationId: string,
    userId: string
  ): Promise<void> {
    throw new APIError(501, API_ERROR_CODES.NOT_IMPLEMENTED, 'deleteCompany not implemented with safe service yet');
  }

  /**
   * Bulk Company Creation
   */
  async createCompaniesBulk(
    request: BulkCompanyCreateRequest,
    organizationId: string,
    userId: string
  ): Promise<BulkOperationResponse<CompanyAPIResponse>> {
    throw new APIError(501, API_ERROR_CODES.NOT_IMPLEMENTED, 'createCompaniesBulk not implemented with safe service yet');
  }

  /**
   * Transform Company to API Response format
   */
  private async transformCompanyToAPIResponse(
    company: CompanyEnhanced, 
    organizationId: string
  ): Promise<CompanyAPIResponse> {
    
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
      
      contactCount: 0, // TODO: Implement
      publicationCount: 0, // TODO: Implement
      
      notes: company.notes,
      
      isActive: company.isActive !== false,
      createdAt: company.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
      updatedAt: company.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
      
      // Computed fields
      lastContactAt: undefined, // TODO: Implement
      activityScore: this.calculateActivityScore(company),
      recentActivity: [] // TODO: Implement
    };
  }

  private formatAddress(address: any): string {
    const parts = [];
    if (address.street) parts.push(address.street);
    if (address.city) parts.push(address.city);
    if (address.postalCode) parts.push(address.postalCode);
    if (address.country) parts.push(address.country);
    return parts.join(', ');
  }

  private calculateActivityScore(company: CompanyEnhanced): number {
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
    
    return Math.min(100, score);
  }

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

  private async transformAPIRequestToCompany(
    data: CompanyCreateRequest,
    organizationId: string,
    userId: string
  ): Promise<Omit<CompanyEnhanced, 'id' | 'createdAt' | 'updatedAt'>> {
    return {
      name: data.name.trim(),
      tradingName: data.tradingName?.trim() || null,
      legalName: data.legalName?.trim() || null,
      
      industry: data.industry?.trim() || null,
      companySize: data.companySize?.trim() || null,
      companyType: data.companyType || null,
      founded: data.founded || null,
      
      website: data.website?.trim() || null,
      phone: data.phone?.trim() || null,
      email: data.email?.trim() || null,
      
      address: data.address || null,
      
      mediaType: data.mediaType || null,
      coverage: data.coverage || null,
      circulation: data.circulation || null,
      audienceSize: data.audienceSize || null,
      
      linkedinUrl: data.linkedinUrl?.trim() || null,
      twitterHandle: data.twitterHandle?.trim() || null,
      facebookUrl: data.facebookUrl?.trim() || null,
      instagramHandle: data.instagramHandle?.trim() || null,
      
      vatNumber: data.vatNumber?.trim() || null,
      registrationNumber: data.registrationNumber?.trim() || null,
      
      tags: data.tags?.map(tag => ({ name: tag })) || [],
      
      notes: data.notes?.trim() || null,
      internalNotes: data.internalNotes?.trim() || null,
      
      isActive: true,
      organizationId,
      userId,
      createdBy: userId
    };
  }
}

// Singleton Export
export const companiesAPIService = new CompaniesAPIService();