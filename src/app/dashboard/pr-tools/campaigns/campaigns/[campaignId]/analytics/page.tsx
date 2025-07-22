// Simplified Activity Type
interface EmailActivity {
  email: string;
  type: 'sent' | 'delivered' | 'opened' | 'clicked' | 'bounced' | 'failed';
  timestamp?: any;
  metadata?: {
    userAgent?: string;
    location?: string;
    clickedUrl?: string;
    failureReason?: string;
  };
}

// Format relative time
function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diffInSeconds < 60) return 'vor wenigen Sekunden';
  if (diffInSeconds < 3600) return `vor ${Math.floor(diffInSeconds / 60)} Minuten`;
  if (diffInSeconds < 86400) return `vor ${Math.floor(diffInSeconds / 3600)} Stunden`;
  if (diffInSeconds < 2592000) return `vor ${Math.floor(diffInSeconds / 86400)} Tagen`;
  return date.toLocaleDateString('de-DE');
}// src/app/dashboard/pr-tools/campaigns/campaigns/[campaignId]/analytics/page.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { teamMemberService } from "@/lib/firebase/organization-service";
import { Heading } from "@/components/heading";
import { Text } from "@/components/text";
import { Button } from "@/components/button";
import { Badge } from "@/components/badge";
import { 
  ArrowLeftIcon,
  EnvelopeIcon,
  EnvelopeOpenIcon,
  CursorArrowRaysIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowPathIcon,
  ArrowDownTrayIcon,
  ChartBarIcon,
  UserIcon,
  GlobeAltIcon,
  ClockIcon,
  DevicePhoneMobileIcon,
  ComputerDesktopIcon,
  QuestionMarkCircleIcon,
  MapPinIcon,
  BuildingOfficeIcon
} from "@heroicons/react/20/solid";
import { prService } from "@/lib/firebase/pr-service";
import { companiesEnhancedService } from "@/lib/firebase/crm-service-enhanced";
import { PRCampaign } from "@/types/pr";
import { EmailCampaignSend } from "@/types/email";
import { CompanyEnhanced } from "@/types/crm-enhanced";

// Metric Card Component
function MetricCard({ 
  title, 
  value, 
  percentage, 
  icon: Icon, 
  color = 'gray',
  detail 
}: { 
  title: string; 
  value: number; 
  percentage?: number; 
  icon: React.ElementType;
  color?: string;
  detail?: string;
}) {
  const colorClasses = {
    gray: 'bg-gray-50 text-gray-600',
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    yellow: 'bg-yellow-50 text-yellow-600',
    red: 'bg-red-50 text-red-600',
    indigo: 'bg-indigo-50 text-indigo-600'
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className={`p-2 rounded-lg ${colorClasses[color as keyof typeof colorClasses]}`}>
          <Icon className="h-6 w-6" />
        </div>
        {percentage !== undefined && (
          <Badge color={color as any} className="text-xs">
            {percentage.toFixed(1)}%
          </Badge>
        )}
      </div>
      <div>
        <Text className="text-sm font-medium text-gray-700">{title}</Text>
        <p className="text-3xl font-bold text-gray-900 mt-1">{value.toLocaleString('de-DE')}</p>
        {detail && (
          <Text className="text-xs text-gray-500 mt-1">{detail}</Text>
        )}
      </div>
    </div>
  );
}

