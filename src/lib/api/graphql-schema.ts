// src/lib/api/graphql-schema.ts
import {
  GraphQLSchema,
  GraphQLTypeDefinition,
  GraphQLQueryDefinition,
  GraphQLMutationDefinition,
  GraphQLSubscriptionDefinition
} from '@/types/api-advanced';

/**
 * CeleroPress GraphQL Schema Definition
 * Definiert alle verfügbaren GraphQL Types, Queries, Mutations und Subscriptions
 */
export const CELEROPRESS_GRAPHQL_SCHEMA: GraphQLSchema = {
  types: [
    // Scalar Types
    {
      name: 'DateTime',
      kind: 'scalar',
      description: 'ISO 8601 datetime string'
    },
    {
      name: 'JSON',
      kind: 'scalar',
      description: 'JSON object'
    },
    {
      name: 'Upload',
      kind: 'scalar',
      description: 'File upload'
    },

    // Enums
    {
      name: 'ContactStatus',
      kind: 'enum',
      description: 'Contact status values',
      values: [
        { name: 'ACTIVE', value: 'active', description: 'Active contact' },
        { name: 'INACTIVE', value: 'inactive', description: 'Inactive contact' },
        { name: 'BLOCKED', value: 'blocked', description: 'Blocked contact' }
      ]
    },
    {
      name: 'PublicationType',
      kind: 'enum',
      description: 'Publication type values',
      values: [
        { name: 'MAGAZINE', value: 'magazine', description: 'Magazine publication' },
        { name: 'NEWSPAPER', value: 'newspaper', description: 'Newspaper publication' },
        { name: 'BLOG', value: 'blog', description: 'Blog publication' },
        { name: 'PODCAST', value: 'podcast', description: 'Podcast publication' },
        { name: 'NEWSLETTER', value: 'newsletter', description: 'Newsletter publication' },
        { name: 'SOCIAL_MEDIA', value: 'social_media', description: 'Social media publication' }
      ]
    },
    {
      name: 'SortOrder',
      kind: 'enum',
      description: 'Sort order for queries',
      values: [
        { name: 'ASC', value: 'asc', description: 'Ascending order' },
        { name: 'DESC', value: 'desc', description: 'Descending order' }
      ]
    },

    // Input Types
    {
      name: 'ContactInput',
      kind: 'input',
      description: 'Input for creating or updating a contact',
      fields: [
        { name: 'firstName', type: 'String', description: 'First name' },
        { name: 'lastName', type: 'String', description: 'Last name' },
        { name: 'email', type: 'String!', description: 'Email address (required)' },
        { name: 'company', type: 'String', description: 'Company name' },
        { name: 'position', type: 'String', description: 'Job position' },
        { name: 'phone', type: 'String', description: 'Phone number' },
        { name: 'website', type: 'String', description: 'Personal website' },
        { name: 'tags', type: '[String!]', description: 'Tags for categorization', list: true },
        { name: 'status', type: 'ContactStatus', description: 'Contact status' },
        { name: 'notes', type: 'String', description: 'Additional notes' }
      ]
    },
    {
      name: 'CompanyInput',
      kind: 'input',
      description: 'Input for creating or updating a company',
      fields: [
        { name: 'name', type: 'String!', description: 'Company name (required)' },
        { name: 'website', type: 'String', description: 'Company website' },
        { name: 'description', type: 'String', description: 'Company description' },
        { name: 'industry', type: 'String', description: 'Industry sector' },
        { name: 'employees', type: 'Int', description: 'Number of employees' },
        { name: 'tags', type: '[String!]', description: 'Tags for categorization', list: true },
        { name: 'location', type: 'JSON', description: 'Location information' }
      ]
    },
    {
      name: 'PublicationInput',
      kind: 'input',
      description: 'Input for creating or updating a publication',
      fields: [
        { name: 'title', type: 'String!', description: 'Publication title (required)' },
        { name: 'type', type: 'PublicationType!', description: 'Publication type (required)' },
        { name: 'publisherName', type: 'String!', description: 'Publisher name (required)' },
        { name: 'publisherLogoUrl', type: 'String', description: 'Publisher logo URL' },
        { name: 'description', type: 'String', description: 'Publication description' },
        { name: 'website', type: 'String', description: 'Publication website' },
        { name: 'tags', type: '[String!]', description: 'Tags for categorization', list: true },
        { name: 'verified', type: 'Boolean', description: 'Verification status' }
      ]
    },
    {
      name: 'FilterInput',
      kind: 'input',
      description: 'Generic filter input for queries',
      fields: [
        { name: 'search', type: 'String', description: 'Text search query' },
        { name: 'tags', type: '[String!]', description: 'Filter by tags', list: true },
        { name: 'dateFrom', type: 'DateTime', description: 'Start date filter' },
        { name: 'dateTo', type: 'DateTime', description: 'End date filter' },
        { name: 'status', type: 'String', description: 'Status filter' }
      ]
    },
    {
      name: 'SortInput',
      kind: 'input',
      description: 'Sort configuration for queries',
      fields: [
        { name: 'field', type: 'String!', description: 'Field to sort by (required)' },
        { name: 'order', type: 'SortOrder', description: 'Sort order' }
      ]
    },
    {
      name: 'PaginationInput',
      kind: 'input',
      description: 'Pagination configuration for queries',
      fields: [
        { name: 'page', type: 'Int', description: 'Page number (1-based)' },
        { name: 'limit', type: 'Int', description: 'Items per page' },
        { name: 'offset', type: 'Int', description: 'Skip items (alternative to page)' }
      ]
    },

    // Object Types
    {
      name: 'Contact',
      kind: 'object',
      description: 'A contact in the system',
      fields: [
        { name: 'id', type: 'ID!', description: 'Unique contact ID' },
        { name: 'firstName', type: 'String', description: 'First name' },
        { name: 'lastName', type: 'String', description: 'Last name' },
        { name: 'fullName', type: 'String', description: 'Computed full name' },
        { name: 'email', type: 'String!', description: 'Email address' },
        { name: 'company', type: 'String', description: 'Company name' },
        { name: 'position', type: 'String', description: 'Job position' },
        { name: 'phone', type: 'String', description: 'Phone number' },
        { name: 'website', type: 'String', description: 'Personal website' },
        { name: 'tags', type: '[String!]', description: 'Associated tags', list: true },
        { name: 'status', type: 'ContactStatus!', description: 'Contact status' },
        { name: 'notes', type: 'String', description: 'Additional notes' },
        { name: 'createdAt', type: 'DateTime!', description: 'Creation timestamp' },
        { name: 'updatedAt', type: 'DateTime!', description: 'Last update timestamp' },
        { name: 'companyDetails', type: 'Company', description: 'Related company details' }
      ]
    },
    {
      name: 'Company',
      kind: 'object',
      description: 'A company in the system',
      fields: [
        { name: 'id', type: 'ID!', description: 'Unique company ID' },
        { name: 'name', type: 'String!', description: 'Company name' },
        { name: 'website', type: 'String', description: 'Company website' },
        { name: 'description', type: 'String', description: 'Company description' },
        { name: 'industry', type: 'String', description: 'Industry sector' },
        { name: 'employees', type: 'Int', description: 'Number of employees' },
        { name: 'tags', type: '[String!]', description: 'Associated tags', list: true },
        { name: 'location', type: 'JSON', description: 'Location information' },
        { name: 'createdAt', type: 'DateTime!', description: 'Creation timestamp' },
        { name: 'updatedAt', type: 'DateTime!', description: 'Last update timestamp' },
        { name: 'contacts', type: '[Contact!]', description: 'Related contacts', list: true,
          args: [
            { name: 'filter', type: 'FilterInput', description: 'Filter contacts' },
            { name: 'sort', type: 'SortInput', description: 'Sort contacts' },
            { name: 'pagination', type: 'PaginationInput', description: 'Paginate results' }
          ]
        }
      ]
    },
    {
      name: 'Publisher',
      kind: 'object',
      description: 'A publication publisher',
      fields: [
        { name: 'id', type: 'ID!', description: 'Unique publisher ID' },
        { name: 'name', type: 'String!', description: 'Publisher name' },
        { name: 'logoUrl', type: 'String', description: 'Publisher logo URL' }
      ]
    },
    {
      name: 'Publication',
      kind: 'object',
      description: 'A publication in the system',
      fields: [
        { name: 'id', type: 'ID!', description: 'Unique publication ID' },
        { name: 'title', type: 'String!', description: 'Publication title' },
        { name: 'type', type: 'PublicationType!', description: 'Publication type' },
        { name: 'publisher', type: 'Publisher!', description: 'Publisher information' },
        { name: 'description', type: 'String', description: 'Publication description' },
        { name: 'website', type: 'String', description: 'Publication website' },
        { name: 'tags', type: '[String!]', description: 'Associated tags', list: true },
        { name: 'verified', type: 'Boolean!', description: 'Verification status' },
        { name: 'metrics', type: 'JSON', description: 'Publication metrics' },
        { name: 'createdAt', type: 'DateTime!', description: 'Creation timestamp' },
        { name: 'updatedAt', type: 'DateTime!', description: 'Last update timestamp' }
      ]
    },
    {
      name: 'BulkJob',
      kind: 'object',
      description: 'A bulk import/export job',
      fields: [
        { name: 'id', type: 'ID!', description: 'Unique job ID' },
        { name: 'type', type: 'String!', description: 'Job type (import/export)' },
        { name: 'status', type: 'String!', description: 'Current job status' },
        { name: 'progress', type: 'JSON!', description: 'Job progress information' },
        { name: 'result', type: 'JSON', description: 'Job results' },
        { name: 'error', type: 'JSON', description: 'Error information if failed' },
        { name: 'createdAt', type: 'DateTime!', description: 'Creation timestamp' },
        { name: 'updatedAt', type: 'DateTime!', description: 'Last update timestamp' },
        { name: 'expiresAt', type: 'DateTime', description: 'Expiration timestamp' }
      ]
    },

    // Connection Types für Pagination
    {
      name: 'PageInfo',
      kind: 'object',
      description: 'Pagination information',
      fields: [
        { name: 'hasNextPage', type: 'Boolean!', description: 'Has more pages' },
        { name: 'hasPreviousPage', type: 'Boolean!', description: 'Has previous pages' },
        { name: 'startCursor', type: 'String', description: 'Start cursor' },
        { name: 'endCursor', type: 'String', description: 'End cursor' }
      ]
    },
    {
      name: 'ContactConnection',
      kind: 'object',
      description: 'Paginated contacts connection',
      fields: [
        { name: 'edges', type: '[ContactEdge!]!', description: 'Contact edges', list: true },
        { name: 'pageInfo', type: 'PageInfo!', description: 'Pagination info' },
        { name: 'totalCount', type: 'Int!', description: 'Total number of items' }
      ]
    },
    {
      name: 'ContactEdge',
      kind: 'object',
      description: 'Contact edge for connections',
      fields: [
        { name: 'node', type: 'Contact!', description: 'The contact' },
        { name: 'cursor', type: 'String!', description: 'Cursor for pagination' }
      ]
    },
    {
      name: 'CompanyConnection',
      kind: 'object',
      description: 'Paginated companies connection',
      fields: [
        { name: 'edges', type: '[CompanyEdge!]!', description: 'Company edges', list: true },
        { name: 'pageInfo', type: 'PageInfo!', description: 'Pagination info' },
        { name: 'totalCount', type: 'Int!', description: 'Total number of items' }
      ]
    },
    {
      name: 'CompanyEdge',
      kind: 'object',
      description: 'Company edge for connections',
      fields: [
        { name: 'node', type: 'Company!', description: 'The company' },
        { name: 'cursor', type: 'String!', description: 'Cursor for pagination' }
      ]
    },
    {
      name: 'PublicationConnection',
      kind: 'object',
      description: 'Paginated publications connection',
      fields: [
        { name: 'edges', type: '[PublicationEdge!]!', description: 'Publication edges', list: true },
        { name: 'pageInfo', type: 'PageInfo!', description: 'Pagination info' },
        { name: 'totalCount', type: 'Int!', description: 'Total number of items' }
      ]
    },
    {
      name: 'PublicationEdge',
      kind: 'object',
      description: 'Publication edge for connections',
      fields: [
        { name: 'node', type: 'Publication!', description: 'The publication' },
        { name: 'cursor', type: 'String!', description: 'Cursor for pagination' }
      ]
    }
  ],

  queries: [
    // Contact Queries
    {
      name: 'contact',
      type: 'Contact',
      description: 'Get a single contact by ID',
      args: [
        { name: 'id', type: 'ID!', description: 'Contact ID' }
      ],
      resolver: 'getContact'
    },
    {
      name: 'contacts',
      type: 'ContactConnection!',
      description: 'Get paginated contacts',
      args: [
        { name: 'first', type: 'Int', description: 'Number of items to fetch' },
        { name: 'after', type: 'String', description: 'Cursor to fetch after' },
        { name: 'last', type: 'Int', description: 'Number of items to fetch from end' },
        { name: 'before', type: 'String', description: 'Cursor to fetch before' },
        { name: 'filter', type: 'FilterInput', description: 'Filter contacts' },
        { name: 'sort', type: 'SortInput', description: 'Sort contacts' }
      ],
      resolver: 'getContacts'
    },

    // Company Queries
    {
      name: 'company',
      type: 'Company',
      description: 'Get a single company by ID',
      args: [
        { name: 'id', type: 'ID!', description: 'Company ID' }
      ],
      resolver: 'getCompany'
    },
    {
      name: 'companies',
      type: 'CompanyConnection!',
      description: 'Get paginated companies',
      args: [
        { name: 'first', type: 'Int', description: 'Number of items to fetch' },
        { name: 'after', type: 'String', description: 'Cursor to fetch after' },
        { name: 'last', type: 'Int', description: 'Number of items to fetch from end' },
        { name: 'before', type: 'String', description: 'Cursor to fetch before' },
        { name: 'filter', type: 'FilterInput', description: 'Filter companies' },
        { name: 'sort', type: 'SortInput', description: 'Sort companies' }
      ],
      resolver: 'getCompanies'
    },

    // Publication Queries
    {
      name: 'publication',
      type: 'Publication',
      description: 'Get a single publication by ID',
      args: [
        { name: 'id', type: 'ID!', description: 'Publication ID' }
      ],
      resolver: 'getPublication'
    },
    {
      name: 'publications',
      type: 'PublicationConnection!',
      description: 'Get paginated publications',
      args: [
        { name: 'first', type: 'Int', description: 'Number of items to fetch' },
        { name: 'after', type: 'String', description: 'Cursor to fetch after' },
        { name: 'last', type: 'Int', description: 'Number of items to fetch from end' },
        { name: 'before', type: 'String', description: 'Cursor to fetch before' },
        { name: 'filter', type: 'FilterInput', description: 'Filter publications' },
        { name: 'sort', type: 'SortInput', description: 'Sort publications' }
      ],
      resolver: 'getPublications'
    },

    // Bulk Job Queries
    {
      name: 'bulkJob',
      type: 'BulkJob',
      description: 'Get a bulk job by ID',
      args: [
        { name: 'id', type: 'ID!', description: 'Job ID' }
      ],
      resolver: 'getBulkJob'
    },
    {
      name: 'bulkJobs',
      type: '[BulkJob!]!',
      description: 'Get all bulk jobs',
      args: [
        { name: 'type', type: 'String', description: 'Filter by job type' },
        { name: 'status', type: 'String', description: 'Filter by job status' },
        { name: 'pagination', type: 'PaginationInput', description: 'Pagination' }
      ],
      resolver: 'getBulkJobs'
    },

    // Search Queries
    {
      name: 'search',
      type: 'JSON!',
      description: 'Global search across all entities',
      args: [
        { name: 'query', type: 'String!', description: 'Search query' },
        { name: 'entities', type: '[String!]', description: 'Entity types to search', list: true },
        { name: 'limit', type: 'Int', description: 'Max results per entity type' }
      ],
      resolver: 'globalSearch'
    }
  ],

  mutations: [
    // Contact Mutations
    {
      name: 'createContact',
      type: 'Contact!',
      description: 'Create a new contact',
      args: [
        { name: 'input', type: 'ContactInput!', description: 'Contact data' }
      ],
      resolver: 'createContact'
    },
    {
      name: 'updateContact',
      type: 'Contact!',
      description: 'Update an existing contact',
      args: [
        { name: 'id', type: 'ID!', description: 'Contact ID' },
        { name: 'input', type: 'ContactInput!', description: 'Updated contact data' }
      ],
      resolver: 'updateContact'
    },
    {
      name: 'deleteContact',
      type: 'Boolean!',
      description: 'Delete a contact',
      args: [
        { name: 'id', type: 'ID!', description: 'Contact ID' }
      ],
      resolver: 'deleteContact'
    },

    // Company Mutations
    {
      name: 'createCompany',
      type: 'Company!',
      description: 'Create a new company',
      args: [
        { name: 'input', type: 'CompanyInput!', description: 'Company data' }
      ],
      resolver: 'createCompany'
    },
    {
      name: 'updateCompany',
      type: 'Company!',
      description: 'Update an existing company',
      args: [
        { name: 'id', type: 'ID!', description: 'Company ID' },
        { name: 'input', type: 'CompanyInput!', description: 'Updated company data' }
      ],
      resolver: 'updateCompany'
    },
    {
      name: 'deleteCompany',
      type: 'Boolean!',
      description: 'Delete a company',
      args: [
        { name: 'id', type: 'ID!', description: 'Company ID' }
      ],
      resolver: 'deleteCompany'
    },

    // Publication Mutations
    {
      name: 'createPublication',
      type: 'Publication!',
      description: 'Create a new publication',
      args: [
        { name: 'input', type: 'PublicationInput!', description: 'Publication data' }
      ],
      resolver: 'createPublication'
    },
    {
      name: 'updatePublication',
      type: 'Publication!',
      description: 'Update an existing publication',
      args: [
        { name: 'id', type: 'ID!', description: 'Publication ID' },
        { name: 'input', type: 'PublicationInput!', description: 'Updated publication data' }
      ],
      resolver: 'updatePublication'
    },
    {
      name: 'deletePublication',
      type: 'Boolean!',
      description: 'Delete a publication',
      args: [
        { name: 'id', type: 'ID!', description: 'Publication ID' }
      ],
      resolver: 'deletePublication'
    },
    {
      name: 'verifyPublication',
      type: 'Publication!',
      description: 'Verify a publication',
      args: [
        { name: 'id', type: 'ID!', description: 'Publication ID' }
      ],
      resolver: 'verifyPublication'
    },

    // Bulk Operations
    {
      name: 'startBulkExport',
      type: 'BulkJob!',
      description: 'Start a bulk export job',
      args: [
        { name: 'entities', type: '[String!]!', description: 'Entities to export', list: true },
        { name: 'format', type: 'String!', description: 'Export format' },
        { name: 'options', type: 'JSON', description: 'Export options' }
      ],
      resolver: 'startBulkExport'
    },
    {
      name: 'startBulkImport',
      type: 'BulkJob!',
      description: 'Start a bulk import job',
      args: [
        { name: 'entity', type: 'String!', description: 'Entity to import' },
        { name: 'format', type: 'String!', description: 'Import format' },
        { name: 'fileUrl', type: 'String', description: 'URL to import file' },
        { name: 'fileContent', type: 'String', description: 'Direct file content' },
        { name: 'options', type: 'JSON', description: 'Import options' }
      ],
      resolver: 'startBulkImport'
    },
    {
      name: 'cancelBulkJob',
      type: 'Boolean!',
      description: 'Cancel a running bulk job',
      args: [
        { name: 'id', type: 'ID!', description: 'Job ID' }
      ],
      resolver: 'cancelBulkJob'
    }
  ],

  subscriptions: [
    // Real-time Updates
    {
      name: 'contactUpdated',
      type: 'Contact!',
      description: 'Subscribe to contact updates',
      args: [
        { name: 'id', type: 'ID', description: 'Specific contact ID to watch' }
      ],
      resolver: 'subscribeContactUpdates',
      trigger: 'contact.updated'
    },
    {
      name: 'companyUpdated',
      type: 'Company!',
      description: 'Subscribe to company updates',
      args: [
        { name: 'id', type: 'ID', description: 'Specific company ID to watch' }
      ],
      resolver: 'subscribeCompanyUpdates',
      trigger: 'company.updated'
    },
    {
      name: 'publicationUpdated',
      type: 'Publication!',
      description: 'Subscribe to publication updates',
      args: [
        { name: 'id', type: 'ID', description: 'Specific publication ID to watch' }
      ],
      resolver: 'subscribePublicationUpdates',
      trigger: 'publication.updated'
    },
    {
      name: 'bulkJobUpdated',
      type: 'BulkJob!',
      description: 'Subscribe to bulk job progress updates',
      args: [
        { name: 'id', type: 'ID!', description: 'Job ID to watch' }
      ],
      resolver: 'subscribeBulkJobUpdates',
      trigger: 'bulk_job.updated'
    }
  ]
};