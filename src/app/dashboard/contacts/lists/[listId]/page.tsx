// src\app\dashboard\contacts\lists\[listId]\page.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import clsx from 'clsx';
import { useAuth } from "@/context/AuthContext";
import { listsService } from "@/lib/firebase/lists-service";
import { tagsService } from "@/lib/firebase/crm-service";
import { DistributionList } from "@/types/lists";
import { Contact, companyTypeLabels, Tag } from "@/types/crm";
import { Heading } from "@/components/heading";
import { Text } from "@/components/text";
import { Button } from "@/components/button";
import { Badge } from "@/components/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/table";
import ListModal from "../ListModal";
import { 
  ArrowLeftIcon,
  CalendarIcon, 
  ClockIcon, 
  HashtagIcon, 
  ListBulletIcon,
  UsersIcon,
  EnvelopeIcon,
  PhoneIcon,
  BuildingOfficeIcon,
  TagIcon,
  GlobeAltIcon,
  DocumentTextIcon,
  FunnelIcon,
  PencilIcon,
  ArrowPathIcon
} from "@heroicons/react/24/outline";
import { 
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon
} from "@heroicons/react/20/solid";

// Toast Types
interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
}

// Toast Component
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

// Hilfsfunktion zum Formatieren des Datums
function formatDate(timestamp: any) {
  if (!timestamp || !timestamp.toDate) return 'N/A';
  return timestamp.toDate().toLocaleString('de-DE', {
    day: '2-digit', 
    month: '2-digit', 
    year: 'numeric',
    hour: '2-digit', 
    minute: '2-digit'
  });
}

