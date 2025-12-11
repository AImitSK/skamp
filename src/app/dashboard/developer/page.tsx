'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
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
  const t = useTranslations('developer');
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
      // DIREKT aus Firestore - KEIN Server-Endpoint nötig!
      if (!user) return;
      
      const { db } = await import('@/lib/firebase/config');
      const { collection, query, where, getDocs } = await import('firebase/firestore');
      
      const keysQuery = query(
        collection(db, 'api_keys'),
        where('userId', '==', user.uid)
      );
      
      const keysSnapshot = await getDocs(keysQuery);
      const apiKeysData: any[] = [];
      
      keysSnapshot.forEach(doc => {
        const data = doc.data();
        apiKeysData.push({
          id: doc.id,
          name: data.name || 'Unnamed Key',
          key: data.key || data.keyPreview || 'N/A',
          status: data.status || 'active',
          createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
          lastUsed: data.lastUsed?.toDate?.()?.toISOString() || null
        });
      });
      
      setApiKeys(apiKeysData);
    } catch (error) {
      console.error('Fehler beim Laden der API Keys:', error);
      setApiKeys([]);
    }
  };

  const fetchUsageStats = async () => {
    try {
      // DIREKT aus Firestore - KEIN Server-Endpoint nötig!
      if (!user) return;
      
      const { db } = await import('@/lib/firebase/config');
      const { collection, query, where, getDocs, Timestamp } = await import('firebase/firestore');
      
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      
      // API Logs für heute
      const todayLogsQuery = query(
        collection(db, 'api_logs'),
        where('userId', '==', user.uid),
        where('timestamp', '>=', Timestamp.fromDate(todayStart))
      );
      const todayLogsSnapshot = await getDocs(todayLogsQuery);
      const requestsToday = todayLogsSnapshot.size;
      
      // API Logs für diesen Monat
      const monthLogsQuery = query(
        collection(db, 'api_logs'),
        where('userId', '==', user.uid),
        where('timestamp', '>=', Timestamp.fromDate(monthStart))
      );
      const monthLogsSnapshot = await getDocs(monthLogsQuery);
      const requestsMonth = monthLogsSnapshot.size;
      
      setUsage({
        requests_today: requestsToday,
        requests_month: requestsMonth,
        rate_limit: '1000/hour', // Default für jetzt
        last_request: requestsMonth > 0 ? new Date().toISOString() : null
      });
    } catch (error) {
      console.error('Fehler beim Laden der Usage Stats:', error);
      setUsage({
        requests_today: 0,
        requests_month: 0,
        rate_limit: '1000/hour',
        last_request: null
      });
    }
  };

  const features = [
    {
      title: t('features.apiDocs.title'),
      description: t('features.apiDocs.description'),
      icon: DocumentTextIcon,
      href: '/dashboard/developer/docs',
      color: 'bg-blue-500'
    },
    {
      title: t('features.sdks.title'),
      description: t('features.sdks.description'),
      icon: CodeBracketIcon,
      href: '/dashboard/developer/sdks',
      color: 'bg-green-500'
    },
    {
      title: t('features.codeExamples.title'),
      description: t('features.codeExamples.description'),
      icon: BookOpenIcon,
      href: '/dashboard/developer/examples',
      color: 'bg-yellow-500'
    },
    {
      title: t('features.apiKeys.title'),
      description: t('features.apiKeys.description'),
      icon: KeyIcon,
      href: '/dashboard/admin/api',
      color: 'bg-red-500'
    },
    {
      title: t('features.analytics.title'),
      description: t('features.analytics.description'),
      icon: ChartBarIcon,
      href: '/dashboard/developer/analytics',
      color: 'bg-indigo-500'
    }
  ];

  const quickStats = [
    { label: t('stats.requestsToday'), value: usage?.requests_today || 0 },
    { label: t('stats.requestsMonth'), value: usage?.requests_month || 0 },
    { label: t('stats.rateLimit'), value: usage?.rate_limit || 'N/A' },
    { label: t('stats.activeKeys'), value: apiKeys.filter(k => k.status === 'active').length }
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
              <h1 className="text-3xl font-bold text-gray-900">{t('header.title')}</h1>
              <p className="mt-2 text-gray-600">
                {t('header.subtitle')}
              </p>
            </div>
            <div className="flex space-x-4">
              <a
                href="/openapi.yaml"
                download
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                <CloudArrowDownIcon className="h-5 w-5 mr-2" />
                {t('header.downloadSpec')}
              </a>
              <Link
                href="/dashboard/developer/docs"
                className="inline-flex items-center bg-primary hover:bg-primary-hover text-white border-0 rounded-md px-4 py-2 text-sm font-medium"
              >
                <DocumentTextIcon className="h-4 w-4 mr-2" />
                {t('header.viewDocs')}
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
          <h2 className="text-xl font-semibold text-gray-900 mb-4">{t('quickStart.title')}</h2>
          <div className="space-y-4">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <div className="flex items-center justify-center h-8 w-8 rounded-full bg-blue-100 text-blue-600">
                  1
                </div>
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-medium text-gray-900">{t('quickStart.step1.title')}</h3>
                <p className="mt-1 text-sm text-gray-600">
                  {t('quickStart.step1.description')} <Link href="/dashboard/admin/api" className="text-blue-600 hover:text-blue-500">{t('quickStart.step1.link')}</Link> {t('quickStart.step1.descriptionEnd')}
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
                <h3 className="text-sm font-medium text-gray-900">{t('quickStart.step2.title')}</h3>
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
                <h3 className="text-sm font-medium text-gray-900">{t('quickStart.step3.title')}</h3>
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
          <h2 className="text-xl font-semibold text-gray-900 mb-4">{t('endpoints.title')}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="font-medium text-gray-900 mb-2">{t('endpoints.rest.title')}</h3>
              <ul className="space-y-1 text-sm text-gray-600">
                <li>• {t('endpoints.rest.items.auth')}</li>
                <li>• {t('endpoints.rest.items.crm')}</li>
                <li>• {t('endpoints.rest.items.publications')}</li>
                <li>• {t('endpoints.rest.items.bulk')}</li>
                <li>• {t('endpoints.rest.items.webhooks')}</li>
                <li>• {t('endpoints.rest.items.search')}</li>
              </ul>
            </div>
            <div>
              <h3 className="font-medium text-gray-900 mb-2">{t('endpoints.advanced.title')}</h3>
              <ul className="space-y-1 text-sm text-gray-600">
                <li>• {t('endpoints.advanced.items.graphql')}</li>
                <li>• {t('endpoints.advanced.items.websocket')}</li>
                <li>• {t('endpoints.advanced.items.batch')}</li>
                <li>• {t('endpoints.advanced.items.events')}</li>
                <li>• {t('endpoints.advanced.items.customWebhooks')}</li>
                <li>• {t('endpoints.advanced.items.rateLimit')}</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}