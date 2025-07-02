// src/components/calendar/ApprovalWidget.tsx
import { useState, useEffect } from 'react';
import { Button } from '@/components/button';
import { Badge } from '@/components/badge';
import { 
  ClockIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ArrowRightIcon,
  DocumentCheckIcon,
  CalendarDaysIcon
} from '@heroicons/react/24/outline';
import Link from 'next/link';
import { prService } from '@/lib/firebase/pr-service';
import { PRCampaign } from '@/types/pr';
import clsx from 'clsx';

interface ApprovalStats {
  total: number;
  pending: number;
  overdue: number;
  approved: number;
  changesRequested: number;
}

interface ApprovalWidgetProps {
  userId: string;
  onRefresh?: () => void;
}

export function ApprovalWidget({ userId, onRefresh }: ApprovalWidgetProps) {
  const [campaigns, setCampaigns] = useState<PRCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<ApprovalStats>({
    total: 0,
    pending: 0,
    overdue: 0,
    approved: 0,
    changesRequested: 0
  });
  const [expandedView, setExpandedView] = useState(false);

  useEffect(() => {
    loadApprovalCampaigns();
  }, [userId]);

  const loadApprovalCampaigns = async () => {
    setLoading(true);
    try {
      const approvalCampaigns = await prService.getApprovalCampaigns(userId);
      setCampaigns(approvalCampaigns);
      
      // Berechne Statistiken
      const now = new Date();
      const stats: ApprovalStats = {
        total: approvalCampaigns.length,
        pending: 0,
        overdue: 0,
        approved: 0,
        changesRequested: 0
      };
      
      approvalCampaigns.forEach(campaign => {
        if (campaign.status === 'approved') {
          stats.approved++;
        } else if (campaign.status === 'changes_requested') {
          stats.changesRequested++;
        } else if (campaign.status === 'in_review') {
          // Prüfe ob überfällig (älter als 7 Tage)
          if (campaign.approvalData?.feedbackHistory?.[0]?.requestedAt) {
            const requestDate = campaign.approvalData.feedbackHistory[0].requestedAt.toDate();
            const daysSinceRequest = Math.floor((now.getTime() - requestDate.getTime()) / (1000 * 60 * 60 * 24));
            
            if (daysSinceRequest > 7) {
              stats.overdue++;
            } else {
              stats.pending++;
            }
          } else {
            stats.pending++;
          }
        }
      });
      
      setStats(stats);
    } catch (error) {
      console.error('Fehler beim Laden der Freigaben:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (campaign: PRCampaign) => {
    if (campaign.status === 'approved') return 'text-green-600';
    if (campaign.status === 'changes_requested') return 'text-yellow-600';
    
    // Prüfe ob überfällig
    if (campaign.approvalData?.feedbackHistory?.[0]?.requestedAt) {
      const requestDate = campaign.approvalData.feedbackHistory[0].requestedAt.toDate();
      const daysSinceRequest = Math.floor((new Date().getTime() - requestDate.getTime()) / (1000 * 60 * 60 * 24));
      if (daysSinceRequest > 7) return 'text-red-600';
    }
    
    return 'text-gray-600';
  };

  const getStatusIcon = (campaign: PRCampaign) => {
    if (campaign.status === 'approved') return <CheckCircleIcon className="h-5 w-5" />;
    if (campaign.status === 'changes_requested') return <ExclamationTriangleIcon className="h-5 w-5" />;
    
    // Prüfe ob überfällig
    if (campaign.approvalData?.feedbackHistory?.[0]?.requestedAt) {
      const requestDate = campaign.approvalData.feedbackHistory[0].requestedAt.toDate();
      const daysSinceRequest = Math.floor((new Date().getTime() - requestDate.getTime()) / (1000 * 60 * 60 * 24));
      if (daysSinceRequest > 7) return <ExclamationTriangleIcon className="h-5 w-5" />;
    }
    
    return <ClockIcon className="h-5 w-5" />;
  };

  const getTimeAgo = (campaign: PRCampaign) => {
    if (campaign.approvalData?.feedbackHistory?.[0]?.requestedAt) {
      const requestDate = campaign.approvalData.feedbackHistory[0].requestedAt.toDate();
      const now = new Date();
      const diffInMs = now.getTime() - requestDate.getTime();
      const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
      
      if (diffInDays === 0) return 'heute';
      if (diffInDays === 1) return 'vor 1 Tag';
      return `vor ${diffInDays} Tagen`;
    }
    return '';
  };

  const getDaysOverdue = (campaign: PRCampaign): number => {
    if (campaign.approvalData?.feedbackHistory?.[0]?.requestedAt) {
      const requestDate = campaign.approvalData.feedbackHistory[0].requestedAt.toDate();
      const daysSinceRequest = Math.floor((new Date().getTime() - requestDate.getTime()) / (1000 * 60 * 60 * 24));
      return Math.max(0, daysSinceRequest - 7);
    }
    return 0;
  };

  // Filter für verschiedene Ansichten
  const criticalCampaigns = campaigns.filter(c => {
    if (c.status === 'changes_requested') return true;
    const daysOverdue = getDaysOverdue(c);
    return daysOverdue > 0;
  });

  const pendingCampaigns = campaigns.filter(c => 
    c.status === 'in_review' && getDaysOverdue(c) === 0
  );

  const approvedCampaigns = campaigns.filter(c => c.status === 'approved');

  if (loading) {
    return (
      <div className="bg-white rounded-lg border p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            <div className="h-3 bg-gray-200 rounded"></div>
            <div className="h-3 bg-gray-200 rounded w-5/6"></div>
          </div>
        </div>
      </div>
    );
  }

  // Kompakte Ansicht (Standard)
  if (!expandedView) {
    return (
      <div className="bg-white rounded-lg border overflow-hidden">
        <div className="p-4 border-b bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <DocumentCheckIcon className="h-5 w-5 text-gray-600" />
              <h3 className="font-semibold text-sm">Freigabe-Status</h3>
            </div>
            <Button plain onClick={() => setExpandedView(true)}>
              <span className="text-xs">Alle anzeigen</span>
            </Button>
          </div>
        </div>

        <div className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Linke Spalte: Statistiken */}
            <div className="space-y-3">
              <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider">Übersicht</h4>
              
              {/* Kritische Items zuerst */}
              {stats.overdue > 0 && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ExclamationTriangleIcon className="h-5 w-5 text-red-600" />
                      <span className="text-sm font-medium text-red-900">
                        {stats.overdue} überfällig
                      </span>
                    </div>
                    <Link href="/dashboard/freigaben">
                      <Button className="bg-red-600 text-white hover:bg-red-700">
                        <span className="text-xs">Anzeigen</span>
                      </Button>
                    </Link>
                  </div>
                </div>
              )}

              {/* Status-Übersicht */}
              <div className="grid grid-cols-2 gap-2">
                <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <span className="text-xs text-gray-600">Ausstehend</span>
                  <Badge color={stats.pending > 0 ? 'yellow' : 'zinc'}>
                    {stats.pending}
                  </Badge>
                </div>
                <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <span className="text-xs text-gray-600">Änderungen</span>
                  <Badge color={stats.changesRequested > 0 ? 'orange' : 'zinc'}>
                    {stats.changesRequested}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Mittlere und rechte Spalte: Kritische Kampagnen */}
            <div className="md:col-span-2">
              <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">
                Aktion erforderlich
              </h4>
              
              {criticalCampaigns.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {criticalCampaigns.slice(0, 4).map(campaign => (
                    <div 
                      key={campaign.id}
                      className={clsx(
                        "flex items-center justify-between p-3 rounded border",
                        getDaysOverdue(campaign) > 0 
                          ? "bg-red-50 border-red-200" 
                          : "bg-yellow-50 border-yellow-200"
                      )}
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <span className={getStatusColor(campaign)}>
                          {getStatusIcon(campaign)}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{campaign.title}</p>
                          <p className="text-xs text-gray-500">
                            {campaign.clientName} • {getTimeAgo(campaign)}
                          </p>
                        </div>
                      </div>
                      <Link href={`/dashboard/pr/campaigns/${campaign.id}`}>
                        <Button plain>
                          <ArrowRightIcon className="h-4 w-4" />
                        </Button>
                      </Link>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 bg-gray-50 rounded-lg">
                  <CheckCircleIcon className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">Keine ausstehenden Aktionen</p>
                </div>
              )}
            </div>
          </div>

          {/* Footer mit Link */}
          <div className="mt-4 pt-4 border-t flex justify-between items-center">
            <p className="text-xs text-gray-500">
              {campaigns.length} {campaigns.length === 1 ? 'Kampagne' : 'Kampagnen'} insgesamt
            </p>
            <Link href="/dashboard/freigaben">
              <Button plain>
                Alle Freigaben verwalten
                <ArrowRightIcon className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Erweiterte Ansicht
  return (
    <div className="bg-white rounded-lg border overflow-hidden">
      <div className="p-4 border-b bg-gray-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <DocumentCheckIcon className="h-5 w-5 text-gray-600" />
            <h3 className="font-semibold">Alle Freigaben</h3>
          </div>
          <div className="flex items-center gap-2">
            <Button plain onClick={loadApprovalCampaigns}>
              <span className="text-xs">Aktualisieren</span>
            </Button>
            <Button plain onClick={() => setExpandedView(false)}>
              <span className="text-xs">Minimieren</span>
            </Button>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Kampagne
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Kunde
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Angefordert
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Feedback
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Aktionen
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {campaigns.map(campaign => {
              const daysOverdue = getDaysOverdue(campaign);
              
              return (
                <tr 
                  key={campaign.id}
                  className={clsx(
                    "hover:bg-gray-50 transition-colors",
                    daysOverdue > 0 && "bg-red-50 hover:bg-red-100"
                  )}
                >
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <span className={getStatusColor(campaign)}>
                        {getStatusIcon(campaign)}
                      </span>
                      {campaign.status === 'approved' && (
                        <Badge color="green">Genehmigt</Badge>
                      )}
                      {campaign.status === 'changes_requested' && (
                        <Badge color="orange">Änderungen</Badge>
                      )}
                      {campaign.status === 'in_review' && daysOverdue > 0 && (
                        <Badge color="red">{daysOverdue}T überfällig</Badge>
                      )}
                      {campaign.status === 'in_review' && daysOverdue === 0 && (
                        <Badge color="yellow">Ausstehend</Badge>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium text-gray-900 truncate max-w-xs">
                      {campaign.title}
                    </p>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <p className="text-sm text-gray-600">{campaign.clientName}</p>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <p className="text-sm text-gray-600">{getTimeAgo(campaign)}</p>
                  </td>
                  <td className="px-4 py-3">
                    {campaign.approvalData?.feedbackHistory && 
                     campaign.approvalData.feedbackHistory.length > 0 ? (
                      <p className="text-xs text-gray-600 italic truncate max-w-xs">
                        "{campaign.approvalData.feedbackHistory[campaign.approvalData.feedbackHistory.length - 1].comment}"
                      </p>
                    ) : (
                      <span className="text-xs text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-right">
                    <div className="flex items-center gap-2 justify-end">
                      {campaign.approvalData?.shareId && (
                        <Button
                          plain
                          onClick={() => {
                            const url = prService.getApprovalUrl(campaign.approvalData!.shareId);
                            navigator.clipboard.writeText(url);
                            alert('Freigabe-Link kopiert!');
                          }}
                        >
                          <span className="text-xs">Link kopieren</span>
                        </Button>
                      )}
                      <Link href={`/dashboard/pr/campaigns/${campaign.id}`}>
                        <Button>
                          <span className="text-xs">Bearbeiten</span>
                        </Button>
                      </Link>
                    </div>
                  </td>
                </tr>
              );
            })}
            
            {campaigns.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center">
                  <CheckCircleIcon className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-500">Keine Kampagnen zur Freigabe</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}