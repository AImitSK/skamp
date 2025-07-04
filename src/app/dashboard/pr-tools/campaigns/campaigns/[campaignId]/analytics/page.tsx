// src\app\dashboard\pr-tools\campaigns\campaigns\[campaignId]\analytics\page.tsx
"use client";

import { useState, useEffect } from "react";
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from "@/context/AuthContext";
import { prService } from "@/lib/firebase/pr-service";
import { analyticsService } from "@/lib/firebase/analytics-service";
import { PRCampaign } from "@/types/pr";
import { CampaignAnalytics, RecipientAnalytics } from "@/lib/firebase/analytics-service";
import { Heading } from "@/components/heading";
import { Text } from "@/components/text";
import { Button } from "@/components/button";
import { Badge } from "@/components/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/table";
import { 
  ChartBarIcon, 
  EnvelopeIcon, 
  EyeIcon, 
  CursorArrowRaysIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  ArrowLeftIcon,
  InformationCircleIcon
} from "@heroicons/react/20/solid";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';

export default function CampaignAnalyticsPage() {
  const { user } = useAuth();
  const params = useParams();
  const campaignId = params.campaignId as string;

  const [campaign, setCampaign] = useState<PRCampaign | null>(null);
  const [analytics, setAnalytics] = useState<CampaignAnalytics | null>(null);
  const [recipients, setRecipients] = useState<RecipientAnalytics[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'recipients' | 'engagement'>('overview');

  useEffect(() => {
    if (user && campaignId) {
      loadData();
    }
  }, [user, campaignId]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('🔄 Loading campaign and analytics data for ID:', campaignId);
      
      // 1. Kampagne laden
      const campaignData = await prService.getById(campaignId);
      
      if (!campaignData) {
        setError(`Kampagne mit ID "${campaignId}" nicht gefunden.`);
        setLoading(false);
        return;
      }
      
      console.log('✅ Campaign loaded:', campaignData.title, 'Status:', campaignData.status);
      setCampaign(campaignData);
      
      // 2. Nur Analytics laden wenn Kampagne versendet wurde
      if (campaignData.status !== 'sent') {
        console.warn('⚠️ Campaign not sent yet, no analytics available');
        setError(`Diese Kampagne wurde noch nicht versendet. Analytics sind nur für versendete Kampagnen verfügbar.`);
        setLoading(false);
        return;
      }
      
      // 3. Analytics laden
      console.log('📊 Loading analytics data...');
      const [analyticsData, recipientData] = await Promise.all([
        analyticsService.getCampaignAnalytics(campaignId),
        analyticsService.getRecipientAnalytics(campaignId)
      ]);

      console.log('📊 Analytics loaded:', analyticsData);
      console.log('👥 Recipients loaded:', recipientData.length, 'recipients');

      setAnalytics(analyticsData);
      setRecipients(recipientData);
      
      // Warnung wenn keine E-Mail-Daten vorhanden
      if (analyticsData && analyticsData.totalSent === 0) {
        setError('Noch keine E-Mail-Versand-Daten verfügbar. Dies kann einige Minuten nach dem Versand dauern.');
      }
      
    } catch (error: any) {
      console.error("❌ Error loading analytics:", error);
      setError(error.message || 'Unbekannter Fehler beim Laden der Analytics');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date?: Date) => {
    if (!date) return '-';
    return date.toLocaleDateString('de-DE', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  const getStatusBadge = (status: string) => {
    const config = {
      sent: { color: 'zinc' as const, icon: EnvelopeIcon, label: 'Versendet' },
      delivered: { color: 'green' as const, icon: CheckCircleIcon, label: 'Zugestellt' },
      opened: { color: 'blue' as const, icon: EyeIcon, label: 'Geöffnet' },
      clicked: { color: 'purple' as const, icon: CursorArrowRaysIcon, label: 'Geklickt' },
      bounced: { color: 'red' as const, icon: ExclamationTriangleIcon, label: 'Bounced' },
      failed: { color: 'red' as const, icon: ExclamationTriangleIcon, label: 'Fehlgeschlagen' }
    };

    const statusConfig = config[status as keyof typeof config] || config.sent;
    const Icon = statusConfig.icon;

    return (
      <Badge color={statusConfig.color} className="inline-flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {statusConfig.label}
      </Badge>
    );
  };

  // Loading State
  if (loading) {
    return (
      <div className="p-8 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-zinc-500">Lade Analytics...</p>
      </div>
    );
  }

  // Error State
  if (error) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-between mb-6">
          <Link href="/dashboard/pr-tools/campaigns">
            <Button plain>
              <ArrowLeftIcon className="size-4 mr-2" />
              Zurück
            </Button>
          </Link>
        </div>
        
        <div className="max-w-md mx-auto text-center">
          <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-yellow-500 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Analytics nicht verfügbar</h3>
          <p className="text-gray-600 mb-6">{error}</p>
          
          {campaign && campaign.status !== 'sent' && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <InformationCircleIcon className="h-5 w-5 text-blue-600 inline mr-2" />
              <span className="text-blue-800">
                Kampagne-Status: <Badge color="zinc">{campaign.status}</Badge>
              </span>
            </div>
          )}
          
          <div className="flex gap-2 justify-center">
            <Link href="/dashboard/pr-tools/campaigns">
              <Button plain>Zur Übersicht</Button>
            </Link>
            <Button onClick={loadData}>
              Erneut versuchen
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Main Content
  if (!campaign || !analytics) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-600">Kampagne oder Analytics konnten nicht geladen werden.</p>
        <Link href="/dashboard/pr-tools/campaigns">
          <Button className="mt-4">Zurück zur Übersicht</Button>
        </Link>
      </div>
    );
  }

  // Chart-Daten für Engagement über Zeit
  const engagementData = recipients
    .filter(r => r.openedAt || r.clickedAt)
    .map(r => ({
      date: (r.openedAt || r.clickedAt)?.toLocaleDateString('de-DE'),
      opens: r.openedAt ? 1 : 0,
      clicks: r.clickedAt ? 1 : 0
    }))
    .reduce((acc, curr) => {
      const existing = acc.find(item => item.date === curr.date);
      if (existing) {
        existing.opens += curr.opens;
        existing.clicks += curr.clicks;
      } else {
        acc.push(curr);
      }
      return acc;
    }, [] as any[])
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Pie Chart Daten für Status-Verteilung
  const statusData = [
    { name: 'Zugestellt', value: analytics.delivered, color: '#10B981' },
    { name: 'Geöffnet', value: analytics.opened, color: '#3B82F6' },
    { name: 'Geklickt', value: analytics.clicked, color: '#8B5CF6' },
    { name: 'Bounced', value: analytics.bounced, color: '#EF4444' },
    { name: 'Fehlgeschlagen', value: analytics.failed, color: '#6B7280' }
  ].filter(item => item.value > 0);

  return (
    <div className="p-6 md:p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/pr-tools/campaigns">
            <Button plain>
              <ArrowLeftIcon className="size-4 mr-2" />
              Zurück
            </Button>
          </Link>
          <div>
            <Heading>Kampagnen-Analytics</Heading>
            <Text className="mt-1">{campaign.title}</Text>
          </div>
        </div>
        <Button onClick={loadData}>
          <ChartBarIcon className="size-4 mr-2" />
          Aktualisieren
        </Button>
      </div>

      {/* No Data Warning */}
      {analytics.totalSent === 0 && (
        <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center">
            <InformationCircleIcon className="h-5 w-5 text-yellow-600 mr-2" />
            <div>
              <h4 className="font-medium text-yellow-800">Noch keine Analytics-Daten</h4>
              <p className="text-yellow-700 text-sm mt-1">
                Die Analytics-Daten werden innerhalb weniger Minuten nach dem E-Mail-Versand verfügbar.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-6 rounded-lg border">
          <div className="flex items-center">
            <EnvelopeIcon className="h-8 w-8 text-blue-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Versendet</p>
              <p className="text-2xl font-semibold text-gray-900">{analytics.totalSent}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border">
          <div className="flex items-center">
            <CheckCircleIcon className="h-8 w-8 text-green-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Zustellrate</p>
              <p className="text-2xl font-semibold text-gray-900">{formatPercentage(analytics.deliveryRate)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border">
          <div className="flex items-center">
            <EyeIcon className="h-8 w-8 text-blue-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Öffnungsrate</p>
              <p className="text-2xl font-semibold text-gray-900">{formatPercentage(analytics.openRate)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border">
          <div className="flex items-center">
            <CursorArrowRaysIcon className="h-8 w-8 text-purple-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Klickrate</p>
              <p className="text-2xl font-semibold text-gray-900">{formatPercentage(analytics.clickRate)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-zinc-200 mb-6">
        {[
          { id: 'overview', label: 'Übersicht' },
          { id: 'recipients', label: 'Empfänger' },
          { id: 'engagement', label: 'Engagement' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-zinc-600 hover:text-zinc-900'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Status-Verteilung Pie Chart */}
          {statusData.length > 0 ? (
            <div className="bg-white p-6 rounded-lg border">
              <h3 className="text-lg font-semibold mb-4">Status-Verteilung</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="bg-white p-6 rounded-lg border">
              <h3 className="text-lg font-semibold mb-4">Status-Verteilung</h3>
              <p className="text-gray-500 text-center py-8">Noch keine Daten verfügbar</p>
            </div>
          )}

          {/* Engagement Timeline */}
          {engagementData.length > 0 ? (
            <div className="bg-white p-6 rounded-lg border">
              <h3 className="text-lg font-semibold mb-4">Engagement über Zeit</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={engagementData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="opens" stroke="#3B82F6" name="Öffnungen" />
                  <Line type="monotone" dataKey="clicks" stroke="#8B5CF6" name="Klicks" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="bg-white p-6 rounded-lg border">
              <h3 className="text-lg font-semibold mb-4">Engagement über Zeit</h3>
              <p className="text-gray-500 text-center py-8">Noch keine Engagement-Daten verfügbar</p>
            </div>
          )}

          {/* Top Links */}
          {analytics.topLinks.length > 0 && (
            <div className="bg-white p-6 rounded-lg border lg:col-span-2">
              <h3 className="text-lg font-semibold mb-4">Top geklickte Links</h3>
              <div className="space-y-3">
                {analytics.topLinks.map((link, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{link.url}</p>
                    </div>
                    <Badge color="purple">{link.clicks} Klicks</Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'recipients' && (
        <div className="bg-white rounded-lg border">
          {recipients.length > 0 ? (
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeader>Empfänger</TableHeader>
                  <TableHeader>Status</TableHeader>
                  <TableHeader>Versendet</TableHeader>
                  <TableHeader>Geöffnet</TableHeader>
                  <TableHeader>Geklickt</TableHeader>
                  <TableHeader>Engagement</TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {recipients.map((recipient, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{recipient.recipientName}</div>
                        <div className="text-sm text-gray-500">{recipient.recipientEmail}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(recipient.status)}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {formatDate(recipient.sentAt)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {recipient.openCount > 0 ? (
                          <div>
                            <div>{formatDate(recipient.openedAt)}</div>
                            {recipient.openCount > 1 && (
                              <div className="text-xs text-gray-500">{recipient.openCount}x geöffnet</div>
                            )}
                          </div>
                        ) : (
                          '-'
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {recipient.clickCount > 0 ? (
                          <div>
                            <div>{formatDate(recipient.clickedAt)}</div>
                            {recipient.clickCount > 1 && (
                              <div className="text-xs text-gray-500">{recipient.clickCount}x geklickt</div>
                            )}
                          </div>
                        ) : (
                          '-'
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {recipient.openCount > 0 && <Badge color="blue" className="text-xs">Öffnung</Badge>}
                        {recipient.clickCount > 0 && <Badge color="purple" className="text-xs">Klick</Badge>}
                        {recipient.status === 'bounced' && <Badge color="red" className="text-xs">Bounce</Badge>}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="p-8 text-center">
              <p className="text-gray-500">Noch keine Empfänger-Daten verfügbar</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'engagement' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Engagement-Details */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white p-6 rounded-lg border">
              <h3 className="text-lg font-semibold mb-4">Engagement-Zeiten</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-500">Erste Öffnung</p>
                  <p className="font-medium">{formatDate(analytics.firstOpenAt)}</p>
                </div>
                <div>
                  <p className="text-gray-500">Letzte Öffnung</p>
                  <p className="font-medium">{formatDate(analytics.lastOpenAt)}</p>
                </div>
                <div>
                  <p className="text-gray-500">Erster Klick</p>
                  <p className="font-medium">{formatDate(analytics.firstClickAt)}</p>
                </div>
                <div>
                  <p className="text-gray-500">Letzter Klick</p>
                  <p className="font-medium">{formatDate(analytics.lastClickAt)}</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg border">
              <h3 className="text-lg font-semibold mb-4">Engagement-Statistiken</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{analytics.totalOpens}</div>
                  <div className="text-sm text-blue-700">Gesamt-Öffnungen</div>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">{analytics.totalClicks}</div>
                  <div className="text-sm text-purple-700">Gesamt-Klicks</div>
                </div>
              </div>
            </div>
          </div>

          {/* Device/Browser Info */}
          {analytics.topUserAgents.length > 0 ? (
            <div className="bg-white p-6 rounded-lg border">
              <h3 className="text-lg font-semibold mb-4">Top Geräte/Browser</h3>
              <div className="space-y-3">
                {analytics.topUserAgents.map((ua, index) => (
                  <div key={index} className="flex items-center justify-between text-sm">
                    <div className="flex-1 min-w-0">
                      <p className="truncate" title={ua.userAgent}>
                        {ua.userAgent.length > 30 ? `${ua.userAgent.substring(0, 30)}...` : ua.userAgent}
                      </p>
                    </div>
                    <Badge color="zinc" className="ml-2">{ua.count}</Badge>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-white p-6 rounded-lg border">
              <h3 className="text-lg font-semibold mb-4">Top Geräte/Browser</h3>
              <p className="text-gray-500 text-center py-4">Noch keine Gerätedaten verfügbar</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}