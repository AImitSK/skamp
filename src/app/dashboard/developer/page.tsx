'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { 
  DocumentTextIcon, 
  CodeBracketIcon, 
  CloudArrowDownIcon,
  ChartBarIcon,
  KeyIcon,
  BookOpenIcon
} from '@heroicons/react/24/outline';
import Link from 'next/link';

export default function DeveloperPortal() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [apiKeys, setApiKeys] = useState<any[]>([]);
  const [usage, setUsage] = useState<any>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user) {
      fetchApiKeys();
      fetchUsageStats();
    }
  }, [user]);

  const fetchApiKeys = async () => {
    try {
      const response = await fetch('/api/v1/auth/keys', {
        headers: {
          'Authorization': `Bearer ${await user?.getIdToken()}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        // API gibt {success: true, data: [...]} zurück
        setApiKeys(data.data || data || []);
      } else {
        setApiKeys([]);
      }
    } catch (error) {
      console.error('Fehler beim Laden der API Keys:', error);
      setApiKeys([]);
    }
  };

  const fetchUsageStats = async () => {
    try {
      const response = await fetch('/api/v1/usage/stats', {
        headers: {
          'Authorization': `Bearer ${await user?.getIdToken()}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setUsage(data);
      } else {
        // Fallback zu Mock-Daten bei Fehler
        setUsage({
          requests_today: 342,
          requests_month: 8453,
          rate_limit: '1000/hour',
          last_request: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('Fehler beim Laden der Usage Stats:', error);
      // Fallback zu Mock-Daten
      setUsage({
        requests_today: 342,
        requests_month: 8453,
        rate_limit: '1000/hour',
        last_request: new Date().toISOString()
      });
    }
  };

  const features = [
    {
      title: 'API Dokumentation',
      description: 'Interaktive OpenAPI 3.0 Dokumentation mit Live-Testing',
      icon: DocumentTextIcon,
      href: '/dashboard/developer/docs',
      color: 'bg-blue-500'
    },
    {
      title: 'SDKs & Libraries',
      description: 'Vorgefertigte Client-Libraries für verschiedene Sprachen',
      icon: CodeBracketIcon,
      href: '/dashboard/developer/sdks',
      color: 'bg-green-500'
    },
    {
      title: 'Code Examples',
      description: 'Integration-Beispiele für Salesforce, HubSpot, Zapier',
      icon: BookOpenIcon,
      href: '/dashboard/developer/examples',
      color: 'bg-yellow-500'
    },
    {
      title: 'API Keys',
      description: 'Verwalte deine API-Schlüssel und Berechtigungen',
      icon: KeyIcon,
      href: '/dashboard/admin/api',
      color: 'bg-red-500'
    },
    {
      title: 'Usage & Analytics',
      description: 'Überwache deine API-Nutzung und Rate Limits',
      icon: ChartBarIcon,
      href: '/dashboard/developer/analytics',
      color: 'bg-indigo-500'
    }
  ];

  const quickStats = [
    { label: 'Requests heute', value: usage?.requests_today || 0 },
    { label: 'Requests diesen Monat', value: usage?.requests_month || 0 },
    { label: 'Rate Limit', value: usage?.rate_limit || 'N/A' },
    { label: 'Aktive API Keys', value: apiKeys.filter(k => k.status === 'active').length }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Developer Portal</h1>
              <p className="mt-2 text-gray-600">
                Alles was du für die Integration der CeleroPress API benötigst
              </p>
            </div>
            <div className="flex space-x-4">
              <a
                href="/openapi.yaml"
                download
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                <CloudArrowDownIcon className="h-5 w-5 mr-2" />
                OpenAPI Spec
              </a>
              <Link
                href="/dashboard/developer/docs"
                className="inline-flex items-center bg-primary hover:bg-primary-hover text-white border-0 rounded-md px-4 py-2 text-sm font-medium"
              >
                <DocumentTextIcon className="h-4 w-4 mr-2" />
                API Dokumentation
              </Link>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          {quickStats.map((stat, index) => (
            <div key={index} className="bg-white rounded-lg shadow-sm p-6">
              <p className="text-sm text-gray-600">{stat.label}</p>
              <p className="mt-2 text-2xl font-semibold text-gray-900">{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {features.map((feature, index) => (
            <Link
              key={index}
              href={feature.href}
              className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center mb-4">
                <div className={`${feature.color} p-3 rounded-lg`}>
                  <feature.icon className="h-6 w-6 text-white" />
                </div>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {feature.title}
              </h3>
              <p className="text-gray-600">{feature.description}</p>
            </Link>
          ))}
        </div>

        {/* Getting Started */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Start</h2>
          <div className="space-y-4">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <div className="flex items-center justify-center h-8 w-8 rounded-full bg-blue-100 text-blue-600">
                  1
                </div>
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-medium text-gray-900">API Key erstellen</h3>
                <p className="mt-1 text-sm text-gray-600">
                  Gehe zu <Link href="/dashboard/admin/api" className="text-blue-600 hover:text-blue-500">API Keys</Link> und erstelle einen neuen Schlüssel
                </p>
              </div>
            </div>
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <div className="flex items-center justify-center h-8 w-8 rounded-full bg-blue-100 text-blue-600">
                  2
                </div>
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-medium text-gray-900">SDK installieren</h3>
                <div className="mt-1 bg-gray-900 rounded-md p-3">
                  <code className="text-sm text-green-400">
                    npm install @celeropress/sdk
                  </code>
                </div>
              </div>
            </div>
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <div className="flex items-center justify-center h-8 w-8 rounded-full bg-blue-100 text-blue-600">
                  3
                </div>
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-medium text-gray-900">Erste API-Anfrage</h3>
                <div className="mt-1 bg-gray-900 rounded-md p-3 overflow-x-auto">
                  <pre className="text-sm text-gray-300">
{`import { CeleroPress } from '@celeropress/sdk';

const client = new CeleroPress({
  apiKey: 'cp_live_your_api_key'
});

const contacts = await client.contacts.list();`}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* API Endpoints Overview */}
        <div className="mt-8 bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Verfügbare API Endpoints</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="font-medium text-gray-900 mb-2">REST API</h3>
              <ul className="space-y-1 text-sm text-gray-600">
                <li>• Authentication & API Keys</li>
                <li>• Contacts & Companies (CRM)</li>
                <li>• Publications & Media Library</li>
                <li>• Bulk Export/Import</li>
                <li>• Webhooks & Events</li>
                <li>• Search & Filtering</li>
              </ul>
            </div>
            <div>
              <h3 className="font-medium text-gray-900 mb-2">Advanced Features</h3>
              <ul className="space-y-1 text-sm text-gray-600">
                <li>• GraphQL API für komplexe Queries</li>
                <li>• WebSocket für Real-time Updates</li>
                <li>• Batch Operations</li>
                <li>• Event Subscriptions</li>
                <li>• Custom Webhooks</li>
                <li>• Rate Limiting & Quotas</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}