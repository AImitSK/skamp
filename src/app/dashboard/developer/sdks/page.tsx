'use client';

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeftIcon,
  CloudArrowDownIcon,
  DocumentDuplicateIcon,
  CheckIcon
} from '@heroicons/react/24/outline';
import Link from 'next/link';

const SDK_LANGUAGES = [
  {
    name: 'TypeScript/JavaScript',
    icon: '🟨',
    package: '@celeropress/sdk',
    version: '1.0.0',
    installation: 'npm install @celeropress/sdk',
    example: `import { CeleroPress } from '@celeropress/sdk';

const client = new CeleroPress({
  apiKey: 'cp_live_your_api_key_here'
});

// Kontakte abrufen
const contacts = await client.contacts.list({
  limit: 10,
  tags: ['journalist']
});

// Neuen Kontakt erstellen
const newContact = await client.contacts.create({
  firstName: 'Max',
  lastName: 'Mustermann',
  email: 'max@example.com',
  company: 'Example GmbH'
});

// Webhook registrieren
const webhook = await client.webhooks.create({
  url: 'https://your-server.com/webhook',
  events: ['contact.created', 'contact.updated']
});`
  },
  {
    name: 'Python',
    icon: '🐍',
    package: 'celeropress',
    version: '1.0.0',
    installation: 'pip install celeropress',
    example: `from celeropress import CeleroPress

client = CeleroPress(api_key='cp_live_your_api_key_here')

# Kontakte abrufen
contacts = client.contacts.list(limit=10, tags=['journalist'])

# Neuen Kontakt erstellen
new_contact = client.contacts.create(
    first_name='Max',
    last_name='Mustermann',
    email='max@example.com',
    company='Example GmbH'
)

# Bulk Export starten
export_job = client.export.create(
    entity='contacts',
    format='csv',
    filters={'tags': ['journalist']}
)

# Export Status prüfen
status = client.export.get_status(export_job.id)`
  },
  {
    name: 'PHP',
    icon: '🐘',
    package: 'celeropress/sdk',
    version: '1.0.0',
    installation: 'composer require celeropress/sdk',
    example: `<?php
use CeleroPress\\Client;

$client = new Client('cp_live_your_api_key_here');

// Kontakte abrufen
$contacts = $client->contacts()->list([
    'limit' => 10,
    'tags' => ['journalist']
]);

// Neuen Kontakt erstellen
$newContact = $client->contacts()->create([
    'firstName' => 'Max',
    'lastName' => 'Mustermann',
    'email' => 'max@example.com',
    'company' => 'Example GmbH'
]);

// GraphQL Query
$result = $client->graphql()->query('
    query GetContacts {
        contacts(limit: 10) {
            id
            firstName
            lastName
            email
        }
    }
');`
  },
  {
    name: 'Ruby',
    icon: '💎',
    package: 'celeropress',
    version: '1.0.0',
    installation: 'gem install celeropress',
    example: `require 'celeropress'

client = CeleroPress::Client.new(api_key: 'cp_live_your_api_key_here')

# Kontakte abrufen
contacts = client.contacts.list(limit: 10, tags: ['journalist'])

# Neuen Kontakt erstellen
new_contact = client.contacts.create(
  first_name: 'Max',
  last_name: 'Mustermann',
  email: 'max@example.com',
  company: 'Example GmbH'
)

# WebSocket Connection
client.websocket.connect do |ws|
  ws.on :message do |event|
    puts "Received: #{event.data}"
  end
  
  ws.subscribe(['contact.created', 'contact.updated'])
end`
  },
  {
    name: 'Go',
    icon: '🐹',
    package: 'github.com/celeropress/go-sdk',
    version: '1.0.0',
    installation: 'go get github.com/celeropress/go-sdk',
    example: `package main

import (
    "fmt"
    "github.com/celeropress/go-sdk"
)

func main() {
    client := celeropress.NewClient("cp_live_your_api_key_here")
    
    // Kontakte abrufen
    contacts, err := client.Contacts.List(&celeropress.ListOptions{
        Limit: 10,
        Tags: []string{"journalist"},
    })
    
    if err != nil {
        panic(err)
    }
    
    // Neuen Kontakt erstellen
    contact, err := client.Contacts.Create(&celeropress.Contact{
        FirstName: "Max",
        LastName:  "Mustermann",
        Email:     "max@example.com",
        Company:   "Example GmbH",
    })
    
    fmt.Printf("Created contact: %s\\n", contact.ID)
}`
  },
  {
    name: 'Java',
    icon: '☕',
    package: 'com.celeropress:sdk',
    version: '1.0.0',
    installation: `<dependency>
  <groupId>com.celeropress</groupId>
  <artifactId>sdk</artifactId>
  <version>1.0.0</version>
</dependency>`,
    example: `import com.celeropress.CeleroPressClient;
import com.celeropress.models.Contact;
import com.celeropress.models.ListOptions;

public class Example {
    public static void main(String[] args) {
        CeleroPressClient client = new CeleroPressClient("cp_live_your_api_key_here");
        
        // Kontakte abrufen
        ListOptions options = new ListOptions()
            .setLimit(10)
            .setTags(Arrays.asList("journalist"));
            
        List<Contact> contacts = client.contacts().list(options);
        
        // Neuen Kontakt erstellen
        Contact newContact = new Contact()
            .setFirstName("Max")
            .setLastName("Mustermann")
            .setEmail("max@example.com")
            .setCompany("Example GmbH");
            
        Contact created = client.contacts().create(newContact);
        System.out.println("Created contact: " + created.getId());
    }
}`
  }
];