// Activity Item Component
function ActivityItem({ activity }: { activity: EmailActivity }) {
  const getActivityIcon = () => {
    switch (activity.type) {
      case 'sent': return EnvelopeIcon;
      case 'delivered': return CheckCircleIcon;
      case 'opened': return EnvelopeOpenIcon;
      case 'clicked': return CursorArrowRaysIcon;
      case 'bounced': return ExclamationTriangleIcon;
      case 'failed': return XCircleIcon;
      default: return QuestionMarkCircleIcon;
    }
  };

  const getActivityColor = () => {
    switch (activity.type) {
      case 'sent': return 'text-gray-600';
      case 'delivered': return 'text-green-600';
      case 'opened': return 'text-blue-600';
      case 'clicked': return 'text-indigo-600';
      case 'bounced': return 'text-yellow-600';
      case 'failed': return 'text-red-600';
      default: return 'text-gray-400';
    }
  };

  const getActivityLabel = () => {
    switch (activity.type) {
      case 'sent': return 'E-Mail versendet';
      case 'delivered': return 'E-Mail zugestellt';
      case 'opened': return 'E-Mail geöffnet';
      case 'clicked': return 'Link angeklickt';
      case 'bounced': return 'E-Mail abgewiesen';
      case 'failed': return 'Versand fehlgeschlagen';
      default: return 'Unbekannte Aktivität';
    }
  };

  const Icon = getActivityIcon();
  const timestamp = activity.timestamp?.toDate?.() || new Date();

  return (
    <div className="flex items-start gap-3 py-3">
      <div className={`mt-0.5 ${getActivityColor()}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0 flex-1">
            <Text className="font-medium">{getActivityLabel()}</Text>
            <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
              <span className="truncate">{activity.email}</span>
              {activity.metadata?.userAgent && (
                <>
                  <span>•</span>
                  <span>{activity.metadata.userAgent.includes('Mobile') ? 'Mobil' : 'Desktop'}</span>
                </>
              )}
              {activity.metadata?.location && (
                <>
                  <span>•</span>
                  <span>{activity.metadata.location}</span>
                </>
              )}
            </div>
          </div>
          <Text className="text-sm text-gray-500 whitespace-nowrap">
            {formatRelativeTime(timestamp)}
          </Text>
        </div>
        {activity.metadata?.clickedUrl && (
          <div className="mt-1">
            <a 
              href={activity.metadata.clickedUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-sm text-blue-600 hover:text-blue-700 truncate block"
            >
              {activity.metadata.clickedUrl}
            </a>
          </div>
        )}
        {activity.metadata?.failureReason && (
          <Text className="text-sm text-red-600 mt-1">
            Fehler: {activity.metadata.failureReason}
          </Text>
        )}
      </div>
    </div>
  );
}

// Export function
function exportAnalytics(campaign: PRCampaign, sends: EmailCampaignSend[], activities: EmailActivity[]) {
  // Create CSV content
  const headers = ['E-Mail', 'Status', 'Versendet', 'Zugestellt', 'Geöffnet', 'Geklickt', 'Fehlgeschlagen', 'Abgewiesen'];
  
  // Group activities by email
  const emailStats = new Map<string, any>();
  
  activities.forEach(activity => {
    if (!emailStats.has(activity.email)) {
      emailStats.set(activity.email, {
        email: activity.email,
        sent: false,
        delivered: false,
        opened: false,
        clicked: false,
        failed: false,
        bounced: false,
        sentAt: null,
        lastActivity: null
      });
    }
    
    const stats = emailStats.get(activity.email);
    stats[activity.type] = true;
    
    if (activity.type === 'sent') {
      stats.sentAt = activity.timestamp?.toDate?.() || null;
    }
    
    const activityDate = activity.timestamp?.toDate?.() || null;
    if (!stats.lastActivity || (activityDate && activityDate > stats.lastActivity)) {
      stats.lastActivity = activityDate;
    }
  });
  
  // Create CSV rows
  const rows = Array.from(emailStats.values()).map(stats => {
    const status = stats.failed ? 'Fehlgeschlagen' : 
                   stats.bounced ? 'Abgewiesen' :
                   stats.clicked ? 'Geklickt' :
                   stats.opened ? 'Geöffnet' :
                   stats.delivered ? 'Zugestellt' :
                   stats.sent ? 'Versendet' : 'Unbekannt';
    
    return [
      stats.email,
      status,
      stats.sent ? 'Ja' : 'Nein',
      stats.delivered ? 'Ja' : 'Nein',
      stats.opened ? 'Ja' : 'Nein',
      stats.clicked ? 'Ja' : 'Nein',
      stats.failed ? 'Ja' : 'Nein',
      stats.bounced ? 'Ja' : 'Nein'
    ];
  });
  
  // Combine headers and rows
  const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
  
  // Download
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `kampagne-${campaign.title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-analytics.csv`;
  link.click();
}

export default function CampaignAnalyticsPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const campaignId = params.campaignId as string;

  const [campaign, setCampaign] = useState<PRCampaign | null>(null);
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [company, setCompany] = useState<CompanyEnhanced | null>(null);
  const [sends, setSends] = useState<EmailCampaignSend[]>([]);
  const [activities, setActivities] = useState<EmailActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'opened' | 'clicked' | 'bounced' | 'failed'>('all');

  // Load OrganizationId
  useEffect(() => {
    const loadOrganizationId = async () => {
      if (!user) return;
      
      try {
        const orgs = await teamMemberService.getUserOrganizations(user.uid);
        if (orgs.length > 0) {
          setOrganizationId(orgs[0].organization.id!);
        } else {
          setOrganizationId(user.uid);
        }
      } catch (error) {
        console.warn('Organization loading failed, using userId as fallback:', error);
        setOrganizationId(user.uid);
      }
    };
    
    loadOrganizationId();
  }, [user]);

  useEffect(() => {
    if (campaignId && user && organizationId) {
      loadAnalyticsData();
    }
  }, [campaignId, user, organizationId]);

  const loadAnalyticsData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Load campaign
      const campaignData = await prService.getById(campaignId);
      if (!campaignData) {
        setError('Kampagne nicht gefunden');
        return;
      }
      setCampaign(campaignData);

      // Load company if exists
      if (campaignData.clientId && organizationId) {
        try {
          const companyData = await companiesEnhancedService.getById(organizationId, campaignData.clientId);
          setCompany(companyData);
        } catch (err) {
          console.error('Error loading company:', err);
        }
      }

      // For now, use mock data since emailService doesn't exist
      // In a real implementation, this would load from Firebase
      const mockSends: EmailCampaignSend[] = [{
        id: 'send-1',
        campaignId: campaignId,
        status: 'sent',
        sentAt: new Date() as any,
        userId: user!.uid,
        recipientEmail: 'example@email.com',
        recipientName: 'Example Recipient'
      }];
      setSends(mockSends);

      // Mock activities
      const mockActivities: EmailActivity[] = campaignData.recipientCount > 0 ? [
        {
          email: 'example@email.com',
          type: 'sent',
          timestamp: new Date()
        },
        {
          email: 'example@email.com', 
          type: 'delivered',
          timestamp: new Date()
        }
      ] : [];
      setActivities(mockActivities);
    } catch (error) {
      console.error('Error loading analytics:', error);
      setError('Fehler beim Laden der Analytics');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await loadAnalyticsData();
    } finally {
      setRefreshing(false);
    }
  };

  // Calculate metrics
  const metrics = useCallback(() => {
    const emailSet = new Set<string>();
    let delivered = 0;
    let opened = 0;
    let clicked = 0;
    let bounced = 0;
    let failed = 0;

    activities.forEach(activity => {
      emailSet.add(activity.email);
      if (activity.type === 'delivered') delivered++;
      if (activity.type === 'opened') opened++;
      if (activity.type === 'clicked') clicked++;
      if (activity.type === 'bounced') bounced++;
      if (activity.type === 'failed') failed++;
    });

    const totalRecipients = campaign?.recipientCount || emailSet.size;
    const sent = campaign?.recipientCount || 0; // Use campaign recipient count

    return {
      sent,
      delivered,
      opened,
      clicked,
      bounced,
      failed,
      openRate: sent > 0 ? (opened / sent) * 100 : 0,
      clickRate: sent > 0 ? (clicked / sent) * 100 : 0,
      bounceRate: sent > 0 ? (bounced / sent) * 100 : 0,
      deliveryRate: sent > 0 ? (delivered / sent) * 100 : 0,
    };
  }, [campaign, sends, activities]);

  // Filter activities
  const filteredActivities = activities.filter(activity => {
    if (filter === 'all') return true;
    return activity.type === filter;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#005fab] mx-auto"></div>
          <Text className="mt-4">Lade Analytics...</Text>
        </div>
      </div>
    );
  }

  if (error || !campaign) {
    return (
      <div className="text-center py-12">
        <ExclamationTriangleIcon className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <Heading level={2}>Fehler</Heading>
        <Text className="mt-2">{error || 'Kampagne nicht gefunden'}</Text>
        <Button href="/dashboard/pr-tools/campaigns" className="mt-4">
          Zurück zur Übersicht
        </Button>
      </div>
    );
  }

  const stats = metrics();

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <Button 
          plain 
          href={`/dashboard/pr-tools/campaigns/campaigns/${campaignId}`}
          className="mb-4"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          Zurück zur Kampagne
        </Button>
        
        <div className="flex items-start justify-between">
          <div>
            <Heading level={1}>Kampagnen-Analytics</Heading>
            <div className="flex items-center gap-4 mt-2">
              <Text className="text-gray-600">{campaign.title}</Text>
              {company && (
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <BuildingOfficeIcon className="h-4 w-4" />
                  <span>{company.name}</span>
                </div>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Button
              plain
              onClick={handleRefresh}
              disabled={refreshing}
            >
              <ArrowPathIcon className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              Aktualisieren
            </Button>
            <Button
              plain
              onClick={() => exportAnalytics(campaign, sends, activities)}
            >
              <ArrowDownTrayIcon className="h-4 w-4" />
              Export CSV
            </Button>
          </div>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
        <MetricCard
          title="Versendet"
          value={stats.sent}
          icon={EnvelopeIcon}
          color="gray"
        />
        <MetricCard
          title="Zugestellt"
          value={stats.delivered}
          percentage={stats.deliveryRate}
          icon={CheckCircleIcon}
          color="green"
        />
        <MetricCard
          title="Geöffnet"
          value={stats.opened}
          percentage={stats.openRate}
          icon={EnvelopeOpenIcon}
          color="blue"
        />
        <MetricCard
          title="Geklickt"
          value={stats.clicked}
          percentage={stats.clickRate}
          icon={CursorArrowRaysIcon}
          color="indigo"
        />
        <MetricCard
          title="Abgewiesen"
          value={stats.bounced}
          percentage={stats.bounceRate}
          icon={ExclamationTriangleIcon}
          color="yellow"
        />
        <MetricCard
          title="Fehlgeschlagen"
          value={stats.failed}
          percentage={stats.sent > 0 ? (stats.failed / stats.sent) * 100 : 0}
          icon={XCircleIcon}
          color="red"
        />
      </div>

      {/* Activity Feed */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Aktivitätsverlauf</h2>
            <div className="flex items-center gap-2">
              <Badge color="zinc">{filteredActivities.length} Aktivitäten</Badge>
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value as any)}
                className="text-sm border-gray-300 rounded-md"
              >
                <option value="all">Alle Aktivitäten</option>
                <option value="opened">Nur Öffnungen</option>
                <option value="clicked">Nur Klicks</option>
                <option value="bounced">Nur Abweisungen</option>
                <option value="failed">Nur Fehler</option>
              </select>
            </div>
          </div>
        </div>
        
        <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
          {filteredActivities.length > 0 ? (
            filteredActivities.map((activity, index) => (
              <div key={`${activity.email}-${activity.type}-${index}`} className="px-6">
                <ActivityItem activity={activity} />
              </div>
            ))
          ) : (
            <div className="px-6 py-12 text-center">
              <ChartBarIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <Text>Keine Aktivitäten gefunden</Text>
            </div>
          )}
        </div>
      </div>

      {/* Send Details */}
      {sends.length > 0 && (
        <div className="mt-8 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold mb-4">Versanddetails</h2>
          <div className="space-y-3">
            {sends.map(send => (
              <div key={send.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <Text className="font-medium">Versand #{send.id?.slice(-6)}</Text>
                  <Text className="text-sm text-gray-500">
                    {campaign.recipientCount} Empfänger • {formatDate(send.sentAt)}
                  </Text>
                </div>
                <Badge color={send.status === 'sent' ? 'green' : 'yellow'}>
                  {send.status === 'sent' ? 'Abgeschlossen' : 'In Bearbeitung'}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Helper function to format date
function formatDate(timestamp: any) {
  if (!timestamp || !timestamp.toDate) return '—';
  return timestamp.toDate().toLocaleDateString('de-DE', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}