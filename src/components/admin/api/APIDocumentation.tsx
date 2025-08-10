// src/components/admin/api/APIDocumentation.tsx
"use client";

import { useState } from 'react';
import { Subheading } from "@/components/ui/heading";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  DocumentTextIcon,
  CommandLineIcon,
  GlobeAltIcon,
  CodeBracketIcon,
  BookOpenIcon,
  ArrowTopRightOnSquareIcon
} from "@heroicons/react/24/outline";

interface APIDocumentationProps {
  className?: string;
}

interface APIEndpoint {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  description: string;
  permissions: string[];
  example?: string;
}

const API_ENDPOINTS: { category: string; endpoints: APIEndpoint[] }[] = [
  {
    category: 'Kontakte',
    endpoints: [
      {
        method: 'GET',
        path: '/api/v1/contacts',
        description: 'Liste aller Kontakte mit Filterung und Pagination',
        permissions: ['contacts:read'],
        example: 'curl -H "Authorization: Bearer YOUR_API_KEY" https://your-domain.com/api/v1/contacts?limit=25&page=1'
      },
      {
        method: 'POST',
        path: '/api/v1/contacts',
        description: 'Neuen Kontakt erstellen',
        permissions: ['contacts:write'],
        example: 'curl -X POST -H "Authorization: Bearer YOUR_API_KEY" -H "Content-Type: application/json" -d \'{"firstName":"John","lastName":"Doe","email":"john@example.com"}\' https://your-domain.com/api/v1/contacts'
      },
      {
        method: 'GET',
        path: '/api/v1/contacts/{id}',
        description: 'Spezifischen Kontakt abrufen',
        permissions: ['contacts:read']
      },
      {
        method: 'PUT',
        path: '/api/v1/contacts/{id}',
        description: 'Kontakt aktualisieren',
        permissions: ['contacts:write']
      },
      {
        method: 'DELETE',
        path: '/api/v1/contacts/{id}',
        description: 'Kontakt löschen',
        permissions: ['contacts:delete']
      }
    ]
  },
  {
    category: 'Firmen',
    endpoints: [
      {
        method: 'GET',
        path: '/api/v1/companies',
        description: 'Liste aller Firmen mit Filterung und Pagination',
        permissions: ['companies:read']
      },
      {
        method: 'POST',
        path: '/api/v1/companies',
        description: 'Neue Firma erstellen',
        permissions: ['companies:write']
      },
      {
        method: 'GET',
        path: '/api/v1/companies/{id}',
        description: 'Spezifische Firma abrufen',
        permissions: ['companies:read']
      },
      {
        method: 'PUT',
        path: '/api/v1/companies/{id}',
        description: 'Firma aktualisieren',
        permissions: ['companies:write']
      },
      {
        method: 'DELETE',
        path: '/api/v1/companies/{id}',
        description: 'Firma löschen',
        permissions: ['companies:delete']
      }
    ]
  },
  {
    category: 'Publikationen',
    endpoints: [
      {
        method: 'GET',
        path: '/api/v1/publications',
        description: 'Liste aller Publikationen mit erweiterten Filtern',
        permissions: ['publications:read'],
        example: 'curl -H "Authorization: Bearer YOUR_API_KEY" "https://your-domain.com/api/v1/publications?type=newspaper&country=DE&verified=true"'
      },
      {
        method: 'POST',
        path: '/api/v1/publications',
        description: 'Neue Publikation erstellen',
        permissions: ['publications:write']
      },
      {
        method: 'GET',
        path: '/api/v1/publications/{id}',
        description: 'Spezifische Publikation mit allen Details abrufen',
        permissions: ['publications:read']
      },
      {
        method: 'PUT',
        path: '/api/v1/publications/{id}',
        description: 'Publikation aktualisieren',
        permissions: ['publications:write']
      },
      {
        method: 'DELETE',
        path: '/api/v1/publications/{id}',
        description: 'Publikation löschen',
        permissions: ['publications:delete']
      }
    ]
  }
];

