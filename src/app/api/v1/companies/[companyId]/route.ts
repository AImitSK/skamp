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
  async (request: NextRequest, context, { params }: { params: { companyId: string } }) => {
    
    const company = await companiesAPIService.getCompany(
      params.companyId,
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
  async (request: NextRequest, context, { params }: { params: { companyId: string } }) => {
    
    // Parse Request Body
    const updateRequest = await RequestParser.parseJSON<CompanyUpdateRequest>(request);
    
    // Update company
    const updatedCompany = await companiesAPIService.updateCompany(
      params.companyId,
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
  async (request: NextRequest, context, { params }: { params: { companyId: string } }) => {
    
    await companiesAPIService.deleteCompany(
      params.companyId,
      context.organizationId,
      context.userId
    );
    
    return APIMiddleware.successResponse({
      message: 'Company deleted successfully',
      companyId: params.companyId
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