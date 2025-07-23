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
import { Select } from "@/components/select";
import { Dialog, DialogTitle, DialogBody, DialogActions } from "@/components/dialog";
import { Dropdown, DropdownButton, DropdownMenu, DropdownItem, DropdownDivider } from "@/components/dropdown";
import { Table, TableHead, TableBody, TableRow, TableHeader, TableCell } from "@/components/table";
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
  CalendarIcon,
  BuildingOfficeIcon,
  UserIcon,
  ChevronLeftIcon,
  ChevronRightIcon
} from "@heroicons/react/20/solid";
import { approvalService } from "@/lib/firebase/approval-service";
import { teamMemberService } from "@/lib/firebase/organization-service";
import { companiesEnhancedService } from "@/lib/firebase/crm-service-enhanced";
import { 
  ApprovalEnhanced, 
  ApprovalListView, 
  ApprovalFilters,
  ApprovalStatus,
  APPROVAL_STATUS_CONFIG,
  PRIORITY_OPTIONS
} from "@/types/approvals";
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
    info: 'bg-blue-50 text-blue-700 border-blue-200',
    success: 'bg-green-50 text-green-700 border-green-200',
    warning: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    error: 'bg-red-50 text-red-700 border-red-200'
  };

  const icons = {
    info: InformationCircleIcon,
    success: CheckCircleIcon,
    warning: ExclamationTriangleIcon,
    error: XCircleIcon
  };

  const Icon = icons[type];

  return (
    <div className={`rounded-lg border p-4 ${styles[type]}`}>
      <div className="flex">
        <div className="shrink-0">
          <Icon aria-hidden="true" className={`size-5 ${type === 'info' || type === 'success' ? 'text-blue-400' : type === 'warning' ? 'text-yellow-400' : 'text-red-400'}`} />
        </div>
        <div className="ml-3 flex-1 md:flex md:justify-between">
          <div>
            <Text className={`font-medium ${styles[type].split(' ')[1]}`}>{title}</Text>
            {message && <Text className={`mt-2 text-sm ${styles[type].split(' ')[1]}`}>{message}</Text>}
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
                          <Text className="text-sm italic text-gray-700 mt-2">"{entry.details.comment}"</Text>
                        )}
                        {entry.inlineComments && entry.inlineComments.length > 0 && (
                          <div className="mt-2 space-y-1">
                            <Text className="text-xs font-medium text-gray-500">Inline-Kommentare:</Text>
                            {entry.inlineComments.map((comment, idx) => (
                              <div key={comment.id} className="text-sm bg-gray-50 p-2 rounded">
                                <Text className="text-gray-600 italic">"{comment.quote}"</Text>
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
                  <div key={idx} className="flex items-center gap-3 p-2 bg-gray-50 rounded">
                    {asset.type === 'folder' ? (
                      <>
                        <FolderIcon className="h-5 w-5 text-gray-400" />
                        <span className="text-sm">{asset.name}</span>
                      </>
                    ) : (
                      <>
                        <DocumentIcon className="h-5 w-5 text-gray-400" />
                        <span className="text-sm">{asset.name}</span>
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

// Filter Bar Component
function FilterBar({
  filters,
  onFiltersChange,
  clients,
  onClearFilters
}: {
  filters: ApprovalFilters;
  onFiltersChange: (filters: ApprovalFilters) => void;
  clients: Array<{ id: string; name: string }>;
  onClearFilters: () => void;
}) {
  const hasActiveFilters = filters.status?.length || filters.clientIds?.length || 
                          filters.priority?.length || filters.isOverdue !== undefined;

  return (
    <div className="bg-white border-b border-gray-200 py-4">
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <FunnelIcon className="h-5 w-5 text-gray-400" />
          <Text className="font-medium text-gray-700">Filter:</Text>
        </div>

        {/* Status Filter */}
        <Select
          value={filters.status?.[0] || ''}
          onChange={(e) => {
            const value = e.target.value;
            onFiltersChange({
              ...filters,
              status: value ? [value as ApprovalStatus] : undefined
            });
          }}
          className="w-40"
        >
          <option value="">Alle Status</option>
          {Object.entries(APPROVAL_STATUS_CONFIG).map(([value, config]) => (
            <option key={value} value={value}>{config.label}</option>
          ))}
        </Select>

        {/* Client Filter */}
        <Select
          value={filters.clientIds?.[0] || ''}
          onChange={(e) => {
            const value = e.target.value;
            onFiltersChange({
              ...filters,
              clientIds: value ? [value] : undefined
            });
          }}
          className="w-48"
        >
          <option value="">Alle Kunden</option>
          {clients.map(client => (
            <option key={client.id} value={client.id}>{client.name}</option>
          ))}
        </Select>

        {/* Priority Filter */}
        <Select
          value={filters.priority?.[0] || ''}
          onChange={(e) => {
            const value = e.target.value;
            onFiltersChange({
              ...filters,
              priority: value ? [value] : undefined
            });
          }}
          className="w-40"
        >
          <option value="">Alle Prioritäten</option>
          {PRIORITY_OPTIONS.map(option => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </Select>

        {/* Overdue Filter */}
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={filters.isOverdue === true}
            onChange={(e) => {
              onFiltersChange({
                ...filters,
                isOverdue: e.target.checked ? true : undefined
              });
            }}
            className="rounded border-gray-300 text-[#005fab] focus:ring-[#005fab]"
          />
          <Text className="text-sm text-gray-700">Nur überfällige</Text>
        </label>

        {/* Clear Filters */}
        {hasActiveFilters && (
          <Button
            plain
            onClick={onClearFilters}
            className="ml-auto"
          >
            <XMarkIcon />
            Filter zurücksetzen
          </Button>
        )}
      </div>
    </div>
  );
}

export default function ApprovalsPage() {
  const { user } = useAuth();
  const [approvals, setApprovals] = useState<ApprovalListView[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState<ApprovalFilters>({});
  const [alert, setAlert] = useState<{ type: 'info' | 'success' | 'warning' | 'error'; title: string; message?: string } | null>(null);
  const [selectedApproval, setSelectedApproval] = useState<ApprovalEnhanced | null>(null);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [clients, setClients] = useState<Array<{ id: string; name: string }>>([]);
  const [organizationId, setOrganizationId] = useState<string>('');
  
  // Refresh States
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  // Alert Management
  const showAlert = useCallback((type: 'info' | 'success' | 'warning' | 'error', title: string, message?: string) => {
    setAlert({ type, title, message });
    setTimeout(() => setAlert(null), 5000);
  }, []);

  // Load Organization
  useEffect(() => {
    const loadOrganization = async () => {
      if (!user) return;
      
      const orgs = await teamMemberService.getUserOrganizations(user.uid);
      if (orgs.length > 0) {
        setOrganizationId(orgs[0].organization.id);
      } else {
        setOrganizationId(user.uid); // Fallback
      }
    };
    
    loadOrganization();
  }, [user]);

  const loadApprovals = async () => {
    if (!organizationId) return;
    
    setLoading(true);
    setIsRefreshing(true);
    try {
      // Lade Freigaben mit Filtern
      const allApprovals = await approvalService.searchEnhanced(
        organizationId,
        {
          ...filters,
          search: searchTerm
        }
      );
      
      setApprovals(allApprovals);
      setLastRefresh(new Date());
      
      // Lade Kunden für Filter
      const companies = await companiesEnhancedService.getAll(organizationId);
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
      console.error('Error loading approvals:', error);
      showAlert('error', 'Fehler beim Laden', 'Die Freigaben konnten nicht geladen werden.');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (organizationId) {
      loadApprovals();
    }
  }, [organizationId, filters, searchTerm]);

  // Auto-Refresh alle 30 Sekunden
  useEffect(() => {
    const interval = setInterval(() => {
      if (!loading && !isRefreshing && organizationId) {
        loadApprovals();
      }
    }, 30000);
    
    return () => clearInterval(interval);
  }, [organizationId, loading, isRefreshing]);

  const handleCopyLink = async (shareId: string) => {
    const url = `${window.location.origin}/freigabe/${shareId}`;
    try {
      await navigator.clipboard.writeText(url);
      showAlert('success', 'Link kopiert', 'Der Freigabe-Link wurde in die Zwischenablage kopiert.');
    } catch (error) {
      showAlert('error', 'Fehler', 'Der Link konnte nicht kopiert werden.');
    }
  };

  const handleViewFeedback = async (approval: ApprovalListView) => {
    // Lade vollständige Approval mit Historie
    const fullApproval = await approvalService.getById(approval.id!, organizationId);
    if (fullApproval) {
      setSelectedApproval(fullApproval);
      setShowFeedbackModal(true);
    }
  };

  const handleResubmit = async (approval: ApprovalListView) => {
    try {
      await approvalService.sendForApproval(approval.id!, { organizationId, userId: user!.uid });
      showAlert('success', 'Erneut zur Freigabe gesendet', 'Die Kampagne wurde erneut an den Kunden gesendet.');
      await loadApprovals();
    } catch (error) {
      showAlert('error', 'Fehler beim erneuten Senden', 'Die Kampagne konnte nicht erneut gesendet werden.');
    }
  };

  const handleSendReminder = async (approval: ApprovalListView) => {
    try {
      await approvalService.sendReminder(approval.id!, { organizationId, userId: user!.uid });
      showAlert('success', 'Erinnerung gesendet', 'Eine Erinnerung wurde an den Kunden gesendet.');
    } catch (error) {
      showAlert('error', 'Fehler beim Senden', 'Die Erinnerung konnte nicht gesendet werden.');
    }
  };

  const getStatusBadge = (status: ApprovalStatus) => {
    const config = APPROVAL_STATUS_CONFIG[status];
    const colorMap: Record<string, any> = {
      'gray': 'zinc',
      'indigo': 'indigo',
      'yellow': 'yellow',
      'blue': 'blue',
      'green': 'green',
      'red': 'red',
      'orange': 'orange',
      'purple': 'purple'
    };
    return <Badge color={colorMap[config.color] || config.color}>{config.label}</Badge>;
  };

  const getPriorityBadge = (priority?: string) => {
    if (!priority) return null;
    const option = PRIORITY_OPTIONS.find(o => o.value === priority);
    if (!option) return null;
    return <Badge color={option.color as any}>{option.label}</Badge>;
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

  // Table columns configuration
  const columns = [
    {
      key: 'title',
      label: 'Kampagne',
      render: (approval: ApprovalListView) => (
        <div>
          <Link 
            href={`/dashboard/pr-tools/campaigns/campaigns/${approval.campaignId}`} 
            className="text-[#005fab] hover:text-[#004a8c] font-medium"
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
      )
    },
    {
      key: 'status',
      label: 'Status',
      render: (approval: ApprovalListView) => (
        <div className="flex items-center gap-2">
          {getStatusBadge(approval.status)}
          {approval.priority && getPriorityBadge(approval.priority)}
          {approval.isOverdue && (
            <Badge color="red">Überfällig</Badge>
          )}
        </div>
      )
    },
    {
      key: 'progress',
      label: 'Fortschritt',
      render: (approval: ApprovalListView) => (
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
      )
    },
    {
      key: 'activity',
      label: 'Letzte Aktivität',
      render: (approval: ApprovalListView) => (
        <div className="text-sm">
          <div className="text-gray-900">{formatDate(approval.updatedAt)}</div>
          {approval.history && approval.history.length > 0 && (
            <div className="text-gray-500 flex items-center gap-1 mt-1">
              <ChatBubbleLeftRightIcon className="h-3 w-3" />
              {approval.history.length} Aktion{approval.history.length !== 1 ? 'en' : ''}
            </div>
          )}
        </div>
      )
    },
    {
      key: 'actions',
      label: '',
      render: (approval: ApprovalListView) => (
        <Dropdown>
          <DropdownButton plain className="p-2 hover:bg-gray-100 rounded-lg">
            <EllipsisVerticalIcon className="h-5 w-5 text-gray-700" />
          </DropdownButton>
          <DropdownMenu anchor="bottom end" className="bg-white shadow-lg rounded-lg">
            <DropdownItem 
              href={`/freigabe/${approval.shareId}`}
              target="_blank"
              className="hover:bg-gray-50"
            >
              <EyeIcon className="text-gray-500" />
              Freigabe-Link öffnen
            </DropdownItem>
            <DropdownItem 
              onClick={() => handleCopyLink(approval.shareId)}
              className="hover:bg-gray-50"
            >
              <LinkIcon className="text-gray-500" />
              Link kopieren
            </DropdownItem>
            <DropdownDivider />
            <DropdownItem 
              href={`/dashboard/pr-tools/campaigns/campaigns/${approval.campaignId}`}
              className="hover:bg-gray-50"
            >
              <DocumentTextIcon className="text-gray-500" />
              Kampagne anzeigen
            </DropdownItem>
            <DropdownItem 
              onClick={() => handleViewFeedback(approval)}
              className="hover:bg-gray-50"
            >
              <ChatBubbleLeftRightIcon className="text-gray-500" />
              Feedback-Historie
            </DropdownItem>
            {(approval.status === 'pending' || approval.status === 'in_review') && (
              <>
                <DropdownDivider />
                <DropdownItem 
                  onClick={() => handleSendReminder(approval)}
                  className="hover:bg-gray-50"
                >
                  <ClockIcon className="text-gray-500" />
                  Erinnerung senden
                </DropdownItem>
              </>
            )}
            {approval.status === 'changes_requested' && (
              <>
                <DropdownDivider />
                <DropdownItem 
                  onClick={() => handleResubmit(approval)}
                  className="hover:bg-gray-50"
                >
                  <ArrowPathIcon className="text-gray-500" />
                  Erneut senden
                </DropdownItem>
              </>
            )}
          </DropdownMenu>
        </Dropdown>
      )
    }
  ];

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
    
    return { pending, changesRequested, approved, overdue };
  }, [approvals]);

  const clearFilters = () => {
    setFilters({});
    setSearchTerm("");
  };

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
            <Heading>Freigaben-Center</Heading>
            <Text className="mt-1 text-gray-600">
              Verwalten Sie alle Kampagnen-Freigaben an einem Ort
            </Text>
          </div>
          <div className="flex items-center gap-3">
            <Text className="text-xs text-gray-500">
              Zuletzt aktualisiert: {lastRefresh.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
            </Text>
            <Button
              onClick={() => loadApprovals()}
              disabled={isRefreshing}
              plain
            >
              <ArrowPathIcon className={isRefreshing ? 'animate-spin' : ''} />
              Aktualisieren
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <Text className="text-sm text-gray-500">Ausstehend</Text>
              <Text className="text-2xl font-semibold text-gray-900">{stats.pending}</Text>
            </div>
            <div className="p-3 bg-yellow-100 rounded-full">
              <ClockIcon className="h-6 w-6 text-yellow-600" />
            </div>
          </div>
        </div>
        
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <Text className="text-sm text-gray-500">Änderungen erbeten</Text>
              <Text className="text-2xl font-semibold text-gray-900">{stats.changesRequested}</Text>
            </div>
            <div className="p-3 bg-orange-100 rounded-full">
              <ChatBubbleLeftRightIcon className="h-6 w-6 text-orange-600" />
            </div>
          </div>
        </div>
        
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <Text className="text-sm text-gray-500">Freigegeben</Text>
              <Text className="text-2xl font-semibold text-gray-900">{stats.approved}</Text>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <CheckBadgeIcon className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>
        
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <Text className="text-sm text-gray-500">Überfällig</Text>
              <Text className="text-2xl font-semibold text-gray-900">{stats.overdue}</Text>
            </div>
            <div className="p-3 bg-red-100 rounded-full">
              <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
        <div className="p-4">
          <div className="relative">
            <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 size-5 text-gray-400" />
            <Input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Kampagnen durchsuchen..."
              className="pl-10"
            />
          </div>
        </div>
        
        {/* Filter Bar */}
        <FilterBar
          filters={filters}
          onFiltersChange={setFilters}
          clients={clients}
          onClearFilters={clearFilters}
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {approvals.length === 0 ? (
          <div className="text-center py-12">
            <CheckBadgeIcon className="mx-auto h-12 w-12 text-gray-400" />
            <Heading level={3} className="mt-2">Keine Freigaben gefunden</Heading>
            <Text className="mt-1">
              {searchTerm || Object.keys(filters).length > 0
                ? "Versuchen Sie andere Suchkriterien" 
                : "Noch keine Kampagnen zur Freigabe eingereicht"}
            </Text>
          </div>
        ) : (
          <>
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeader>Kampagne</TableHeader>
                  <TableHeader>Status</TableHeader>
                  <TableHeader>Fortschritt</TableHeader>
                  <TableHeader>Letzte Aktivität</TableHeader>
                  <TableHeader>
                    <span className="sr-only">Aktionen</span>
                  </TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {paginatedApprovals.map((approval) => (
                  <TableRow key={approval.id}>
                    <TableCell>
                      <div>
                        <Link 
                          href={`/dashboard/pr-tools/campaigns/campaigns/${approval.campaignId}`} 
                          className="text-[#005fab] hover:text-[#004a8c] font-medium"
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
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(approval.status)}
                        {approval.priority && getPriorityBadge(approval.priority)}
                        {approval.isOverdue && (
                          <Badge color="red">Überfällig</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
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
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div className="text-gray-900">{formatDate(approval.updatedAt)}</div>
                        {approval.history && approval.history.length > 0 && (
                          <div className="text-gray-500 flex items-center gap-1 mt-1">
                            <ChatBubbleLeftRightIcon className="h-3 w-3" />
                            {approval.history.length} Aktion{approval.history.length !== 1 ? 'en' : ''}
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
                            href={`/freigabe/${approval.shareId}`}
                            target="_blank"
                            className="hover:bg-gray-50"
                          >
                            <EyeIcon className="text-gray-500" />
                            Freigabe-Link öffnen
                          </DropdownItem>
                          <DropdownItem 
                            onClick={() => handleCopyLink(approval.shareId)}
                            className="hover:bg-gray-50"
                          >
                            <LinkIcon className="text-gray-500" />
                            Link kopieren
                          </DropdownItem>
                          <DropdownDivider />
                          <DropdownItem 
                            href={`/dashboard/pr-tools/campaigns/campaigns/${approval.campaignId}`}
                            className="hover:bg-gray-50"
                          >
                            <DocumentTextIcon className="text-gray-500" />
                            Kampagne anzeigen
                          </DropdownItem>
                          <DropdownItem 
                            onClick={() => handleViewFeedback(approval)}
                            className="hover:bg-gray-50"
                          >
                            <ChatBubbleLeftRightIcon className="text-gray-500" />
                            Feedback-Historie
                          </DropdownItem>
                          {(approval.status === 'pending' || approval.status === 'in_review') && (
                            <>
                              <DropdownDivider />
                              <DropdownItem 
                                onClick={() => handleSendReminder(approval)}
                                className="hover:bg-gray-50"
                              >
                                <ClockIcon className="text-gray-500" />
                                Erinnerung senden
                              </DropdownItem>
                            </>
                          )}
                          {approval.status === 'changes_requested' && (
                            <>
                              <DropdownDivider />
                              <DropdownItem 
                                onClick={() => handleResubmit(approval)}
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
            
            {/* Pagination */}
            {totalPages > 1 && (
              <nav className="flex items-center justify-between border-t border-gray-200 px-4 py-3 sm:px-6">
                <div className="hidden sm:block">
                  <Text className="text-sm text-gray-700">
                    Zeige <span className="font-medium">{(currentPage - 1) * pageSize + 1}</span> bis{' '}
                    <span className="font-medium">
                      {Math.min(currentPage * pageSize, approvals.length)}
                    </span>{' '}
                    von <span className="font-medium">{approvals.length}</span> Ergebnissen
                  </Text>
                </div>
                <div className="flex flex-1 justify-between sm:justify-end">
                  <Button
                    plain
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="mr-3"
                  >
                    <ChevronLeftIcon />
                    Zurück
                  </Button>
                  <Button
                    plain
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Weiter
                    <ChevronRightIcon />
                  </Button>
                </div>
              </nav>
            )}
          </>
        )}
      </div>

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