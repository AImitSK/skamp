'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeftIcon,
  PlayIcon,
  DocumentDuplicateIcon,
  ChevronDownIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline';
import Link from 'next/link';

const API_ENDPOINTS = {
  'Authentication': [
    { method: 'GET', path: '/api/v1/auth/test', description: 'Test API Key' },
    { method: 'GET', path: '/api/v1/auth/keys', description: 'List API Keys' },
    { method: 'POST', path: '/api/v1/auth/keys', description: 'Create API Key' }
  ],
  'Contacts': [
    { method: 'GET', path: '/api/v1/contacts', description: 'List Contacts' },
    { method: 'POST', path: '/api/v1/contacts', description: 'Create Contact' },
    { method: 'GET', path: '/api/v1/contacts/{id}', description: 'Get Contact' },
    { method: 'PUT', path: '/api/v1/contacts/{id}', description: 'Update Contact' },
    { method: 'DELETE', path: '/api/v1/contacts/{id}', description: 'Delete Contact' }
  ],
  'Companies': [
    { method: 'GET', path: '/api/v1/companies', description: 'List Companies' },
    { method: 'POST', path: '/api/v1/companies', description: 'Create Company' },
    { method: 'GET', path: '/api/v1/companies/{id}', description: 'Get Company' },
    { method: 'PUT', path: '/api/v1/companies/{id}', description: 'Update Company' },
    { method: 'DELETE', path: '/api/v1/companies/{id}', description: 'Delete Company' }
  ],
  'Publications': [
    { method: 'GET', path: '/api/v1/publications', description: 'List Publications' },
    { method: 'POST', path: '/api/v1/publications', description: 'Create Publication' },
    { method: 'GET', path: '/api/v1/publications/statistics', description: 'Get Statistics' }
  ],
  'Search': [
    { method: 'POST', path: '/api/v1/search', description: 'Search Entities' },
    { method: 'GET', path: '/api/v1/search/suggestions', description: 'Get Suggestions' }
  ],
  'Export/Import': [
    { method: 'POST', path: '/api/v1/export', description: 'Start Export' },
    { method: 'GET', path: '/api/v1/export/{jobId}', description: 'Get Export Status' },
    { method: 'POST', path: '/api/v1/import', description: 'Start Import' },
    { method: 'GET', path: '/api/v1/import/{jobId}', description: 'Get Import Status' }
  ],
  'Webhooks': [
    { method: 'GET', path: '/api/v1/webhooks', description: 'List Webhooks' },
    { method: 'POST', path: '/api/v1/webhooks', description: 'Create Webhook' },
    { method: 'POST', path: '/api/v1/webhooks/{id}/test', description: 'Test Webhook' }
  ],
  'GraphQL': [
    { method: 'POST', path: '/api/v1/graphql', description: 'GraphQL Endpoint' }
  ],
  'WebSocket': [
    { method: 'WS', path: '/api/v1/websocket', description: 'WebSocket Connection' },
    { method: 'POST', path: '/api/v1/websocket/subscriptions', description: 'Manage Subscriptions' }
  ]
};

const SAMPLE_PAYLOADS: { [key: string]: any } = {
  '/api/v1/contacts': {
    firstName: 'Max',
    lastName: 'Mustermann',
    email: 'max@example.com',
    company: 'Example GmbH',
    position: 'CEO',
    tags: ['wichtig', 'partner']
  },
  '/api/v1/companies': {
    name: 'Example Media GmbH',
    type: 'media_house',
    website: 'https://example.com',
    circulation: 50000,
    tags: ['print', 'digital']
  },
  '/api/v1/webhooks': {
    url: 'https://your-server.com/webhook',
    events: ['contact.created', 'contact.updated'],
    active: true
  },
  '/api/v1/search': {
    query: 'test',
    entities: ['contacts', 'companies'],
    limit: 10
  },
  '/api/v1/export': {
    entity: 'contacts',
    format: 'csv',
    filters: {}
  },
  '/api/v1/graphql': {
    query: `
      query GetContacts {
        contacts(limit: 10) {
          id
          firstName
          lastName
          email
          company {
            name
            type
          }
        }
      }
    `
  }
};

