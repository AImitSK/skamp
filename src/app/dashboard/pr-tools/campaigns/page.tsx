// src/app/dashboard/pr-tools/campaigns/page.tsx
"use client";

import { useState, useEffect, useMemo, Fragment } from "react";
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useAuth } from "@/context/AuthContext";
import { useOrganization } from "@/context/OrganizationContext";
import { Heading } from "@/components/ui/heading";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/ui/search-input";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogTitle, DialogBody, DialogActions } from "@/components/ui/dialog";
import { Dropdown, DropdownButton, DropdownMenu, DropdownItem, DropdownDivider } from "@/components/ui/dropdown";
import { Popover, Transition } from '@headlessui/react';
import { Alert } from "@/components/common/Alert";
import { StatusBadge } from "@/components/campaigns/StatusBadge";
import { useAlert } from "@/hooks/useAlert";
import { formatDateShort } from "@/utils/dateHelpers";
import { statusConfig } from "@/utils/campaignStatus";
import { DEFAULT_ITEMS_PER_PAGE, LOADING_SPINNER_SIZE, LOADING_SPINNER_BORDER, MAX_VISIBLE_PAGES, ICON_SIZES } from "@/constants/ui";
import { teamMemberService } from "@/lib/firebase/team-service-enhanced";
import { 
  PlusIcon, 
  EyeIcon, 
  TrashIcon,
  CalendarIcon,
  EnvelopeIcon,
  UsersIcon,
  PaperAirplaneIcon,
  ChartBarIcon,
  PhotoIcon,
  SparklesIcon,
  EllipsisVerticalIcon,
  ExclamationTriangleIcon,
  ArrowDownTrayIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  BuildingOfficeIcon,
  FunnelIcon
} from "@heroicons/react/20/solid";
import {
  PencilIcon as PencilIconOutline,
  EyeIcon as EyeIconOutline,
  TrashIcon as TrashIconOutline,
  ChartBarIcon as ChartBarIconOutline,
  PaperAirplaneIcon as PaperAirplaneIconOutline
} from "@heroicons/react/24/outline";
import { prService } from "@/lib/firebase/pr-service";
import { PRCampaign, PRCampaignStatus } from "@/types/pr";
import { TeamMember } from "@/types/international";
import EmailSendModal from "@/components/pr/EmailSendModal";
import Papa from 'papaparse';
import clsx from 'clsx';






