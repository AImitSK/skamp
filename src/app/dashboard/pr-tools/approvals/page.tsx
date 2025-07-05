// src/app/dashboard/pr-tools/approvals/page.tsx
"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Link from 'next/link';
import { useAuth } from "@/context/AuthContext";
import { Heading } from "@/components/heading";
import { Text } from "@/components/text";
import { Button } from "@/components/button";
import { Badge } from "@/components/badge";
import { Input } from "@/components/input";
import { Table, TableHead, TableBody, TableRow, TableHeader, TableCell } from "@/components/table";
import { Dialog, DialogTitle, DialogBody, DialogActions } from "@/components/dialog";
import { Dropdown, DropdownButton, DropdownMenu, DropdownItem, DropdownDivider } from "@/components/dropdown";
import { 
  MagnifyingGlassIcon,
  CheckBadgeIcon,
  ClockIcon,
  ChatBubbleLeftRightIcon,
  EllipsisVerticalIcon,
  EyeIcon,
  LinkIcon,
  DocumentTextIcon,
  InformationCircleIcon,
  ArrowPathIcon,
  PhotoIcon,
  FolderIcon,
  DocumentIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon
} from "@heroicons/react/20/solid";
import { prService } from "@/lib/firebase/pr-service";
import { PRCampaign } from "@/types/pr";

// Types
type ApprovalStatus = 'all' | 'in_review' | 'changes_requested' | 'approved';

