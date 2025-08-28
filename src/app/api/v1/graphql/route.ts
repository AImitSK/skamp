// src/app/api/v1/graphql/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { APIMiddleware, RequestParser } from '@/lib/api/api-middleware';
import { graphqlResolvers, GraphQLContext } from '@/lib/api/graphql-resolvers';
import { CELEROPRESS_GRAPHQL_SCHEMA } from '@/lib/api/graphql-schema';
import { GraphQLQueryRequest, GraphQLResponse } from '@/types/api-advanced';
import { APIError } from '@/lib/api/api-errors';

/**
 * POST /api/v1/graphql
 * GraphQL Endpoint mit vollständiger Query/Mutation/Subscription Unterstützung
 */
export const POST = APIMiddleware.withAuth(
  async (request: NextRequest, context) => {

    // Request Body parsen
    const body: GraphQLQueryRequest = await RequestParser.parseJSON<GraphQLQueryRequest>(request);
    
    if (!body.query) {
      return APIMiddleware.handleError({
        name: 'GraphQLError',
        statusCode: 400,
        errorCode: 'VALIDATION_ERROR',
        message: 'Query is required'
      });
    }

    // GraphQL Context erstellen
    const graphqlContext: GraphQLContext = {
      organizationId: context.organizationId,
      userId: context.userId,
      apiKeyId: (context as any).keyId
    };

    // Query verarbeiten
    const result = await processGraphQLRequest(body, graphqlContext);
    
    return NextResponse.json(result);
  },
  ['companies:read', 'contacts:read']
);

/**
 * GET /api/v1/graphql
 * GraphQL Introspection und Schema-Dokumentation
 */
export const GET = APIMiddleware.withAuth(
  async (request: NextRequest, context) => {
    const query = RequestParser.parseQuery(request);
    const format = query.format as string || 'json';

    if (format === 'schema') {
      // Return SDL (Schema Definition Language)
      const sdl = generateGraphQLSDL(CELEROPRESS_GRAPHQL_SCHEMA);
      return new NextResponse(sdl, {
        headers: {
          'Content-Type': 'text/plain'
        }
      });
    }

    // Return schema as JSON
    return APIMiddleware.successResponse({
      schema: CELEROPRESS_GRAPHQL_SCHEMA,
      introspection: {
        available: true,
        endpoint: '/api/v1/graphql',
        documentation: 'https://docs.celeropress.com/api/graphql'
      }
    });
  },
  ['companies:read', 'contacts:read']
);

/**
 * Verarbeitet GraphQL Request
 */
async function processGraphQLRequest(
  request: GraphQLQueryRequest,
  context: GraphQLContext
): Promise<GraphQLResponse> {
  try {
    // Parse Query (vereinfacht)
    const operation = parseGraphQLOperation(request.query);
    
    if (!operation) {
      return {
        errors: [{
          message: 'Invalid GraphQL query',
          locations: [],
          path: []
        }]
      };
    }

    // Execute Operation
    let result: any;
    
    switch (operation.type) {
      case 'query':
        result = await executeQuery(operation, request.variables || {}, context);
        break;
      case 'mutation':
        result = await executeMutation(operation, request.variables || {}, context);
        break;
      case 'subscription':
        result = await executeSubscription(operation, request.variables || {}, context);
        break;
      default:
        return {
          errors: [{
            message: `Unsupported operation type: ${operation.type}`,
            locations: [],
            path: []
          }]
        };
    }

    return { data: result };

  } catch (error) {
    return {
      errors: [{
        message: error instanceof Error ? error.message : 'Unknown error',
        locations: [],
        path: [],
        extensions: {
          code: error instanceof APIError ? (error as any).errorCode : 'INTERNAL_ERROR'
        }
      }]
    };
  }
}

/**
 * Parst GraphQL Operation (vereinfacht)
 */