const INTEGRATION_EXAMPLES = [
  {
    title: 'JavaScript/Node.js',
    code: `// CeleroPress API Client
const api = new CeleroPressAPI({
  apiKey: 'cp_live_your_api_key_here',
  baseUrl: 'https://your-domain.com'
});

// Kontakte abrufen
const contacts = await api.contacts.list({
  limit: 50,
  tags: ['journalist'],
  search: 'tech reporter'
});

// Neuen Kontakt erstellen
const newContact = await api.contacts.create({
  firstName: 'Jane',
  lastName: 'Smith',
  email: 'jane.smith@techmagazine.com',
  company: 'Tech Weekly',
  tags: ['journalist', 'tech']
});`
  },
  {
    title: 'Python',
    code: `import requests

# CeleroPress API Client
class CeleroPressAPI:
    def __init__(self, api_key, base_url):
        self.api_key = api_key
        self.base_url = base_url
        self.headers = {
            'Authorization': f'Bearer {api_key}',
            'Content-Type': 'application/json'
        }
    
    def get_contacts(self, **params):
        response = requests.get(
            f'{self.base_url}/api/v1/contacts',
            headers=self.headers,
            params=params
        )
        return response.json()

# Verwendung
api = CeleroPressAPI(
    api_key='cp_live_your_api_key_here',
    base_url='https://your-domain.com'
)

contacts = api.get_contacts(limit=50, tags='journalist')`
  },
  {
    title: 'PHP',
    code: `<?php
class CeleroPressAPI {
    private $apiKey;
    private $baseUrl;
    
    public function __construct($apiKey, $baseUrl) {
        $this->apiKey = $apiKey;
        $this->baseUrl = $baseUrl;
    }
    
    public function getContacts($params = []) {
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $this->baseUrl . '/api/v1/contacts?' . http_build_query($params));
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Authorization: Bearer ' . $this->apiKey,
            'Content-Type: application/json'
        ]);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        
        $response = curl_exec($ch);
        curl_close($ch);
        
        return json_decode($response, true);
    }
}

// Verwendung
$api = new CeleroPressAPI('cp_live_your_api_key_here', 'https://your-domain.com');
$contacts = $api->getContacts(['limit' => 50, 'tags' => 'journalist']);
?>`
  }
];

