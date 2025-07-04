// src/app/dashboard/contacts/lists/[listId]/page.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
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
  ArrowPathIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon
} from "@heroicons/react/20/solid";

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

// InfoCard Component
function InfoCard({ 
  title, 
  icon: Icon, 
  children 
}: { 
  title: string; 
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border bg-white overflow-hidden">
      <div className="px-4 py-3 border-b bg-gray-50">
        <h3 className="font-semibold text-lg flex items-center gap-2">
          <Icon className="h-5 w-5 text-gray-500" />
          {title}
        </h3>
      </div>
      <div className="p-4">
        {children}
      </div>
    </div>
  );
}

// Helper functions
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
  const [alert, setAlert] = useState<{ type: 'info' | 'success' | 'warning' | 'error'; title: string; message?: string } | null>(null);

  // Alert Management
  const showAlert = useCallback((type: 'info' | 'success' | 'warning' | 'error', title: string, message?: string) => {
    setAlert({ type, title, message });
    setTimeout(() => setAlert(null), 5000);
  }, []);

  const loadData = useCallback(async () => {
    if (!user || !listId) return;
    setLoading(true);
    setError(null);
    try {
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
      setError("Fehler beim Laden der Listendetails.");
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
      showAlert('success', 'Liste aktualisiert', 'Die dynamische Liste wurde erfolgreich aktualisiert.');
      await loadData();
    } catch (error) {
      showAlert('error', 'Fehler', 'Die Liste konnte nicht aktualisiert werden.');
    } finally {
      setRefreshing(false);
    }
  };

  const handleSave = async (listData: Omit<DistributionList, 'id' | 'contactCount' | 'createdAt' | 'updatedAt'>) => {
    if(!list?.id) return;
    try {
      await listsService.update(list.id, listData);
      showAlert('success', 'Liste aktualisiert', 'Die Liste wurde erfolgreich aktualisiert.');
      setShowEditModal(false);
      await loadData();
    } catch (error) {
      showAlert('error', 'Fehler', 'Die Liste konnte nicht aktualisiert werden.');
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
    // Tag-IDs
    if (key === 'tagIds' && Array.isArray(value)) {
      const tagNames = value.map(tagId => {
        const tag = tags.find(t => t.id === tagId);
        return tag ? tag.name : tagId;
      });
      if (tagNames.length === 0) return '—';
      if (tagNames.length <= 3) return tagNames.join(', ');
      return `${tagNames.slice(0, 3).join(', ')} (+${tagNames.length - 3} weitere)`;
    }
    
    // Firmentypen
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
    
    // Publikationsformat
    if (key === 'publicationFormat' && value) {
      const formatLabels: { [key: string]: string } = {
        'print': 'Print',
        'online': 'Online',
        'both': 'Print & Online'
      };
      return formatLabels[value] || value;
    }
    
    // Mindestauflage
    if (key === 'minCirculation' && typeof value === 'number') {
      return value.toLocaleString('de-DE');
    }
    
    // Arrays
    if (Array.isArray(value)) {
      if (value.length === 0) return '—';
      if (value.length <= 3) return value.join(', ');
      return `${value.slice(0, 3).join(', ')} (+${value.length - 3} weitere)`;
    }
    
    if (typeof value === 'boolean') return value ? 'Ja' : 'Nein';
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
      publicationNames: 'Publikationen'
    };
    return labelMap[key] || key;
  };
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#005fab] mx-auto"></div>
          <Text className="mt-4">Lade Listendetails...</Text>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <Alert type="error" title="Fehler" message={error} />
        <div className="mt-4">
          <Button onClick={() => router.push('/dashboard/contacts/lists')} plain className="whitespace-nowrap">
            Zurück zur Übersicht
          </Button>
        </div>
      </div>
    );
  }
  
  if (!list) {
    return (
      <div className="p-8 text-center">
        <Text>Liste konnte nicht gefunden werden.</Text>
        <div className="mt-4">
          <Button onClick={() => router.push('/dashboard/contacts/lists')} plain className="whitespace-nowrap">
            Zurück zur Übersicht
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="p-6 md:p-8">
        {/* Alert */}
        {alert && (
          <div className="mb-4">
            <Alert type={alert.type} title={alert.title} message={alert.message} />
          </div>
        )}

        {/* Header */}
        <div className="mb-6">
          <Button 
            plain 
            onClick={() => router.push('/dashboard/contacts/lists')}
            className="mb-4 flex items-center gap-2 whitespace-nowrap"
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
                  className="flex items-center gap-2 whitespace-nowrap"
                >
                  <ArrowPathIcon className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                  Aktualisieren
                </Button>
              )}
              <Button 
                onClick={() => setShowEditModal(true)}
                className="bg-[#005fab] hover:bg-[#004a8c] text-white inline-flex items-center gap-x-2 whitespace-nowrap"
              >
                <PencilIcon className="h-4 w-4" />
                Liste bearbeiten
              </Button>
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
                  <Badge color="blue" className="ml-2 whitespace-nowrap">{list.contactCount || 0}</Badge>
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
                              href={`/dashboard/contacts/crm/contacts/${contact.id}`} 
                              className="text-[#005fab] hover:text-[#004a8c] hover:underline"
                            >
                              {contact.firstName} {contact.lastName}
                            </Link>
                          </TableCell>
                          <TableCell>{contact.position || <Text>—</Text>}</TableCell>
                          <TableCell>
                            {contact.companyId && contact.companyName ? (
                              <Link 
                                href={`/dashboard/contacts/crm/companies/${contact.companyId}`} 
                                className="text-[#005fab] hover:text-[#004a8c] hover:underline"
                              >
                                {contact.companyName}
                              </Link>
                            ) : (
                              <Text>—</Text>
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
                                <Text>—</Text>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-12">
                          <UsersIcon className="mx-auto h-12 w-12 text-gray-300 mb-3" />
                          <Text>Diese Liste enthält keine Kontakte.</Text>
                          {list.type === 'dynamic' && (
                            <Text className="mt-2 text-sm">
                              Die Filterkriterien ergeben keine Treffer.
                            </Text>
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
            <InfoCard title="Listen-Details" icon={ListBulletIcon}>
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-3">
                  <ListBulletIcon className="h-5 w-5 text-gray-400 flex-shrink-0" />
                  <div className="flex items-center gap-2">
                    <span className="text-gray-600">Typ:</span>
                    <Badge color={list.type === 'dynamic' ? 'green' : 'zinc'} className="whitespace-nowrap">
                      {list.type === 'dynamic' ? 'Dynamische Liste' : 'Statische Liste'}
                    </Badge>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <HashtagIcon className="h-5 w-5 text-gray-400 flex-shrink-0" />
                  <div className="flex items-center gap-2">
                    <span className="text-gray-600">Kategorie:</span>
                    <Badge color="purple" className="whitespace-nowrap">{getCategoryLabel(list.category)}</Badge>
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
            </InfoCard>
            
            {/* Aktive Filter */}
            {list.type === 'dynamic' && list.filters && Object.values(list.filters).some(v => v && (!Array.isArray(v) || v.length > 0)) && (
              <InfoCard title="Aktive Filter" icon={FunnelIcon}>
                <ul className="space-y-3">
                  {Object.entries(list.filters).map(([key, value]) => {
                    if (!value || (Array.isArray(value) && value.length === 0)) return null;
                    if (key === 'beats' || key === 'mediaFocus') return null;
                    
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
              </InfoCard>
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
    </>
  );
}