// src/app/api/v1/search/route.ts
import { NextRequest } from 'next/server';
import { APIMiddleware, RequestParser } from '@/lib/api/api-middleware';
import { contactsAPIService } from '@/lib/api/contacts-api-service';
import { companiesAPIService } from '@/lib/api/companies-api-service';
import { ContactListParams, CompanyListParams } from '@/types/api-crm';

/**
 * POST /api/v1/search
 * Advanced Search Funktionalität für Contacts und Companies
 * Ermöglicht komplexere Suchabfragen als die Standard GET-Endpunkte
 */
export async function POST(request: NextRequest) {
  return APIMiddleware.withAuth(async (request, context) => {
    
    const searchRequest = await RequestParser.parseJSON<{
      query: string;
      type: 'contacts' | 'companies' | 'all';
      filters?: ContactListParams | CompanyListParams;
      highlights?: boolean;
      fuzzy?: boolean;
      limit?: number;
    }>(request);
    
    RequestParser.validateRequired(searchRequest, ['query', 'type']);
    
    const results: any = {};
    
    // Enhanced search parameters
    const limit = Math.min(50, searchRequest.limit || 10);
    const baseParams = {
      search: searchRequest.query,
      limit,
      sortBy: 'updatedAt',
      sortOrder: 'desc' as const,
      ...searchRequest.filters
    };
    
    // Search Contacts
    if (searchRequest.type === 'contacts' || searchRequest.type === 'all') {
      const contactParams = baseParams as ContactListParams;
      const contactResults = await contactsAPIService.getContacts(
        context.organizationId,
        context.userId,
        contactParams
      );
      
      results.contacts = {
        items: contactResults.contacts,
        total: contactResults.pagination.total,
        hasMore: contactResults.pagination.hasNext
      };
    }
    
    // Search Companies
    if (searchRequest.type === 'companies' || searchRequest.type === 'all') {
      const companyParams = baseParams as CompanyListParams;
      const companyResults = await companiesAPIService.getCompanies(
        context.organizationId,
        context.userId,
        companyParams
      );
      
      results.companies = {
        items: companyResults.companies,
        total: companyResults.pagination.total,
        hasMore: companyResults.pagination.hasNext
      };
    }
    
    // Add search metadata
    const response = {
      query: searchRequest.query,
      type: searchRequest.type,
      results,
      metadata: {
        searchTime: Date.now(),
        totalResults: (results.contacts?.total || 0) + (results.companies?.total || 0),
        fuzzyMatch: searchRequest.fuzzy || false
      }
    };
    
    return APIMiddleware.successResponse(response);
    
  }, ['contacts:read', 'companies:read'])(request);
}

/**
 * OPTIONS-Handler für CORS Preflight
 */
export async function OPTIONS(request: NextRequest) {
  return APIMiddleware.handlePreflight();
}