export default function APIPlayground() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [apiKey, setApiKey] = useState('');
  const [selectedEndpoint, setSelectedEndpoint] = useState<any>(null);
  const [method, setMethod] = useState('GET');
  const [path, setPath] = useState('/api/v1/auth/test');
  const [headers, setHeaders] = useState<string>('');
  const [body, setBody] = useState<string>('');
  const [response, setResponse] = useState<string>('');
  const [responseStatus, setResponseStatus] = useState<number | null>(null);
  const [responseTime, setResponseTime] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['Authentication']));

  useEffect(() => {
    if (!loading && !user) {
      router.push('/');
    }
  }, [user, loading, router]);

  useEffect(() => {
    // Lade API Key
    if (user) {
      user.getIdToken().then(token => {
        setHeaders(`Authorization: Bearer ${token}`);
      });
    }
  }, [user]);

  const executeRequest = async () => {
    setIsLoading(true);
    setResponse('');
    setResponseStatus(null);
    setResponseTime(null);

    const startTime = Date.now();

    try {
      const requestHeaders: any = {
        'Content-Type': 'application/json'
      };

      // Parse custom headers
      if (headers) {
        headers.split('\n').forEach(line => {
          const [key, value] = line.split(':').map(s => s.trim());
          if (key && value) {
            requestHeaders[key] = value;
          }
        });
      }

      const requestOptions: RequestInit = {
        method: method,
        headers: requestHeaders
      };

      if (body && method !== 'GET') {
        requestOptions.body = body;
      }

      const finalPath = path.replace('{id}', 'test-id-123');
      const res = await fetch(finalPath, requestOptions);
      const responseTime = Date.now() - startTime;

      setResponseStatus(res.status);
      setResponseTime(responseTime);

      const contentType = res.headers.get('content-type');
      let responseData;
      
      if (contentType?.includes('application/json')) {
        responseData = await res.json();
        setResponse(JSON.stringify(responseData, null, 2));
      } else {
        responseData = await res.text();
        setResponse(responseData);
      }
    } catch (error: any) {
      setResponse(`Error: ${error.message}`);
      setResponseStatus(0);
    } finally {
      setIsLoading(false);
    }
  };

  const selectEndpoint = (endpoint: any) => {
    setSelectedEndpoint(endpoint);
    setMethod(endpoint.method);
    setPath(endpoint.path);
    
    // Set sample payload if available
    const basePath = endpoint.path.split('{')[0].replace(/\/$/, '');
    if (SAMPLE_PAYLOADS[basePath] && endpoint.method === 'POST') {
      setBody(JSON.stringify(SAMPLE_PAYLOADS[basePath], null, 2));
    } else {
      setBody('');
    }
  };

  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const getMethodColor = (method: string) => {
    switch (method) {
      case 'GET': return 'bg-blue-100 text-blue-800';
      case 'POST': return 'bg-green-100 text-green-800';
      case 'PUT': return 'bg-yellow-100 text-yellow-800';
      case 'DELETE': return 'bg-red-100 text-red-800';
      case 'WS': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center">
              <Link
                href="/dashboard/developer"
                className="inline-flex items-center bg-gray-50 hover:bg-gray-100 text-gray-900 border-0 rounded-md px-3 py-2 text-sm font-medium mr-4"
              >
                <ArrowLeftIcon className="h-4 w-4 mr-2" />
                Zurück zum Developer Portal
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">API Playground</h1>
                <p className="text-sm text-gray-600">
                  Teste API-Endpunkte direkt im Browser
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Sidebar with endpoints */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm p-4">
              <h2 className="text-lg font-semibold mb-4">API Endpoints</h2>
              <div className="space-y-2">
                {Object.entries(API_ENDPOINTS).map(([category, endpoints]) => (
                  <div key={category}>
                    <button
                      onClick={() => toggleCategory(category)}
                      className="w-full flex items-center justify-between px-3 py-2 text-sm font-medium text-gray-900 hover:bg-gray-50 rounded-md"
                    >
                      <span>{category}</span>
                      {expandedCategories.has(category) ? (
                        <ChevronDownIcon className="h-4 w-4" />
                      ) : (
                        <ChevronRightIcon className="h-4 w-4" />
                      )}
                    </button>
                    {expandedCategories.has(category) && (
                      <div className="ml-4 space-y-1">
                        {endpoints.map((endpoint, index) => (
                          <button
                            key={index}
                            onClick={() => selectEndpoint(endpoint)}
                            className={`w-full text-left px-3 py-2 text-sm rounded-md hover:bg-gray-50 ${
                              selectedEndpoint === endpoint ? 'bg-blue-50' : ''
                            }`}
                          >
                            <div className="flex items-center space-x-2">
                              <span className={`px-2 py-0.5 text-xs font-medium rounded ${getMethodColor(endpoint.method)}`}>
                                {endpoint.method}
                              </span>
                              <span className="text-gray-700 truncate">{endpoint.path.split('/').pop()}</span>
                            </div>
                            <div className="text-xs text-gray-500 mt-1">{endpoint.description}</div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Main content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Request Builder */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold mb-4">Request</h2>
              
              {/* Method and Path */}
              <div className="flex space-x-4 mb-4">
                <select
                  value={method}
                  onChange={(e) => setMethod(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="GET">GET</option>
                  <option value="POST">POST</option>
                  <option value="PUT">PUT</option>
                  <option value="DELETE">DELETE</option>
                </select>
                <input
                  type="text"
                  value={path}
                  onChange={(e) => setPath(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="/api/v1/..."
                />
              </div>

              {/* Headers */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Headers
                </label>
                <textarea
                  value={headers}
                  onChange={(e) => setHeaders(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                  placeholder="Authorization: Bearer your-api-key"
                />
              </div>

              {/* Body */}
              {method !== 'GET' && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Body (JSON)
                  </label>
                  <textarea
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    rows={8}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                    placeholder='{"key": "value"}'
                  />
                </div>
              )}

              {/* Execute Button */}
              <button
                onClick={executeRequest}
                disabled={isLoading}
                className="w-full flex items-center justify-center bg-primary hover:bg-primary-hover text-white border-0 rounded-md px-4 py-2 text-sm font-medium disabled:opacity-50"
              >
                {isLoading ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                ) : (
                  <>
                    <PlayIcon className="h-5 w-5 mr-2" />
                    Execute Request
                  </>
                )}
              </button>
            </div>

            {/* Response */}
            {(response || responseStatus !== null) && (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold">Response</h2>
                  <div className="flex items-center space-x-4">
                    {responseStatus !== null && (
                      <span className={`px-2 py-1 text-xs font-medium rounded ${
                        responseStatus >= 200 && responseStatus < 300
                          ? 'bg-green-100 text-green-800'
                          : responseStatus >= 400
                          ? 'bg-red-100 text-red-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {responseStatus}
                      </span>
                    )}
                    {responseTime !== null && (
                      <span className="text-sm text-gray-600">
                        {responseTime}ms
                      </span>
                    )}
                    <button
                      onClick={() => copyToClipboard(response)}
                      className="p-1 hover:bg-gray-100 rounded"
                    >
                      <DocumentDuplicateIcon className="h-5 w-5 text-gray-600" />
                    </button>
                  </div>
                </div>
                <pre className="bg-gray-900 text-gray-300 p-4 rounded-md overflow-x-auto">
                  <code className="text-sm">{response}</code>
                </pre>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}