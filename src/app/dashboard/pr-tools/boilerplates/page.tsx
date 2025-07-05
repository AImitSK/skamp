// src/app/dashboard/pr-tools/boilerplates/page.tsx
"use client";

import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import { boilerplatesService } from "@/lib/firebase/boilerplate-service";
import { companiesService } from "@/lib/firebase/crm-service";
import { Boilerplate } from "@/types/crm";
import { Company } from "@/types/crm";
import { Heading } from "@/components/heading";
import { Text } from "@/components/text";
import { Button } from "@/components/button";
import { Badge } from "@/components/badge";
import { Input } from "@/components/input";
import { Select } from "@/components/select";
import { Table, TableHead, TableBody, TableRow, TableHeader, TableCell } from "@/components/table";
import { Dropdown, DropdownButton, DropdownMenu, DropdownItem, DropdownDivider } from "@/components/dropdown";
import { 
  PlusIcon,
  MagnifyingGlassIcon,
  StarIcon,
  GlobeAltIcon,
  BuildingOfficeIcon,
  DocumentDuplicateIcon,
  ArchiveBoxIcon,
  TrashIcon,
  ChartBarIcon,
  EllipsisVerticalIcon,
  PencilIcon
} from "@heroicons/react/20/solid";
import { StarIcon as StarIconOutline } from "@heroicons/react/24/outline";
import BoilerplateModal from "./BoilerplateModal";

// Kategorie-Labels
const CATEGORY_LABELS: Record<string, string> = {
  company: 'Unternehmensbeschreibung',
  contact: 'Kontaktinformationen',
  legal: 'Rechtliche Hinweise',
  product: 'Produktbeschreibung',
  custom: 'Sonstige'
};

// Positions-Labels
const POSITION_LABELS: Record<string, string> = {
  top: 'Am Anfang',
  bottom: 'Am Ende',
  signature: 'Als Signatur',
  custom: 'Manuell'
};

