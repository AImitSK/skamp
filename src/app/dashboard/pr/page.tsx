// src/app/dashboard/pr/page.tsx
"use client";

import { useState, useEffect, useMemo } from "react";
import Link from 'next/link';
import { useAuth } from "@/context/AuthContext";
import { Heading } from "@/components/heading";
import { Text } from "@/components/text";
import { Button } from "@/components/button";
import { Badge } from "@/components/badge";
import { Table, TableHead, TableBody, TableRow, TableHeader, TableCell } from "@/components/table";
import { Checkbox } from "@/components/checkbox";
import { 
  PlusIcon, 
  MagnifyingGlassIcon, 
  EyeIcon, 
  PencilIcon, 
  TrashIcon,
  CalendarIcon,
  EnvelopeIcon,
  UsersIcon,
  PaperAirplaneIcon
} from "@heroicons/react/20/solid";
import { prService } from "@/lib/firebase/pr-service";
import { PRCampaign, PRCampaignStatus } from "@/types/pr";
import EmailSendModal from "@/components/pr/EmailSendModal";
import clsx from "clsx";

// Hilfsfunktion zum Formatieren des Datums
function formatDate(timestamp: any) {
  if (!timestamp || !timestamp.toDate) return 'Unbekannt';
  return timestamp.toDate().toLocaleDateString('de-DE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// Status-Label und Farben
const statusConfig: Record<PRCampaignStatus, { label: string; color: any; icon: any }> = {
  draft: { 
    label: 'Entwurf', 
    color: 'zinc', 
    icon: PencilIcon 
  },
  scheduled: { 
    label: 'Geplant', 
    color: 'blue', 
    icon: CalendarIcon 
  },
  sending: { 
    label: 'Wird versendet', 
    color: 'orange', 
    icon: EnvelopeIcon 
  },
  sent: { 
    label: 'Versendet', 
    color: 'green', 
    icon: EnvelopeIcon 
  },
  archived: { 
    label: 'Archiviert', 
    color: 'zinc', 
    icon: EyeIcon 
  }
};

export default function PRCampaignsPage() {
  const { user } = useAuth();
  const [campaigns, setCampaigns] = useState<PRCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<PRCampaignStatus | 'all'>('all');
  const [selectedCampaignIds, setSelectedCampaignIds] = useState<Set<string>>(new Set());
  const [showSendModal, setShowSendModal] = useState<PRCampaign | null>(null);

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
      console.error("Fehler beim Laden der Kampagnen:", error);
    } finally {
      setLoading(false);
    }
  };

  // Gefilterte Kampagnen
  const filteredCampaigns = useMemo(() => {
    return campaigns.filter(campaign => {
      const searchMatch = campaign.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         campaign.distributionListName.toLowerCase().includes(searchTerm.toLowerCase());
      
      const statusMatch = selectedStatus === 'all' || campaign.status === selectedStatus;
      
      return searchMatch && statusMatch;
    });
  }, [campaigns, searchTerm, selectedStatus]);

  // Statistiken
  const stats = useMemo(() => {
    const total = campaigns.length;
    const drafts = campaigns.filter(c => c.status === 'draft').length;
    const scheduled = campaigns.filter(c => c.status === 'scheduled').length;
    const sent = campaigns.filter(c => c.status === 'sent').length;
    const totalRecipients = campaigns.reduce((sum, c) => sum + (c.recipientCount || 0), 0);

    return { total, drafts, scheduled, sent, totalRecipients };
  }, [campaigns]);

  // Bulk-Aktionen
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedCampaignIds(new Set(filteredCampaigns.map(c => c.id!)));
    } else {
      setSelectedCampaignIds(new Set());
    }
  };

  const handleSelectCampaign = (id: string, checked: boolean) => {
    const newSelection = new Set(selectedCampaignIds);
    if (checked) {
      newSelection.add(id);
    } else {
      newSelection.delete(id);
    }
    setSelectedCampaignIds(newSelection);
  };

  const handleBulkDelete = async () => {
    const count = selectedCampaignIds.size;
    if (count === 0) return;
    
    if (confirm(`Möchten Sie wirklich ${count} ausgewählte Kampagnen löschen?`)) {
      try {
        await prService.deleteMany(Array.from(selectedCampaignIds));
        setSelectedCampaignIds(new Set());
        await loadCampaigns();
      } catch (error) {
        console.error("Fehler beim Löschen der Kampagnen:", error);
        alert("Fehler beim Löschen der Kampagnen");
      }
    }
  };

  const handleDeleteCampaign = async (id: string, title: string) => {
    if (window.confirm(`Möchten Sie die Kampagne "${title}" wirklich löschen?`)) {
      try {
        await prService.delete(id);
        await loadCampaigns();
      } catch (error) {
        console.error("Fehler beim Löschen der Kampagne:", error);
        alert("Fehler beim Löschen der Kampagne");
      }
    }
  };

  const StatusBadge = ({ status }: { status: PRCampaignStatus }) => {
    const config = statusConfig[status];
    const Icon = config.icon;
    
    return (
      <Badge color={config.color} className="inline-flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-zinc-500">Lade Kampagnen...</div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <Heading>PR-Kampagnen</Heading>
          <Text className="mt-1">
            Verwalte deine Pressemitteilungen und Kampagnen
          </Text>
        </div>
        <Link href="/dashboard/pr/campaigns/new">
          <Button>
            <PlusIcon className="size-4 mr-2" />
            Neue Kampagne
          </Button>
        </Link>
      </div>

      {/* Statistiken */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg border">
          <div className="flex items-center">
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Gesamt</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.total}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg border">
          <div className="flex items-center">
            <PencilIcon className="h-8 w-8 text-zinc-500" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Entwürfe</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.drafts}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border">
          <div className="flex items-center">
            <CalendarIcon className="h-8 w-8 text-blue-500" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Geplant</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.scheduled}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border">
          <div className="flex items-center">
            <EnvelopeIcon className="h-8 w-8 text-green-500" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Versendet</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.sent}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border">
          <div className="flex items-center">
            <UsersIcon className="h-8 w-8 text-purple-500" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Empfänger</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.totalRecipients.toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filter und Suche */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-zinc-400 pointer-events-none" />
          <input
            type="search"
            placeholder="Kampagnen durchsuchen..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-md border border-zinc-300 py-2 pl-10 pr-4 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setSelectedStatus("all")}
            className={clsx(
              "px-3 py-2 text-sm font-medium rounded-md",
              selectedStatus === "all"
                ? "bg-blue-100 text-blue-700"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            )}
          >
            Alle ({campaigns.length})
          </button>
          {Object.entries(statusConfig).map(([status, config]) => {
            const count = campaigns.filter(c => c.status === status).length;
            return (
              <button
                key={status}
                onClick={() => setSelectedStatus(status as PRCampaignStatus)}
                className={clsx(
                  "px-3 py-2 text-sm font-medium rounded-md",
                  selectedStatus === status
                    ? "bg-blue-100 text-blue-700"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                )}
              >
                {config.label} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Bulk-Aktionen */}
      <div className="mb-4 flex items-center justify-between h-9">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          {filteredCampaigns.length} von {campaigns.length} Kampagnen
        </p>
        <div className={clsx(
          "flex items-center gap-4 transition-opacity", 
          selectedCampaignIds.size > 0 ? "opacity-100" : "opacity-0 pointer-events-none"
        )}>
          <span className="text-sm text-zinc-600">
            {selectedCampaignIds.size} ausgewählt
          </span>
          <button 
            onClick={handleBulkDelete}
            className="inline-flex items-center gap-2 rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-500"
          >
            <TrashIcon className="size-4" /> 
            Löschen
          </button>
        </div>
      </div>

      {/* Kampagnen-Tabelle */}
      {filteredCampaigns.length === 0 && !loading ? (
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
            <Link href="/dashboard/pr/campaigns/new">
              <Button>
                <PlusIcon className="size-4 mr-2" />
                Erste Kampagne erstellen
              </Button>
            </Link>
          )}
        </div>
      ) : (
        <Table>
          <TableHead>
            <TableRow>
              <TableHeader className="w-12">
                <Checkbox 
                  checked={filteredCampaigns.length > 0 && selectedCampaignIds.size === filteredCampaigns.length}
                  indeterminate={selectedCampaignIds.size > 0 && selectedCampaignIds.size < filteredCampaigns.length}
                  onChange={handleSelectAll}
                />
              </TableHeader>
              <TableHeader>Kampagne</TableHeader>
              <TableHeader>Status</TableHeader>
              <TableHeader>Verteiler</TableHeader>
              <TableHeader>Empfänger</TableHeader>
              <TableHeader>Erstellt</TableHeader>
              <TableHeader className="text-right">Aktionen</TableHeader>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredCampaigns.map((campaign) => (
              <TableRow key={campaign.id}>
                <TableCell>
                  <Checkbox 
                    checked={selectedCampaignIds.has(campaign.id!)}
                    onChange={(checked) => handleSelectCampaign(campaign.id!, checked)}
                  />
                </TableCell>
                
                <TableCell>
                  <div className="font-medium text-gray-900">
                    {campaign.title}
                  </div>
                  {campaign.scheduledAt && (
                    <div className="text-sm text-gray-500">
                      Geplant für: {formatDate(campaign.scheduledAt)}
                    </div>
                  )}
                </TableCell>
                
                <TableCell>
                  <StatusBadge status={campaign.status} />
                </TableCell>
                
                <TableCell>
                  <div className="text-sm">
                    {campaign.distributionListName}
                  </div>
                </TableCell>
                
                <TableCell>
                  <div className="font-medium">
                    {(campaign.recipientCount || 0).toLocaleString()}
                  </div>
                </TableCell>
                
                <TableCell>
                  <span className="text-sm text-gray-500">
                    {formatDate(campaign.createdAt)}
                  </span>
                </TableCell>
                
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    {campaign.status === 'draft' && (
                      <>
                        <Button
                          plain
                          onClick={() => setShowSendModal(campaign)}
                          className="text-green-600 hover:text-green-500"
                        >
                          <PaperAirplaneIcon className="size-4 mr-1" />
                          Senden
                        </Button>
                        <Link href={`/dashboard/pr/campaigns/edit/${campaign.id}`}>
                          <Button plain className="text-indigo-600 hover:text-indigo-500">
                            Bearbeiten
                          </Button>
                        </Link>
                      </>
                    )}
                    <Button
                      plain
                      onClick={() => handleDeleteCampaign(campaign.id!, campaign.title)}
                      className="text-red-600 hover:text-red-500"
                    >
                      Löschen
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {/* Quick Actions Footer */}
      {campaigns.length > 0 && (
        <div className="mt-8 border-t pt-6">
          <h3 className="text-lg font-medium mb-4">Schnellaktionen</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link 
              href="/dashboard/pr/campaigns/new"
              className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer block"
            >
              <PlusIcon className="h-8 w-8 text-blue-600 mb-2" />
              <h4 className="font-medium">Neue Kampagne</h4>
              <p className="text-sm text-gray-600">Erstelle eine neue PR-Kampagne</p>
            </Link>
            
            <div className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer" onClick={() => {
              alert("Template-System kommt bald!");
            }}>
              <svg className="h-8 w-8 text-green-600 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h4 className="font-medium">Templates</h4>
              <p className="text-sm text-gray-600">Vorlagen für Pressemitteilungen</p>
            </div>

            <div className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer" onClick={() => {
              alert("Analytics kommen bald!");
            }}>
              <svg className="h-8 w-8 text-purple-600 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h2a2 2 0 012 2v4a2 2 0 01-2 2h2a2 2 0 012 2v6" />
              </svg>
              <h4 className="font-medium">Analytics</h4>
              <p className="text-sm text-gray-600">Kampagnen-Performance auswerten</p>
            </div>
          </div>
        </div>
      )}

      {/* E-Mail Versand Modal */}
      {showSendModal && (
        <EmailSendModal
          campaign={showSendModal}
          onClose={() => setShowSendModal(null)}
          onSent={() => {
            setShowSendModal(null);
            loadCampaigns(); // Kampagnen neu laden
          }}
        />
      )}
    </div>
  );
}