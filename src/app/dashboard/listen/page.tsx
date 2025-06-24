// src/app/dashboard/listen/page.tsx
"use client";

import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import { Heading } from "@/components/heading";
import { Text } from "@/components/text";
import { Button } from "@/components/button";
import { Input } from "@/components/input";
import { Badge } from "@/components/badge";
import { Table, TableHead, TableBody, TableRow, TableHeader, TableCell } from "@/components/table";
import { PlusIcon, MagnifyingGlassIcon, FunnelIcon, UsersIcon } from "@heroicons/react/20/solid";
import { listsService } from "@/lib/firebase/lists-service";
import { DistributionList, ListMetrics } from "@/types/lists";
import ListModal from "./ListModal";
import clsx from "clsx";

export default function ListsPage() {
  const { user } = useAuth();
  const [lists, setLists] = useState<DistributionList[]>([]);
  const [metrics, setMetrics] = useState<Map<string, ListMetrics>>(new Map());
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingList, setEditingList] = useState<DistributionList | null>(null);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const listsData = await listsService.getAll(user.uid);
      setLists(listsData);

      // Metriken für alle Listen laden
      const metricsMap = new Map<string, ListMetrics>();
      for (const list of listsData) {
        if (list.id) {
          const listMetrics = await listsService.getListMetrics(list.id);
          if (listMetrics) {
            metricsMap.set(list.id, listMetrics);
          }
        }
      }
      setMetrics(metricsMap);
    } catch (error) {
      console.error("Fehler beim Laden der Listen:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateList = async (listData: Omit<DistributionList, 'id' | 'contactCount' | 'createdAt' | 'updatedAt'>) => {
    try {
      await listsService.create(listData);
      await loadData();
      setShowCreateModal(false);
    } catch (error) {
      console.error("Fehler beim Erstellen der Liste:", error);
      alert("Fehler beim Erstellen der Liste");
    }
  };

  const handleEditList = async (listData: Omit<DistributionList, 'id' | 'contactCount' | 'createdAt' | 'updatedAt'>) => {
    if (!editingList?.id) return;
    try {
      await listsService.update(editingList.id, listData);
      await loadData();
      setEditingList(null);
    } catch (error) {
      console.error("Fehler beim Bearbeiten der Liste:", error);
      alert("Fehler beim Bearbeiten der Liste");
    }
  };

  const handleDeleteList = async (listId: string) => {
    if (window.confirm("Möchten Sie diese Liste wirklich löschen?")) {
      try {
        await listsService.delete(listId);
        await loadData();
      } catch (error) {
        console.error("Fehler beim Löschen der Liste:", error);
        alert("Fehler beim Löschen der Liste");
      }
    }
  };

  const handleRefreshList = async (listId: string) => {
    try {
      await listsService.refreshDynamicList(listId);
      await loadData();
    } catch (error) {
      console.error("Fehler beim Aktualisieren der Liste:", error);
    }
  };

  const categories = useMemo(() => {
    const cats = new Set(lists.map(list => list.category || 'custom'));
    return Array.from(cats);
  }, [lists]);

  const filteredLists = useMemo(() => {
    return lists.filter(list => {
      const searchMatch = list.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         list.description?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const categoryMatch = selectedCategory === "all" || 
                           (list.category || 'custom') === selectedCategory;
      
      return searchMatch && categoryMatch;
    });
  }, [lists, searchTerm, selectedCategory]);

  const getCategoryLabel = (category: string) => {
    const labels = {
      press: 'Presse',
      customers: 'Kunden',
      partners: 'Partner',
      leads: 'Leads',
      custom: 'Benutzerdefiniert',
      all: 'Alle'
    };
    return labels[category as keyof typeof labels] || category;
  };

  const getCategoryColor = (category?: string) => {
    const colors = {
      press: 'blue',
      customers: 'green',
      partners: 'purple',
      leads: 'orange',
      custom: 'zinc'
    };
    return colors[category as keyof typeof colors] || 'zinc';
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp || !timestamp.toDate) return 'Unbekannt';
    return timestamp.toDate().toLocaleDateString('de-DE', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-zinc-500">Lade Listen...</div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <Heading>Verteilerlisten</Heading>
          <Text className="mt-1">
            Verwalte deine Marketing-Verteiler für alle Kanäle
          </Text>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <PlusIcon className="size-4 mr-2" />
          Liste erstellen
        </Button>
      </div>

      {/* Statistiken */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg border">
          <div className="flex items-center">
            <UsersIcon className="h-8 w-8 text-blue-500" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Gesamt Listen</p>
              <p className="text-2xl font-semibold text-gray-900">{lists.length}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg border">
          <div className="flex items-center">
            <FunnelIcon className="h-8 w-8 text-green-500" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Dynamische Listen</p>
              <p className="text-2xl font-semibold text-gray-900">
                {lists.filter(l => l.type === 'dynamic').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border">
          <div className="flex items-center">
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Gesamt Kontakte</p>
              <p className="text-2xl font-semibold text-gray-900">
                {lists.reduce((sum, list) => sum + list.contactCount, 0)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border">
          <div className="flex items-center">
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Aktive Listen</p>
              <p className="text-2xl font-semibold text-gray-900">
                {lists.filter(l => l.lastUpdated && 
                  l.lastUpdated.toDate() > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
                ).length}
              </p>
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
            placeholder="Listen durchsuchen..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-md border border-zinc-300 py-2 pl-10 pr-4 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setSelectedCategory("all")}
            className={clsx(
              "px-3 py-2 text-sm font-medium rounded-md",
              selectedCategory === "all"
                ? "bg-blue-100 text-blue-700"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            )}
          >
            Alle ({lists.length})
          </button>
          {categories.map(category => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={clsx(
                "px-3 py-2 text-sm font-medium rounded-md",
                selectedCategory === category
                  ? "bg-blue-100 text-blue-700"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              )}
            >
              {getCategoryLabel(category)} ({lists.filter(l => (l.category || 'custom') === category).length})
            </button>
          ))}
        </div>
      </div>

      {/* Listen-Tabelle */}
      {filteredLists.length === 0 ? (
        <div className="text-center py-12">
          <UsersIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Keine Listen gefunden</h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchTerm || selectedCategory !== "all" 
              ? "Versuchen Sie andere Suchkriterien" 
              : "Erstellen Sie Ihre erste Verteilerliste"}
          </p>
          {!searchTerm && selectedCategory === "all" && (
            <div className="mt-6">
              <Button onClick={() => setShowCreateModal(true)}>
                <PlusIcon className="size-4 mr-2" />
                Erste Liste erstellen
              </Button>
            </div>
          )}
        </div>
      ) : (
        <Table>
          <TableHead>
            <TableRow>
              <TableHeader>Name & Kategorie</TableHeader>
              <TableHeader>Typ</TableHeader>
              <TableHeader>Kontakte</TableHeader>
              <TableHeader>Letzte Verwendung</TableHeader>
              <TableHeader>Aktualisiert</TableHeader>
              <TableHeader className="text-right">Aktionen</TableHeader>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredLists.map((list) => {
              const listMetrics = metrics.get(list.id!);
              return (
                <TableRow key={list.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className={clsx(
                        "h-3 w-3 rounded-full",
                        list.color === 'blue' && 'bg-blue-500',
                        list.color === 'green' && 'bg-green-500',
                        list.color === 'purple' && 'bg-purple-500',
                        list.color === 'orange' && 'bg-orange-500',
                        list.color === 'red' && 'bg-red-500',
                        list.color === 'pink' && 'bg-pink-500',
                        list.color === 'yellow' && 'bg-yellow-500',
                        (!list.color || list.color === 'zinc') && 'bg-zinc-500'
                      )} />
                      <div>
                        <div className="font-medium text-gray-900">
                          <button
                            onClick={() => {/* Navigate to detail page */}}
                            className="hover:text-blue-600 hover:underline"
                          >
                            {list.name}
                          </button>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge color={getCategoryColor(list.category) as any} className="text-xs">
                            {getCategoryLabel(list.category || 'custom')}
                          </Badge>
                          {list.description && (
                            <span className="text-sm text-gray-500 truncate max-w-xs">
                              {list.description}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    <Badge color={list.type === 'dynamic' ? 'green' : 'zinc'} className="text-xs">
                      {list.type === 'dynamic' ? 'Dynamisch' : 'Statisch'}
                    </Badge>
                  </TableCell>
                  
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{list.contactCount.toLocaleString()}</span>
                      {list.type === 'dynamic' && (
                        <button
                          onClick={() => handleRefreshList(list.id!)}
                          className="text-blue-600 hover:text-blue-800 text-xs"
                          title="Liste aktualisieren"
                        >
                          ↻
                        </button>
                      )}
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    {listMetrics ? (
                      <div className="text-sm">
                        <div>{listMetrics.last30DaysCampaigns} Kampagnen</div>
                        <div className="text-gray-500">in 30 Tagen</div>
                      </div>
                    ) : (
                      <span className="text-gray-400">Noch nicht verwendet</span>
                    )}
                  </TableCell>
                  
                  <TableCell>
                    <span className="text-sm text-gray-500">
                      {formatDate(list.lastUpdated || list.updatedAt)}
                    </span>
                  </TableCell>
                  
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        plain
                        onClick={() => window.open(`/dashboard/listen/${list.id}`, '_blank')}
                        className="text-xs"
                      >
                        Anzeigen
                      </Button>
                      <Button
                        plain
                        onClick={() => setEditingList(list)}
                        className="text-xs"
                      >
                        Bearbeiten
                      </Button>
                      <Button
                        plain
                        onClick={() => handleDeleteList(list.id!)}
                        className="text-xs text-red-600 hover:text-red-500"
                      >
                        Löschen
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}

      {/* Schnellzugriff-Karten für häufige Aktionen */}
      {lists.length > 0 && (
        <div className="mt-8 border-t pt-6">
          <h3 className="text-lg font-medium mb-4">Schnellaktionen</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer" onClick={() => setShowCreateModal(true)}>
              <PlusIcon className="h-8 w-8 text-blue-600 mb-2" />
              <h4 className="font-medium">Neue Liste erstellen</h4>
              <p className="text-sm text-gray-600">Erstelle eine neue Verteilerliste</p>
            </div>
            
            <div className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer" onClick={async () => {
              try {
                await listsService.refreshAllDynamicLists(user!.uid);
                await loadData();
              } catch (error) {
                console.error("Fehler beim Aktualisieren:", error);
              }
            }}>
              <svg className="h-8 w-8 text-green-600 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <h4 className="font-medium">Alle Listen aktualisieren</h4>
              <p className="text-sm text-gray-600">Dynamische Listen neu berechnen</p>
            </div>

            <div className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer" onClick={() => {
              // Hier könnte später ein Export-Dialog geöffnet werden
              alert("Export-Funktion kommt bald!");
            }}>
              <svg className="h-8 w-8 text-purple-600 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
              </svg>
              <h4 className="font-medium">Listen exportieren</h4>
              <p className="text-sm text-gray-600">Kontakte als CSV exportieren</p>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      {showCreateModal && (
        <ListModal
          onClose={() => setShowCreateModal(false)}
          onSave={handleCreateList}
          userId={user?.uid || ''}
        />
      )}

      {editingList && (
        <ListModal
          list={editingList}
          onClose={() => setEditingList(null)}
          onSave={handleEditList}
          userId={user?.uid || ''}
        />
      )}
    </div>
  );
}