export default function PRCampaignsPage() {
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();
  const searchParams = useSearchParams();
  const [campaigns, setCampaigns] = useState<PRCampaign[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<PRCampaignStatus | 'all'>('all');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [selectedCampaignIds, setSelectedCampaignIds] = useState<Set<string>>(new Set());
  const [showSendModal, setShowSendModal] = useState<PRCampaign | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    type?: 'danger' | 'warning';
  }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });


  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(DEFAULT_ITEMS_PER_PAGE);

  // Alert Management
  const { alert, showAlert } = useAlert();


  useEffect(() => {
    if (user && currentOrganization) {
      loadCampaigns();
    }
  }, [user, currentOrganization]);

  // Auto-reload on window focus (when returning from campaign creation)
  useEffect(() => {
    const handleFocus = () => {
      if (user && currentOrganization && !loading) {
        loadCampaigns();
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [user, currentOrganization, loading]);

  // Check for refresh parameter (from campaign creation)
  useEffect(() => {
    const shouldRefresh = searchParams.get('refresh');
    if (shouldRefresh === 'true' && user && currentOrganization) {
      loadCampaigns();
      // Clean URL without triggering navigation
      window.history.replaceState({}, '', '/dashboard/pr-tools/campaigns');
    }
  }, [searchParams, user, currentOrganization]);

  const loadCampaigns = async () => {
    if (!user || !currentOrganization) return;
    setLoading(true);
    try {
      // Load campaigns (KRITISCH) - muss funktionieren
      const campaignsData = await prService.getAllByOrganization(currentOrganization.id);
      setCampaigns(campaignsData);
      
      // Load team members (OPTIONAL) - Fehler dürfen Kampagnen nicht blockieren
      try {
        const membersData = await teamMemberService.getByOrganization(currentOrganization.id);
        setTeamMembers(membersData);
        
        
        
      } catch (teamError) {
        setTeamMembers([]); // Fallback zu leerem Array
      }
      
    } catch (error) {
      showAlert('error', 'Fehler beim Laden', 'Die Kampagnen konnten nicht geladen werden.');
    } finally {
      setLoading(false);
    }
  };


  // Filtered campaigns
  const filteredCampaigns = useMemo(() => {
    return campaigns.filter(campaign => {
      // Verstecke temporäre Kampagnen während PDF-Generierung
      if (campaign.status === 'generating_preview') {
        return false;
      }
      
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
        "Erstellt": formatDateShort(campaign.createdAt),
        "Versendet": campaign.sentAt ? formatDateShort(campaign.sentAt) : 'Noch nicht versendet',
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
          <div className={`animate-spin rounded-full ${LOADING_SPINNER_SIZE} ${LOADING_SPINNER_BORDER} mx-auto`}></div>
          <Text className="mt-4">Lade Kampagnen...</Text>
        </div>
      </div>
    );
  }

  const activeFiltersCount = (selectedStatus !== 'all' ? 1 : 0) + (selectedCustomerId ? 1 : 0);

  return (
    <div>
      {/* Alert */}
      {alert && (
        <div className="mb-4">
          <Alert type={alert.type} title={alert.title} message={alert.message} />
        </div>
      )}

      {/* Header */}
      <div className="mb-6">
        <Heading level={1}>PR-Kampagnen</Heading>
        
        {/* AI Model Badge */}
        <div className="mt-2 inline-flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
          <SparklesIcon className="h-4 w-4 text-[#005fab]" />
          <span className="text-sm">
            <span className="font-medium text-gray-700">KI-Modell:</span>
            <span className="ml-1 text-gray-600">Gemini 1.5 Flash</span>
          </span>
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
                'inline-flex items-center justify-center rounded-lg border p-2.5 transition-colors focus:outline-none focus:ring-2 focus:ring-[#005fab] focus:ring-offset-2 h-10 w-10',
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
              <Popover.Panel className="absolute left-0 z-10 mt-2 w-80 origin-top-left rounded-lg bg-white p-4 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none dark:bg-zinc-800 dark:ring-white/10">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium text-zinc-900 dark:text-white">Filter</h3>
                    {activeFiltersCount > 0 && (
                      <button
                        onClick={() => {
                          setSelectedStatus('all');
                          setSelectedCustomerId('');
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
                      {Object.entries(statusConfig).map(([status, config]) => {
                        const isChecked = selectedStatus === status;
                        return (
                          <label
                            key={status}
                            className="flex items-center gap-2 cursor-pointer"
                          >
                            <input
                              type="radio"
                              name="status"
                              checked={isChecked}
                              onChange={() => setSelectedStatus(status as PRCampaignStatus)}
                              className="h-4 w-4 border-zinc-300 text-[#005fab] focus:ring-[#005fab]"
                            />
                            <span className="text-sm text-zinc-700 dark:text-zinc-300">
                              {config.label}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </Popover.Panel>
            </Transition>
          </Popover>


          {/* Add Button */}
          <Button 
            href="/dashboard/pr-tools/campaigns/campaigns/new"
            className="bg-[#005fab] hover:bg-[#004a8c] text-white whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#005fab] h-10 px-6"
          >
            Neue Kampagne
          </Button>
          

          {/* Actions Button */}
          <Popover className="relative">
            <Popover.Button className="inline-flex items-center justify-center p-2 text-zinc-700 hover:bg-zinc-100 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-[#005fab] focus:ring-offset-2 dark:text-zinc-300 dark:hover:bg-zinc-800">
              <EllipsisVerticalIcon className="h-5 w-5" />
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
              <Popover.Panel className="absolute right-0 z-10 mt-2 w-48 origin-top-right rounded-lg bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none dark:bg-zinc-800 dark:ring-white/10">
                <div className="py-1">
                  <button
                    onClick={handleExport}
                    className="flex w-full items-center gap-3 px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-700"
                  >
                    <ArrowDownTrayIcon className="h-5 w-5" />
                    Exportieren
                  </button>
                  {selectedCampaignIds.size > 0 && (
                    <>
                      <div className="border-t border-zinc-200 dark:border-zinc-700 my-1"></div>
                      <button
                        onClick={handleBulkDelete}
                        className="flex w-full items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                      >
                        <TrashIcon className="h-5 w-5" />
                        Auswahl löschen ({selectedCampaignIds.size})
                      </button>
                    </>
                  )}
                </div>
              </Popover.Panel>
            </Transition>
          </Popover>
        </div>
      </div>


      {/* Results Info */}
      <div className="mb-4 flex items-center justify-between">
        <Text className="text-sm text-zinc-600 dark:text-zinc-400">
          {filteredCampaigns.length} von {campaigns.length} Kampagnen
          {selectedCampaignIds.size > 0 && (
            <span className="ml-2">
              • {selectedCampaignIds.size} ausgewählt
            </span>
          )}
        </Text>
        
        {/* Bulk Delete Link */}
        {selectedCampaignIds.size > 0 && (
          <button
            onClick={handleBulkDelete}
            className="text-sm text-red-600 hover:text-red-700 underline"
          >
            {selectedCampaignIds.size} Löschen
          </button>
        )}
      </div>

      {/* Content */}
      <div>
        {filteredCampaigns.length === 0 ? (
          <div className="text-center py-12 border rounded-lg bg-white dark:bg-zinc-800">
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
          // Table View
          <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-sm overflow-hidden">
            {/* Header */}
            <div className="px-8 py-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50">
              <div className="flex items-center">
                <div className="w-10 flex items-center">
                  <Checkbox
                    checked={paginatedCampaigns.length > 0 && selectedCampaignIds.size === paginatedCampaigns.length}
                    indeterminate={selectedCampaignIds.size > 0 && selectedCampaignIds.size < paginatedCampaigns.length}
                    onChange={(checked: boolean) => handleSelectAll(checked)}
                  />
                </div>
                <div className="flex-1 px-4 text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                  Kampagne
                </div>
                <div className="w-64 px-4 text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                  Kunde / Projekt
                </div>
                <div className="w-48 px-4 text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                  Status
                </div>
                <div className="w-20 px-4 text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                  Admin
                </div>
                <div className="w-12"></div>
              </div>
            </div>

            {/* Body */}
            <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {paginatedCampaigns.map((campaign) => {
                // Placeholder-Daten für Demo
                const projectName = "Hier steht der Projektname";
                
                // Find the actual admin for this campaign (robust gegen leere teamMembers)
                const campaignAdmin = teamMembers.find(member => member.userId === campaign.userId);
                
                // Robuste Avatar-Logik mit Multi-Tenancy Support
                const getAdminAvatar = () => {
                  if (campaignAdmin?.photoUrl) {
                    // Echtes Avatar verfügbar (nach Avatar-Sync)
                    return campaignAdmin.photoUrl;
                  }
                  
                  // Fallback zu generiertem Avatar
                  let displayName = 'Admin';
                  
                  if (campaignAdmin?.displayName) {
                    displayName = campaignAdmin.displayName;
                  } else if (teamMembers.length === 0) {
                    // Keine TeamMembers geladen - fallback zu current user
                    displayName = user?.displayName || user?.email || 'Admin';
                  }
                  
                  return `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=005fab&color=fff&size=32`;
                };
                
                const adminAvatar = getAdminAvatar();
                
                // Titel kürzen wenn zu lang
                const truncateTitle = (title: string, maxLength: number = 50) => {
                  return title.length > maxLength ? title.substring(0, maxLength) + '...' : title;
                };
                
                // Projektname kürzen
                const truncateProject = (name: string, maxLength: number = 30) => {
                  return name.length > maxLength ? name.substring(0, maxLength) + '...' : name;
                };
                
                // Versanddatum bestimmen
                const getSentDate = () => {
                  if (campaign.status === 'sent' && campaign.sentAt) {
                    return formatDateShort(campaign.sentAt);
                  }
                  return '';
                };
                
                return (
                  <div key={campaign.id} className="px-8 py-5 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                    <div className="flex items-center">
                      {/* Checkbox */}
                      <div className="w-10 flex items-center">
                        <Checkbox
                          checked={selectedCampaignIds.has(campaign.id!)}
                          onChange={(checked: boolean) => {
                            const newIds = new Set(selectedCampaignIds);
                            if (checked) newIds.add(campaign.id!);
                            else newIds.delete(campaign.id!);
                            setSelectedCampaignIds(newIds);
                          }}
                        />
                      </div>
                      
                      {/* Kampagne Title mit Datum */}
                      <div className="flex-1 px-4 min-w-0">
                        <Link 
                          href={`/dashboard/pr-tools/campaigns/campaigns/${campaign.id}`} 
                          className="text-sm font-semibold text-zinc-900 dark:text-white hover:text-[#005fab] block truncate"
                          title={campaign.title}
                        >
                          {truncateTitle(campaign.title)}
                        </Link>
                        <div className="text-xs text-zinc-900 dark:text-zinc-300 mt-1">
                          {formatDateShort(campaign.createdAt)}
                        </div>
                      </div>

                      {/* Kunde mit Projekt */}
                      <div className="w-64 px-4">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <BuildingOfficeIcon className="h-4 w-4 text-zinc-400 flex-shrink-0" />
                            {campaign.clientName ? (
                              <Link 
                                href={`/dashboard/contacts/crm/companies/${campaign.clientId}`}
                                className="text-sm text-zinc-900 dark:text-white hover:text-[#005fab] block truncate"
                                title={campaign.clientName}
                              >
                                {campaign.clientName}
                              </Link>
                            ) : (
                              <span className="text-sm text-zinc-900 dark:text-white">SK Online Marketing</span>
                            )}
                          </div>
                          <div className="text-xs text-zinc-500 dark:text-zinc-400 truncate" title={projectName}>
                            {truncateProject(projectName)}
                          </div>
                        </div>
                      </div>

                      {/* Status mit Datum */}
                      <div className="w-48 px-4">
                        <StatusBadge 
                          status={campaign.status} 
                          campaign={campaign}
                          showApprovalTooltip={false}
                          teamMembers={teamMembers}
                        />
                        <div className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">
                          {getSentDate()}
                        </div>
                      </div>

                      {/* Admin Avatar */}
                      <div className="w-20 px-4 flex justify-center">
                        <img 
                          src={adminAvatar}
                          alt={campaignAdmin?.displayName || 'Admin'}
                          className="w-8 h-8 rounded-full"
                          title={campaignAdmin?.displayName || user?.displayName || user?.email || 'Admin'}
                        />
                      </div>

                      {/* Actions */}
                      <div className="w-12 flex justify-end">
                        <Dropdown>
                          <DropdownButton plain className="p-1.5 hover:bg-zinc-100 rounded-md dark:hover:bg-zinc-700 focus:outline-none focus:ring-2 focus:ring-[#005fab] focus:ring-offset-2">
                            <EllipsisVerticalIcon className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
                          </DropdownButton>
                          <DropdownMenu anchor="bottom end">
                            {campaign.status === 'sent' && (
                              <DropdownItem href={`/dashboard/pr-tools/campaigns/campaigns/${campaign.id}/analytics`}>
                                <ChartBarIconOutline className="h-4 w-4" />
                                Analytics
                              </DropdownItem>
                            )}
                            <DropdownItem href={`/dashboard/pr-tools/campaigns/campaigns/${campaign.id}`}>
                              <EyeIconOutline className="h-4 w-4" />
                              Vorschau
                            </DropdownItem>
                            {(campaign.status === 'draft' || campaign.status === 'changes_requested') && (
                              <DropdownItem href={`/dashboard/pr-tools/campaigns/campaigns/edit/${campaign.id}`}>
                                <PencilIconOutline className="h-4 w-4" />
                                Bearbeiten
                              </DropdownItem>
                            )}
                            {(campaign.status === 'draft' || campaign.status === 'approved') && (
                              <DropdownItem onClick={() => setShowSendModal(campaign)}>
                                <PaperAirplaneIconOutline className="h-4 w-4" />
                                Versenden
                              </DropdownItem>
                            )}
                            <DropdownDivider />
                            <DropdownItem onClick={() => handleDelete(campaign.id!, campaign.title)}>
                              <TrashIconOutline className="h-4 w-4" />
                              <span className="text-red-600">Löschen</span>
                            </DropdownItem>
                          </DropdownMenu>
                        </Dropdown>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
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
              const maxVisible = MAX_VISIBLE_PAGES;
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
                    className={currentPage === i ? 'font-semibold text-[#005fab]' : 'text-zinc-700 hover:text-[#005fab]'}
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
              className="whitespace-nowrap"
            >
              Abbrechen
            </Button>
            <Button
              color={confirmDialog.type === 'danger' ? 'zinc' : 'zinc'}
              onClick={() => {
                confirmDialog.onConfirm();
                setConfirmDialog(prev => ({ ...prev, isOpen: false }));
              }}
              className={confirmDialog.type === 'danger' ? 'bg-red-600 hover:bg-red-700 text-white' : ''}
            >
              {confirmDialog.type === 'danger' ? 'Löschen' : 'Bestätigen'}
            </Button>
          </DialogActions>
        </div>
      </Dialog>
    </div>
  );
}