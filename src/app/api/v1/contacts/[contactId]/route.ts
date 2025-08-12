// src/app/api/v1/contacts/[contactId]/route.ts
import { NextRequest } from 'next/server';
import { APIMiddleware, RequestParser } from '@/lib/api/api-middleware';
import { contactsAPIService } from '@/lib/api/contacts-api-service';
import { ContactUpdateRequest } from '@/types/api-crm';

/**
 * GET /api/v1/contacts/[contactId]
 * Spezifischen Kontakt abrufen
 */
export const GET = APIMiddleware.withAuth(
  async (request: NextRequest, context) => {
    
    // Extract contactId from URL
    const url = new URL(request.url);
    const pathSegments = url.pathname.split('/');
    const contactId = pathSegments[pathSegments.length - 1];
    
    const contact = await contactsAPIService.getContact(
      contactId,
      context.organizationId,
      context.userId
    );
    
    return APIMiddleware.successResponse(contact);
    
  },
  ['contacts:read']
);

/**
 * PUT /api/v1/contacts/[contactId]
 * Kontakt aktualisieren
 */
export const PUT = APIMiddleware.withAuth(
  async (request: NextRequest, context) => {
    
    // Extract contactId from URL
    const url = new URL(request.url);
    const pathSegments = url.pathname.split('/');
    const contactId = pathSegments[pathSegments.length - 1];
    
    // Parse Request Body
    const updateRequest = await RequestParser.parseJSON<ContactUpdateRequest>(request);
    
    // Update contact
    const updatedContact = await contactsAPIService.updateContact(
      contactId,
      updateRequest,
      context.organizationId,
      context.userId
    );
    
    return APIMiddleware.successResponse(updatedContact);
    
  },
  ['contacts:write']
);

/**
 * DELETE /api/v1/contacts/[contactId]
 * Kontakt löschen
 */
export const DELETE = APIMiddleware.withAuth(
  async (request: NextRequest, context) => {
    
    // Extract contactId from URL
    const url = new URL(request.url);
    const pathSegments = url.pathname.split('/');
    const contactId = pathSegments[pathSegments.length - 1];
    
    await contactsAPIService.deleteContact(
      contactId,
      context.organizationId,
      context.userId
    );
    
    return APIMiddleware.successResponse({
      message: 'Contact deleted successfully',
      contactId: contactId
    });
    
  },
  ['contacts:delete']
);

/**
 * OPTIONS-Handler für CORS Preflight
 */
export async function OPTIONS(request: NextRequest) {
  return APIMiddleware.handlePreflight();
}