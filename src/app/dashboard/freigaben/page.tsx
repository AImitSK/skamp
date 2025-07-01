// src/app/dashboard/freigaben/page.tsx - Überarbeitete Version
"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import Link from 'next/link';
import { useAuth } from "@/context/AuthContext";
import { Heading } from "@/components/heading";
import { Text } from "@/components/text";
import { Button } from "@/components/button";
import { Badge } from "@/components/badge";
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
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  PaperAirplaneIcon
} from "@heroicons/react/20/solid";
import { prService } from "@/lib/firebase/pr-service";
import { PRCampaign } from "@/types/pr";
import clsx from "clsx";

// Types
type ApprovalStatus = 'all' | 'in_review' | 'changes_requested' | 'approved';

interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
}

// Toast Notification Component
function ToastNotification({ toasts, onRemove }: { toasts: Toast[], onRemove: (id: string) => void }) {
  const icons = {
    success: CheckCircleIcon,
    error: XCircleIcon,
    warning: ExclamationTriangleIcon,
    info: InformationCircleIcon
  };

  const colors = {
    success: 'bg-green-50 border-green-200 text-green-800',
    error: 'bg-red-50 border-red-200 text-red-800',
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    info: 'bg-blue-50 border-blue-200 text-blue-800'
  };

  const iconColors = {
    success: 'text-green-400',
    error: 'text-red-400',
    warning: 'text-yellow-400',
    info: 'text-blue-400'
  };

  return (
    <div className="fixed bottom-0 right-0 p-6 space-y-4 z-50">
      {toasts.map((toast) => {
        const Icon = icons[toast.type];
        return (
          <div
            key={toast.id}
            className={`${colors[toast.type]} border rounded-lg p-4 shadow-lg transform transition-all duration-300 ease-in-out animate-slide-in-up`}
            style={{ minWidth: '320px' }}
          >
            <div className="flex">
              <Icon className={`h-5 w-5 ${iconColors[toast.type]} mr-3 flex-shrink-0`} />
              <div className="flex-1">
                <p className="font-medium">{toast.title}</p>
                {toast.message && (
                  <p className="text-sm mt-1 opacity-90">{toast.message}</p>
                )}
              </div>
              <button
                onClick={() => onRemove(toast.id)}
                className="ml-3 flex-shrink-0 rounded-md hover:opacity-70 focus:outline-none"
              >
                <XCircleIcon className="h-5 w-5" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Quick Preview Component
function QuickPreview({ 
  campaign, 
  position 
}: { 
  campaign: PRCampaign;
  position: { x: number; y: number };
}) {
  const previewRef = useRef<HTMLDivElement>(null);
  const [adjustedPosition, setAdjustedPosition] = useState(position);

  useEffect(() => {
    if (previewRef.current) {
      const rect = previewRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      
      let newX = position.x;
      let newY = position.y;
      
      if (rect.right > viewportWidth) {
        newX = position.x - rect.width - 20;
      }
      if (rect.bottom > viewportHeight) {
        newY = viewportHeight - rect.height - 20;
      }
      
      setAdjustedPosition({ x: newX, y: newY });
    }
  }, [position]);

  const formatDate = (timestamp: any) => {
    if (!timestamp || !timestamp.toDate) return '—';
    return timestamp.toDate().toLocaleDateString('de-DE', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = () => {
    switch (campaign.approvalData?.status) {
      case 'pending':
        return <Badge color="yellow" className="text-xs">Warten auf Feedback</Badge>;
      case 'viewed':
        return <Badge color="blue" className="text-xs">Angesehen</Badge>;
      case 'commented':
        return <Badge color="orange" className="text-xs">Kommentiert</Badge>;
      case 'approved':
        return <Badge color="green" className="text-xs">Freigegeben</Badge>;
      default:
        return null;
    }
  };

  return (
    <div
      ref={previewRef}
      className="fixed z-50 bg-white rounded-lg shadow-xl border border-gray-200 p-4 w-80 animate-fade-in-scale"
      style={{ left: `${adjustedPosition.x}px`, top: `${adjustedPosition.y}px` }}
    >
      <div className="mb-3">
        <h4 className="font-semibold text-gray-900">{campaign.title}</h4>
        <p className="text-sm text-gray-600 mt-1">{campaign.clientName}</p>
      </div>
      
      <div className="space-y-2 text-sm">
        <div className="flex justify-between items-center">
          <span className="text-gray-500">Status:</span>
          {getStatusBadge()}
        </div>
        
        {campaign.approvalData?.feedbackHistory && campaign.approvalData.feedbackHistory.length > 0 && (
          <div className="pt-2 border-t">
            <span className="text-gray-500 text-xs">Letztes Feedback:</span>
            <p className="text-xs mt-1 text-gray-600 italic">
              "{campaign.approvalData.feedbackHistory[campaign.approvalData.feedbackHistory.length - 1].comment}"
            </p>
          </div>
        )}
        
        <div className="flex justify-between">
          <span className="text-gray-500">Angefordert:</span>
          <span className="text-xs">{campaign.approvalData?.feedbackHistory?.[0] 
            ? formatDate(campaign.approvalData.feedbackHistory[0].requestedAt)
            : '—'}</span>
        </div>
        
        {campaign.approvalData?.approvedAt && (
          <div className="flex justify-between">
            <span className="text-gray-500">Freigegeben:</span>
            <span className="text-xs">{formatDate(campaign.approvalData.approvedAt)}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// Dropdown Menu Component
function DropdownMenu({ 
  campaign,
  onCopyLink,
  onViewDetails
}: { 
  campaign: PRCampaign;
  onCopyLink: (shareId: string) => void;
  onViewDetails: (campaign: PRCampaign) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + window.scrollY,
        left: rect.right - 192 + window.scrollX
      });
    }
  }, [isOpen]);

  const handleAction = (action: () => void) => {
    action();
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="p-1 rounded hover:bg-gray-100 transition-colors"
      >
        <EllipsisVerticalIcon className="h-5 w-5 text-gray-500" />
      </button>

      {isOpen && (
        <div 
          className={`fixed w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 transform transition-all duration-200 ${
            isOpen ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
          }`}
          style={{ 
            top: `${dropdownPosition.top}px`,
            left: `${dropdownPosition.left}px`,
            zIndex: 9999
          }}
        >
          <div className="py-1">
            <Link
              href={`/freigabe/${campaign.approvalData?.shareId}`}
              target="_blank"
              className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
              onClick={() => setIsOpen(false)}
            >
              <EyeIcon className="h-4 w-4 mr-3 text-gray-400" />
              Freigabe-Link öffnen
            </Link>

            <button
              onClick={() => handleAction(() => onCopyLink(campaign.approvalData?.shareId || ''))}
              className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors text-left"
            >
              <LinkIcon className="h-4 w-4 mr-3 text-gray-400" />
              Link kopieren
            </button>

            <div className="border-t border-gray-100 my-1"></div>

            <Link
              href={`/dashboard/pr/campaigns/${campaign.id}`}
              className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
              onClick={() => setIsOpen(false)}
            >
              <DocumentTextIcon className="h-4 w-4 mr-3 text-gray-400" />
              Kampagne anzeigen
            </Link>

            <button
              onClick={() => handleAction(() => onViewDetails(campaign))}
              className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors text-left"
            >
              <ChatBubbleLeftRightIcon className="h-4 w-4 mr-3 text-gray-400" />
              Feedback-Historie
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ApprovalsPage() {
  const { user } = useAuth();
  const [campaigns, setCampaigns] = useState<PRCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ApprovalStatus>('all');
  const [searchTerm, setSearchTerm] = useState("");
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [previewCampaign, setPreviewCampaign] = useState<{ campaign: PRCampaign; position: { x: number; y: number } } | null>(null);
  
  // Pagination States
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);

  // Toast Management
  const showToast = useCallback((type: Toast['type'], title: string, message?: string) => {
    const id = Date.now().toString();
    const newToast: Toast = { id, type, title, message, duration: 5000 };
    setToasts(prev => [...prev, newToast]);
    
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, newToast.duration);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
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
      const allCampaigns = await prService.getAll(user.uid);
      // Nur Kampagnen mit Freigabe-Anforderung
      const approvalCampaigns = allCampaigns.filter((c: PRCampaign) => c.approvalRequired && c.approvalData);
      setCampaigns(approvalCampaigns);
    } catch (error) {
      console.error("Fehler beim Laden der Kampagnen:", error);
      showToast('error', 'Fehler beim Laden', 'Die Freigaben konnten nicht geladen werden.');
    } finally {
      setLoading(false);
    }
  };

  const filteredCampaigns = useMemo(() => {
    return campaigns.filter(campaign => {
      const searchMatch = campaign.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (campaign.clientName || '').toLowerCase().includes(searchTerm.toLowerCase());
      
      if (!searchMatch) return false;

      if (activeTab === 'all') return true;
      
      // Map tabs to campaign status
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
    const endIndex = startIndex + itemsPerPage;
    return filteredCampaigns.slice(startIndex, endIndex);
  }, [filteredCampaigns, currentPage, itemsPerPage]);

  // Total Pages
  const totalPages = Math.ceil(filteredCampaigns.length / itemsPerPage);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, activeTab]);

  const handleCopyLink = async (shareId: string) => {
    const url = `${window.location.origin}/freigabe/${shareId}`;
    try {
      await navigator.clipboard.writeText(url);
      showToast('success', 'Link kopiert', 'Der Freigabe-Link wurde in die Zwischenablage kopiert.');
    } catch (error) {
      showToast('error', 'Fehler', 'Der Link konnte nicht kopiert werden.');
    }
  };

  const handleViewDetails = (campaign: PRCampaign) => {
    // Hier könnte ein Modal mit der Feedback-Historie geöffnet werden
    showToast('info', 'Feedback-Historie', `${campaign.approvalData?.feedbackHistory?.length || 0} Feedback-Einträge vorhanden.`);
  };

  const handleMouseEnter = (campaign: PRCampaign, event: React.MouseEvent) => {
    const rect = (event.target as HTMLElement).getBoundingClientRect();
    setPreviewCampaign({
      campaign,
      position: { x: rect.right + 10, y: rect.top }
    });
  };

  const handleMouseLeave = () => {
    setPreviewCampaign(null);
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
        <div className="animate-pulse">
          <div className="h-8 w-8 bg-[#005fab] rounded-full animate-bounce"></div>
          <p className="mt-4 text-zinc-500">Lade Freigaben...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <Heading>Freigaben-Center</Heading>
          <Text className="mt-1">
            Verwalten und überwachen Sie alle Pressemitteilungen, die eine Kundenfreigabe benötigen
          </Text>
        </div>
      </div>

      {/* Filter-Box */}
      <div className="bg-gray-50 dark:bg-zinc-800/50 rounded-lg p-4 mb-6 space-y-4">
        {/* Tabs */}
        <div className="flex gap-4 overflow-x-auto">
          {approvalTabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as ApprovalStatus)}
              className={clsx(
                'pb-3 px-1 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap',
                activeTab === tab.id
                  ? 'border-[#005fab] text-[#005fab]'
                  : 'border-transparent text-zinc-600 hover:text-zinc-900 dark:text-zinc-400'
              )}
            >
              {tab.id === 'in_review' && <ClockIcon className="h-4 w-4" />}
              {tab.id === 'changes_requested' && <ChatBubbleLeftRightIcon className="h-4 w-4" />}
              {tab.id === 'approved' && <CheckBadgeIcon className="h-4 w-4" />}
              {tab.label} ({tab.count})
            </button>
          ))}
        </div>
        
        {/* Suche */}
        <div className="relative w-full lg:max-w-md">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-zinc-400 pointer-events-none" />
          <input
            type="search"
            placeholder="Kampagnen durchsuchen..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-10 rounded-md border border-zinc-300 py-2 pl-10 pr-4 text-sm focus:border-[#005fab] focus:outline-none focus:ring-1 focus:ring-[#005fab] transition-all"
          />
        </div>
      </div>

      {/* Ergebnis-Info */}
      <div className="mb-4">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          {filteredCampaigns.length} von {campaigns.length} Freigaben
        </p>
      </div>

      {/* Tabelle */}
      <div className="overflow-x-auto rounded-lg border">
        <Table className="min-w-full">
          <TableHead>
            <TableRow>
              <TableHeader>Kampagne</TableHeader>
              <TableHeader>Kunde</TableHeader>
              <TableHeader>Status</TableHeader>
              <TableHeader>Letzte Aktivität</TableHeader>
              <TableHeader className="w-12 relative overflow-visible"></TableHeader>
            </TableRow>
          </TableHead>
          <TableBody>
            {paginatedCampaigns.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-10">
                  <CheckBadgeIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <Text className="mt-2 text-zinc-500">
                    {searchTerm || activeTab !== 'all' 
                      ? "Keine Freigaben in dieser Ansicht gefunden." 
                      : "Noch keine Kampagnen zur Freigabe eingereicht."}
                  </Text>
                </TableCell>
              </TableRow>
            ) : (
              paginatedCampaigns.map((campaign) => (
                <TableRow key={campaign.id} className="hover:bg-gray-50 transition-colors">
                  <TableCell>
                    <div 
                      className="font-medium text-[#005fab] hover:text-[#004a8c] cursor-pointer"
                      onMouseEnter={(e) => handleMouseEnter(campaign, e)}
                      onMouseLeave={handleMouseLeave}
                    >
                      <Link href={`/dashboard/pr/campaigns/${campaign.id}`} className="hover:underline">
                        {campaign.title}
                      </Link>
                    </div>
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
                  <TableCell className="relative overflow-visible">
                    <DropdownMenu 
                      campaign={campaign}
                      onCopyLink={handleCopyLink}
                      onViewDetails={handleViewDetails}
                    />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {filteredCampaigns.length > 0 && (
        <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 px-2">
          {/* Items per page selector */}
          <div className="flex items-center gap-2">
            <label htmlFor="itemsPerPage" className="text-sm text-gray-600">
              Einträge pro Seite:
            </label>
            <select
              id="itemsPerPage"
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-[#005fab] focus:outline-none focus:ring-1 focus:ring-[#005fab]"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>

          {/* Page info and navigation */}
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">
              {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, filteredCampaigns.length)} von {filteredCampaigns.length}
            </span>
            
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Erste Seite"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                </svg>
              </button>
              
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Vorherige Seite"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>

              {/* Page numbers */}
              <div className="flex items-center gap-1 mx-2">
                {totalPages <= 7 ? (
                  Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={clsx(
                        "min-w-[32px] h-8 px-2 rounded text-sm font-medium transition-colors",
                        currentPage === page
                          ? "bg-[#005fab] text-white"
                          : "hover:bg-gray-100"
                      )}
                    >
                      {page}
                    </button>
                  ))
                ) : (
                  <>
                    {currentPage > 3 && (
                      <>
                        <button
                          onClick={() => setCurrentPage(1)}
                          className="min-w-[32px] h-8 px-2 rounded text-sm font-medium hover:bg-gray-100"
                        >
                          1
                        </button>
                        {currentPage > 4 && <span className="px-1">...</span>}
                      </>
                    )}
                    
                    {Array.from({ length: 5 }, (_, i) => {
                      const page = currentPage - 2 + i;
                      if (page > 0 && page <= totalPages) {
                        return (
                          <button
                            key={page}
                            onClick={() => setCurrentPage(page)}
                            className={clsx(
                              "min-w-[32px] h-8 px-2 rounded text-sm font-medium transition-colors",
                              currentPage === page
                                ? "bg-[#005fab] text-white"
                                : "hover:bg-gray-100"
                            )}
                          >
                            {page}
                          </button>
                        );
                      }
                      return null;
                    }).filter(Boolean)}
                    
                    {currentPage < totalPages - 2 && (
                      <>
                        {currentPage < totalPages - 3 && <span className="px-1">...</span>}
                        <button
                          onClick={() => setCurrentPage(totalPages)}
                          className="min-w-[32px] h-8 px-2 rounded text-sm font-medium hover:bg-gray-100"
                        >
                          {totalPages}
                        </button>
                      </>
                    )}
                  </>
                )}
              </div>

              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Nächste Seite"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
              
              <button
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Letzte Seite"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Preview */}
      {previewCampaign && (
        <QuickPreview 
          campaign={previewCampaign.campaign}
          position={previewCampaign.position}
        />
      )}

      {/* Toast Notifications */}
      <ToastNotification toasts={toasts} onRemove={removeToast} />

      {/* CSS für Animationen */}
      <style jsx global>{`
        @keyframes slide-in-up {
          from {
            transform: translateY(100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        
        @keyframes fade-in-scale {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        
        .animate-slide-in-up {
          animation: slide-in-up 0.3s ease-out;
        }

        .animate-fade-in-scale {
          animation: fade-in-scale 0.2s ease-out;
        }
      `}</style>
    </div>
  );
}