export default function SDKsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [selectedLanguage, setSelectedLanguage] = useState(SDK_LANGUAGES[0]);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
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
                <h1 className="text-2xl font-bold text-gray-900">SDKs & Libraries</h1>
                <p className="text-sm text-gray-600">
                  Vorgefertigte Client-Libraries für verschiedene Programmiersprachen
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Language Selector */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <h2 className="text-lg font-semibold mb-4">Verfügbare SDKs</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {SDK_LANGUAGES.map((lang, index) => (
              <button
                key={index}
                onClick={() => setSelectedLanguage(lang)}
                className={`p-4 rounded-lg border-2 transition-colors ${
                  selectedLanguage.name === lang.name
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="text-2xl mb-2">{lang.icon}</div>
                <div className="text-sm font-medium text-gray-900">{lang.name.split('/')[0]}</div>
                <div className="text-xs text-gray-500">v{lang.version}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Selected SDK Details */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Installation */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold mb-4">Installation</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Package Manager
                </label>
                <div className="bg-gray-900 rounded-md p-4 relative">
                  <pre className="text-sm text-green-400 overflow-x-auto">
                    <code>{selectedLanguage.installation}</code>
                  </pre>
                  <button
                    onClick={() => copyToClipboard(selectedLanguage.installation, 0)}
                    className="absolute top-2 right-2 p-2 hover:bg-gray-800 rounded"
                  >
                    {copiedIndex === 0 ? (
                      <CheckIcon className="h-5 w-5 text-green-400" />
                    ) : (
                      <DocumentDuplicateIcon className="h-5 w-5 text-gray-400" />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Package Info
                </label>
                <div className="bg-gray-50 rounded-md p-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-gray-600">Package</span>
                    <span className="text-sm font-mono">{selectedLanguage.package}</span>
                  </div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-gray-600">Version</span>
                    <span className="text-sm font-mono">{selectedLanguage.version}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">License</span>
                    <span className="text-sm font-mono">MIT</span>
                  </div>
                </div>
              </div>

              <div className="flex space-x-4">
                <button className="flex-1 inline-flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
                  <CloudArrowDownIcon className="h-5 w-5 mr-2" />
                  Download SDK
                </button>
                <a
                  href={`https://github.com/celeropress/${selectedLanguage.name.toLowerCase().replace('/', '-')}-sdk`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 inline-flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  GitHub Repository
                </a>
              </div>
            </div>
          </div>

          {/* Quick Start */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold mb-4">Quick Start</h2>
            <div className="bg-gray-900 rounded-md p-4 relative max-h-96 overflow-y-auto">
              <pre className="text-sm text-gray-300">
                <code>{selectedLanguage.example}</code>
              </pre>
              <button
                onClick={() => copyToClipboard(selectedLanguage.example, 1)}
                className="absolute top-2 right-2 p-2 hover:bg-gray-800 rounded"
              >
                {copiedIndex === 1 ? (
                  <CheckIcon className="h-5 w-5 text-green-400" />
                ) : (
                  <DocumentDuplicateIcon className="h-5 w-5 text-gray-400" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="mt-8 bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-4">SDK Features</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div>
              <h3 className="font-medium text-gray-900 mb-2">✅ Vollständige API-Abdeckung</h3>
              <p className="text-sm text-gray-600">
                Alle REST, GraphQL und WebSocket Endpoints sind implementiert
              </p>
            </div>
            <div>
              <h3 className="font-medium text-gray-900 mb-2">✅ Type Safety</h3>
              <p className="text-sm text-gray-600">
                Vollständige Typisierung für TypeScript und statisch typisierte Sprachen
              </p>
            </div>
            <div>
              <h3 className="font-medium text-gray-900 mb-2">✅ Auto-Retry</h3>
              <p className="text-sm text-gray-600">
                Automatische Wiederholungen bei Netzwerkfehlern mit exponential backoff
              </p>
            </div>
            <div>
              <h3 className="font-medium text-gray-900 mb-2">✅ Rate Limiting</h3>
              <p className="text-sm text-gray-600">
                Eingebaute Rate-Limit-Behandlung mit automatischer Warteschlange
              </p>
            </div>
            <div>
              <h3 className="font-medium text-gray-900 mb-2">✅ Pagination</h3>
              <p className="text-sm text-gray-600">
                Einfache Pagination mit Cursor-basiertem und Offset-basiertem Support
              </p>
            </div>
            <div>
              <h3 className="font-medium text-gray-900 mb-2">✅ Error Handling</h3>
              <p className="text-sm text-gray-600">
                Strukturierte Fehlerbehandlung mit detaillierten Fehlermeldungen
              </p>
            </div>
          </div>
        </div>

        {/* Documentation Links */}
        <div className="mt-8 bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-4">Dokumentation & Ressourcen</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <a
              href="/dashboard/developer/docs"
              className="block p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:shadow-sm transition-all"
            >
              <h3 className="font-medium text-gray-900 mb-1">API Referenz</h3>
              <p className="text-sm text-gray-600">
                Vollständige API-Dokumentation mit allen Endpoints
              </p>
            </a>
            <a
              href="/dashboard/developer/examples"
              className="block p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:shadow-sm transition-all"
            >
              <h3 className="font-medium text-gray-900 mb-1">Code Examples</h3>
              <p className="text-sm text-gray-600">
                Beispiele für Salesforce, HubSpot und Zapier Integration
              </p>
            </a>
            <a
              href="https://github.com/celeropress/sdk-examples"
              target="_blank"
              rel="noopener noreferrer"
              className="block p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:shadow-sm transition-all"
            >
              <h3 className="font-medium text-gray-900 mb-1">GitHub Examples</h3>
              <p className="text-sm text-gray-600">
                Vollständige Beispielprojekte auf GitHub
              </p>
            </a>
            <a
              href="https://discord.gg/celeropress"
              target="_blank"
              rel="noopener noreferrer"
              className="block p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:shadow-sm transition-all"
            >
              <h3 className="font-medium text-gray-900 mb-1">Community Support</h3>
              <p className="text-sm text-gray-600">
                Hilfe und Diskussionen in unserer Discord Community
              </p>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}