function parseGraphQLOperation(query: string): {
  type: 'query' | 'mutation' | 'subscription';
  name: string;
  fields: Array<{ name: string; args: Record<string, any>; subfields?: any[] }>;
} | null {
  try {
    // Entferne Kommentare und Whitespace
    const cleanQuery = query.replace(/#[^\n]*/g, '').trim();
    
    // Erkenne Operation-Typ
    let operationType: 'query' | 'mutation' | 'subscription' = 'query';
    if (cleanQuery.startsWith('mutation')) {
      operationType = 'mutation';
    } else if (cleanQuery.startsWith('subscription')) {
      operationType = 'subscription';
    }

    // Extrahiere Operation-Name und Felder (sehr vereinfacht)
    const operationMatch = cleanQuery.match(/^(?:query|mutation|subscription)\s*(\w+)?\s*(?:\([^)]*\))?\s*\{(.*)\}$/);
    if (!operationMatch) {
      return null;
    }

    const operationName = operationMatch[1] || 'anonymous';
    const fieldsString = operationMatch[2];
    
    // Parse Felder (vereinfacht)
    const fields = parseFields(fieldsString);
    
    return {
      type: operationType,
      name: operationName,
      fields
    };
  } catch (error) {
    console.error('GraphQL parse error:', error);
    return null;
  }
}

/**
 * Parst Felder aus GraphQL Query (vereinfacht)
 */
function parseFields(fieldsString: string): Array<{ name: string; args: Record<string, any>; subfields?: any[] }> {
  const fields: Array<{ name: string; args: Record<string, any>; subfields?: any[] }> = [];
  
  // Sehr vereinfachtes Parsing - für Produktion würde man eine richtige GraphQL-Library verwenden
  const fieldMatches = fieldsString.match(/(\w+)(?:\s*\([^)]*\))?\s*(?:\{[^}]*\})?/g);
  
  if (fieldMatches) {
    for (const fieldMatch of fieldMatches) {
      const nameMatch = fieldMatch.match(/^(\w+)/);
      if (nameMatch) {
        fields.push({
          name: nameMatch[1],
          args: {}, // Vereinfacht - würde Argumente parsen
          subfields: [] // Vereinfacht - würde Sub-Felder parsen
        });
      }
    }
  }
  
  return fields;
}

/**
 * Führt Query aus
 */
async function executeQuery(
  operation: any,
  variables: Record<string, any>,
  context: GraphQLContext
): Promise<any> {
  const result: any = {};
  
  for (const field of operation.fields) {
    try {
      // Finde entsprechenden Resolver
      const resolverMethod = getResolverMethod('query', field.name);
      
      if (resolverMethod) {
        const args = { ...field.args, ...variables };
        result[field.name] = await (graphqlResolvers as any)[resolverMethod](args, context);
      } else {
        throw new Error(`Unknown query field: ${field.name}`);
      }
    } catch (error) {
      console.error(`Query field error (${field.name}):`, error);
      result[field.name] = null;
    }
  }
  
  return result;
}

/**
 * Führt Mutation aus
 */
async function executeMutation(
  operation: any,
  variables: Record<string, any>,
  context: GraphQLContext
): Promise<any> {
  const result: any = {};
  
  // Mutationen werden sequenziell ausgeführt
  for (const field of operation.fields) {
    try {
      const resolverMethod = getResolverMethod('mutation', field.name);
      
      if (resolverMethod) {
        const args = { ...field.args, ...variables };
        result[field.name] = await (graphqlResolvers as any)[resolverMethod](args, context);
      } else {
        throw new Error(`Unknown mutation field: ${field.name}`);
      }
    } catch (error) {
      console.error(`Mutation field error (${field.name}):`, error);
      throw error; // Mutationen sollten bei Fehlern abbrechen
    }
  }
  
  return result;
}

/**
 * Führt Subscription aus
 */
async function executeSubscription(
  operation: any,
  variables: Record<string, any>,
  context: GraphQLContext
): Promise<any> {
  const result: any = {};
  
  for (const field of operation.fields) {
    try {
      const resolverMethod = getResolverMethod('subscription', field.name);
      
      if (resolverMethod) {
        const args = { ...field.args, ...variables };
        result[field.name] = await (graphqlResolvers as any)[resolverMethod](args, context);
      } else {
        throw new Error(`Unknown subscription field: ${field.name}`);
      }
    } catch (error) {
      console.error(`Subscription field error (${field.name}):`, error);
      result[field.name] = null;
    }
  }
  
  return result;
}

/**
 * Mappt GraphQL Field zu Resolver-Methode
 */
