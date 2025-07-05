// src/app/dashboard/pr-tools/campaigns/page.tsx
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
import { Table, TableHead, TableBody, TableRow, TableHeader, TableCell } from "@/components/table";
import { Checkbox } from "@/components/checkbox";
import { Dialog, DialogTitle, DialogBody, DialogActions } from "@/components/dialog";
import { Dropdown, DropdownButton, DropdownMenu, DropdownItem, DropdownDivider } from "@/components/dropdown";
import { 
  PlusIcon, 
  MagnifyingGlassIcon, 
  EyeIcon, 
  PencilIcon, 
  TrashIcon,
  CalendarIcon,
  EnvelopeIcon,
  UsersIcon,
  PaperAirplaneIcon,
  ChartBarIcon,
  PhotoIcon,
  SparklesIcon,
  EllipsisVerticalIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  ArrowDownTrayIcon,
  ExclamationCircleIcon,
  CheckBadgeIcon,
  PencilSquareIcon,
  ClockIcon,
  ArchiveBoxIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  BuildingOfficeIcon
} from "@heroicons/react/20/solid";
import { prService } from "@/lib/firebase/pr-service";
import { PRCampaign, PRCampaignStatus } from "@/types/pr";
import EmailSendModal from "@/components/pr/EmailSendModal";
import Papa from 'papaparse';

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

// Status configuration
const statusConfig: Record<PRCampaignStatus, { label: string; color: "zinc" | "yellow" | "orange" | "teal" | "blue" | "indigo" | "green"; icon: React.ElementType }> = {
  draft: {
    label: 'Entwurf',
    color: 'zinc',
    icon: PencilSquareIcon,
  },
  in_review: {
    label: 'In Prüfung',
    color: 'yellow',
    icon: ClockIcon,
  },
  changes_requested: {
    label: 'Änderung erbeten',
    color: 'orange',
    icon: ExclamationCircleIcon,
  },
  approved: {
    label: 'Freigegeben',
    color: 'teal',
    icon: CheckBadgeIcon,
  },
  scheduled: {
    label: 'Geplant',
    color: 'blue',
    icon: ClockIcon,
  },
  sending: {
    label: 'Wird gesendet',
    color: 'indigo',
    icon: PaperAirplaneIcon,
  },
  sent: {
    label: 'Gesendet',
    color: 'green',
    icon: CheckCircleIcon,
  },
  archived: {
    label: 'Archiviert',
    color: 'zinc',
    icon: ArchiveBoxIcon,
  },
};

