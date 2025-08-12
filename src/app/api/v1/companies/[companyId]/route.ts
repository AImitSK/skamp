// src/app/api/v1/companies/[companyId]/route.ts
import { NextRequest } from 'next/server';
import { APIMiddleware, RequestParser } from '@/lib/api/api-middleware';
import { companiesAPIService } from '@/lib/api/companies-api-service';
import { CompanyUpdateRequest } from '@/types/api-crm';

/**
 * GET /api/v1/companies/[companyId]
 * Spezifische Firma abrufen
 */
export const GET = APIMiddleware.withAuth(
  async (request: NextRequest, context, params) => {
    // Extract companyId from URL path segments (Next.js 15)
    const url = new URL(request.url);
    const pathSegments = url.pathname.split('/');
    const companyId = pathSegments[pathSegments.length - 1];
    
    if (!companyId || companyId === 'companies') {
      throw new Error('Company ID is required');
    }
    
    const company = await companiesAPIService.getCompany(
      companyId,
      context.organizationId,
      context.userId
    );
    
    return APIMiddleware.successResponse(company);
    
  },
  ['companies:read']
);

/**
 * PUT /api/v1/companies/[companyId]
 * Firma aktualisieren
 */
export const PUT = APIMiddleware.withAuth(
  async (request: NextRequest, context, params) => {
    // Extract companyId from URL path segments (Next.js 15)
    const url = new URL(request.url);
    const pathSegments = url.pathname.split('/');
    const companyId = pathSegments[pathSegments.length - 1];
    
    if (!companyId || companyId === 'companies') {
      throw new Error('Company ID is required');
    }
    
    // Parse Request Body
    const updateRequest = await RequestParser.parseJSON<CompanyUpdateRequest>(request);
    
    // Update company
    const updatedCompany = await companiesAPIService.updateCompany(
      companyId,
      updateRequest,
      context.organizationId,
      context.userId
    );
    
    return APIMiddleware.successResponse(updatedCompany);
    
  },
  ['companies:write']
);

/**
 * DELETE /api/v1/companies/[companyId]
 * Firma löschen
 */
export const DELETE = APIMiddleware.withAuth(
  async (request: NextRequest, context, params) => {
    // Extract companyId from URL path segments (Next.js 15)
    const url = new URL(request.url);
    const pathSegments = url.pathname.split('/');
    const companyId = pathSegments[pathSegments.length - 1];
    
    if (!companyId || companyId === 'companies') {
      throw new Error('Company ID is required');
    }
    
    await companiesAPIService.deleteCompany(
      companyId,
      context.organizationId,
      context.userId
    );
    
    return APIMiddleware.successResponse({
      message: 'Company deleted successfully',
      companyId: companyId
    });
    
  },
  ['companies:delete']
);

/**
 * OPTIONS-Handler für CORS Preflight
 */
export async function OPTIONS(request: NextRequest) {
  return APIMiddleware.handlePreflight();
}