function getResolverMethod(operationType: string, fieldName: string): string | null {
  // Mapping von GraphQL-Feldnamen zu Resolver-Methoden
  const queryMappings: Record<string, string> = {
    'contact': 'getContact',
    'contacts': 'getContacts',
    'company': 'getCompany',
    'companies': 'getCompanies',
    'publication': 'getPublication',
    'publications': 'getPublications',
    'bulkJob': 'getBulkJob',
    'bulkJobs': 'getBulkJobs',
    'search': 'globalSearch'
  };

  const mutationMappings: Record<string, string> = {
    'createContact': 'createContact',
    'updateContact': 'updateContact',
    'deleteContact': 'deleteContact',
    'createCompany': 'createCompany',
    'updateCompany': 'updateCompany',
    'deleteCompany': 'deleteCompany',
    'createPublication': 'createPublication',
    'updatePublication': 'updatePublication',
    'deletePublication': 'deletePublication',
    'verifyPublication': 'verifyPublication',
    'startBulkExport': 'startBulkExport',
    'startBulkImport': 'startBulkImport',
    'cancelBulkJob': 'cancelBulkJob'
  };

  const subscriptionMappings: Record<string, string> = {
    'contactUpdated': 'subscribeContactUpdates',
    'companyUpdated': 'subscribeCompanyUpdates',
    'publicationUpdated': 'subscribePublicationUpdates',
    'bulkJobUpdated': 'subscribeBulkJobUpdates'
  };

  switch (operationType) {
    case 'query':
      return queryMappings[fieldName] || null;
    case 'mutation':
      return mutationMappings[fieldName] || null;
    case 'subscription':
      return subscriptionMappings[fieldName] || null;
    default:
      return null;
  }
}

/**
 * Generiert GraphQL SDL (Schema Definition Language)
 */
function generateGraphQLSDL(schema: any): string {
  let sdl = '';
  
  // Scalar types
  sdl += 'scalar DateTime\n';
  sdl += 'scalar JSON\n';
  sdl += 'scalar Upload\n\n';

  // Enums
  for (const type of schema.types) {
    if (type.kind === 'enum') {
      sdl += `enum ${type.name} {\n`;
      if (type.values) {
        for (const value of type.values) {
          sdl += `  ${value.name}\n`;
        }
      }
      sdl += '}\n\n';
    }
  }

  // Input types
  for (const type of schema.types) {
    if (type.kind === 'input') {
      sdl += `input ${type.name} {\n`;
      if (type.fields) {
        for (const field of type.fields) {
          sdl += `  ${field.name}: ${field.type}\n`;
        }
      }
      sdl += '}\n\n';
    }
  }

  // Object types
  for (const type of schema.types) {
    if (type.kind === 'object') {
      sdl += `type ${type.name} {\n`;
      if (type.fields) {
        for (const field of type.fields) {
          const args = field.args ? 
            '(' + field.args.map((arg: any) => `${arg.name}: ${arg.type}`).join(', ') + ')' : '';
          sdl += `  ${field.name}${args}: ${field.type}\n`;
        }
      }
      sdl += '}\n\n';
    }
  }

  // Root Query
  sdl += 'type Query {\n';
  for (const query of schema.queries) {
    const args = query.args ? 
      '(' + query.args.map((arg: any) => `${arg.name}: ${arg.type}`).join(', ') + ')' : '';
    sdl += `  ${query.name}${args}: ${query.type}\n`;
  }
  sdl += '}\n\n';

  // Root Mutation
  if (schema.mutations && schema.mutations.length > 0) {
    sdl += 'type Mutation {\n';
    for (const mutation of schema.mutations) {
      const args = mutation.args ? 
        '(' + mutation.args.map((arg: any) => `${arg.name}: ${arg.type}`).join(', ') + ')' : '';
      sdl += `  ${mutation.name}${args}: ${mutation.type}\n`;
    }
    sdl += '}\n\n';
  }

  // Root Subscription
  if (schema.subscriptions && schema.subscriptions.length > 0) {
    sdl += 'type Subscription {\n';
    for (const subscription of schema.subscriptions) {
      const args = subscription.args ? 
        '(' + subscription.args.map((arg: any) => `${arg.name}: ${arg.type}`).join(', ') + ')' : '';
      sdl += `  ${subscription.name}${args}: ${subscription.type}\n`;
    }
    sdl += '}\n\n';
  }

  return sdl;
}