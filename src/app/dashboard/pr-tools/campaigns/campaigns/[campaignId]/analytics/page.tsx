// Die Direktive "use client" muss die allererste Zeile in der Datei sein.
"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { teamMemberService } from "@/lib/firebase/organization-service";
import { Heading } from "@/components/ui/heading";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { formatDate } from "@/utils/dateHelpers";
import { LOADING_SPINNER_SIZE, LOADING_SPINNER_BORDER, ICON_SIZES } from "@/constants/ui";

// Vereinfachter Aktivitätstyp
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



// Metrik-Karten Komponente
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

// Aktivitäts-Item Komponente
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
            {formatDate(activity.timestamp)}
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

// Export Funktion
function exportAnalytics(campaign: PRCampaign, sends: EmailCampaignSend[], activities: EmailActivity[]) {
  // Erstelle CSV-Inhalt
  const headers = ['E-Mail', 'Status', 'Versendet', 'Zugestellt', 'Geöffnet', 'Geklickt', 'Fehlgeschlagen', 'Abgewiesen'];

  // Gruppiere Aktivitäten nach E-Mail
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

  // Erstelle CSV-Zeilen
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

  // Kombiniere Kopfzeilen und Zeilen
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

  // Lade OrganizationId
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
        // Organization loading failed, using userId as fallback
        setOrganizationId(user.uid);
      }
    };

    loadOrganizationId();
  }, [user]);

  const loadAnalyticsData = useCallback(async () => {
    if (!campaignId || !user || !organizationId) return;
    
    setLoading(true);
    setError(null);

    try {
      // Lade Kampagne
      const campaignData = await prService.getById(campaignId);
      if (!campaignData) {
        setError('Kampagne nicht gefunden');
        setLoading(false);
        return;
      }
      setCampaign(campaignData);

      // Lade Unternehmen, falls vorhanden
      if (campaignData.clientId && organizationId) {
        try {
          const companyData = await companiesEnhancedService.getById(organizationId, campaignData.clientId);
          setCompany(companyData);
        } catch (err) {
          // Error loading company
        }
      }

      // Vorerst Mock-Daten verwenden, da emailService nicht existiert
      // In einer echten Implementierung würde dies aus Firebase geladen
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

      // Mock-Aktivitäten
      const mockActivities: EmailActivity[] = campaignData.recipientCount > 0 ? [
        {
          email: 'max.mustermann@beispiel.de',
          type: 'sent',
          timestamp: { toDate: () => new Date(Date.now() - 2 * 60 * 1000) } // vor 2 Minuten
        },
        {
          email: 'max.mustermann@beispiel.de',
          type: 'delivered',
          timestamp: { toDate: () => new Date(Date.now() - 1 * 60 * 1000) } // vor 1 Minute
        },
        {
          email: 'erika.mustermann@beispiel.de',
          type: 'sent',
          timestamp: { toDate: () => new Date(Date.now() - 5 * 3600 * 1000) } // vor 5 Stunden
        },
        {
          email: 'erika.mustermann@beispiel.de',
          type: 'delivered',
          timestamp: { toDate: () => new Date(Date.now() - 5 * 3600 * 1000) }
        },
        {
          email: 'erika.mustermann@beispiel.de',
          type: 'opened',
          timestamp: { toDate: () => new Date(Date.now() - 4 * 3600 * 1000) }, // vor 4 Stunden
          metadata: { userAgent: 'Desktop Chrome', location: 'Berlin, Germany' }
        },
        {
          email: 'john.doe@example.com',
          type: 'sent',
          timestamp: { toDate: () => new Date(Date.now() - 2 * 86400 * 1000) } // vor 2 Tagen
        },
         {
          email: 'john.doe@example.com',
          type: 'delivered',
          timestamp: { toDate: () => new Date(Date.now() - 2 * 86400 * 1000) }
        },
        {
          email: 'john.doe@example.com',
          type: 'opened',
          timestamp: { toDate: () => new Date(Date.now() - 1 * 86400 * 1000) },
           metadata: { userAgent: 'Mobile Safari', location: 'Munich, Germany' }
        },
        {
          email: 'john.doe@example.com',
          type: 'clicked',
          timestamp: { toDate: () => new Date(Date.now() - 1 * 86400 * 1000 + 5000) },
          metadata: { clickedUrl: 'https://deine-website.de/pressemitteilung', userAgent: 'Mobile Safari', location: 'Munich, Germany' }
        },
        {
          email: 'bounce@example.com',
          type: 'sent',
          timestamp: { toDate: () => new Date(Date.now() - 3 * 86400 * 1000) }
        },
        {
          email: 'bounce@example.com',
          type: 'bounced',
          timestamp: { toDate: () => new Date(Date.now() - 3 * 86400 * 1000 + 2000) },
          metadata: { failureReason: 'Mailbox does not exist' }
        },
        {
          email: 'fail@example.com',
          type: 'failed',
          timestamp: { toDate: () => new Date(Date.now() - 4 * 86400 * 1000) },
           metadata: { failureReason: 'Invalid API Key' }
        }
      ] : [];
      
      // Aktivitäten nach Zeitstempel sortieren (neueste zuerst)
      mockActivities.sort((a, b) => (b.timestamp?.toDate() || 0) - (a.timestamp?.toDate() || 0));

      setActivities(mockActivities);
    } catch (error) {
      setError('Fehler beim Laden der Analytics');
    } finally {
      setLoading(false);
    }
  }, [campaignId, user, organizationId]);


  useEffect(() => {
    loadAnalyticsData();
  }, [loadAnalyticsData]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await loadAnalyticsData();
    } finally {
      setRefreshing(false);
    }
  };

  // Berechne Metriken
  const metrics = useCallback(() => {
    const deliveredEmails = new Set<string>();
    const openedEmails = new Set<string>();
    const clickedEmails = new Set<string>();
    const bouncedEmails = new Set<string>();
    const failedEmails = new Set<string>();

    activities.forEach(activity => {
        if (activity.type === 'delivered') deliveredEmails.add(activity.email);
        if (activity.type === 'opened') openedEmails.add(activity.email);
        if (activity.type === 'clicked') clickedEmails.add(activity.email);
        if (activity.type === 'bounced') bouncedEmails.add(activity.email);
        if (activity.type === 'failed') failedEmails.add(activity.email);
    });

    const sent = campaign?.recipientCount || 0;
    const delivered = deliveredEmails.size;
    const opened = openedEmails.size;
    const clicked = clickedEmails.size;
    const bounced = bouncedEmails.size;
    const failed = failedEmails.size;

    return {
        sent,
        delivered,
        opened,
        clicked,
        bounced,
        failed,
        deliveryRate: sent > 0 ? (delivered / sent) * 100 : 0,
        openRate: delivered > 0 ? (opened / delivered) * 100 : 0, // Open-Rate oft bezogen auf Zugestellte
        clickRate: opened > 0 ? (clicked / opened) * 100 : 0, // Click-Through-Rate oft bezogen auf Geöffnete
        bounceRate: sent > 0 ? (bounced / sent) * 100 : 0,
    };
  }, [campaign, activities]);

  // Filter Aktivitäten
  const filteredActivities = activities.filter(activity => {
    if (filter === 'all') return true;
    return activity.type === filter;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className={`animate-spin rounded-full ${LOADING_SPINNER_SIZE} ${LOADING_SPINNER_BORDER} mx-auto`}></div>
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

        <div className="flex flex-col md:flex-row items-start justify-between gap-4">
          <div>
            <Heading level={1}>Kampagnen-Analytics</Heading>
            <div className="flex items-center flex-wrap gap-x-4 gap-y-2 mt-2">
              <Text className="text-gray-600 font-semibold">{campaign.title}</Text>
              {company && (
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <BuildingOfficeIcon className="h-4 w-4" />
                  <span>{company.name}</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 flex-shrink-0">
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
          detail={`von ${stats.delivered} zugestellten`}
        />
        <MetricCard
          title="Geklickt"
          value={stats.clicked}
          percentage={stats.clickRate}
          icon={CursorArrowRaysIcon}
          color="indigo"
          detail={`von ${stats.opened} geöffneten`}
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
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <h2 className="text-lg font-semibold">Aktivitätsverlauf</h2>
            <div className="flex items-center gap-2">
              <Badge color="zinc">{filteredActivities.length} Aktivitäten</Badge>
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value as any)}
                className="text-sm border-gray-300 rounded-md shadow-sm focus:ring-[#005fab] focus:border-[#005fab]"
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

        <div className="divide-y divide-gray-200 max-h-[450px] overflow-y-auto">
          {filteredActivities.length > 0 ? (
            filteredActivities.map((activity, index) => (
              <div key={`${activity.email}-${activity.type}-${index}`} className="px-6">
                <ActivityItem activity={activity} />
              </div>
            ))
          ) : (
            <div className="px-6 py-12 text-center">
              <ChartBarIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <Text>Keine Aktivitäten für diesen Filter gefunden</Text>
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
