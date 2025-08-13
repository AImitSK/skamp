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
    status: 'available',
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
    version: 'Coming Soon',
    status: 'coming_soon',
    installation: 'pip install celeropress  # Coming Soon',
    example: `# Python SDK kommt bald!
# 
# from celeropress import CeleroPress
# 
# client = CeleroPress(api_key='cp_live_your_api_key_here')
# 
# # Kontakte abrufen
# contacts = client.contacts.list(limit=10, tags=['journalist'])
# 
# # Neuen Kontakt erstellen  
# new_contact = client.contacts.create(
#     first_name='Max',
#     last_name='Mustermann',
#     email='max@example.com',
#     company='Example GmbH'
# )

# Aktuell: Verwende direkte API-Calls mit requests
import requests

headers = {
    'Authorization': 'cp_live_your_api_key_here',
    'Content-Type': 'application/json'
}

# Kontakte abrufen
response = requests.get(
    'https://www.celeropress.com/api/v1/contacts',
    headers=headers,
    params={'limit': 10, 'tags[]': 'journalist'}
)
contacts = response.json()`
  },
  {
    name: 'PHP',
    icon: '🐘',
    package: 'celeropress/sdk',
    version: 'Coming Soon',
    status: 'coming_soon',
    installation: 'composer require celeropress/sdk  # Coming Soon',
    example: `<?php
// PHP SDK kommt bald!
//
// use CeleroPress\\Client;
// $client = new Client('cp_live_your_api_key_here');

// Aktuell: Verwende direkte API-Calls mit cURL
$apiKey = 'cp_live_your_api_key_here';
$baseUrl = 'https://www.celeropress.com/api/v1';

// Kontakte abrufen
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $baseUrl . '/contacts?limit=10&tags[]=journalist');
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Authorization: ' . $apiKey,
    'Content-Type: application/json'
]);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
$response = curl_exec($ch);
$contacts = json_decode($response, true);
curl_close($ch);`
  },
  {
    name: 'Ruby',
    icon: '💎',
    package: 'celeropress',
    version: 'Coming Soon',
    status: 'coming_soon',
    installation: 'gem install celeropress  # Coming Soon',
    example: `# Ruby SDK kommt bald!
#
# require 'celeropress'
# client = CeleroPress::Client.new(api_key: 'cp_live_your_api_key_here')

# Aktuell: Verwende direkte API-Calls mit Net::HTTP
require 'net/http'
require 'json'

api_key = 'cp_live_your_api_key_here'
base_url = 'https://www.celeropress.com/api/v1'

# Kontakte abrufen
uri = URI("#{base_url}/contacts?limit=10&tags[]=journalist")
http = Net::HTTP.new(uri.host, uri.port)
http.use_ssl = true

request = Net::HTTP::Get.new(uri)
request['Authorization'] = api_key
request['Content-Type'] = 'application/json'

response = http.request(request)
contacts = JSON.parse(response.body)`
  },
  {
    name: 'Go',
    icon: '🐹',
    package: 'github.com/celeropress/go-sdk',
    version: 'Coming Soon',
    status: 'coming_soon',
    installation: 'go get github.com/celeropress/go-sdk  # Coming Soon',
    example: `package main

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
)

// Go SDK kommt bald!
// import "github.com/celeropress/go-sdk"

// Aktuell: Verwende direkte API-Calls
func main() {
	apiKey := "cp_live_your_api_key_here"
	baseURL := "https://www.celeropress.com/api/v1"

	// Kontakte abrufen
	params := url.Values{}
	params.Add("limit", "10")
	params.Add("tags[]", "journalist")

	client := &http.Client{}
	req, _ := http.NewRequest("GET", baseURL+"/contacts?"+params.Encode(), nil)
	req.Header.Add("Authorization", apiKey)
	req.Header.Add("Content-Type", "application/json")

	resp, err := client.Do(req)
	if err != nil {
		panic(err)
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	fmt.Println(string(body))
}`
  },
  {
    name: 'Java',
    icon: '☕',
    package: 'com.celeropress:sdk',
    version: 'Coming Soon',
    status: 'coming_soon',
    installation: `<!-- Coming Soon -->
<dependency>
  <groupId>com.celeropress</groupId>
  <artifactId>sdk</artifactId>
  <version>1.0.0</version>
</dependency>`,
    example: `// Java SDK kommt bald!
//
// import com.celeropress.CeleroPressClient;
// CeleroPressClient client = new CeleroPressClient("cp_live_your_api_key_here");

// Aktuell: Verwende direkte API-Calls mit HttpURLConnection
import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;

public class Example {
    public static void main(String[] args) throws Exception {
        String apiKey = "cp_live_your_api_key_here";
        String baseUrl = "https://www.celeropress.com/api/v1";
        
        // Kontakte abrufen
        URL url = new URL(baseUrl + "/contacts?limit=10&tags[]=journalist");
        HttpURLConnection conn = (HttpURLConnection) url.openConnection();
        conn.setRequestMethod("GET");
        conn.setRequestProperty("Authorization", apiKey);
        conn.setRequestProperty("Content-Type", "application/json");
        
        BufferedReader reader = new BufferedReader(
            new InputStreamReader(conn.getInputStream()));
        String response = reader.readLine();
        System.out.println(response);
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
                className={`p-4 rounded-lg border-2 transition-colors relative ${
                  selectedLanguage.name === lang.name
                    ? 'border-blue-500 bg-blue-50'
                    : lang.status === 'available' 
                      ? 'border-gray-200 hover:border-gray-300' 
                      : 'border-gray-200 hover:border-gray-300 opacity-75'
                }`}
              >
                <div className="text-2xl mb-2">{lang.icon}</div>
                <div className="text-sm font-medium text-gray-900">{lang.name.split('/')[0]}</div>
                <div className={`text-xs ${lang.status === 'available' ? 'text-gray-500' : 'text-orange-500 font-medium'}`}>
                  {lang.status === 'available' ? `v${lang.version}` : lang.version}
                </div>
                {lang.status === 'coming_soon' && (
                  <div className="absolute -top-1 -right-1 bg-orange-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                    Soon
                  </div>
                )}
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

              {selectedLanguage.status === 'available' ? (
                <div className="flex space-x-4">
                  <a
                    href={`https://www.npmjs.com/package/${selectedLanguage.package}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 inline-flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                  >
                    <CloudArrowDownIcon className="h-5 w-5 mr-2" />
                    NPM Package
                  </a>
                  <a
                    href="https://github.com/AImitSK/skamp"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 inline-flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                  >
                    GitHub Repository
                  </a>
                </div>
              ) : (
                <div className="bg-orange-50 border border-orange-200 rounded-md p-4">
                  <div className="flex items-center">
                    <div className="text-orange-500 mr-3">🚧</div>
                    <div>
                      <h4 className="text-sm font-medium text-orange-800">SDK in Entwicklung</h4>
                      <p className="text-sm text-orange-700 mt-1">
                        Dieses SDK ist noch in Entwicklung. Verwende vorerst die direkten API-Calls im Code-Beispiel.
                      </p>
                    </div>
                  </div>
                </div>
              )}
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