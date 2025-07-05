// src/components/calendar/ApprovalWidget.tsx
import { useState, useEffect } from 'react';
import { Button } from '@/components/button';
import { Badge } from '@/components/badge';
import { Text } from '@/components/text';
import { Table, TableHead, TableBody, TableRow, TableHeader, TableCell } from '@/components/table';
import { 
  ClockIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ArrowRightIcon,
  DocumentCheckIcon,
  ArrowPathIcon,
  ChevronDownIcon,
  LinkIcon
} from '@heroicons/react/20/solid';
import Link from 'next/link';
import { prService } from '@/lib/firebase/pr-service';
import { PRCampaign } from '@/types/pr';

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

  const handleCopyLink = async (shareId: string) => {
    try {
      const url = prService.getApprovalUrl(shareId);
      await navigator.clipboard.writeText(url);
    } catch (error) {
      console.error('Fehler beim Kopieren:', error);
    }
  };

  const criticalCampaigns = campaigns.filter(c => {
    if (c.status === 'changes_requested') return true;
    const daysOverdue = getDaysOverdue(c);
    return daysOverdue > 0;
  });

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

  if (!expandedView) {
    return (
      <div className="bg-white rounded-lg border overflow-hidden">
        <div className="p-4 border-b bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <DocumentCheckIcon className="h-5 w-5 text-gray-600" />
              <Text className="font-semibold text-sm">Freigabe-Status</Text>
            </div>
            <Button plain onClick={() => setExpandedView(true)} className="whitespace-nowrap">
              Alle anzeigen
            </Button>
          </div>
        </div>

        <div className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-3">
              <Text className="text-xs font-medium text-gray-500 uppercase tracking-wider">Übersicht</Text>
              
              {stats.overdue > 0 && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ExclamationTriangleIcon className="h-5 w-5 text-red-600" />
                      <Text className="text-sm font-medium text-red-900">
                        {stats.overdue} überfällig
                      </Text>
                    </div>
                    <Link href="/dashboard/pr-tools/approvals">
                      <Button className="bg-red-600 hover:bg-red-700 text-white whitespace-nowrap">
                        Anzeigen
                      </Button>
                    </Link>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <Text className="text-xs text-gray-600">Ausstehend</Text>
                  <Badge color={stats.pending > 0 ? 'yellow' : 'zinc'}>
                    {stats.pending}
                  </Badge>
                </div>
                <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <Text className="text-xs text-gray-600">Änderungen</Text>
                  <Badge color={stats.changesRequested > 0 ? 'orange' : 'zinc'}>
                    {stats.changesRequested}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="md:col-span-2">
              <Text className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">
                Aktion erforderlich
              </Text>
              
              {criticalCampaigns.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {criticalCampaigns.slice(0, 4).map(campaign => (
                    <div 
                      key={campaign.id}
                      className={`flex items-center justify-between p-3 rounded border ${
                        getDaysOverdue(campaign) > 0 
                          ? "bg-red-50 border-red-200" 
                          : "bg-yellow-50 border-yellow-200"
                      }`}
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <span className={getStatusColor(campaign)}>
                          {getStatusIcon(campaign)}
                        </span>
                        <div className="min-w-0 flex-1">
                          <Text className="text-sm font-medium truncate">{campaign.title}</Text>
                          <Text className="text-xs text-gray-500">
                            {campaign.clientName} • {getTimeAgo(campaign)}
                          </Text>
                        </div>
                      </div>
                      <Link href={`/dashboard/pr-tools/campaigns/campaigns/${campaign.id}`}>
                        <Button plain>
                          <ArrowRightIcon />
                        </Button>
                      </Link>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 bg-gray-50 rounded-lg">
                  <CheckCircleIcon className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <Text className="text-sm text-gray-500">Keine ausstehenden Aktionen</Text>
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 pt-4 border-t flex justify-between items-center">
            <Text className="text-xs text-gray-500">
              {campaigns.length} {campaigns.length === 1 ? 'Kampagne' : 'Kampagnen'} insgesamt
            </Text>
            <Link href="/dashboard/pr-tools/approvals">
              <Button plain className="whitespace-nowrap">
                Alle Freigaben verwalten
                <ArrowRightIcon />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border overflow-hidden">
      <div className="p-4 border-b bg-gray-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <DocumentCheckIcon className="h-5 w-5 text-gray-600" />
            <Text className="font-semibold">Alle Freigaben</Text>
          </div>
          <div className="flex items-center gap-2">
            <Button plain onClick={loadApprovalCampaigns} className="whitespace-nowrap">
              <ArrowPathIcon />
              Aktualisieren
            </Button>
            <Button plain onClick={() => setExpandedView(false)} className="whitespace-nowrap">
              <ChevronDownIcon />
              Minimieren
            </Button>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHead>
            <TableRow>
              <TableHeader>Status</TableHeader>
              <TableHeader>Kampagne</TableHeader>
              <TableHeader>Kunde</TableHeader>
              <TableHeader>Angefordert</TableHeader>
              <TableHeader>Feedback</TableHeader>
              <TableHeader className="text-right">Aktionen</TableHeader>
            </TableRow>
          </TableHead>
          <TableBody>
            {campaigns.map(campaign => {
              const daysOverdue = getDaysOverdue(campaign);
              
              return (
                <TableRow 
                  key={campaign.id}
                  className={daysOverdue > 0 ? "bg-red-50 hover:bg-red-100" : "hover:bg-gray-50"}
                >
                  <TableCell>
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
                  </TableCell>
                  <TableCell>
                    <Text className="text-sm font-medium text-gray-900 truncate max-w-xs">
                      {campaign.title}
                    </Text>
                  </TableCell>
                  <TableCell>
                    <Text className="text-sm text-gray-600">{campaign.clientName}</Text>
                  </TableCell>
                  <TableCell>
                    <Text className="text-sm text-gray-600">{getTimeAgo(campaign)}</Text>
                  </TableCell>
                  <TableCell>
                    {campaign.approvalData?.feedbackHistory && 
                     campaign.approvalData.feedbackHistory.length > 0 ? (
                      <Text className="text-xs text-gray-600 italic truncate max-w-xs">
                        "{campaign.approvalData.feedbackHistory[campaign.approvalData.feedbackHistory.length - 1].comment}"
                      </Text>
                    ) : (
                      <Text className="text-xs text-gray-400">-</Text>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center gap-2 justify-end">
                      {campaign.approvalData?.shareId && (
                        <Button
                          plain
                          onClick={() => handleCopyLink(campaign.approvalData!.shareId)}
                          className="whitespace-nowrap"
                        >
                          <LinkIcon />
                          Link kopieren
                        </Button>
                      )}
                      <Link href={`/dashboard/pr-tools/campaigns/campaigns/${campaign.id}`}>
                        <Button className="bg-[#005fab] hover:bg-[#004a8c] text-white whitespace-nowrap">
                          Bearbeiten
                        </Button>
                      </Link>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
            
            {campaigns.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  <CheckCircleIcon className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                  <Text className="text-gray-500">Keine Kampagnen zur Freigabe</Text>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}