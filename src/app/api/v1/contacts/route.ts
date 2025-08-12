// src/app/api/v1/contacts/route.ts
import { NextRequest } from 'next/server';
import { APIMiddleware, RequestParser } from '@/lib/api/api-middleware';
import { contactsAPIService } from '@/lib/api/contacts-api-service';
import { ContactCreateRequest, ContactListParams, BulkContactCreateRequest } from '@/types/api-crm';

/**
 * GET /api/v1/contacts
 * Liste aller Kontakte mit Filterung und Pagination
 */
export const GET = APIMiddleware.withAuth(
  async (request: NextRequest, context) => {
    
    // Parse Query Parameters
    const params = RequestParser.parseQuery(request) as ContactListParams;
    
    // Get contacts
    const result = await contactsAPIService.getContacts(
      context.organizationId,
      context.userId,
      params
    );
    
    return APIMiddleware.successResponse(result.contacts, 200, result.pagination);
    
  },
  ['contacts:read']
);

/**
 * POST /api/v1/contacts
 * Neuen Kontakt erstellen
 */
export const POST = APIMiddleware.withAuth(
  async (request: NextRequest, context) => {
    
    const contentType = request.headers.get('content-type');
    
    // Check if it's a bulk operation
    if (contentType?.includes('application/json')) {
      const body = await RequestParser.parseJSON<any>(request);
      
      // Bulk create if array of contacts
      if (Array.isArray(body) || (body.contacts && Array.isArray(body.contacts))) {
        const bulkRequest: BulkContactCreateRequest = Array.isArray(body) 
          ? { contacts: body, continueOnError: true }
          : body;
        
        RequestParser.validateRequired(bulkRequest, ['contacts']);
        
        const result = await contactsAPIService.createContactsBulk(
          bulkRequest,
          context.organizationId,
          context.userId
        );
        
        return APIMiddleware.successResponse(result, 201);
      }
      
      // Single contact create
      const createRequest = body as ContactCreateRequest;
      RequestParser.validateRequired(createRequest, ['firstName', 'lastName']);
      
      const contact = await contactsAPIService.createContact(
        createRequest,
        context.organizationId,
        context.userId
      );
      
      return APIMiddleware.successResponse(contact, 201);
    }
    
    // Unsupported content type
    return APIMiddleware.handleError({
      name: 'APIError',
      statusCode: 400,
      errorCode: 'INVALID_REQUEST_FORMAT',
      message: 'Content-Type must be application/json'
    });
    
  },
  ['contacts:write']
);

/**
 * OPTIONS-Handler für CORS Preflight
 */
export async function OPTIONS(request: NextRequest) {
  return APIMiddleware.handlePreflight();
}