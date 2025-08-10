// src/app/api/v1/companies/[companyId]/route.ts
import { NextRequest } from 'next/server';
import { APIMiddleware, RequestParser } from '@/lib/api/api-middleware';
import { companiesAPIService } from '@/lib/api/companies-api-service';
import { CompanyUpdateRequest } from '@/types/api-crm';

/**
 * GET /api/v1/companies/[companyId]
 * Spezifische Firma abrufen
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { companyId: string } }
) {
  return APIMiddleware.withAuth(async (request, context) => {
    
    const company = await companiesAPIService.getCompany(
      params.companyId,
      context.organizationId,
      context.userId
    );
    
    return APIMiddleware.successResponse(company);
    
  }, ['companies:read'])(request);
}

/**
 * PUT /api/v1/companies/[companyId]
 * Firma aktualisieren
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { companyId: string } }
) {
  return APIMiddleware.withAuth(async (request, context) => {
    
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
    
  }, ['companies:write'])(request);
}

/**
 * DELETE /api/v1/companies/[companyId]
 * Firma löschen
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { companyId: string } }
) {
  return APIMiddleware.withAuth(async (request, context) => {
    
    await companiesAPIService.deleteCompany(
      params.companyId,
      context.organizationId,
      context.userId
    );
    
    return APIMiddleware.successResponse({
      message: 'Company deleted successfully',
      companyId: params.companyId
    });
    
  }, ['companies:delete'])(request);
}

/**
 * OPTIONS-Handler für CORS Preflight
 */
export async function OPTIONS(request: NextRequest) {
  return APIMiddleware.handlePreflight();
}