export default function BoilerplatesPage() {
  const { user } = useAuth();
  const [boilerplates, setBoilerplates] = useState<Boilerplate[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingBoilerplate, setEditingBoilerplate] = useState<Boilerplate | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterClient, setFilterClient] = useState<string>('all');
  const [showStats, setShowStats] = useState(false);
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [boilerplatesData, companiesData, statsData] = await Promise.all([
        boilerplatesService.getAll(user.uid),
        companiesService.getAll(user.uid),
        boilerplatesService.getStats(user.uid)
      ]);
      setBoilerplates(boilerplatesData);
      setCompanies(companiesData);
      setStats(statsData);
    } catch (error) {
      console.error("Fehler beim Laden:", error);
    } finally {
      setLoading(false);
    }
  };

  // Gefilterte Boilerplates
  const filteredBoilerplates = useMemo(() => {
    let filtered = boilerplates;

    // Textsuche
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(bp =>
        bp.name.toLowerCase().includes(term) ||
        bp.content.toLowerCase().includes(term) ||
        bp.description?.toLowerCase().includes(term) ||
        bp.tags?.some(tag => tag.toLowerCase().includes(term))
      );
    }

    // Kategorie-Filter
    if (filterCategory !== 'all') {
      filtered = filtered.filter(bp => bp.category === filterCategory);
    }

    // Kunden-Filter
    if (filterClient === 'global') {
      filtered = filtered.filter(bp => bp.isGlobal);
    } else if (filterClient !== 'all') {
      filtered = filtered.filter(bp => bp.clientId === filterClient);
    }

    return filtered;
  }, [boilerplates, searchTerm, filterCategory, filterClient]);

  const handleEdit = (boilerplate: Boilerplate) => {
    setEditingBoilerplate(boilerplate);
    setShowModal(true);
  };

  const handleAddNew = () => {
    setEditingBoilerplate(null);
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Möchten Sie diesen Textbaustein wirklich löschen?")) {
      await boilerplatesService.delete(id);
      await loadData();
    }
  };

  const handleArchive = async (id: string) => {
    await boilerplatesService.archive(id);
    await loadData();
  };

  const handleToggleFavorite = async (id: string) => {
    await boilerplatesService.toggleFavorite(id);
    await loadData();
  };

  const handleDuplicate = async (boilerplate: Boilerplate) => {
    const newName = prompt("Name für die Kopie:", `${boilerplate.name} (Kopie)`);
    if (newName) {
      await boilerplatesService.duplicate(boilerplate.id!, newName);
      await loadData();
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingBoilerplate(null);
  };

  return (
    <div>
      {/* Header */}
      <div className="md:flex md:items-center md:justify-between">
        <div className="min-w-0 flex-1">
          <Heading>Textbausteine</Heading>
        </div>
        <div className="mt-4 flex md:mt-0 md:ml-4 gap-3">
          <Button plain onClick={() => setShowStats(!showStats)}>
            <ChartBarIcon />
            Statistiken
          </Button>
          <Button onClick={handleAddNew} className="bg-[#005fab] hover:bg-[#004a8c] text-white whitespace-nowrap">
            <PlusIcon />
            Neuer Baustein
          </Button>
        </div>
      </div>

      {/* Statistiken */}
      {showStats && stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 mt-8">
          <div className="bg-white rounded-lg border p-4">
            <div className="text-2xl font-bold">{stats.total}</div>
            <div className="text-sm text-gray-500">Gesamt</div>
          </div>
          <div className="bg-white rounded-lg border p-4">
            <div className="text-2xl font-bold">{stats.global}</div>
            <div className="text-sm text-gray-500">Global</div>
          </div>
          <div className="bg-white rounded-lg border p-4">
            <div className="text-2xl font-bold">{stats.clientSpecific}</div>
            <div className="text-sm text-gray-500">Kundenspezifisch</div>
          </div>
          <div className="bg-white rounded-lg border p-4">
            <div className="text-2xl font-bold">{stats.favorites}</div>
            <div className="text-sm text-gray-500">Favoriten</div>
          </div>
        </div>
      )}

      {/* Search and Filters */}
      <div className="mt-6">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 size-5 text-gray-400 z-10" />
            <Input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Textbausteine durchsuchen..."
              className="pl-10"
            />
          </div>
          
          <div className="w-full sm:w-auto">
            <Select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
              <option value="all">Alle Kategorien</option>
              {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </Select>
          </div>

          <div className="w-full sm:w-auto">
            <Select value={filterClient} onChange={(e) => setFilterClient(e.target.value)}>
              <option value="all">Alle Kunden</option>
              <option value="global">Nur globale</option>
              {companies.map(company => (
                <option key={company.id} value={company.id}>{company.name}</option>
              ))}
            </Select>
          </div>
        </div>
      </div>

      {/* Results Info */}
      <div className="mt-4">
        <Text>
          {filteredBoilerplates.length} von {boilerplates.length} Textbausteinen
        </Text>
      </div>

      {/* Table */}
      <div className="mt-8">
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#005fab] mx-auto"></div>
            <p className="mt-4">Lade Textbausteine...</p>
          </div>
        ) : filteredBoilerplates.length === 0 ? (
          <div className="text-center py-12 border rounded-lg bg-white">
            <DocumentDuplicateIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <Heading level={3}>Keine Textbausteine gefunden</Heading>
            <Text className="mt-2">
              {searchTerm || filterCategory !== 'all' || filterClient !== 'all' 
                ? 'Versuchen Sie andere Suchkriterien' 
                : 'Noch keine Textbausteine vorhanden'}
            </Text>
          </div>
        ) : (
          <Table>
            <TableHead>
              <TableRow>
                <TableHeader className="w-8"></TableHeader>
                <TableHeader>Name</TableHeader>
                <TableHeader>Kategorie</TableHeader>
                <TableHeader>Kunde</TableHeader>
                <TableHeader>Tags</TableHeader>
                <TableHeader>Position</TableHeader>
                <TableHeader>
                  <span className="sr-only">Aktionen</span>
                </TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredBoilerplates.map((bp) => (
                <TableRow key={bp.id} className="hover:bg-gray-50">
                  <TableCell>
                    <button
                      onClick={() => handleToggleFavorite(bp.id!)}
                      className="text-gray-400 hover:text-yellow-500"
                    >
                      {bp.isFavorite ? (
                        <StarIcon className="h-5 w-5 text-yellow-500" />
                      ) : (
                        <StarIconOutline className="h-5 w-5" />
                      )}
                    </button>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{bp.name}</div>
                      {bp.description && (
                        <div className="text-sm text-gray-500 mt-1">{bp.description}</div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge color="zinc">
                      {CATEGORY_LABELS[bp.category] || bp.category}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {bp.isGlobal ? (
                      <Text>—</Text>
                    ) : (
                      <Text>{bp.clientName || 'Kunde'}</Text>
                    )}
                  </TableCell>
                  <TableCell>
                    {bp.tags && bp.tags.length > 0 ? (
                      <div className="flex gap-1 flex-wrap">
                        {bp.tags.slice(0, 3).map((tag, i) => (
                          <Badge key={i} color="zinc" className="text-xs">{tag}</Badge>
                        ))}
                        {bp.tags.length > 3 && (
                          <Text className="text-xs text-gray-400">+{bp.tags.length - 3}</Text>
                        )}
                      </div>
                    ) : (
                      <Text>—</Text>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge color="zinc" className="text-xs">
                      {POSITION_LABELS[bp.defaultPosition || 'custom']}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Dropdown>
                      <DropdownButton plain className="p-2 hover:bg-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#005fab]">
                        <EllipsisVerticalIcon className="h-5 w-5 text-gray-700" />
                      </DropdownButton>
                      <DropdownMenu anchor="bottom end" className="bg-white shadow-lg rounded-lg">
                        <DropdownItem onClick={() => handleEdit(bp)} className="hover:bg-gray-50">
                          <PencilIcon className="text-gray-500" />
                          Bearbeiten
                        </DropdownItem>
                        <DropdownItem onClick={() => handleDuplicate(bp)} className="hover:bg-gray-50">
                          <DocumentDuplicateIcon className="text-gray-500" />
                          Duplizieren
                        </DropdownItem>
                        <DropdownItem onClick={() => handleToggleFavorite(bp.id!)} className="hover:bg-gray-50">
                          {bp.isFavorite ? (
                            <>
                              <StarIconOutline className="text-gray-500" />
                              Favorit entfernen
                            </>
                          ) : (
                            <>
                              <StarIcon className="text-gray-500" />
                              Als Favorit
                            </>
                          )}
                        </DropdownItem>
                        <DropdownDivider />
                        <DropdownItem onClick={() => handleArchive(bp.id!)} className="hover:bg-gray-50">
                          <ArchiveBoxIcon className="text-gray-500" />
                          Archivieren
                        </DropdownItem>
                        <DropdownItem onClick={() => handleDelete(bp.id!)} className="hover:bg-red-50">
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

      {/* Modal */}
      {showModal && (
        <BoilerplateModal
          boilerplate={editingBoilerplate}
          onClose={handleCloseModal}
          onSave={() => {
            handleCloseModal();
            loadData();
          }}
          userId={user!.uid}
        />
      )}
    </div>
  );
}