function formatShortDate(timestamp: any) {
  if (!timestamp || !timestamp.toDate) return 'N/A';
  return timestamp.toDate().toLocaleDateString('de-DE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
}

export default function ListDetailPage() {
  const { user } = useAuth();
  const params = useParams();
  const router = useRouter();
  const listId = params.listId as string;

  const [list, setList] = useState<DistributionList | null>(null);
  const [contactsInList, setContactsInList] = useState<Contact[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);

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

  const loadData = useCallback(async () => {
    if (!user || !listId) return;
    setLoading(true);
    setError(null);
    try {
      // Lade Liste und Tags parallel
      const [listData, userTags] = await Promise.all([
        listsService.getById(listId),
        tagsService.getAll(user.uid)
      ]);
      
      if (listData) {
        setList(listData);
        setTags(userTags);
        const contactsData = await listsService.getContacts(listData);
        setContactsInList(contactsData);
      } else {
        setError("Liste nicht gefunden.");
      }
    } catch (err: any) {
      console.error(err);
      setError("Fehler beim Laden der Listendetails.");
      if (err.code === 'failed-precondition') {
        setError("Fehler: Ein Datenbank-Index ist erforderlich. Bitte erstelle den Index gemäß der Anweisung in der Browser-Konsole und lade die Seite neu.");
      }
    } finally {
      setLoading(false);
    }
  }, [user, listId]);
  
  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefreshList = async () => {
    if (!list || list.type !== 'dynamic') return;
    
    setRefreshing(true);
    try {
      await listsService.refreshDynamicList(list.id!);
      showToast('success', 'Liste aktualisiert', 'Die dynamische Liste wurde erfolgreich aktualisiert.');
      await loadData();
    } catch (error) {
      console.error("Fehler beim Aktualisieren der Liste:", error);
      showToast('error', 'Fehler', 'Die Liste konnte nicht aktualisiert werden.');
    } finally {
      setRefreshing(false);
    }
  };

  const handleSave = async (listData: Omit<DistributionList, 'id' | 'contactCount' | 'createdAt' | 'updatedAt'>) => {
    if(!list?.id) return;
    try {
      await listsService.update(list.id, listData);
      showToast('success', 'Liste aktualisiert', 'Die Liste wurde erfolgreich aktualisiert.');
      setShowEditModal(false);
      await loadData();
    } catch (error) {
      console.error("Fehler beim Aktualisieren der Liste:", error);
      showToast('error', 'Fehler', 'Die Liste konnte nicht aktualisiert werden.');
    }
  };

  const getCategoryLabel = (category?: string) => {
    const labels: { [key: string]: string } = {
      press: 'Presse',
      customers: 'Kunden',
      partners: 'Partner',
      leads: 'Leads',
      custom: 'Benutzerdefiniert'
    };
    return labels[category || 'custom'] || category || 'Benutzerdefiniert';
  };

  const renderFilterValue = (key: string, value: any): string => {
    // Spezielle Behandlung für Tag-IDs
    if (key === 'tagIds' && Array.isArray(value)) {
      const tagNames = value.map(tagId => {
        const tag = tags.find(t => t.id === tagId);
        return tag ? tag.name : tagId;
      });
      if (tagNames.length === 0) return '—';
      if (tagNames.length <= 3) return tagNames.join(', ');
      return `${tagNames.slice(0, 3).join(', ')} (+${tagNames.length - 3} weitere)`;
    }
    
    // Spezielle Behandlung für Firmentypen
    if (key === 'companyTypes' && Array.isArray(value)) {
      const extendedTypeLabels: { [key: string]: string } = {
        ...companyTypeLabels,
        'publisher': 'Verlag',
        'media_house': 'Medienhaus',
        'agency': 'Agentur'
      };
      const typeLabels = value.map(type => extendedTypeLabels[type] || type);
      if (typeLabels.length === 0) return '—';
      if (typeLabels.length <= 3) return typeLabels.join(', ');
      return `${typeLabels.slice(0, 3).join(', ')} (+${typeLabels.length - 3} weitere)`;
    }
    
    // Spezielle Behandlung für Publikationsformat
    if (key === 'publicationFormat' && value) {
      const formatLabels: { [key: string]: string } = {
        'print': 'Print',
        'online': 'Online',
        'both': 'Print & Online'
      };
      return formatLabels[value] || value;
    }
    
    // Spezielle Behandlung für Mindestauflage
    if (key === 'minCirculation' && typeof value === 'number') {
      return value.toLocaleString('de-DE');
    }
    
    // Standard-Behandlung für Arrays
    if (Array.isArray(value)) {
      if (value.length === 0) return '—';
      if (value.length <= 3) return value.join(', ');
      return `${value.slice(0, 3).join(', ')} (+${value.length - 3} weitere)`;
    }
    
    if (typeof value === 'boolean') return value ? 'Ja' : 'Nein';
    if (value instanceof Date) return formatShortDate({ toDate: () => value });
    return String(value || '—');
  };

  const getFilterIcon = (key: string) => {
    const iconMap: { [key: string]: any } = {
      companyTypes: BuildingOfficeIcon,
      industries: BuildingOfficeIcon,
      countries: GlobeAltIcon,
      tagIds: TagIcon,
      positions: UsersIcon,
      hasEmail: EnvelopeIcon,
      hasPhone: PhoneIcon,
      publicationFormat: DocumentTextIcon,
      publicationFocusAreas: DocumentTextIcon,
      minCirculation: DocumentTextIcon,
      publicationNames: DocumentTextIcon
    };
    return iconMap[key] || FunnelIcon;
  };

  const getFilterLabel = (key: string) => {
    const labelMap: { [key: string]: string } = {
      companyTypes: 'Firmentypen',
      industries: 'Branchen',
      countries: 'Länder',
      tagIds: 'Tags',
      positions: 'Positionen',
      hasEmail: 'Mit E-Mail',
      hasPhone: 'Mit Telefon',
      publicationFormat: 'Publikationsformat',
      publicationFocusAreas: 'Themenschwerpunkte',
      minCirculation: 'Mindestauflage',
      publicationNames: 'Publikationen',
      beats: 'Ressorts',
      mediaFocus: 'Medienschwerpunkte'
    };
    return labelMap[key] || key;
  };
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse">
          <div className="h-8 w-8 bg-[#005fab] rounded-full animate-bounce"></div>
          <p className="mt-4 text-zinc-500">Lade Listendetails...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex">
            <XCircleIcon className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Fehler</h3>
              <div className="mt-2 text-sm text-red-700">{error}</div>
              <div className="mt-4">
                <Button onClick={() => router.push('/dashboard/listen')} plain>
                  Zurück zur Übersicht
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  if (!list) {
    return (
      <div className="p-8 text-center">
        <div className="text-gray-500">Liste konnte nicht gefunden werden.</div>
        <div className="mt-4">
          <Button onClick={() => router.push('/dashboard/listen')} plain>
            Zurück zur Übersicht
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="p-6 md:p-8">
        {/* Header */}
        <div className="mb-6">
          <Button 
            plain 
            onClick={() => router.push('/dashboard/listen')}
            className="mb-4 flex items-center gap-2"
          >
            <ArrowLeftIcon className="h-4 w-4" />
            Zurück zur Übersicht
          </Button>
          
          <div className="flex items-center justify-between">
            <div>
              <Heading>{list.name}</Heading>
              <Text className="mt-1">{list.description || 'Keine Beschreibung'}</Text>
            </div>
            <div className="flex items-center gap-2">
              {list.type === 'dynamic' && (
                <Button 
                  plain 
                  onClick={handleRefreshList}
                  disabled={refreshing}
                  className="flex items-center gap-2"
                >
                  <ArrowPathIcon className={clsx("h-4 w-4", refreshing && "animate-spin")} />
                  Aktualisieren
                </Button>
              )}
              <button 
                onClick={() => setShowEditModal(true)}
                className="inline-flex items-center gap-x-2 rounded-lg bg-[#005fab] px-4 py-2 text-sm font-semibold text-white hover:bg-[#004a8c] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#005fab]"
              >
                <PencilIcon className="h-4 w-4" />
                Liste bearbeiten
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Kontakte Tabelle */}
          <div className="lg:col-span-2">
            <div className="rounded-lg border bg-white overflow-hidden">
              <div className="px-6 py-4 border-b bg-gray-50">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <UsersIcon className="h-5 w-5 text-gray-500" />
                  Enthaltene Kontakte
                  <Badge color="blue" className="ml-2">{list.contactCount || 0}</Badge>
                </h3>
              </div>
              
              <div className="overflow-x-auto">
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableHeader>Name</TableHeader>
                      <TableHeader>Position</TableHeader>
                      <TableHeader>Firma</TableHeader>
                      <TableHeader>Kontakt</TableHeader>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {contactsInList.length > 0 ? (
                      contactsInList.map(contact => (
                        <TableRow key={contact.id} className="hover:bg-gray-50">
                          <TableCell className="font-medium">
                            <Link 
                              href={`/dashboard/contacts/contacts/${contact.id}`} 
                              className="text-[#005fab] hover:text-[#004a8c] hover:underline"
                            >
                              {contact.firstName} {contact.lastName}
                            </Link>
                          </TableCell>
                          <TableCell>{contact.position || <span className="text-gray-400">—</span>}</TableCell>
                          <TableCell>
                            {contact.companyId && contact.companyName ? (
                              <Link 
                                href={`/dashboard/contacts/companies/${contact.companyId}`} 
                                className="text-[#005fab] hover:text-[#004a8c] hover:underline"
                              >
                                {contact.companyName}
                              </Link>
                            ) : (
                              <span className="text-gray-400">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {contact.email && (
                                <a 
                                  href={`mailto:${contact.email}`}
                                  className="text-[#005fab] hover:text-[#004a8c]"
                                  title={contact.email}
                                >
                                  <EnvelopeIcon className="h-4 w-4" />
                                </a>
                              )}
                              {contact.phone && (
                                <a 
                                  href={`tel:${contact.phone}`}
                                  className="text-[#005fab] hover:text-[#004a8c]"
                                  title={contact.phone}
                                >
                                  <PhoneIcon className="h-4 w-4" />
                                </a>
                              )}
                              {!contact.email && !contact.phone && (
                                <span className="text-gray-400">—</span>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-zinc-500 py-12">
                          <UsersIcon className="mx-auto h-12 w-12 text-gray-300 mb-3" />
                          <div>Diese Liste enthält keine Kontakte.</div>
                          {list.type === 'dynamic' && (
                            <div className="mt-2 text-sm">
                              Die Filterkriterien ergeben keine Treffer.
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>

          {/* Sidebar mit Details */}
          <div className="space-y-6">
            {/* Listen-Details */}
            <div className="rounded-lg border bg-white">
              <div className="px-4 py-3 border-b bg-gray-50">
                <h3 className="font-semibold text-lg">Listen-Details</h3>
              </div>
              <div className="p-4 space-y-3 text-sm">
                <div className="flex items-center gap-3">
                  <ListBulletIcon className="h-5 w-5 text-gray-400 flex-shrink-0" />
                  <div className="flex items-center gap-2">
                    <span className="text-gray-600">Typ:</span>
                    <Badge color={list.type === 'dynamic' ? 'green' : 'zinc'}>
                      {list.type === 'dynamic' ? 'Dynamische Liste' : 'Statische Liste'}
                    </Badge>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <HashtagIcon className="h-5 w-5 text-gray-400 flex-shrink-0" />
                  <div className="flex items-center gap-2">
                    <span className="text-gray-600">Kategorie:</span>
                    <Badge color="purple">{getCategoryLabel(list.category)}</Badge>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <CalendarIcon className="h-5 w-5 text-gray-400 flex-shrink-0" />
                  <div>
                    <span className="text-gray-600">Erstellt:</span>
                    <span className="ml-2">{formatDate(list.createdAt)}</span>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <ClockIcon className="h-5 w-5 text-gray-400 flex-shrink-0" />
                  <div>
                    <span className="text-gray-600">Aktualisiert:</span>
                    <span className="ml-2">{formatDate(list.lastUpdated || list.updatedAt)}</span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Aktive Filter */}
            {list.type === 'dynamic' && list.filters && Object.values(list.filters).some(v => v && (!Array.isArray(v) || v.length > 0)) && (
              <div className="rounded-lg border bg-white">
                <div className="px-4 py-3 border-b bg-gray-50">
                  <h3 className="font-semibold text-lg flex items-center gap-2">
                    <FunnelIcon className="h-5 w-5 text-gray-500" />
                    Aktive Filter
                  </h3>
                </div>
                <div className="p-4">
                  <ul className="space-y-3">
                    {Object.entries(list.filters).map(([key, value]) => {
                      // Filter ausblenden, die keine Werte haben oder redundant sind
                      if (!value || (Array.isArray(value) && value.length === 0)) return null;
                      if (key === 'beats' || key === 'mediaFocus') return null; // Redundante Filter ausblenden
                      
                      const Icon = getFilterIcon(key);
                      return (
                        <li key={key} className="flex items-start gap-3">
                          <Icon className="h-5 w-5 text-gray-400 flex-shrink-0 mt-0.5" />
                          <div className="flex-1">
                            <div className="font-medium text-sm text-gray-700">
                              {getFilterLabel(key)}
                            </div>
                            <div className="text-sm text-gray-600 mt-0.5">
                              {renderFilterValue(key, value)}
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {showEditModal && user && (
        <ListModal
          list={list}
          onClose={() => setShowEditModal(false)}
          onSave={handleSave}
          userId={user.uid}
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
        
        .animate-slide-in-up {
          animation: slide-in-up 0.3s ease-out;
        }
      `}</style>
    </>
  );
}