export function APIDocumentation({ className = '' }: APIDocumentationProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('Kontakte');
  const [selectedLanguage, setSelectedLanguage] = useState<string>('JavaScript/Node.js');

  const getMethodColor = (method: string): "blue" | "green" | "yellow" | "red" => {
    switch (method) {
      case 'GET': return 'blue';
      case 'POST': return 'green'; 
      case 'PUT': return 'yellow';
      case 'DELETE': return 'red';
      default: return 'blue';
    }
  };

  return (
    <div className={className}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <Subheading level={2}>API-Dokumentation</Subheading>
          <Text className="mt-2 text-zinc-500 dark:text-zinc-400">
            Vollständige Referenz für die CeleroPress REST API
          </Text>
        </div>
        <div className="flex gap-3">
          <Button plain className="flex items-center gap-2">
            <BookOpenIcon className="h-4 w-4" />
            Vollständige Docs
            <ArrowTopRightOnSquareIcon className="h-3 w-3" />
          </Button>
          <Button plain className="flex items-center gap-2">
            <GlobeAltIcon className="h-4 w-4" />
            API Playground
            <ArrowTopRightOnSquareIcon className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Quick Start */}
      <div 
        className="mb-8 p-6 rounded-lg border border-gray-200"
        style={{ backgroundColor: '#f1f0e2' }}
      >
        <div className="flex items-center gap-3 mb-4">
          <CommandLineIcon className="h-6 w-6 text-blue-600" />
          <Text className="font-semibold text-gray-900">Quick Start</Text>
        </div>
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <Text className="font-medium mb-2">1. API-Key erstellen</Text>
            <Text className="text-sm text-gray-600 mb-4">
              Erstelle einen neuen API-Key oben auf dieser Seite mit den benötigten Berechtigungen.
            </Text>
          </div>
          <div>
            <Text className="font-medium mb-2">2. Ersten API-Aufruf testen</Text>
            <div className="bg-gray-900 text-gray-100 p-3 rounded text-sm font-mono overflow-x-auto">
              curl -H "Authorization: Bearer YOUR_API_KEY" \<br/>
              &nbsp;&nbsp;https://your-domain.com/api/v1/auth/test
            </div>
          </div>
        </div>
      </div>

      {/* API Endpoints */}
      <div className="mb-8">
        <Text className="font-semibold text-gray-900 mb-4">API-Endpunkte</Text>
        
        {/* Category Tabs */}
        <div className="flex gap-2 mb-6 border-b border-gray-200">
          {API_ENDPOINTS.map((category) => (
            <button
              key={category.category}
              onClick={() => setSelectedCategory(category.category)}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                selectedCategory === category.category
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {category.category}
            </button>
          ))}
        </div>

        {/* Endpoints List */}
        <div className="space-y-3">
          {API_ENDPOINTS.find(cat => cat.category === selectedCategory)?.endpoints.map((endpoint, index) => (
            <div key={index} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center gap-3 mb-2">
                <Badge color={getMethodColor(endpoint.method)} className="font-mono text-xs">
                  {endpoint.method}
                </Badge>
                <Text className="font-mono text-sm text-gray-600">{endpoint.path}</Text>
                <div className="flex gap-1">
                  {endpoint.permissions.map(permission => (
                    <Badge key={permission} color="blue" className="text-xs">
                      {permission}
                    </Badge>
                  ))}
                </div>
              </div>
              <Text className="text-sm text-gray-700 mb-2">{endpoint.description}</Text>
              {endpoint.example && (
                <div className="bg-gray-50 p-3 rounded text-xs font-mono overflow-x-auto">
                  {endpoint.example}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Code Examples */}
      <div>
        <Text className="font-semibold text-gray-900 mb-4">Integration-Beispiele</Text>
        
        {/* Language Tabs */}
        <div className="flex gap-2 mb-4 border-b border-gray-200">
          {INTEGRATION_EXAMPLES.map((example) => (
            <button
              key={example.title}
              onClick={() => setSelectedLanguage(example.title)}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                selectedLanguage === example.title
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {example.title}
            </button>
          ))}
        </div>

        {/* Code Display */}
        <div className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto">
          <pre className="text-sm">
            <code>
              {INTEGRATION_EXAMPLES.find(ex => ex.title === selectedLanguage)?.code}
            </code>
          </pre>
        </div>
      </div>

      {/* Additional Resources */}
      <div className="mt-8 grid md:grid-cols-3 gap-4">
        <div className="p-4 border border-gray-200 rounded-lg">
          <div className="flex items-center gap-3 mb-2">
            <DocumentTextIcon className="h-5 w-5 text-blue-600" />
            <Text className="font-medium">OpenAPI Spec</Text>
          </div>
          <Text className="text-sm text-gray-600 mb-3">
            Maschinenlesbare API-Spezifikation für automatische Code-Generierung
          </Text>
          <Button plain className="text-xs">
            Download openapi.yaml
          </Button>
        </div>

        <div className="p-4 border border-gray-200 rounded-lg">
          <div className="flex items-center gap-3 mb-2">
            <CodeBracketIcon className="h-5 w-5 text-green-600" />
            <Text className="font-medium">SDK Libraries</Text>
          </div>
          <Text className="text-sm text-gray-600 mb-3">
            Offizielle Client-Bibliotheken für verschiedene Programmiersprachen
          </Text>
          <Button plain className="text-xs">
            Verfügbare SDKs ansehen
          </Button>
        </div>

        <div className="p-4 border border-gray-200 rounded-lg">
          <div className="flex items-center gap-3 mb-2">
            <GlobeAltIcon className="h-5 w-5 text-purple-600" />
            <Text className="font-medium">Webhooks</Text>
          </div>
          <Text className="text-sm text-gray-600 mb-3">
            Event-basierte Benachrichtigungen für Datenänderungen
          </Text>
          <Button plain className="text-xs">
            Webhook-Guide lesen
          </Button>
        </div>
      </div>
    </div>
  );
}