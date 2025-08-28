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
      
      if ((params as any).search) {
        filterOptions.search = (params as any).search;
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
      const queryOptions: any = {
        limit,
        // offset, // Entfernt wegen QueryOptions incompatibility
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
        } else if (result && Array.isArray((result as any).items)) {
          companies = (result as any).items;
          total = (result as any).total || (result as any).items.length;
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
        companies.map((company: any) => this.transformCompanyToAPIResponse(company, organizationId))
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
    try {
      const { safeCompaniesService } = await import('@/lib/api/safe-companies-service');
      
      // Prüfe ob Firma existiert
      const existingCompany = await safeCompaniesService.getCompanyById(companyId, organizationId);
      if (!existingCompany) {
        throw new APIError(
          404,
          API_ERROR_CODES.RESOURCE_NOT_FOUND,
          'Company not found'
        );
      }

      // Transform Update-Daten
      const updateData = await this.transformAPIUpdateToCompany(data, organizationId, userId);
      
      // Update Firma
      await safeCompaniesService.updateCompany(companyId, updateData);

      // Hole aktualisierte Firma
      const updatedCompany = await safeCompaniesService.getCompanyById(companyId, organizationId);
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
      const { safeCompaniesService } = await import('@/lib/api/safe-companies-service');
      
      // Prüfe ob Firma existiert
      const existingCompany = await safeCompaniesService.getCompanyById(companyId, organizationId);
      if (!existingCompany) {
        throw new APIError(
          404,
          API_ERROR_CODES.RESOURCE_NOT_FOUND,
          'Company not found'
        );
      }

      // Soft delete
      await safeCompaniesService.deleteCompany(companyId);
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
    throw new APIError(501, 'NOT_IMPLEMENTED' as any, 'createCompaniesBulk not implemented with safe service yet');
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
      legalName: (company as any).legalName,
      displayName: company.tradingName || company.name,
      
      industry: (company as any).industry,
      companySize: (company as any).companySize,
      companyType: (company as any).companyType,
      founded: (company as any).founded,
      
      website: company.website,
      domain,
      phone: (company as any).phone || company.phones?.[0]?.number,
      email: (company as any).email || company.emails?.[0]?.email,
      
      address: (company as any).address ? {
        ...(company as any).address,
        formatted: this.formatAddress((company as any).address)
      } : undefined,
      
      mediaType: (company as any).mediaType,
      coverage: (company as any).coverage,
      circulation: (company as any).circulation,
      audienceSize: (company as any).audienceSize,
      
      linkedinUrl: (company as any).linkedinUrl,
      twitterHandle: (company as any).twitterHandle,
      facebookUrl: (company as any).facebookUrl,
      instagramHandle: (company as any).instagramHandle,
      
      vatNumber: (company as any).vatNumber,
      registrationNumber: (company as any).registrationNumber,
      
      tags: ((company as any).tags || []).map((tag: any) => ({
        name: typeof tag === 'string' ? tag : tag.name,
        color: typeof tag === 'object' && tag.color ? tag.color : undefined
      })),
      
      contactCount: 0, // TODO: Implement
      publicationCount: 0, // TODO: Implement
      
      notes: (company as any).notes,
      
      isActive: (company as any).isActive !== false,
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
    if ((company as any).email || company.emails?.[0]) score += 15;
    if ((company as any).phone || company.phones?.[0]) score += 10;
    if ((company as any).industry) score += 10;
    
    // Social presence
    if ((company as any).linkedinUrl) score += 15;
    if ((company as any).twitterHandle) score += 10;
    if ((company as any).facebookUrl) score += 5;
    
    // Business completeness
    if ((company as any).address || company.addresses?.[0]) score += 10;
    if ((company as any).founded) score += 5;
    
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
  ): Promise<any> {
    return {
      name: data.name.trim(),
      tradingName: data.tradingName?.trim() || undefined,
      legalName: data.legalName?.trim() || null,
      
      industry: data.industry?.trim() || null,
      companySize: data.companySize?.trim() || null,
      companyType: data.companyType || null,
      founded: data.founded || null,
      
      website: data.website?.trim() || undefined,
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
      internalNotes: data.internalNotes?.trim() || undefined,
      
      isActive: true,
      organizationId,
      userId,
      createdBy: userId
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
    if (data.legalName !== undefined) (updateData as any).legalName = data.legalName?.trim();
    if (data.industry !== undefined) (updateData as any).industry = data.industry?.trim();
    if (data.companySize !== undefined) (updateData as any).companySize = data.companySize?.trim();
    if (data.companyType !== undefined) (updateData as any).companyType = data.companyType;
    if (data.founded !== undefined) (updateData as any).founded = data.founded;
    if (data.website !== undefined) updateData.website = data.website?.trim();
    if (data.phone !== undefined) (updateData as any).phone = data.phone?.trim();
    if (data.email !== undefined) (updateData as any).email = data.email?.trim();
    if (data.address !== undefined) (updateData as any).address = data.address;
    if (data.mediaType !== undefined) (updateData as any).mediaType = data.mediaType;
    if (data.coverage !== undefined) (updateData as any).coverage = data.coverage;
    if (data.circulation !== undefined) (updateData as any).circulation = data.circulation;
    if (data.audienceSize !== undefined) (updateData as any).audienceSize = data.audienceSize;
    if (data.linkedinUrl !== undefined) (updateData as any).linkedinUrl = data.linkedinUrl?.trim();
    if (data.twitterHandle !== undefined) (updateData as any).twitterHandle = data.twitterHandle?.trim();
    if (data.facebookUrl !== undefined) (updateData as any).facebookUrl = data.facebookUrl?.trim();
    if (data.instagramHandle !== undefined) (updateData as any).instagramHandle = data.instagramHandle?.trim();
    if (data.vatNumber !== undefined) (updateData as any).vatNumber = data.vatNumber?.trim();
    if (data.registrationNumber !== undefined) (updateData as any).registrationNumber = data.registrationNumber?.trim();
    if (data.tags !== undefined) (updateData as any).tags = data.tags?.map(tag => ({ name: tag }));
    if (data.notes !== undefined) (updateData as any).notes = data.notes?.trim();
    if (data.internalNotes !== undefined) updateData.internalNotes = data.internalNotes?.trim();
    if (data.isActive !== undefined) (updateData as any).isActive = data.isActive;

    return updateData;
  }
}

// Singleton Export
export const companiesAPIService = new CompaniesAPIService();