// src/app/api/v1/companies/route.ts
import { NextRequest } from 'next/server';
import { APIMiddleware, RequestParser } from '@/lib/api/api-middleware';
import { companiesAPIService } from '@/lib/api/companies-api-service';
import { CompanyCreateRequest, CompanyListParams, BulkCompanyCreateRequest } from '@/types/api-crm';

/**
 * GET /api/v1/companies
 * Liste aller Firmen mit Filterung und Pagination
 */
export const GET = APIMiddleware.withAuth(
  async (request: NextRequest, context) => {
    
    // Parse Query Parameters
    const params = RequestParser.parseQuery(request) as CompanyListParams;
    
    // Get companies
    const result = await companiesAPIService.getCompanies(
      context.organizationId,
      context.userId,
      params
    );
    
    return APIMiddleware.successResponse(result.companies, 200, result.pagination);
    
  },
  ['companies:read']
);

/**
 * POST /api/v1/companies
 * Neue Firma erstellen
 */
export const POST = APIMiddleware.withAuth(
  async (request: NextRequest, context) => {
    
    const contentType = request.headers.get('content-type');
    
    // Check if it's a bulk operation
    if (contentType?.includes('application/json')) {
      const body = await RequestParser.parseJSON<any>(request);
      
      // Bulk create if array of companies
      if (Array.isArray(body) || (body.companies && Array.isArray(body.companies))) {
        const bulkRequest: BulkCompanyCreateRequest = Array.isArray(body) 
          ? { companies: body, continueOnError: true }
          : body;
        
        RequestParser.validateRequired(bulkRequest, ['companies']);
        
        const result = await companiesAPIService.createCompaniesBulk(
          bulkRequest,
          context.organizationId,
          context.userId
        );
        
        return APIMiddleware.successResponse(result, 201);
      }
      
      // Single company create
      const createRequest = body as CompanyCreateRequest;
      RequestParser.validateRequired(createRequest, ['name']);
      
      const company = await companiesAPIService.createCompany(
        createRequest,
        context.organizationId,
        context.userId
      );
      
      return APIMiddleware.successResponse(company, 201);
    }
    
    // Unsupported content type
    return APIMiddleware.handleError({
      name: 'APIError',
      statusCode: 400,
      errorCode: 'INVALID_REQUEST_FORMAT',
      message: 'Content-Type must be application/json'
    });
    
  },
  ['companies:write']
);

/**
 * OPTIONS-Handler für CORS Preflight
 */
export async function OPTIONS(request: NextRequest) {
  return APIMiddleware.handlePreflight();
}