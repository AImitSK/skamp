// src/app/api/v1/search/suggestions/route.ts
import { NextRequest } from 'next/server';
import { APIMiddleware, RequestParser } from '@/lib/api/api-middleware';
import { contactsAPIService } from '@/lib/api/contacts-api-service';
import { companiesAPIService } from '@/lib/api/companies-api-service';

/**
 * GET /api/v1/search/suggestions
 * Schnelle Auto-Complete Vorschläge für Search-As-You-Type
 */
export const GET = APIMiddleware.withAuth(
  async (request: NextRequest, context) => {
    
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const type = searchParams.get('type') || 'all';
    const limit = Math.min(10, parseInt(searchParams.get('limit') || '5'));
    
    if (!query || query.length < 2) {
      return APIMiddleware.successResponse({
        suggestions: [],
        query: query || ''
      });
    }
    
    const suggestions: any[] = [];
    
    try {
      // Contact Suggestions
      if (type === 'contacts' || type === 'all') {
        const contactResults = await contactsAPIService.getContacts(
          context.organizationId,
          context.userId,
          {
            search: query,
            limit: Math.ceil(limit / 2),
            sortBy: 'updatedAt',
            sortOrder: 'desc'
          }
        );
        
        contactResults.contacts.forEach(contact => {
          suggestions.push({
            id: contact.id,
            type: 'contact',
            title: contact.fullName,
            subtitle: contact.jobTitle || contact.company?.name || '',
            email: contact.email,
            company: contact.company?.name
          });
        });
      }
      
      // Company Suggestions
      if (type === 'companies' || type === 'all') {
        const companyResults = await companiesAPIService.getCompanies(
          context.organizationId,
          context.userId,
          {
            search: query,
            limit: Math.ceil(limit / 2),
            sortBy: 'updatedAt',
            sortOrder: 'desc'
          }
        );
        
        companyResults.companies.forEach(company => {
          suggestions.push({
            id: company.id,
            type: 'company',
            title: company.displayName,
            subtitle: company.industry || company.companyType || '',
            domain: company.domain,
            contactCount: company.contactCount
          });
        });
      }
      
      // Sort by relevance and limit results
      const sortedSuggestions = suggestions
        .sort((a, b) => {
          // Prioritize exact matches at the beginning
          const aExact = a.title.toLowerCase().startsWith(query.toLowerCase()) ? 1 : 0;
          const bExact = b.title.toLowerCase().startsWith(query.toLowerCase()) ? 1 : 0;
          return bExact - aExact;
        })
        .slice(0, limit);
      
      return APIMiddleware.successResponse({
        suggestions: sortedSuggestions,
        query: query,
        hasMore: suggestions.length > limit
      });
      
    } catch (error) {
      // Return empty suggestions on error to not break user experience
      return APIMiddleware.successResponse({
        suggestions: [],
        query: query,
        error: 'Search temporarily unavailable'
      });
    }
    
  },
  ['contacts:read', 'companies:read']
);

/**
 * OPTIONS-Handler für CORS Preflight
 */
export async function OPTIONS(request: NextRequest) {
  return APIMiddleware.handlePreflight();
}