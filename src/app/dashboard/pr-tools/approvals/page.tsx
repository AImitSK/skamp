// src/app/dashboard/pr-tools/approvals/page.tsx
"use client";

import { useState, useEffect, useMemo, useCallback, Fragment } from "react";
import Link from 'next/link';
import { useAuth } from "@/context/AuthContext";
import { useOrganization } from "@/context/OrganizationContext";
import { Heading } from "@/components/ui/heading";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SearchInput } from "@/components/ui/search-input";
import { Dialog, DialogTitle, DialogBody, DialogActions } from "@/components/ui/dialog";
import { Dropdown, DropdownButton, DropdownMenu, DropdownItem, DropdownDivider } from "@/components/ui/dropdown";
import { Popover, Transition } from '@headlessui/react';
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
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  FunnelIcon,
  XMarkIcon,
  BuildingOfficeIcon,
  ChevronLeftIcon,
  ChevronRightIcon
} from "@heroicons/react/24/outline";
import { approvalService } from "@/lib/firebase/approval-service";
import { companiesEnhancedService } from "@/lib/firebase/crm-service-enhanced";
import { pdfVersionsService } from "@/lib/firebase/pdf-versions-service";
import { 
  ApprovalEnhanced, 
  ApprovalListView, 
  ApprovalFilters,
  ApprovalStatus,
  APPROVAL_STATUS_CONFIG,
  PRIORITY_OPTIONS
} from "@/types/approvals";
import { PDFVersion } from "@/lib/firebase/pdf-versions-service";
import clsx from "clsx";

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
  approval, 
  onClose 
}: { 
  approval: ApprovalEnhanced; 
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

  const getActionLabel = (action: string) => {
    const labels: Record<string, string> = {
      created: 'Erstellt',
      sent_for_approval: 'Zur Freigabe gesendet',
      viewed: 'Angesehen',
      approved: 'Freigegeben',
      rejected: 'Abgelehnt',
      commented: 'Kommentiert',
      changes_requested: 'Änderungen angefordert',
      reminder_sent: 'Erinnerung gesendet',
      resubmitted: 'Erneut eingereicht'
    };
    return labels[action] || action;
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'approved':
        return <CheckCircleIcon className="h-5 w-5 text-green-600" />;
      case 'rejected':
        return <XCircleIcon className="h-5 w-5 text-red-600" />;
      case 'changes_requested':
      case 'commented':
        return <ChatBubbleLeftRightIcon className="h-5 w-5 text-orange-600" />;
      case 'viewed':
        return <EyeIcon className="h-5 w-5 text-blue-600" />;
      default:
        return <InformationCircleIcon className="h-5 w-5 text-gray-400" />;
    }
  };

  return (
    <Dialog open={true} onClose={onClose} size="2xl">
      <div className="p-6">
        <DialogTitle>Freigabe-Historie</DialogTitle>
        <DialogBody className="mt-4">
          <div className="mb-4">
            <Text className="font-medium">{approval.title}</Text>
            <Text className="text-sm text-gray-500">{approval.clientName}</Text>
          </div>

          {approval.history && approval.history.length > 0 ? (
            <div className="space-y-4">
              {approval.history.map((entry, index) => (
                <div key={entry.id} className="flex gap-4">
                  <div className="flex-shrink-0 mt-1">
                    {getActionIcon(entry.action)}
                  </div>
                  <div className="flex-1 border rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge color={entry.action === 'approved' ? 'green' : entry.action === 'rejected' ? 'red' : entry.action === 'changes_requested' || entry.action === 'commented' ? 'orange' : 'blue'}>
                            {getActionLabel(entry.action)}
                          </Badge>
                          <Text className="text-sm text-gray-500">{formatDate(entry.timestamp)}</Text>
                        </div>
                        <Text className="text-sm font-medium text-gray-900">
                          {entry.actorName}
                          {entry.actorEmail && (
                            <span className="font-normal text-gray-500"> ({entry.actorEmail})</span>
                          )}
                        </Text>
                        {entry.details.comment && (
                          <Text className="text-sm italic text-gray-700 mt-2">&ldquo;{entry.details.comment}&rdquo;</Text>
                        )}
                        {entry.inlineComments && entry.inlineComments.length > 0 && (
                          <div className="mt-2 space-y-1">
                            <Text className="text-xs font-medium text-gray-500">Inline-Kommentare:</Text>
                            {entry.inlineComments.map((comment, idx) => (
                              <div key={comment.id} className="text-sm bg-gray-50 p-2 rounded">
                                <Text className="text-gray-600 italic">&ldquo;{comment.quote}&rdquo;</Text>
                                <Text className="text-gray-800 mt-1">→ {comment.text}</Text>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <ChatBubbleLeftRightIcon className="h-12 w-12 mx-auto text-gray-300" />
              <Text className="mt-2 text-gray-500">Noch keine Historie vorhanden</Text>
            </div>
          )}

          {approval.attachedAssets && approval.attachedAssets.length > 0 && (
            <div className="mt-6 pt-6 border-t">
              <Text className="font-medium mb-3">Angehängte Medien ({approval.attachedAssets.length})</Text>
              <div className="space-y-2">
                {approval.attachedAssets.map((asset, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-2 bg-gray-50 rounded overflow-hidden">
                    <div className="flex-shrink-0">
                      {asset.type === 'folder' ? (
                        <FolderIcon className="h-5 w-5 text-gray-400" />
                      ) : (
                        <DocumentIcon className="h-5 w-5 text-gray-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-sm text-gray-900 truncate block">{asset.name}</span>
                    </div>
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

// Enhanced ApprovalListView Interface mit PDF-Daten
interface EnhancedApprovalListView extends ApprovalListView {
  pdfVersions: PDFVersion[];
  currentPdfVersion: PDFVersion | null;
  hasPDF: boolean;
  pdfStatus: 'none' | 'draft' | 'pending_customer' | 'approved' | 'rejected';
}

export default function ApprovalsPage() {
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();
  const [approvals, setApprovals] = useState<EnhancedApprovalListView[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string[]>([]);
  const [selectedClients, setSelectedClients] = useState<string[]>([]);
  const [selectedPriorities, setSelectedPriorities] = useState<string[]>([]);
  const [selectedPdfStatus, setSelectedPdfStatus] = useState<string[]>([]);
  const [showOverdueOnly, setShowOverdueOnly] = useState(false);
  const [alert, setAlert] = useState<{ type: 'info' | 'success' | 'warning' | 'error'; title: string; message?: string } | null>(null);
  const [selectedApproval, setSelectedApproval] = useState<ApprovalEnhanced | null>(null);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [clients, setClients] = useState<Array<{ id: string; name: string }>>([]);
  
  // Refresh States
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Alert Management
  const showAlert = useCallback((type: 'info' | 'success' | 'warning' | 'error', title: string, message?: string) => {
    setAlert({ type, title, message });
    setTimeout(() => setAlert(null), 5000);
  }, []);


  const loadApprovals = async () => {
    if (!currentOrganization) {
      return;
    }
    
    
    setLoading(true);
    setIsRefreshing(true);
    try {
      // Erstelle Filter
      const filters: ApprovalFilters = {
        search: searchTerm,
        status: selectedStatus.length > 0 ? selectedStatus as ApprovalStatus[] : undefined,
        clientIds: selectedClients.length > 0 ? selectedClients : undefined,
        priority: selectedPriorities.length > 0 ? selectedPriorities : undefined,
        isOverdue: showOverdueOnly ? true : undefined
      };
      
      
      // Lade Freigaben mit Filtern
      const allApprovals = await approvalService.searchEnhanced(currentOrganization.id, filters);
      
      
      // Filtere Draft-Status heraus
      const filteredApprovals = allApprovals.filter(a => a.status !== 'draft');
      
      // NEU: PDF-Versionen für alle Approvals laden
      const approvalsWithPDF = await Promise.all(
        filteredApprovals.map(async (approval) => {
          try {
            const pdfVersions = await pdfVersionsService.getVersionHistory(approval.campaignId);
            const currentPdfVersion = await pdfVersionsService.getCurrentVersion(approval.campaignId);
            
            return {
              ...approval,
              pdfVersions,
              currentPdfVersion,
              hasPDF: !!currentPdfVersion,
              pdfStatus: currentPdfVersion?.status || 'none'
            } as EnhancedApprovalListView;
          } catch (error) {
            console.error(`Error loading PDF data for campaign ${approval.campaignId}:`, error);
            return {
              ...approval,
              pdfVersions: [],
              currentPdfVersion: null,
              hasPDF: false,
              pdfStatus: 'none'
            } as EnhancedApprovalListView;
          }
        })
      );
      
      // Filter nach PDF-Status anwenden
      let finalApprovals = approvalsWithPDF;
      if (selectedPdfStatus.length > 0) {
        finalApprovals = approvalsWithPDF.filter(approval => 
          selectedPdfStatus.includes(approval.pdfStatus)
        );
      }
      
      setApprovals(finalApprovals);
      
      // Lade Kunden für Filter
      const companies = await companiesEnhancedService.getAll(currentOrganization.id);
      const uniqueClients = Array.from(new Map(
        allApprovals
          .filter(a => a.clientId)
          .map(a => [a.clientId, { id: a.clientId!, name: a.clientName }])
      ).values());
      
      // Füge weitere Kunden hinzu, die noch keine Freigaben haben
      companies.forEach(company => {
        if (!uniqueClients.find(c => c.id === company.id)) {
          uniqueClients.push({ id: company.id!, name: company.name });
        }
      });
      
      setClients(uniqueClients.sort((a, b) => a.name.localeCompare(b.name)));
      
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
    if (currentOrganization) {
      loadApprovals();
    }
  }, [currentOrganization, selectedStatus, selectedClients, selectedPriorities, selectedPdfStatus, showOverdueOnly, searchTerm]);


  const handleCopyLink = async (shareId: string) => {
    const url = `${window.location.origin}/freigabe/${shareId}`;
    try {
      await navigator.clipboard.writeText(url);
      showAlert('success', 'Link kopiert', 'Der Freigabe-Link wurde in die Zwischenablage kopiert.');
    } catch (error) {
      showAlert('error', 'Fehler', 'Der Link konnte nicht kopiert werden.');
    }
  };

  const handleCopyPDFLink = async (pdfUrl: string) => {
    try {
      await navigator.clipboard.writeText(pdfUrl);
      showAlert('success', 'PDF-Link kopiert', 'Der PDF-Link wurde in die Zwischenablage kopiert.');
    } catch (error) {
      showAlert('error', 'Fehler', 'Der PDF-Link konnte nicht kopiert werden.');
    }
  };

  const handleViewFeedback = async (approval: ApprovalListView) => {
    // Lade vollständige Approval mit Historie
    const fullApproval = await approvalService.getById(approval.id!, currentOrganization!.id);
    if (fullApproval) {
      setSelectedApproval(fullApproval);
      setShowFeedbackModal(true);
    }
  };

  const handleResubmit = async (approval: ApprovalListView) => {
    try {
      await approvalService.sendForApproval(approval.id!, { organizationId: currentOrganization!.id, userId: user!.uid });
      showAlert('success', 'Erneut zur Freigabe gesendet', 'Die Kampagne wurde erneut an den Kunden gesendet.');
      await loadApprovals();
    } catch (error) {
      showAlert('error', 'Fehler beim erneuten Senden', 'Die Kampagne konnte nicht erneut gesendet werden.');
    }
  };

  const handleSendReminder = async (approval: ApprovalListView) => {
    try {
      await approvalService.sendReminder(approval.id!, { organizationId: currentOrganization!.id, userId: user!.uid });
      showAlert('success', 'Erinnerung gesendet', 'Eine Erinnerung wurde an den Kunden gesendet.');
    } catch (error) {
      showAlert('error', 'Fehler beim Senden', 'Die Erinnerung konnte nicht gesendet werden.');
    }
  };

  const getStatusBadge = (status: ApprovalStatus) => {
    const config = APPROVAL_STATUS_CONFIG[status];
    const colorMap: Record<string, 'zinc' | 'indigo' | 'blue' | 'green' | 'yellow' | 'red' | 'orange' | 'purple'> = {
      'gray': 'zinc',
      'indigo': 'indigo',
      'yellow': 'yellow',
      'blue': 'blue',
      'green': 'green',
      'red': 'red',
      'orange': 'orange',
      'purple': 'purple'
    };
    return <Badge color={colorMap[config.color] || 'zinc'}>{config.label}</Badge>;
  };

  const getPriorityBadge = (priority?: string) => {
    if (!priority) return null;
    const option = PRIORITY_OPTIONS.find(o => o.value === priority);
    if (!option) return null;
    
    const priorityColorMap: Record<string, 'zinc' | 'blue' | 'orange' | 'red'> = {
      'gray': 'zinc',
      'blue': 'blue',
      'orange': 'orange',
      'red': 'red'
    };
    
    return <Badge color={priorityColorMap[option.color] || 'zinc'}>{option.label}</Badge>;
  };

  const getPDFStatusColor = (status: string): 'green' | 'yellow' | 'red' | 'blue' | 'zinc' => {
    switch (status) {
      case 'approved':
        return 'green';
      case 'pending_customer':
        return 'yellow';
      case 'rejected':
        return 'red';
      case 'draft':
        return 'blue';
      default:
        return 'zinc';
    }
  };

  const getPDFStatusLabel = (status: string): string => {
    switch (status) {
      case 'approved':
        return 'Freigegeben';
      case 'pending_customer':
        return 'Zur Freigabe';
      case 'rejected':
        return 'Abgelehnt';
      case 'draft':
        return 'Entwurf';
      case 'none':
        return 'Kein PDF';
      default:
        return status;
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp || !timestamp.toDate) return '—';
    const date = timestamp.toDate();
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (minutes < 1) return 'Gerade eben';
    if (minutes < 60) return `vor ${minutes} Minute${minutes !== 1 ? 'n' : ''}`;
    if (hours < 24) return `vor ${hours} Stunde${hours !== 1 ? 'n' : ''}`;
    if (days < 7) return `vor ${days} Tag${days !== 1 ? 'en' : ''}`;
    
    return date.toLocaleDateString('de-DE', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(25);
  
  // Paginated data
  const paginatedApprovals = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return approvals.slice(startIndex, startIndex + pageSize);
  }, [approvals, currentPage, pageSize]);
  
  const totalPages = Math.ceil(approvals.length / pageSize);

  // Reset page when data changes
  useEffect(() => {
    setCurrentPage(1);
  }, [approvals]);
  
  const stats = useMemo(() => {
    const pending = approvals.filter(a => a.status === 'pending' || a.status === 'in_review').length;
    const changesRequested = approvals.filter(a => a.status === 'changes_requested').length;
    const approved = approvals.filter(a => a.status === 'approved' || a.status === 'completed').length;
    const overdue = approvals.filter(a => a.isOverdue).length;
    
    // NEU: PDF-Stats
    const withPDF = approvals.filter(a => a.hasPDF).length;
    const pdfPending = approvals.filter(a => a.pdfStatus === 'pending_customer').length;
    const pdfApproved = approvals.filter(a => a.pdfStatus === 'approved').length;
    
    return { 
      pending, 
      changesRequested, 
      approved, 
      overdue,
      withPDF,
      pdfPending,
      pdfApproved
    };
  }, [approvals]);

  const statusOptions = Object.entries(APPROVAL_STATUS_CONFIG).map(([value, config]) => ({
    value,
    label: config.label
  }));

  const activeFiltersCount = selectedStatus.length + selectedClients.length + selectedPriorities.length + selectedPdfStatus.length + (showOverdueOnly ? 1 : 0);

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
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <Heading level={1}>Freigaben-Center</Heading>
            <Text className="mt-1 text-gray-600">
              Verwalten Sie alle Kampagnen-Freigaben an einem Ort
            </Text>
          </div>
          <div className="flex items-center gap-3">
            <Button
              onClick={() => loadApprovals()}
              disabled={isRefreshing}
              className="bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200"
            >
              <ArrowPathIcon className={isRefreshing ? 'animate-spin' : ''} />
              Aktualisieren
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-4 mb-6">
        <div className="rounded-lg p-4" style={{backgroundColor: '#f1f0e2'}}>
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0">
              <ClockIcon className="h-5 w-5 text-gray-500" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-lg font-semibold text-gray-900 flex items-baseline gap-2">
                {stats.pending}
              </div>
              <Badge color="yellow">Ausstehend</Badge>
            </div>
          </div>
        </div>
        
        <div className="rounded-lg p-4" style={{backgroundColor: '#f1f0e2'}}>
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0">
              <ChatBubbleLeftRightIcon className="h-5 w-5 text-gray-500" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-lg font-semibold text-gray-900 flex items-baseline gap-2">
                {stats.changesRequested}
              </div>
              <Badge color="orange">Änderungen erbeten</Badge>
            </div>
          </div>
        </div>
        
        <div className="rounded-lg p-4" style={{backgroundColor: '#f1f0e2'}}>
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0">
              <CheckBadgeIcon className="h-5 w-5 text-gray-500" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-lg font-semibold text-gray-900 flex items-baseline gap-2">
                {stats.approved}
              </div>
              <Badge color="green">Freigegeben</Badge>
            </div>
          </div>
        </div>
        
        <div className="rounded-lg p-4" style={{backgroundColor: '#f1f0e2'}}>
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0">
              <ExclamationTriangleIcon className="h-5 w-5 text-gray-500" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-lg font-semibold text-gray-900 flex items-baseline gap-2">
                {stats.overdue}
              </div>
              <Badge color="red">Überfällig</Badge>
            </div>
          </div>
        </div>
        
        {/* Neue PDF-Stats */}
        <div className="rounded-lg p-4" style={{backgroundColor: '#f1f0e2'}}>
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0">
              <DocumentTextIcon className="h-5 w-5 text-gray-500" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-lg font-semibold text-gray-900 flex items-baseline gap-2">
                {stats.withPDF}
              </div>
              <Badge color="blue">Mit PDF</Badge>
            </div>
          </div>
        </div>
        
        <div className="rounded-lg p-4" style={{backgroundColor: '#f1f0e2'}}>
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0">
              <ClockIcon className="h-5 w-5 text-gray-500" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-lg font-semibold text-gray-900 flex items-baseline gap-2">
                {stats.pdfPending}
              </div>
              <Badge color="yellow">PDF ausstehend</Badge>
            </div>
          </div>
        </div>
        
        <div className="rounded-lg p-4" style={{backgroundColor: '#f1f0e2'}}>
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0">
              <CheckCircleIcon className="h-5 w-5 text-gray-500" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-lg font-semibold text-gray-900 flex items-baseline gap-2">
                {stats.pdfApproved}
              </div>
              <Badge color="green">PDF freigegeben</Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="mb-6">
        <div className="flex items-center gap-2">
          {/* Search Input */}
          <SearchInput
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Kampagnen durchsuchen..."
            className="flex-1"
          />

          {/* Filter Button */}
          <Popover className="relative">
            <Popover.Button
              className={clsx(
                'inline-flex items-center justify-center rounded-lg border p-2.5 transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 h-10 w-10',
                activeFiltersCount > 0
                  ? 'border-primary bg-primary/5 text-primary hover:bg-primary/10'
                  : 'border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700'
              )}
              aria-label="Filter"
            >
              <FunnelIcon className="h-5 w-5" />
              {activeFiltersCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs font-medium text-white">
                  {activeFiltersCount}
                </span>
              )}
            </Popover.Button>
            
            <Transition
              as={Fragment}
              enter="transition ease-out duration-200"
              enterFrom="opacity-0 translate-y-1"
              enterTo="opacity-100 translate-y-0"
              leave="transition ease-in duration-150"
              leaveFrom="opacity-100 translate-y-0"
              leaveTo="opacity-0 translate-y-1"
            >
              <Popover.Panel className="absolute right-0 z-10 mt-2 w-80 origin-top-right rounded-lg bg-white p-4 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none dark:bg-zinc-800 dark:ring-white/10">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium text-zinc-900 dark:text-white">Filter</h3>
                    {activeFiltersCount > 0 && (
                      <button
                        onClick={() => {
                          setSelectedStatus([]);
                          setSelectedClients([]);
                          setSelectedPriorities([]);
                          setSelectedPdfStatus([]);
                          setShowOverdueOnly(false);
                        }}
                        className="text-sm text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
                      >
                        Zurücksetzen
                      </button>
                    )}
                  </div>

                  {/* Status Filter */}
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                      Status
                    </label>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {statusOptions.map((option) => {
                        const isChecked = selectedStatus.includes(option.value);
                        return (
                          <label
                            key={option.value}
                            className="flex items-center gap-2 cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                const newValues = e.target.checked
                                  ? [...selectedStatus, option.value]
                                  : selectedStatus.filter(v => v !== option.value);
                                setSelectedStatus(newValues);
                              }}
                              className="h-4 w-4 rounded border-zinc-300 text-primary focus:ring-primary"
                            />
                            <span className="text-sm text-zinc-700 dark:text-zinc-300">
                              {option.label}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  {/* Client Filter */}
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                      Kunde
                    </label>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {clients.map((client) => {
                        const isChecked = selectedClients.includes(client.id);
                        return (
                          <label
                            key={client.id}
                            className="flex items-center gap-2 cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                const newValues = e.target.checked
                                  ? [...selectedClients, client.id]
                                  : selectedClients.filter(v => v !== client.id);
                                setSelectedClients(newValues);
                              }}
                              className="h-4 w-4 rounded border-zinc-300 text-primary focus:ring-primary"
                            />
                            <span className="text-sm text-zinc-700 dark:text-zinc-300">
                              {client.name}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  {/* Priority Filter */}
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                      Priorität
                    </label>
                    <div className="space-y-2">
                      {PRIORITY_OPTIONS.map((option) => {
                        const isChecked = selectedPriorities.includes(option.value);
                        return (
                          <label
                            key={option.value}
                            className="flex items-center gap-2 cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                const newValues = e.target.checked
                                  ? [...selectedPriorities, option.value]
                                  : selectedPriorities.filter(v => v !== option.value);
                                setSelectedPriorities(newValues);
                              }}
                              className="h-4 w-4 rounded border-zinc-300 text-primary focus:ring-primary"
                            />
                            <span className="text-sm text-zinc-700 dark:text-zinc-300">
                              {option.label}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  {/* PDF Status Filter */}
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                      PDF-Status
                    </label>
                    <div className="space-y-2">
                      {[
                        { value: 'none', label: 'Kein PDF' },
                        { value: 'draft', label: 'PDF Entwurf' },
                        { value: 'pending_customer', label: 'PDF zur Freigabe' },
                        { value: 'approved', label: 'PDF freigegeben' },
                        { value: 'rejected', label: 'PDF abgelehnt' }
                      ].map((option) => {
                        const isChecked = selectedPdfStatus.includes(option.value);
                        return (
                          <label
                            key={option.value}
                            className="flex items-center gap-2 cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                const newValues = e.target.checked
                                  ? [...selectedPdfStatus, option.value]
                                  : selectedPdfStatus.filter(v => v !== option.value);
                                setSelectedPdfStatus(newValues);
                              }}
                              className="h-4 w-4 rounded border-zinc-300 text-primary focus:ring-primary"
                            />
                            <span className="text-sm text-zinc-700 dark:text-zinc-300">
                              {option.label}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  {/* Overdue Filter */}
                  <div>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={showOverdueOnly}
                        onChange={(e) => setShowOverdueOnly(e.target.checked)}
                        className="h-4 w-4 rounded border-zinc-300 text-primary focus:ring-primary"
                      />
                      <span className="text-sm text-zinc-700 dark:text-zinc-300">
                        Nur überfällige anzeigen
                      </span>
                    </label>
                  </div>
                </div>
              </Popover.Panel>
            </Transition>
          </Popover>
        </div>
      </div>

      {/* Results Info */}
      <div className="mb-4">
        <Text className="text-sm text-zinc-600 dark:text-zinc-400">
          {approvals.length} Freigabe{approvals.length !== 1 ? 'n' : ''}
        </Text>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-sm overflow-hidden">
        {approvals.length === 0 ? (
          <div className="text-center py-12">
            <CheckBadgeIcon className="mx-auto h-12 w-12 text-gray-400" />
            <Heading level={3} className="mt-2">Keine Freigaben gefunden</Heading>
            <Text className="mt-1">
              {searchTerm || activeFiltersCount > 0
                ? "Versuchen Sie andere Suchkriterien" 
                : "Noch keine Kampagnen zur Freigabe eingereicht"}
            </Text>
          </div>
        ) : (
          <>
            {/* Table Header */}
            <div className="px-6 py-3 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50">
              <div className="flex items-center">
                <div className="w-[35%] text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                  Kampagne
                </div>
                <div className="w-[15%] text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                  Status
                </div>
                <div className="w-[20%] text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                  Fortschritt
                </div>
                <div className="flex-1 text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider text-right pr-14">
                  Letzte Aktivität
                </div>
              </div>
            </div>

            {/* Table Body */}
            <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {paginatedApprovals.map((approval) => (
                <div key={approval.id} className="px-6 py-4 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                  <div className="flex items-center">
                    {/* Kampagne */}
                    <div className="w-[35%] min-w-0">
                      <Link 
                        href={`/dashboard/pr-tools/campaigns/campaigns/${approval.campaignId}`} 
                        className="text-sm font-semibold text-zinc-900 dark:text-white hover:text-primary truncate block"
                      >
                        {approval.title}
                      </Link>
                      <div className="mt-1 flex items-center gap-4 text-sm text-gray-500">
                        {approval.clientName && (
                          <div className="flex items-center gap-1">
                            <BuildingOfficeIcon className="h-3 w-3" />
                            {approval.clientName}
                          </div>
                        )}
                        {approval.attachedAssets && approval.attachedAssets.length > 0 && (
                          <div className="flex items-center gap-1">
                            <PhotoIcon className="h-3 w-3" />
                            {approval.attachedAssets.length} Medien
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Status */}
                    <div className="w-[15%]">
                      <div className="flex flex-wrap items-center gap-1">
                        {getStatusBadge(approval.status)}
                        {approval.priority && getPriorityBadge(approval.priority)}
                        {approval.isOverdue && (
                          <Badge color="red" className="text-xs">Überfällig</Badge>
                        )}
                        
                        {/* NEU: PDF-Status-Badge */}
                        {approval.hasPDF && (
                          <Badge 
                            color={getPDFStatusColor(approval.pdfStatus)} 
                            className="text-xs flex items-center gap-1"
                          >
                            <DocumentIcon className="h-3 w-3" />
                            PDF {approval.currentPdfVersion?.version}
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Fortschritt */}
                    <div className="w-[20%]">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <div className="w-24 bg-gray-200 rounded-full h-2">
                            <div 
                              className={clsx(
                                "h-2 rounded-full transition-all",
                                approval.status === 'approved' ? 'bg-green-600' :
                                approval.status === 'rejected' ? 'bg-red-600' :
                                approval.progressPercentage > 50 ? 'bg-blue-600' :
                                approval.progressPercentage > 0 ? 'bg-yellow-600' :
                                'bg-gray-400'
                              )}
                              style={{ width: `${approval.progressPercentage}%` }}
                            />
                          </div>
                          <Text className="text-sm text-gray-600">
                            {approval.progressPercentage}%
                          </Text>
                        </div>
                        <Text className="text-xs text-gray-500">
                          {approval.approvedCount} von {approval.recipients.length} Empfängern
                        </Text>
                      </div>
                    </div>

                    {/* Letzte Aktivität */}
                    <div className="flex-1 text-right pr-14">
                      <div className="text-sm">
                        <div className="text-gray-900">{formatDate(approval.updatedAt)}</div>
                        {approval.history && approval.history.length > 0 && (
                          <div className="text-gray-500 flex items-center gap-1 mt-1 justify-end">
                            <ChatBubbleLeftRightIcon className="h-3 w-3" />
                            {approval.history.length} Aktion{approval.history.length !== 1 ? 'en' : ''}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="ml-4">
                      <Dropdown>
                        <DropdownButton plain className="p-1.5 hover:bg-zinc-100 rounded-md dark:hover:bg-zinc-700">
                          <EllipsisVerticalIcon className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
                        </DropdownButton>
                        <DropdownMenu anchor="bottom end">
                          <DropdownItem 
                            href={`/freigabe/${approval.shareId}`}
                            target="_blank"
                          >
                            <EyeIcon className="h-4 w-4" />
                            Freigabe-Link öffnen
                          </DropdownItem>
                          <DropdownItem 
                            onClick={() => handleCopyLink(approval.shareId)}
                          >
                            <LinkIcon className="h-4 w-4" />
                            Link kopieren
                          </DropdownItem>
                          
                          {/* NEU: PDF-Actions wenn vorhanden */}
                          {approval.hasPDF && approval.currentPdfVersion && (
                            <>
                              <DropdownDivider />
                              <DropdownItem 
                                onClick={() => window.open(approval.currentPdfVersion!.downloadUrl, '_blank')}
                              >
                                <DocumentTextIcon className="h-4 w-4" />
                                PDF öffnen (V{approval.currentPdfVersion.version})
                              </DropdownItem>
                              <DropdownItem 
                                onClick={() => handleCopyPDFLink(approval.currentPdfVersion!.downloadUrl)}
                              >
                                <LinkIcon className="h-4 w-4" />
                                PDF-Link kopieren
                              </DropdownItem>
                            </>
                          )}
                          
                          <DropdownDivider />
                          <DropdownItem 
                            href={`/dashboard/pr-tools/campaigns/campaigns/${approval.campaignId}`}
                          >
                            <DocumentTextIcon className="h-4 w-4" />
                            Kampagne anzeigen
                          </DropdownItem>
                          <DropdownItem 
                            onClick={() => handleViewFeedback(approval)}
                          >
                            <ChatBubbleLeftRightIcon className="h-4 w-4" />
                            Feedback-Historie
                          </DropdownItem>
                          {(approval.status === 'pending' || approval.status === 'in_review') && (
                            <>
                              <DropdownDivider />
                              <DropdownItem 
                                onClick={() => handleSendReminder(approval)}
                              >
                                <ClockIcon className="h-4 w-4" />
                                Erinnerung senden
                              </DropdownItem>
                            </>
                          )}
                          {approval.status === 'changes_requested' && (
                            <>
                              <DropdownDivider />
                              <DropdownItem 
                                onClick={() => handleResubmit(approval)}
                              >
                                <ArrowPathIcon className="h-4 w-4" />
                                Erneut senden
                              </DropdownItem>
                            </>
                          )}
                        </DropdownMenu>
                      </Dropdown>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
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
      {showFeedbackModal && selectedApproval && (
        <FeedbackHistoryModal 
          approval={selectedApproval}
          onClose={() => {
            setShowFeedbackModal(false);
            setSelectedApproval(null);
          }}
        />
      )}
    </div>
  );
}