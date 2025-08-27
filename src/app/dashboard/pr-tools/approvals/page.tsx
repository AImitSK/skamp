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
// ENTFERNT: import { teamApprovalService } from "@/lib/firebase/team-approval-service";
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
import { formatDateShort, formatDate as formatDateLong } from "@/utils/dateHelpers";
import { ApprovalHistoryModal } from "@/components/campaigns/ApprovalHistoryModal";
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
      
      
      // VEREINFACHT - NUR NOCH CUSTOMER APPROVALS (Team-Approvals entfernt)
      const allApprovals = await approvalService.searchEnhanced(currentOrganization.id, filters);
      
      
      // Filtere Draft-Status und abgeschlossene Workflows heraus
      const filteredApprovals = allApprovals.filter(a => 
        a.status !== 'draft' && 
        a.status !== 'cancelled' && 
        a.status !== 'expired' &&
        !a.completedAt // Komplett abgeschlossene Workflows ausblenden
      );
      
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
      
      // Sortiere nach updatedAt oder createdAt (neueste Aktivität zuerst)
      const sortedApprovals = finalApprovals.sort((a, b) => {
        // Robuste Timestamp-Behandlung - priorisiere updatedAt für neueste Aktivität
        const getTimestamp = (approval: any) => {
          // Zuerst updatedAt prüfen (neueste Aktivität)
          if (approval.updatedAt?.toDate) {
            return approval.updatedAt.toDate().getTime();
          }
          if (approval.updatedAt instanceof Date) {
            return approval.updatedAt.getTime();
          }
          
          // Fallback auf createdAt
          if (approval.createdAt?.toDate) {
            return approval.createdAt.toDate().getTime();
          }
          if (approval.createdAt instanceof Date) {
            return approval.createdAt.getTime();
          }
          
          return Date.now(); // Fallback zu aktuellem Zeitpunkt
        };
        
        const timeA = getTimestamp(a);
        const timeB = getTimestamp(b);
        return timeB - timeA; // Neueste Aktivität zuerst
      });
      
      setApprovals(sortedApprovals);
      
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


  const handleCopyLink = async (shareId: string, approvalType?: string) => {
    // VEREINFACHT - Nur noch Customer-Approvals
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

  const getStatusText = (status: ApprovalStatus): string => {
    switch (status) {
      case 'pending':
        return 'Ausstehend';
      case 'in_review':
        return 'Erstmal angesehen';
      case 'changes_requested':
        return 'Änderung erbeten';
      case 'approved':
        return 'Freigegeben';
      case 'rejected':
        return 'Abgelehnt';
      default:
        return 'Unbekannt';
    }
  };

  const getStatusProgress = (status: ApprovalStatus): number => {
    switch (status) {
      case 'pending':
        return 20;
      case 'in_review':
        return 40;
      case 'changes_requested':
        return 60;
      case 'approved':
        return 80;
      case 'rejected':
        return 10;
      default:
        return 0;
    }
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


      {/* Compact Toolbar */}
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
                'inline-flex items-center justify-center rounded-lg border p-2.5 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#005fab] h-10 w-10',
                activeFiltersCount > 0
                  ? 'border-[#005fab] bg-[#005fab]/5 text-[#005fab] hover:bg-[#005fab]/10'
                  : 'border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700'
              )}
              aria-label="Filter"
            >
              <FunnelIcon className="h-5 w-5" />
              {activeFiltersCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#005fab] text-xs font-medium text-white">
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
            {/* Header */}
            <div className="px-8 py-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50">
              <div className="flex items-center">
                <div className="flex-1 px-4 text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                  Kampagne
                </div>
                <div className="w-48 px-4 text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                  Status
                </div>
                <div className="w-64 px-4 text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                  Kunde & Kontakt
                </div>
                <div className="w-48 px-4 text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                  Letzte Aktivität
                </div>
                <div className="w-12"></div>
              </div>
            </div>

            {/* Body */}
            <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {paginatedApprovals.map((approval) => (
                <div key={approval.id} className="px-8 py-5 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                  <div className="flex items-center">
                    {/* Kampagne */}
                    <div className="flex-1 px-4 min-w-0">
                      <Link 
                        href={`/dashboard/pr-tools/campaigns/campaigns/${approval.campaignId}`} 
                        className="text-sm font-semibold text-zinc-900 dark:text-white hover:text-primary truncate block"
                      >
                        {approval.campaignTitle || approval.title || 'Unbekannte Kampagne'}
                      </Link>
                      <div className="mt-1 text-xs text-gray-500">
                        {formatDateShort(approval.createdAt)}
                      </div>
                      <div className="mt-1 flex items-center gap-4 text-sm text-gray-500">
                        {approval.attachedAssets && approval.attachedAssets.length > 0 && (
                          <div className="flex items-center gap-1">
                            <PhotoIcon className="h-3 w-3" />
                            {approval.attachedAssets.length} Medien
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Status */}
                    <div className="w-48 px-4">
                      <div className="space-y-1">
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
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <div className="w-16 bg-gray-200 rounded-full h-1.5">
                              <div 
                                className="bg-blue-600 h-1.5 rounded-full transition-all"
                                style={{ width: `${getStatusProgress(approval.status)}%` }}
                              />
                            </div>
                            <span className="text-xs text-gray-500">{getStatusProgress(approval.status)}%</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Kunde & Kontakt */}
                    <div className="w-64 px-4">
                      <div className="space-y-1">
                        <div className="text-sm text-gray-900">
                          {approval.clientName || 'Unbekannter Kunde'}
                        </div>
                        <div className="text-xs text-gray-500">
                          {approval.recipients && approval.recipients.length > 0 
                            ? approval.recipients[0].email 
                            : approval.clientEmail || 'Kein Kontakt'}
                        </div>
                      </div>
                    </div>

                    {/* Letzte Aktivität */}
                    <div className="w-48 px-4">
                      <div className="text-sm">
                        <div className="text-gray-900">{formatDateShort(approval.updatedAt || approval.createdAt)}</div>
                        {approval.history && approval.history.length > 0 && (
                          <div className="text-gray-500 flex items-center gap-1 mt-1">
                            <ChatBubbleLeftRightIcon className="h-3 w-3" />
                            {approval.history.length} Aktion{approval.history.length !== 1 ? 'en' : ''}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="w-12 flex justify-end">
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
                            onClick={() => handleCopyLink(approval.shareId, approval.type)}
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
        <ApprovalHistoryModal 
          approval={selectedApproval}
          isOpen={showFeedbackModal}
          onClose={() => {
            setShowFeedbackModal(false);
            setSelectedApproval(null);
          }}
        />
      )}
    </div>
  );
}