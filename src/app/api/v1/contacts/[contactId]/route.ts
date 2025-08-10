// src/app/api/v1/contacts/[contactId]/route.ts
import { NextRequest } from 'next/server';
import { APIMiddleware, RequestParser } from '@/lib/api/api-middleware';
import { contactsAPIService } from '@/lib/api/contacts-api-service';
import { ContactUpdateRequest } from '@/types/api-crm';

/**
 * GET /api/v1/contacts/[contactId]
 * Spezifischen Kontakt abrufen
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { contactId: string } }
) {
  return APIMiddleware.withAuth(async (request, context) => {
    
    const contact = await contactsAPIService.getContact(
      params.contactId,
      context.organizationId,
      context.userId
    );
    
    return APIMiddleware.successResponse(contact);
    
  }, ['contacts:read'])(request);
}

/**
 * PUT /api/v1/contacts/[contactId]
 * Kontakt aktualisieren
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { contactId: string } }
) {
  return APIMiddleware.withAuth(async (request, context) => {
    
    // Parse Request Body
    const updateRequest = await RequestParser.parseJSON<ContactUpdateRequest>(request);
    
    // Update contact
    const updatedContact = await contactsAPIService.updateContact(
      params.contactId,
      updateRequest,
      context.organizationId,
      context.userId
    );
    
    return APIMiddleware.successResponse(updatedContact);
    
  }, ['contacts:write'])(request);
}

/**
 * DELETE /api/v1/contacts/[contactId]
 * Kontakt löschen
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { contactId: string } }
) {
  return APIMiddleware.withAuth(async (request, context) => {
    
    await contactsAPIService.deleteContact(
      params.contactId,
      context.organizationId,
      context.userId
    );
    
    return APIMiddleware.successResponse({
      message: 'Contact deleted successfully',
      contactId: params.contactId
    });
    
  }, ['contacts:delete'])(request);
}

/**
 * OPTIONS-Handler für CORS Preflight
 */
export async function OPTIONS(request: NextRequest) {
  return APIMiddleware.handlePreflight();
}