// Helper functions
function formatDate(timestamp: any) {
  if (!timestamp || !timestamp.toDate) return '—';
  return timestamp.toDate().toLocaleDateString('de-DE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// Status Badge Component
function StatusBadge({ status }: { status: PRCampaignStatus }) {
  const config = statusConfig[status];
  const Icon = config.icon;
  
  return (
    <Badge color={config.color} className="inline-flex items-center gap-1 whitespace-nowrap">
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  );
}

export default function PRCampaignsPage() {
  const { user } = useAuth();
  const [campaigns, setCampaigns] = useState<PRCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<PRCampaignStatus | 'all'>('all');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [selectedCampaignIds, setSelectedCampaignIds] = useState<Set<string>>(new Set());
  const [showSendModal, setShowSendModal] = useState<PRCampaign | null>(null);
  const [alert, setAlert] = useState<{ type: 'info' | 'success' | 'warning' | 'error'; title: string; message?: string } | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    type?: 'danger' | 'warning';
  }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(25);

  // Alert Management
  const showAlert = useCallback((type: 'info' | 'success' | 'warning' | 'error', title: string, message?: string) => {
    setAlert({ type, title, message });
    setTimeout(() => setAlert(null), 5000);
  }, []);

  useEffect(() => {
    if (user) {
      loadCampaigns();
    }
  }, [user]);

  const loadCampaigns = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const campaignsData = await prService.getAll(user.uid);
      setCampaigns(campaignsData);
    } catch (error) {
      showAlert('error', 'Fehler beim Laden', 'Die Kampagnen konnten nicht geladen werden.');
    } finally {
      setLoading(false);
    }
  };

  // Filtered campaigns
  const filteredCampaigns = useMemo(() => {
    return campaigns.filter(campaign => {
      const searchMatch = campaign.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         campaign.distributionListName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         campaign.clientName?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const statusMatch = selectedStatus === 'all' || campaign.status === selectedStatus;
      const customerMatch = !selectedCustomerId || campaign.clientId === selectedCustomerId;
      
      return searchMatch && statusMatch && customerMatch;
    });
  }, [campaigns, searchTerm, selectedStatus, selectedCustomerId]);

  // Paginated Data
  const paginatedCampaigns = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredCampaigns.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredCampaigns, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredCampaigns.length / itemsPerPage);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedStatus, selectedCustomerId]);

  // Selection handlers
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedCampaignIds(new Set(paginatedCampaigns.map(c => c.id!)));
    } else {
      setSelectedCampaignIds(new Set());
    }
  };

  // Bulk Delete
  const handleBulkDelete = async () => {
    const count = selectedCampaignIds.size;
    if (count === 0) return;
    
    setConfirmDialog({
      isOpen: true,
      title: `${count} Kampagnen löschen`,
      message: `Möchten Sie wirklich ${count} Kampagnen unwiderruflich löschen?`,
      type: 'danger',
      onConfirm: async () => {
        try {
          await Promise.all(Array.from(selectedCampaignIds).map(id => prService.delete(id)));
          showAlert('success', `${count} Kampagnen gelöscht`);
          await loadCampaigns();
          setSelectedCampaignIds(new Set());
        } catch (error) {
          showAlert('error', 'Fehler beim Löschen');
        }
      }
    });
  };

  // Delete Individual Campaign
  const handleDelete = async (id: string, title: string) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Kampagne löschen',
      message: `Möchten Sie "${title}" wirklich löschen?`,
      type: 'danger',
      onConfirm: async () => {
        try {
          await prService.delete(id);
          showAlert('success', `${title} wurde gelöscht`);
          await loadCampaigns();
        } catch (error) {
          showAlert('error', 'Fehler beim Löschen');
        }
      }
    });
  };

  // Export Function
  const handleExport = () => {
    if (filteredCampaigns.length === 0) {
      showAlert('warning', 'Keine Daten zum Exportieren');
      return;
    }

    try {
      const exportData = filteredCampaigns.map(campaign => ({
        "Titel": campaign.title,
        "Kunde": campaign.clientName || '',
        "Status": statusConfig[campaign.status].label,
        "Empfänger": campaign.recipientCount || 0,
        "Medien": campaign.attachedAssets?.length || 0,
        "Erstellt": formatDate(campaign.createdAt),
        "Versendet": campaign.sentAt ? formatDate(campaign.sentAt) : 'Noch nicht versendet',
        "Verteiler": campaign.distributionListName
      }));

      const csv = Papa.unparse(exportData);
      const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.setAttribute('download', `pr-kampagnen-export-${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      showAlert('success', 'Export erfolgreich');
    } catch (error) {
      showAlert('error', 'Export fehlgeschlagen');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#005fab] mx-auto"></div>
          <Text className="mt-4">Lade Kampagnen...</Text>
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
          <Heading level={1}>PR-Kampagnen</Heading>
        </div>
        <div className="mt-4 flex md:mt-0 md:ml-4 gap-3">
          {/* AI Model Display */}
          <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
            <SparklesIcon className="h-5 w-5 text-[#005fab]" />
            <div className="text-sm">
              <span className="font-medium text-gray-700">KI-Modell:</span>
              <span className="ml-1 text-gray-600">Gemini 1.5 Flash</span>
            </div>
          </div>
          
          <Button plain onClick={handleExport}>
            <ArrowDownTrayIcon />
            Export
          </Button>
          <Button 
            href="/dashboard/pr-tools/campaigns/campaigns/new"
            className="bg-[#005fab] hover:bg-[#004a8c] text-white whitespace-nowrap"
          >
            <PlusIcon />
            Neue Kampagne
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="mt-8 space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 size-5 text-gray-400 z-10" />
            <Input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Kampagnen durchsuchen..."
              className="pl-10"
            />
          </div>
          
          {/* Status Filter */}
          <div className="w-full sm:w-auto">
            <Select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value as PRCampaignStatus | 'all')}
            >
              <option value="all">Alle Status</option>
              {Object.entries(statusConfig).map(([status, config]) => (
                <option key={status} value={status}>
                  {config.label}
                </option>
              ))}
            </Select>
          </div>
        </div>

        {/* Status Filter Pills */}
        <div className="flex gap-2 flex-wrap">
          {Object.entries({
            all: { label: 'Alle', count: campaigns.length },
            ...Object.entries(statusConfig).reduce((acc, [status, config]) => {
              const count = campaigns.filter(c => c.status === status).length;
              if (count > 0) {
                acc[status] = { ...config, count };
              }
              return acc;
            }, {} as Record<string, any>)
          }).map(([status, data]) => (
            <Button
              key={status}
              plain={selectedStatus !== status}
              color={selectedStatus === status ? "zinc" : undefined}
              onClick={() => setSelectedStatus(status as PRCampaignStatus | 'all')}
              className="whitespace-nowrap"
            >
              {data.label} ({data.count})
            </Button>
          ))}
        </div>
      </div>

      {/* Results Info and Bulk Actions */}
      <div className="mt-4 flex items-center justify-between">
        <Text>
          {filteredCampaigns.length} von {campaigns.length} Kampagnen
        </Text>
        
        <div className="flex min-h-10 items-center gap-4">
          {selectedCampaignIds.size > 0 && (
            <>
              <Text>{selectedCampaignIds.size} ausgewählt</Text>
              <Button color="zinc" onClick={handleBulkDelete}>
                <TrashIcon />
                Löschen
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="mt-8">
        {filteredCampaigns.length === 0 ? (
          <div className="text-center py-12 border rounded-lg bg-white">
            <EnvelopeIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {campaigns.length === 0 ? 'Noch keine Kampagnen' : 'Keine Kampagnen gefunden'}
            </h3>
            <p className="text-gray-600 mb-6">
              {campaigns.length === 0 
                ? 'Erstelle deine erste PR-Kampagne und erreiche deine Zielgruppe.'
                : 'Versuche andere Suchkriterien oder Filter.'
              }
            </p>
            {campaigns.length === 0 && (
              <Button 
                href="/dashboard/pr-tools/campaigns/campaigns/new"
                className="bg-[#005fab] hover:bg-[#004a8c] text-white"
              >
                <PlusIcon />
                Erste Kampagne erstellen
              </Button>
            )}
          </div>
        ) : (
          <Table>
            <TableHead>
              <TableRow>
                <TableHeader>
                  <Checkbox
                    checked={paginatedCampaigns.length > 0 && paginatedCampaigns.every(c => selectedCampaignIds.has(c.id!))}
                    indeterminate={paginatedCampaigns.some(c => selectedCampaignIds.has(c.id!)) && !paginatedCampaigns.every(c => selectedCampaignIds.has(c.id!))}
                    onChange={(checked) => handleSelectAll(checked)}
                  />
                </TableHeader>
                <TableHeader>Kampagne</TableHeader>
                <TableHeader>Kunde</TableHeader>
                <TableHeader>Status</TableHeader>
                <TableHeader>Medien</TableHeader>
                <TableHeader>Empfänger</TableHeader>
                <TableHeader>Erstellt</TableHeader>
                <TableHeader>Versendet</TableHeader>
                <TableHeader>
                  <span className="sr-only">Aktionen</span>
                </TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {paginatedCampaigns.map((campaign) => (
                <TableRow key={campaign.id} className="hover:bg-gray-50">
                  <TableCell>
                    <Checkbox
                      checked={selectedCampaignIds.has(campaign.id!)}
                      onChange={(checked) => {
                        const newIds = new Set(selectedCampaignIds);
                        if (checked) {
                          newIds.add(campaign.id!);
                        } else {
                          newIds.delete(campaign.id!);
                        }
                        setSelectedCampaignIds(newIds);
                      }}
                    />
                  </TableCell>
                  <TableCell className="font-medium">
                    <Link 
                      href={`/dashboard/pr-tools/campaigns/campaigns/${campaign.id}`} 
                      className="text-[#005fab] hover:text-[#004a8c]"
                    >
                      {campaign.title}
                    </Link>
                    {campaign.scheduledAt && (
                      <div className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                        <CalendarIcon className="h-3 w-3" />
                        Geplant für: {formatDate(campaign.scheduledAt)}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    {campaign.clientId ? (
                      <Link 
                        href={`/dashboard/contacts/crm/companies/${campaign.clientId}`}
                        className="inline-flex items-center gap-1 text-[#005fab] hover:text-[#004a8c]"
                      >
                        <BuildingOfficeIcon className="h-4 w-4" />
                        {campaign.clientName}
                      </Link>
                    ) : (
                      <Text>—</Text>
                    )}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={campaign.status} />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <PhotoIcon className="h-4 w-4 text-gray-400" />
                      <span>{campaign.attachedAssets?.length || 0}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <UsersIcon className="h-4 w-4 text-gray-400" />
                      <span className="font-medium">
                        {(campaign.recipientCount || 0).toLocaleString('de-DE')}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {formatDate(campaign.createdAt)}
                  </TableCell>
                  <TableCell>
                    {campaign.sentAt ? formatDate(campaign.sentAt) : <Text>—</Text>}
                  </TableCell>
                  <TableCell>
                    <Dropdown>
                      <DropdownButton plain className="p-2 hover:bg-gray-100 rounded-lg">
                        <EllipsisVerticalIcon className="h-5 w-5 text-gray-700" />
                      </DropdownButton>
                      <DropdownMenu anchor="bottom end">
                        {campaign.status === 'sent' && (
                          <DropdownItem href={`/dashboard/pr-tools/campaigns/campaigns/${campaign.id}/analytics`}>
                            <ChartBarIcon />
                            Analytics
                          </DropdownItem>
                        )}
                        <DropdownItem href={`/dashboard/pr-tools/campaigns/campaigns/${campaign.id}`}>
                          <EyeIcon />
                          Vorschau
                        </DropdownItem>
                        {(campaign.status === 'draft' || campaign.status === 'changes_requested') && (
                          <DropdownItem href={`/dashboard/pr-tools/campaigns/campaigns/edit/${campaign.id}`}>
                            <PencilIcon />
                            Bearbeiten
                          </DropdownItem>
                        )}
                        {(campaign.status === 'draft' || campaign.status === 'approved') && (
                          <DropdownItem onClick={() => setShowSendModal(campaign)}>
                            <PaperAirplaneIcon />
                            Versenden
                          </DropdownItem>
                        )}
                        <DropdownDivider />
                        <DropdownItem onClick={() => handleDelete(campaign.id!, campaign.title)}>
                          <TrashIcon className="text-red-500" />
                          <span className="text-red-600">Löschen</span>
                        </DropdownItem>
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
            >
              Weiter
              <ChevronRightIcon />
            </Button>
          </div>
        </nav>
      )}

      {/* Send Modal */}
      {showSendModal && (
        <EmailSendModal
          campaign={showSendModal}
          onClose={() => setShowSendModal(null)}
          onSent={() => {
            setShowSendModal(null);
            showAlert('success', 'Kampagne versendet', `"${showSendModal.title}" wurde erfolgreich versendet.`);
            loadCampaigns();
          }}
        />
      )}

      {/* Confirm Dialog */}
      <Dialog
        open={confirmDialog.isOpen}
        onClose={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
      >
        <div className="p-6">
          <div className="sm:flex sm:items-start">
            <div className={`mx-auto flex h-12 w-12 shrink-0 items-center justify-center rounded-full sm:mx-0 sm:h-10 sm:w-10 ${
              confirmDialog.type === 'danger' ? 'bg-red-100' : 'bg-yellow-100'
            }`}>
              <ExclamationTriangleIcon className={`h-6 w-6 ${
                confirmDialog.type === 'danger' ? 'text-red-600' : 'text-yellow-600'
              }`} />
            </div>
            <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left">
              <DialogTitle>{confirmDialog.title}</DialogTitle>
              <DialogBody className="mt-2">
                <Text>{confirmDialog.message}</Text>
              </DialogBody>
            </div>
          </div>
          <DialogActions className="mt-5 sm:mt-4">
            <Button
              plain
              onClick={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
            >
              Abbrechen
            </Button>
            <Button
              color={confirmDialog.type === 'danger' ? 'zinc' : 'zinc'}
              onClick={() => {
                confirmDialog.onConfirm();
                setConfirmDialog(prev => ({ ...prev, isOpen: false }));
              }}
            >
              {confirmDialog.type === 'danger' ? 'Löschen' : 'Bestätigen'}
            </Button>
          </DialogActions>
        </div>
      </Dialog>
    </div>
  );
}