// Alert Component
function Alert({ 
  type = 'info', 
  title, 
  message, 
  action 
}: { 
  type?: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message?: string;
  action?: { label: string; onClick: () => void };
}) {
  const styles = {
    info: 'bg-blue-50 text-blue-700',
    success: 'bg-green-50 text-green-700',
    warning: 'bg-yellow-50 text-yellow-700',
    error: 'bg-red-50 text-red-700'
  };

  const icons = {
    info: InformationCircleIcon,
    success: CheckCircleIcon,
    warning: ExclamationTriangleIcon,
    error: XCircleIcon
  };

  const Icon = icons[type];

  return (
    <div className={`rounded-md p-4 ${styles[type].split(' ')[0]}`}>
      <div className="flex">
        <div className="shrink-0">
          <Icon aria-hidden="true" className={`size-5 ${type === 'info' || type === 'success' ? 'text-blue-400' : type === 'warning' ? 'text-yellow-400' : 'text-red-400'}`} />
        </div>
        <div className="ml-3 flex-1 md:flex md:justify-between">
          <div>
            <Text className={`font-medium ${styles[type].split(' ')[1]}`}>{title}</Text>
            {message && <Text className={`mt-2 ${styles[type].split(' ')[1]}`}>{message}</Text>}
          </div>
          {action && (
            <p className="mt-3 text-sm md:mt-0 md:ml-6">
              <button
                onClick={action.onClick}
                className={`font-medium whitespace-nowrap ${styles[type].split(' ')[1]} hover:opacity-80`}
              >
                {action.label}
                <span aria-hidden="true"> →</span>
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// Feedback History Modal
function FeedbackHistoryModal({ 
  campaign, 
  onClose 
}: { 
  campaign: PRCampaign; 
  onClose: () => void;
}) {
  const formatDate = (timestamp: any) => {
    if (!timestamp || !timestamp.toDate) return '—';
    return timestamp.toDate().toLocaleDateString('de-DE', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusFromHistory = (campaign: PRCampaign, index: number) => {
    // Bestimme den Status basierend auf der Position und dem aktuellen Kampagnenstatus
    if (campaign.approvalData?.status === 'approved' && index === campaign.approvalData.feedbackHistory!.length - 1) {
      return 'approved';
    }
    // Wenn es einen Kommentar gibt, wurde kommentiert
    if (campaign.approvalData?.feedbackHistory?.[index].comment) {
      return 'commented';
    }
    // Ansonsten nur angesehen
    return 'viewed';
  };

  return (
    <Dialog open={true} onClose={onClose} size="2xl">
      <div className="p-6">
        <DialogTitle>Feedback-Historie</DialogTitle>
        <DialogBody className="mt-4">
          <div className="mb-4">
            <Text className="font-medium">{campaign.title}</Text>
            <Text className="text-sm text-gray-500">{campaign.clientName}</Text>
          </div>

          {campaign.approvalData?.feedbackHistory && campaign.approvalData.feedbackHistory.length > 0 ? (
            <div className="space-y-4">
              {campaign.approvalData.feedbackHistory.map((feedback, index) => {
                const status = getStatusFromHistory(campaign, index);
                return (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge color={status === 'approved' ? 'green' : status === 'commented' ? 'orange' : 'blue'}>
                            {status === 'approved' ? 'Freigegeben' : status === 'commented' ? 'Kommentiert' : 'Angesehen'}
                          </Badge>
                          <Text className="text-sm text-gray-500">{formatDate(feedback.requestedAt)}</Text>
                        </div>
                        {feedback.comment && (
                          <Text className="text-sm italic text-gray-700">"{feedback.comment}"</Text>
                        )}
                        {feedback.author && (
                          <Text className="text-sm text-gray-500 mt-2">
                            Von: {feedback.author}
                          </Text>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <ChatBubbleLeftRightIcon className="h-12 w-12 mx-auto text-gray-300" />
              <Text className="mt-2 text-gray-500">Noch kein Feedback vorhanden</Text>
            </div>
          )}

          {campaign.attachedAssets && campaign.attachedAssets.length > 0 && (
            <div className="mt-6 pt-6 border-t">
              <Text className="font-medium mb-3">Angehängte Medien ({campaign.attachedAssets.length})</Text>
              <div className="space-y-2">
                {campaign.attachedAssets.map((asset, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-2 bg-gray-50 rounded">
                    {asset.type === 'folder' ? (
                      <>
                        <FolderIcon className="h-5 w-5 text-gray-400" />
                        <span className="text-sm">{asset.metadata.folderName}</span>
                      </>
                    ) : (
                      <>
                        <DocumentIcon className="h-5 w-5 text-gray-400" />
                        <span className="text-sm">{asset.metadata.fileName}</span>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </DialogBody>
        <DialogActions>
          <Button plain onClick={onClose}>Schließen</Button>
        </DialogActions>
      </div>
    </Dialog>
  );
}

export default function ApprovalsPage() {
  const { user } = useAuth();
  const [campaigns, setCampaigns] = useState<PRCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ApprovalStatus>('all');
  const [searchTerm, setSearchTerm] = useState("");
  const [alert, setAlert] = useState<{ type: 'info' | 'success' | 'warning' | 'error'; title: string; message?: string } | null>(null);
  const [selectedCampaign, setSelectedCampaign] = useState<PRCampaign | null>(null);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  
  // Refresh States
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(25);

  // Alert Management
  const showAlert = useCallback((type: 'info' | 'success' | 'warning' | 'error', title: string, message?: string) => {
    setAlert({ type, title, message });
    setTimeout(() => setAlert(null), 5000);
  }, []);

  const loadCampaigns = async () => {
    if (!user) return;
    setLoading(true);
    setIsRefreshing(true);
    try {
      const allCampaigns = await prService.getAll(user.uid);
      const approvalCampaigns = allCampaigns.filter((c: PRCampaign) => c.approvalRequired && c.approvalData);
      
      setCampaigns(approvalCampaigns);
      setLastRefresh(new Date());
      
      if (!loading) {
        showAlert('success', 'Daten aktualisiert');
      }
    } catch (error) {
      showAlert('error', 'Fehler beim Laden', 'Die Freigaben konnten nicht geladen werden.');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadCampaigns();
    }
  }, [user]);

  // Auto-Refresh alle 30 Sekunden
  useEffect(() => {
    const interval = setInterval(() => {
      if (!loading && !isRefreshing && user) {
        loadCampaigns();
      }
    }, 30000);
    
    return () => clearInterval(interval);
  }, [user, loading, isRefreshing]);

  // Refresh bei Fokus
  useEffect(() => {
    const handleFocus = () => {
      const timeSinceLastRefresh = new Date().getTime() - lastRefresh.getTime();
      if (timeSinceLastRefresh > 10000 && !loading && !isRefreshing && user) {
        loadCampaigns();
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [lastRefresh, loading, isRefreshing, user]);

  const filteredCampaigns = useMemo(() => {
    return campaigns.filter(campaign => {
      const searchMatch = campaign.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (campaign.clientName || '').toLowerCase().includes(searchTerm.toLowerCase());
      
      if (!searchMatch) return false;

      if (activeTab === 'all') return true;
      
      const statusMap: { [key in ApprovalStatus]: string[] } = {
        'all': [],
        'in_review': ['pending', 'viewed'],
        'changes_requested': ['commented'],
        'approved': ['approved']
      };

      return statusMap[activeTab].includes(campaign.approvalData?.status || '');
    });
  }, [campaigns, searchTerm, activeTab]);

  // Paginated Data
  const paginatedCampaigns = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredCampaigns.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredCampaigns, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredCampaigns.length / itemsPerPage);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, activeTab]);

  const handleCopyLink = async (shareId: string) => {
    const url = `${window.location.origin}/freigabe/${shareId}`;
    try {
      await navigator.clipboard.writeText(url);
      showAlert('success', 'Link kopiert', 'Der Freigabe-Link wurde in die Zwischenablage kopiert.');
    } catch (error) {
      showAlert('error', 'Fehler', 'Der Link konnte nicht kopiert werden.');
    }
  };

  const handleViewFeedback = (campaign: PRCampaign) => {
    setSelectedCampaign(campaign);
    setShowFeedbackModal(true);
  };

  const handleResubmit = async (campaign: PRCampaign) => {
    try {
      await prService.resubmitForApproval(campaign.id!);
      showAlert('success', 'Erneut zur Freigabe gesendet', 'Die Kampagne wurde erneut an den Kunden gesendet.');
      await loadCampaigns();
    } catch (error) {
      showAlert('error', 'Fehler beim erneuten Senden', 'Die Kampagne konnte nicht erneut gesendet werden.');
    }
  };

  const getStatusBadge = (campaign: PRCampaign) => {
    const status = campaign.approvalData?.status;
    switch (status) {
      case 'pending':
        return <Badge color="yellow">Warten auf Feedback</Badge>;
      case 'viewed':
        return <Badge color="blue">Angesehen</Badge>;
      case 'commented':
        return <Badge color="orange">Änderungen erbeten</Badge>;
      case 'approved':
        return <Badge color="green">Freigegeben</Badge>;
      default:
        return <Badge color="zinc">Unbekannt</Badge>;
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp || !timestamp.toDate) return '—';
    const date = timestamp.toDate();
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (hours < 1) return 'Vor weniger als 1 Stunde';
    if (hours < 24) return `Vor ${hours} Stunde${hours > 1 ? 'n' : ''}`;
    if (days < 7) return `Vor ${days} Tag${days > 1 ? 'en' : ''}`;
    
    return date.toLocaleDateString('de-DE', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const approvalTabs = [
    { id: "all", label: "Alle", count: campaigns.length },
    { id: "in_review", label: "In Prüfung", count: campaigns.filter((c: PRCampaign) => ['pending', 'viewed'].includes(c.approvalData?.status || '')).length },
    { id: "changes_requested", label: "Änderungen erbeten", count: campaigns.filter((c: PRCampaign) => c.approvalData?.status === 'commented').length },
    { id: "approved", label: "Freigegeben", count: campaigns.filter((c: PRCampaign) => c.approvalData?.status === 'approved').length },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#005fab] mx-auto"></div>
          <Text className="mt-4">Lade Freigaben...</Text>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Alert */}
      {alert && (
        <div className="mb-4">
          <Alert type={alert.type} title={alert.title} message={alert.message} />
        </div>
      )}

      {/* Header */}
      <div className="md:flex md:items-center md:justify-between">
        <div className="min-w-0 flex-1">
          <Heading>Freigaben-Center</Heading>
        </div>
        <div className="mt-4 flex md:mt-0 md:ml-4 gap-3">
          <Text className="text-xs text-gray-500 self-center">
            Zuletzt aktualisiert: {lastRefresh.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
          </Text>
          <Button
            onClick={() => loadCampaigns()}
            disabled={isRefreshing}
            plain
            className="whitespace-nowrap"
          >
            <ArrowPathIcon className={isRefreshing ? 'animate-spin' : ''} />
            Aktualisieren
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="mt-8">
        <div className="border-b border-gray-200">
          <nav aria-label="Tabs" className="-mb-px flex gap-8 overflow-x-auto">
            {approvalTabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as ApprovalStatus)}
                className={`group inline-flex items-center border-b-2 px-1 py-4 text-sm font-medium whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-[#005fab] text-[#005fab]'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                }`}
              >
                {tab.id === 'in_review' && (
                  <ClockIcon className={`mr-2 -ml-0.5 size-5 ${
                    activeTab === tab.id ? 'text-[#005fab]' : 'text-gray-400 group-hover:text-gray-500'
                  }`} />
                )}
                {tab.id === 'changes_requested' && (
                  <ChatBubbleLeftRightIcon className={`mr-2 -ml-0.5 size-5 ${
                    activeTab === tab.id ? 'text-[#005fab]' : 'text-gray-400 group-hover:text-gray-500'
                  }`} />
                )}
                {tab.id === 'approved' && (
                  <CheckBadgeIcon className={`mr-2 -ml-0.5 size-5 ${
                    activeTab === tab.id ? 'text-[#005fab]' : 'text-gray-400 group-hover:text-gray-500'
                  }`} />
                )}
                <span>{tab.label} ({tab.count})</span>
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Search */}
      <div className="mt-6">
        <div className="relative max-w-md">
          <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 size-5 text-gray-400 z-10" />
          <Input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Kampagnen durchsuchen..."
            className="pl-10"
          />
        </div>
      </div>

      {/* Results Info */}
      <div className="mt-4">
        <Text>
          {filteredCampaigns.length} von {campaigns.length} Freigaben
        </Text>
      </div>

      {/* Table */}
      <div className="mt-8">
        {paginatedCampaigns.length === 0 ? (
          <div className="text-center py-12 border rounded-lg bg-white">
            <CheckBadgeIcon className="mx-auto h-12 w-12 text-gray-400" />
            <Heading level={3} className="mt-2">Keine Freigaben gefunden</Heading>
            <Text className="mt-1">
              {searchTerm || activeTab !== 'all' 
                ? "Versuchen Sie andere Suchkriterien" 
                : "Noch keine Kampagnen zur Freigabe eingereicht"}
            </Text>
          </div>
        ) : (
          <Table>
            <TableHead>
              <TableRow>
                <TableHeader>Kampagne</TableHeader>
                <TableHeader>Kunde</TableHeader>
                <TableHeader>Status</TableHeader>
                <TableHeader>Letzte Aktivität</TableHeader>
                <TableHeader>
                  <span className="sr-only">Aktionen</span>
                </TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {paginatedCampaigns.map((campaign) => (
                <TableRow key={campaign.id} className="hover:bg-gray-50">
                  <TableCell>
                    <Link 
                      href={`/dashboard/pr-tools/campaigns/campaigns/${campaign.id}`} 
                      className="text-[#005fab] hover:text-[#004a8c] font-medium"
                    >
                      {campaign.title}
                    </Link>
                    {campaign.attachedAssets && campaign.attachedAssets.length > 0 && (
                      <div className="mt-1 flex items-center gap-2">
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <PhotoIcon className="h-3 w-3" />
                          {campaign.attachedAssets.length} Medien
                        </div>
                      </div>
                    )}
                  </TableCell>
                  <TableCell>{campaign.clientName || '—'}</TableCell>
                  <TableCell>{getStatusBadge(campaign)}</TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <div className="text-gray-900">{formatDate(
                        campaign.approvalData?.approvedAt || 
                        (campaign.approvalData?.feedbackHistory?.length 
                          ? campaign.approvalData.feedbackHistory[campaign.approvalData.feedbackHistory.length - 1].requestedAt
                          : campaign.updatedAt)
                      )}</div>
                      {campaign.approvalData?.feedbackHistory && campaign.approvalData.feedbackHistory.length > 0 && (
                        <div className="text-gray-500 flex items-center gap-1 mt-1">
                          <ChatBubbleLeftRightIcon className="h-3 w-3" />
                          {campaign.approvalData.feedbackHistory.length} Kommentar{campaign.approvalData.feedbackHistory.length !== 1 ? 'e' : ''}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Dropdown>
                      <DropdownButton plain className="p-2 hover:bg-gray-100 rounded-lg">
                        <EllipsisVerticalIcon className="h-5 w-5 text-gray-700" />
                      </DropdownButton>
                      <DropdownMenu anchor="bottom end" className="bg-white shadow-lg rounded-lg">
                        <DropdownItem 
                          href={`/freigabe/${campaign.approvalData?.shareId}`}
                          target="_blank"
                          className="hover:bg-gray-50"
                        >
                          <EyeIcon className="text-gray-500" />
                          Freigabe-Link öffnen
                        </DropdownItem>
                        <DropdownItem 
                          onClick={() => handleCopyLink(campaign.approvalData?.shareId || '')}
                          className="hover:bg-gray-50"
                        >
                          <LinkIcon className="text-gray-500" />
                          Link kopieren
                        </DropdownItem>
                        <DropdownDivider />
                        <DropdownItem 
                          href={`/dashboard/pr-tools/campaigns/campaigns/${campaign.id}`}
                          className="hover:bg-gray-50"
                        >
                          <DocumentTextIcon className="text-gray-500" />
                          Kampagne anzeigen
                        </DropdownItem>
                        <DropdownItem 
                          onClick={() => handleViewFeedback(campaign)}
                          className="hover:bg-gray-50"
                        >
                          <ChatBubbleLeftRightIcon className="text-gray-500" />
                          Feedback-Historie
                        </DropdownItem>
                        {campaign.status === 'changes_requested' && (
                          <>
                            <DropdownDivider />
                            <DropdownItem 
                              onClick={() => handleResubmit(campaign)}
                              className="hover:bg-gray-50"
                            >
                              <ArrowPathIcon className="text-gray-500" />
                              Erneut senden
                            </DropdownItem>
                          </>
                        )}
                      </DropdownMenu>
                    </Dropdown>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <nav className="mt-6 flex items-center justify-between border-t border-gray-200 px-4 sm:px-0 pt-4">
          <div className="-mt-px flex w-0 flex-1">
            <Button
              plain
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="whitespace-nowrap"
            >
              <ChevronLeftIcon />
              Zurück
            </Button>
          </div>
          <div className="hidden md:-mt-px md:flex">
            {(() => {
              const pages = [];
              const maxVisible = 7;
              let start = Math.max(1, currentPage - 3);
              let end = Math.min(totalPages, start + maxVisible - 1);
              
              if (end - start < maxVisible - 1) {
                start = Math.max(1, end - maxVisible + 1);
              }
              
              for (let i = start; i <= end; i++) {
                pages.push(
                  <Button
                    key={i}
                    plain
                    onClick={() => setCurrentPage(i)}
                    className={currentPage === i ? 'font-semibold text-[#005fab]' : ''}
                  >
                    {i}
                  </Button>
                );
              }
              
              return pages;
            })()}
          </div>
          <div className="-mt-px flex w-0 flex-1 justify-end">
            <Button
              plain
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="whitespace-nowrap"
            >
              Weiter
              <ChevronRightIcon />
            </Button>
          </div>
        </nav>
      )}

      {/* Feedback History Modal */}
      {showFeedbackModal && selectedCampaign && (
        <FeedbackHistoryModal 
          campaign={selectedCampaign}
          onClose={() => {
            setShowFeedbackModal(false);
            setSelectedCampaign(null);
          }}
        />
      )}
    </div>
  );
}