// src/app/dashboard/contacts/page.tsx - Modernisierte Version
"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
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
  TrashIcon,
  PencilIcon,
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  BuildingOfficeIcon,
  UserIcon,
  EllipsisVerticalIcon,
  EyeIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  CheckIcon,
  XMarkIcon
} from "@heroicons/react/20/solid";
import { companiesService, contactsService, tagsService } from "@/lib/firebase/crm-service";
import { Company, Contact, Tag, companyTypeLabels, CompanyType } from "@/types/crm";
import CompanyModal from "./CompanyModal";
import ContactModal from "./ContactModal";
import ImportModal from "./ImportModal";
import clsx from "clsx";
import { MultiSelectDropdown } from "@/components/MultiSelectDropdown";
import Papa from 'papaparse';

type TabType = 'companies' | 'contacts';

// Toast Notification Component
interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
}

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
  item, 
  type,
  position,
  tags
}: { 
  item: Company | Contact;
  type: 'company' | 'contact';
  position: { x: number; y: number };
  tags: Tag[];
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
      year: 'numeric'
    });
  };

  return (
    <div
      ref={previewRef}
      className="fixed z-50 bg-white rounded-lg shadow-xl border border-gray-200 p-4 w-80 animate-fade-in-scale"
      style={{ left: `${adjustedPosition.x}px`, top: `${adjustedPosition.y}px` }}
    >
      <div className="mb-3">
        <h4 className="font-semibold text-gray-900">
          {type === 'company' ? (item as Company).name : `${(item as Contact).firstName} ${(item as Contact).lastName}`}
        </h4>
        {type === 'company' && (item as Company).industry && (
          <p className="text-sm text-gray-600">{(item as Company).industry}</p>
        )}
        {type === 'contact' && (item as Contact).position && (
          <p className="text-sm text-gray-600">{(item as Contact).position}</p>
        )}
      </div>
      
      <div className="space-y-2 text-sm">
        {type === 'company' ? (
          <>
            <div className="flex justify-between">
              <span className="text-gray-500">Typ:</span>
              <Badge color="zinc" className="text-xs">
                {companyTypeLabels[(item as Company).type]}
              </Badge>
            </div>
            {(item as Company).phone && (
              <div className="flex justify-between">
                <span className="text-gray-500">Telefon:</span>
                <span>{(item as Company).phone}</span>
              </div>
            )}
            {(item as Company).website && (
              <div className="flex justify-between">
                <span className="text-gray-500">Website:</span>
                <a href={(item as Company).website} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:text-indigo-500 truncate max-w-[180px]">
                  {(item as Company).website}
                </a>
              </div>
            )}
          </>
        ) : (
          <>
            {(item as Contact).companyName && (
              <div className="flex justify-between">
                <span className="text-gray-500">Firma:</span>
                <span className="font-medium">{(item as Contact).companyName}</span>
              </div>
            )}
            {(item as Contact).email && (
              <div className="flex justify-between">
                <span className="text-gray-500">E-Mail:</span>
                <a href={`mailto:${(item as Contact).email}`} className="text-indigo-600 hover:text-indigo-500 truncate max-w-[180px]">
                  {(item as Contact).email}
                </a>
              </div>
            )}
            {(item as Contact).phone && (
              <div className="flex justify-between">
                <span className="text-gray-500">Telefon:</span>
                <span>{(item as Contact).phone}</span>
              </div>
            )}
          </>
        )}
        <div className="flex justify-between">
          <span className="text-gray-500">Erstellt:</span>
          <span>{formatDate(item.createdAt)}</span>
        </div>
        {item.tagIds && item.tagIds.length > 0 && (
          <div className="pt-2 border-t">
            <div className="flex flex-wrap gap-1">
              {item.tagIds.map(tagId => {
                const tag = tags.find(t => t.id === tagId);
                return tag ? (
                  <Badge key={tag.id} color={tag.color as any} className="text-xs">
                    {tag.name}
                  </Badge>
                ) : null;
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Inline Edit Component
function InlineEdit({ 
  value, 
  onSave, 
  onCancel,
  className = ""
}: { 
  value: string; 
  onSave: (value: string) => void;
  onCancel: () => void;
  className?: string;
}) {
  const [editValue, setEditValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      onSave(editValue);
    } else if (e.key === 'Escape') {
      onCancel();
    }
  };

  return (
    <div className="flex items-center gap-2">
      <input
        ref={inputRef}
        type="text"
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onKeyDown={handleKeyDown}
        className={clsx(
          "px-2 py-1 border border-indigo-500 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500",
          className
        )}
      />
      <button
        onClick={() => onSave(editValue)}
        className="p-1 text-green-600 hover:bg-green-50 rounded"
      >
        <CheckIcon className="h-4 w-4" />
      </button>
      <button
        onClick={onCancel}
        className="p-1 text-red-600 hover:bg-red-50 rounded"
      >
        <XMarkIcon className="h-4 w-4" />
      </button>
    </div>
  );
}

// Dropdown Menu Component
function DropdownMenu({ 
  item,
  type,
  onDelete, 
  onEdit,
  onRename
}: { 
  item: Company | Contact;
  type: 'company' | 'contact';
  onDelete: (id: string, name: string) => void;
  onEdit: () => void; // Changed to callback style
  onRename: (id: string) => void;
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

  const displayName = type === 'company' 
    ? (item as Company).name 
    : `${(item as Contact).firstName} ${(item as Contact).lastName}`;

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
              href={`/dashboard/contacts/${type === 'company' ? 'companies' : 'contacts'}/${item.id}`}
              className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
              onClick={() => setIsOpen(false)}
            >
              <EyeIcon className="h-4 w-4 mr-3 text-gray-400" />
              Anzeigen
            </Link>

            <button
              onClick={() => handleAction(() => onRename(item.id!))}
              className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors text-left"
            >
              <PencilIcon className="h-4 w-4 mr-3 text-gray-400" />
              Umbenennen
            </button>

            <button
              onClick={() => handleAction(onEdit)}
              className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors text-left"
            >
              <PencilIcon className="h-4 w-4 mr-3 text-gray-400" />
              Bearbeiten
            </button>

            <div className="border-t border-gray-100 my-1"></div>

            <button
              onClick={() => handleAction(() => onDelete(item.id!, displayName))}
              className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors text-left"
            >
              <TrashIcon className="h-4 w-4 mr-3" />
              Löschen
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Confirm Dialog Component
function ConfirmDialog({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  message, 
  confirmText = "Löschen",
  cancelText = "Abbrechen",
  type = "danger"
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning';
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div 
          className="fixed inset-0 bg-black bg-opacity-25 transition-opacity"
          onClick={onClose}
        />
        
        <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full transform transition-all">
          <div className="p-6">
            <div className="flex items-center mb-4">
              {type === 'danger' ? (
                <XCircleIcon className="h-6 w-6 text-red-600 mr-3" />
              ) : (
                <ExclamationTriangleIcon className="h-6 w-6 text-yellow-600 mr-3" />
              )}
              <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            </div>
            <p className="text-gray-600 mb-6">{message}</p>
            <div className="flex justify-end gap-3">
              <Button plain onClick={onClose}>
                {cancelText}
              </Button>
              <button 
                className={clsx(
                  "px-3 py-2 text-sm font-semibold rounded-md transition-colors",
                  type === 'danger' 
                    ? "bg-red-600 text-white hover:bg-red-500" 
                    : "bg-yellow-600 text-white hover:bg-yellow-500"
                )}
                onClick={() => {
                  onConfirm();
                  onClose();
                }}
              >
                {confirmText}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ContactsPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('companies');
  const [companies, setCompanies] = useState<Company[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  
  const [selectedCompanyIds, setSelectedCompanyIds] = useState<Set<string>>(new Set());
  const [selectedContactIds, setSelectedContactIds] = useState<Set<string>>(new Set());
  
  const [showCompanyModal, setShowCompanyModal] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [previewItem, setPreviewItem] = useState<{ item: Company | Contact; type: 'company' | 'contact'; position: { x: number; y: number } } | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    type?: 'danger' | 'warning';
  }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());

  // Filter-States für Firmen
  const [selectedTypes, setSelectedTypes] = useState<CompanyType[]>([]);
  const [selectedCompanyTagIds, setSelectedCompanyTagIds] = useState<string[]>([]);
  
  // Filter-States für Kontakte
  const [selectedContactCompanyIds, setSelectedContactCompanyIds] = useState<string[]>([]);
  const [selectedContactTagIds, setSelectedContactTagIds] = useState<string[]>([]);
  const [selectedContactPositions, setSelectedContactPositions] = useState<string[]>([]);

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
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [companiesData, contactsData, tagsData] = await Promise.all([
        companiesService.getAll(user.uid),
        contactsService.getAll(user.uid),
        tagsService.getAll(user.uid)
      ]);
      setCompanies(companiesData);
      setContacts(contactsData);
      setTags(tagsData);
    } catch (error) {
      console.error("Fehler beim Laden der Daten:", error);
      showToast('error', 'Fehler beim Laden', 'Die Daten konnten nicht geladen werden.');
    } finally {
      setLoading(false);
    }
  };

  const tagOptions = useMemo(() => {
    return tags.sort((a, b) => a.name.localeCompare(b.name));
  }, [tags]);

  const positionOptions = useMemo(() => {
    const positions = contacts.map(c => c.position).filter(Boolean) as string[];
    return Array.from(new Set(positions)).sort();
  }, [contacts]);
  
  const companyOptions = useMemo(() => {
    return companies
      .map(c => ({ value: c.id!, label: c.name }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [companies]);

  const filteredCompanies = useMemo(() => {
    return companies
      .filter(company => {
        if (deletingIds.has(company.id!)) return false;
        
        const searchMatch = company.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           company.industry?.toLowerCase().includes(searchTerm.toLowerCase());
        if (!searchMatch) return false;
        
        const typeMatch = selectedTypes.length === 0 || selectedTypes.includes(company.type);
        if (!typeMatch) return false;
          
        const tagMatch = selectedCompanyTagIds.length === 0 || 
                        company.tagIds?.some(tagId => selectedCompanyTagIds.includes(tagId));
        if (!tagMatch) return false;

        return true;
      });
  }, [companies, searchTerm, selectedTypes, selectedCompanyTagIds, deletingIds]);

  const filteredContacts = useMemo(() => {
    return contacts.filter(contact => {
      if (deletingIds.has(contact.id!)) return false;
      
      const searchMatch = `${contact.firstName} ${contact.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         contact.email?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         contact.companyName?.toLowerCase().includes(searchTerm.toLowerCase());
      if (!searchMatch) return false;

      const companyMatch = selectedContactCompanyIds.length === 0 || 
                          (contact.companyId && selectedContactCompanyIds.includes(contact.companyId));
      if (!companyMatch) return false;
      
      const positionMatch = selectedContactPositions.length === 0 || 
                           (contact.position && selectedContactPositions.includes(contact.position));
      if (!positionMatch) return false;
        
      const tagMatch = selectedContactTagIds.length === 0 || 
                      contact.tagIds?.some(tagId => selectedContactTagIds.includes(tagId));
      if (!tagMatch) return false;

      return true;
    });
  }, [contacts, searchTerm, selectedContactCompanyIds, selectedContactPositions, selectedContactTagIds, deletingIds]);

  const handleSelectAllCompanies = (checked: boolean) => {
    if (checked) {
      setSelectedCompanyIds(new Set(filteredCompanies.map(c => c.id!)));
    } else {
      setSelectedCompanyIds(new Set());
    }
  };

  const handleSelectAllContacts = (checked: boolean) => {
    if (checked) {
      setSelectedContactIds(new Set(filteredContacts.map(c => c.id!)));
    } else {
      setSelectedContactIds(new Set());
    }
  };

  const handleSelectCompany = (id: string, checked: boolean) => {
    const newSelection = new Set(selectedCompanyIds);
    if (checked) {
      newSelection.add(id);
    } else {
      newSelection.delete(id);
    }
    setSelectedCompanyIds(newSelection);
  };

  const handleSelectContact = (id: string, checked: boolean) => {
    const newSelection = new Set(selectedContactIds);
    if (checked) {
      newSelection.add(id);
    } else {
      newSelection.delete(id);
    }
    setSelectedContactIds(newSelection);
  };

  const handleBulkDelete = async () => {
    const count = activeTab === 'companies' ? selectedCompanyIds.size : selectedContactIds.size;
    if (count === 0) return;
    const type = activeTab === 'companies' ? 'Firmen' : 'Kontakte';
    
    setConfirmDialog({
      isOpen: true,
      title: `Mehrere ${type} löschen`,
      message: `Möchten Sie wirklich ${count} ausgewählte ${type} unwiderruflich löschen?`,
      type: 'danger',
      onConfirm: async () => {
        const ids = activeTab === 'companies' ? Array.from(selectedCompanyIds) : Array.from(selectedContactIds);
        const service = activeTab === 'companies' ? companiesService : contactsService;
        
        setDeletingIds(new Set(ids));
        if (activeTab === 'companies') {
          setSelectedCompanyIds(new Set());
        } else {
          setSelectedContactIds(new Set());
        }
        
        try {
          await Promise.all(ids.map(id => service.delete(id)));
          showToast('success', `${type} gelöscht`, `${count} ${type} wurden erfolgreich gelöscht.`);
          await loadData();
        } catch (error) {
          console.error("Fehler beim Löschen:", error);
          showToast('error', 'Fehler beim Löschen', `Die ${type} konnten nicht gelöscht werden.`);
          setDeletingIds(new Set());
        }
      }
    });
  };

  const handleEditCompany = (company: Company) => {
    setSelectedCompany(company);
    setShowCompanyModal(true);
  };

  const handleEditContact = (contact: Contact) => {
    setSelectedContact(contact);
    setShowContactModal(true);
  };

  const handleDeleteCompany = async (id: string, name: string) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Firma löschen',
      message: `Möchten Sie die Firma "${name}" wirklich unwiderruflich löschen?`,
      type: 'danger',
      onConfirm: async () => {
        setDeletingIds(new Set([id]));
        
        try {
          await companiesService.delete(id);
          showToast('success', 'Firma gelöscht', `"${name}" wurde erfolgreich gelöscht.`);
          await loadData();
        } catch (error) {
          console.error("Fehler beim Löschen der Firma:", error);
          showToast('error', 'Fehler beim Löschen', 'Die Firma konnte nicht gelöscht werden.');
          setDeletingIds(new Set());
        }
      }
    });
  };

  const handleDeleteContact = async (id: string, name: string) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Kontakt löschen',
      message: `Möchten Sie den Kontakt "${name}" wirklich unwiderruflich löschen?`,
      type: 'danger',
      onConfirm: async () => {
        setDeletingIds(new Set([id]));
        
        try {
          await contactsService.delete(id);
          showToast('success', 'Kontakt gelöscht', `"${name}" wurde erfolgreich gelöscht.`);
          await loadData();
        } catch (error) {
          console.error("Fehler beim Löschen des Kontakts:", error);
          showToast('error', 'Fehler beim Löschen', 'Der Kontakt konnte nicht gelöscht werden.');
          setDeletingIds(new Set());
        }
      }
    });
  };

  const handleInlineEdit = async (id: string, newName: string, type: 'company' | 'contact') => {
    if (!newName.trim()) {
      showToast('error', 'Fehler', 'Der Name darf nicht leer sein.');
      setEditingId(null);
      return;
    }

    try {
      if (type === 'company') {
        await companiesService.update(id, { name: newName });
        showToast('success', 'Name aktualisiert', 'Der Firmenname wurde erfolgreich geändert.');
      } else {
        const [firstName, ...lastNameParts] = newName.trim().split(' ');
        const lastName = lastNameParts.join(' ');
        await contactsService.update(id, { firstName, lastName: lastName || '' });
        showToast('success', 'Name aktualisiert', 'Der Kontaktname wurde erfolgreich geändert.');
      }
      setEditingId(null);
      await loadData();
    } catch (error) {
      console.error("Fehler beim Aktualisieren des Namens:", error);
      showToast('error', 'Fehler', 'Der Name konnte nicht aktualisiert werden.');
    }
  };

  const handleMouseEnter = (item: Company | Contact, type: 'company' | 'contact', event: React.MouseEvent) => {
    const rect = (event.target as HTMLElement).getBoundingClientRect();
    setPreviewItem({
      item,
      type,
      position: { x: rect.right + 10, y: rect.top }
    });
  };

  const handleMouseLeave = () => {
    setPreviewItem(null);
  };
  
  const handleAddNew = () => {
    if (activeTab === 'companies') {
        setSelectedCompany(null);
        setShowCompanyModal(true);
    } else {
        setSelectedContact(null);
        setShowContactModal(true);
    }
  };

  const renderTags = (tagIds?: string[]) => {
    if (!tagIds || tagIds.length === 0) return null;
    const entityTags = tags.filter(tag => tagIds.includes(tag.id!));
    return (
      <div className="flex flex-wrap gap-1">
        {entityTags.map(tag => (
          <Badge key={tag.id} color={tag.color as any} className="text-xs">{tag.name}</Badge>
        ))}
      </div>
    );
  };
  
  const handleExport = () => {
    const isCompanies = activeTab === 'companies';
    const data = isCompanies ? filteredCompanies : filteredContacts;
    const filename = isCompanies ? 'firmen-export.csv' : 'kontakte-export.csv';

    if (data.length === 0) {
      showToast('warning', 'Keine Daten', 'Keine Daten zum Exportieren in der aktuellen Ansicht.');
      return;
    }

    try {
      let csv;
      if (isCompanies) {
        const companyData = (data as Company[]).map(company => ({
          "Firmenname": company.name,
          "Typ": companyTypeLabels[company.type],
          "Branche": company.industry || '',
          "Website": company.website || '',
          "Telefon": company.phone || '',
          "Strasse": company.address?.street || '',
          "Adresszeile 2": company.address?.street2 || '',
          "PLZ": company.address?.zip || '',
          "Stadt": company.address?.city || '',
          "Land": company.address?.country || '',
          "Notizen": company.notes || '',
          "Tags": (company.tagIds || []).map(tagId => tags.find(t => t.id === tagId)?.name).filter(Boolean).join(', '),
        }));
        csv = Papa.unparse(companyData);
      } else {
        const contactData = (data as Contact[]).map(contact => ({
          "Vorname": contact.firstName,
          "Nachname": contact.lastName,
          "Firma": contact.companyName || '',
          "Position": contact.position || '',
          "E-Mail": contact.email || '',
          "Telefon": contact.phone || '',
          "Notizen": contact.notes || '',
          "Tags": (contact.tagIds || []).map(tagId => tags.find(t => t.id === tagId)?.name).filter(Boolean).join(', '),
        }));
        csv = Papa.unparse(contactData);
      }
      
      const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      showToast('success', 'Export erfolgreich', `${data.length} ${isCompanies ? 'Firmen' : 'Kontakte'} wurden exportiert.`);
    } catch (error) {
      console.error("Fehler beim Exportieren:", error);
      showToast('error', 'Fehler', 'Die Daten konnten nicht exportiert werden.');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse">
          <div className="h-8 w-8 bg-indigo-600 rounded-full animate-bounce"></div>
          <p className="mt-4 text-zinc-500">Lade Daten...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <Heading>Kontakte</Heading>
          <Text className="mt-1">Verwalte deine Firmen und Ansprechpartner</Text>
        </div>
        <div className="flex items-center gap-x-2">
          <Button 
            plain 
            onClick={() => setShowImportModal(true)}
            className="flex items-center gap-1"
          >
            <ArrowUpTrayIcon className="h-4 w-4" />
            Import
          </Button>
          <Button onClick={handleAddNew}>
            <PlusIcon className="size-4 mr-2" />
            {activeTab === 'companies' ? 'Firma hinzufügen' : 'Person hinzufügen'}
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 mb-6">
        <button
          onClick={() => { setActiveTab('companies'); setSearchTerm(''); }}
          className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'companies'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-zinc-600 hover:text-zinc-900 dark:text-zinc-400'
          }`}
        >
          <BuildingOfficeIcon className="h-4 w-4" />
          Firmen ({companies.length})
        </button>
        <button
          onClick={() => { setActiveTab('contacts'); setSearchTerm(''); }}
          className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'contacts'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-zinc-600 hover:text-zinc-900 dark:text-zinc-400'
          }`}
        >
          <UserIcon className="h-4 w-4" />
          Personen ({contacts.length})
        </button>
      </div>
      
      {/* Filter + Suche */}
      {activeTab === 'companies' && (
        <div className="flex flex-col lg:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-zinc-400 pointer-events-none" />
            <input
              type="search"
              placeholder="Firmen durchsuchen..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-md border border-zinc-300 py-2 pl-10 pr-4 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
            />
          </div>
          
          <MultiSelectDropdown 
            label="" 
            placeholder="Nach Typ filtern..." 
            options={Object.entries(companyTypeLabels).map(([value, label]) => ({ value, label }))} 
            selectedValues={selectedTypes} 
            onChange={(values) => setSelectedTypes(values as CompanyType[])}
          />
          
          <MultiSelectDropdown 
            label="" 
            placeholder="Nach Tags filtern..." 
            options={tagOptions.map(tag => ({ value: tag.id!, label: tag.name }))} 
            selectedValues={selectedCompanyTagIds} 
            onChange={(values) => setSelectedCompanyTagIds(values)}
          />
        </div>
      )}

      {activeTab === 'contacts' && (
        <div className="flex flex-col lg:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-zinc-400 pointer-events-none" />
            <input
              type="search"
              placeholder="Personen durchsuchen..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-md border border-zinc-300 py-2 pl-10 pr-4 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
            />
          </div>
          
          <MultiSelectDropdown 
            label="" 
            placeholder="Nach Firma filtern..." 
            options={companyOptions} 
            selectedValues={selectedContactCompanyIds} 
            onChange={(values) => setSelectedContactCompanyIds(values)}
          />
          
          <MultiSelectDropdown 
            label="" 
            placeholder="Nach Position filtern..." 
            options={positionOptions.map(pos => ({ value: pos, label: pos }))} 
            selectedValues={selectedContactPositions} 
            onChange={(values) => setSelectedContactPositions(values)}
          />
          
          <MultiSelectDropdown 
            label="" 
            placeholder="Nach Tags filtern..." 
            options={tagOptions.map(tag => ({ value: tag.id!, label: tag.name }))} 
            selectedValues={selectedContactTagIds} 
            onChange={(values) => setSelectedContactTagIds(values)}
          />
        </div>
      )}

      {/* Ergebnis-Info und Bulk-Aktionen */}
      <div className="mb-4 flex items-center justify-between h-9">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
            {activeTab === 'companies' ? `${filteredCompanies.length} von ${companies.length} Firmen` : `${filteredContacts.length} von ${contacts.length} Kontakten`}
        </p>
        <div className={clsx(
          "flex items-center gap-4 transition-all duration-300", 
          (activeTab === 'companies' && selectedCompanyIds.size > 0) || (activeTab === 'contacts' && selectedContactIds.size > 0)
            ? "opacity-100 transform translate-y-0" 
            : "opacity-0 transform -translate-y-2 pointer-events-none"
        )}>
          <span className="text-sm text-zinc-600">
            {activeTab === 'companies' ? `${selectedCompanyIds.size} ausgewählt` : `${selectedContactIds.size} ausgewählt`}
          </span>
          <button 
            onClick={handleBulkDelete} 
            className="inline-flex items-center gap-2 rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-500 transition-colors"
          >
            <TrashIcon className="size-4" /> 
            Löschen
          </button>
        </div>
      </div>

      {/* Tables */}
      <div className="relative">
        <div className="overflow-x-auto rounded-lg border">
          {activeTab === 'companies' && (
            <Table className="min-w-full">
              <TableHead>
                <TableRow>
                  <TableHeader className="w-12">
                    <Checkbox 
                      checked={filteredCompanies.length > 0 && selectedCompanyIds.size === filteredCompanies.length} 
                      indeterminate={selectedCompanyIds.size > 0 && selectedCompanyIds.size < filteredCompanies.length} 
                      onChange={(checked) => handleSelectAllCompanies(checked)}
                    />
                  </TableHeader>
                  <TableHeader>Name</TableHeader>
                  <TableHeader>Typ</TableHeader>
                  <TableHeader>Tags</TableHeader>
                  <TableHeader>Website</TableHeader>
                  <TableHeader>Telefon</TableHeader>
                  <TableHeader className="w-12 relative overflow-visible"></TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredCompanies.map((company) => (
                  <TableRow 
                    key={company.id} 
                    className={clsx(
                      "hover:bg-gray-50 transition-colors duration-150",
                      deletingIds.has(company.id!) && "opacity-50"
                    )}
                  >
                    <TableCell>
                      <Checkbox 
                        checked={selectedCompanyIds.has(company.id!)} 
                        onChange={(checked) => handleSelectCompany(company.id!, checked)}
                        disabled={deletingIds.has(company.id!)}
                      />
                    </TableCell>
                    <TableCell>
                      {editingId === company.id ? (
                        <InlineEdit
                          value={company.name}
                          onSave={(value) => handleInlineEdit(company.id!, value, 'company')}
                          onCancel={() => setEditingId(null)}
                          className="w-full"
                        />
                      ) : (
                        <div 
                          className="font-medium text-indigo-600 hover:text-indigo-500 cursor-pointer"
                          onMouseEnter={(e) => handleMouseEnter(company, 'company', e)}
                          onMouseLeave={handleMouseLeave}
                        >
                          <Link href={`/dashboard/contacts/companies/${company.id}`} className="hover:underline">
                            {company.name}
                          </Link>
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge color="zinc">{companyTypeLabels[company.type]}</Badge>
                    </TableCell>
                    <TableCell>{renderTags(company.tagIds)}</TableCell>
                    <TableCell>
                      {company.website ? (
                        <a 
                          href={company.website} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-indigo-600 hover:text-indigo-500 hover:underline text-sm"
                        >
                          Website
                        </a>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {company.phone ? (
                        <a 
                          href={`tel:${company.phone}`}
                          className="text-indigo-600 hover:text-indigo-500 hover:underline text-sm"
                        >
                          {company.phone}
                        </a>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </TableCell>
                    <TableCell className="relative overflow-visible">
                      <DropdownMenu 
                        item={company}
                        type="company"
                        onDelete={handleDeleteCompany}
                        onEdit={() => handleEditCompany(company)}
                        onRename={setEditingId}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {activeTab === 'contacts' && (
            <Table className="min-w-full">
              <TableHead>
                <TableRow>
                  <TableHeader className="w-12">
                    <Checkbox 
                      checked={filteredContacts.length > 0 && selectedContactIds.size === filteredContacts.length} 
                      indeterminate={selectedContactIds.size > 0 && selectedContactIds.size < filteredContacts.length} 
                      onChange={(checked) => handleSelectAllContacts(checked)}
                    />
                  </TableHeader>
                  <TableHeader>Name</TableHeader>
                  <TableHeader>Firma</TableHeader>
                  <TableHeader>Tags</TableHeader>
                  <TableHeader>Position</TableHeader>
                  <TableHeader>E-Mail</TableHeader>
                  <TableHeader>Telefon</TableHeader>
                  <TableHeader className="w-12 relative overflow-visible"></TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredContacts.map((contact) => (
                  <TableRow 
                    key={contact.id} 
                    className={clsx(
                      "hover:bg-gray-50 transition-colors duration-150",
                      deletingIds.has(contact.id!) && "opacity-50"
                    )}
                  >
                    <TableCell>
                      <Checkbox 
                        checked={selectedContactIds.has(contact.id!)} 
                        onChange={(checked) => handleSelectContact(contact.id!, checked)}
                        disabled={deletingIds.has(contact.id!)}
                      />
                    </TableCell>
                    <TableCell>
                      {editingId === contact.id ? (
                        <InlineEdit
                          value={`${contact.firstName} ${contact.lastName}`}
                          onSave={(value) => handleInlineEdit(contact.id!, value, 'contact')}
                          onCancel={() => setEditingId(null)}
                          className="w-full"
                        />
                      ) : (
                        <div 
                          className="font-medium text-indigo-600 hover:text-indigo-500 cursor-pointer"
                          onMouseEnter={(e) => handleMouseEnter(contact, 'contact', e)}
                          onMouseLeave={handleMouseLeave}
                        >
                          <Link href={`/dashboard/contacts/contacts/${contact.id}`} className="hover:underline">
                            {contact.firstName} {contact.lastName}
                          </Link>
                        </div>
                      )}
                    </TableCell>
                    <TableCell>{contact.companyName || <span className="text-gray-400">—</span>}</TableCell>
                    <TableCell>{renderTags(contact.tagIds)}</TableCell>
                    <TableCell>{contact.position || <span className="text-gray-400">—</span>}</TableCell>
                    <TableCell>
                      {contact.email ? (
                        <a 
                          href={`mailto:${contact.email}`}
                          className="text-indigo-600 hover:text-indigo-500 hover:underline text-sm"
                        >
                          {contact.email}
                        </a>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {contact.phone ? (
                        <a 
                          href={`tel:${contact.phone}`}
                          className="text-indigo-600 hover:text-indigo-500 hover:underline text-sm"
                        >
                          {contact.phone}
                        </a>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </TableCell>
                    <TableCell className="relative overflow-visible">
                      <DropdownMenu 
                        item={contact}
                        type="contact"
                        onDelete={handleDeleteContact}
                        onEdit={() => handleEditContact(contact)}
                        onRename={setEditingId}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>

      {/* Quick Preview */}
      {previewItem && (
        <QuickPreview 
          item={previewItem.item}
          type={previewItem.type}
          position={previewItem.position}
          tags={tags}
        />
      )}

      {/* Modals */}
      {showCompanyModal && (
        <CompanyModal 
          company={selectedCompany} 
          onClose={() => setShowCompanyModal(false)} 
          onSave={() => {
            loadData();
            showToast('success', selectedCompany ? 'Firma aktualisiert' : 'Firma erstellt', 
              selectedCompany ? 'Die Firma wurde erfolgreich aktualisiert.' : 'Die neue Firma wurde erfolgreich erstellt.');
          }} 
          userId={user?.uid || ''}
        />
      )}
      
      {showContactModal && (
        <ContactModal 
          contact={selectedContact} 
          companies={companies} 
          onClose={() => setShowContactModal(false)} 
          onSave={() => {
            loadData();
            showToast('success', selectedContact ? 'Kontakt aktualisiert' : 'Kontakt erstellt',
              selectedContact ? 'Der Kontakt wurde erfolgreich aktualisiert.' : 'Der neue Kontakt wurde erfolgreich erstellt.');
          }} 
          userId={user?.uid || ''}
        />
      )}
      
      {showImportModal && (
        <ImportModal 
          activeTab={activeTab} 
          onClose={() => setShowImportModal(false)} 
          onImportSuccess={() => { 
            setShowImportModal(false); 
            loadData();
            showToast('success', 'Import erfolgreich', 'Die Daten wurden erfolgreich importiert.');
          }}
        />
      )}

      {/* Toast Notifications */}
      <ToastNotification toasts={toasts} onRemove={removeToast} />

      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmDialog.onConfirm}
        title={confirmDialog.title}
        message={confirmDialog.message}
        type={confirmDialog.type}
      />

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
        
        @keyframes fade-in {
          from {
            opacity: 0;
          }
          to {
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
        
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }

        .animate-fade-in-scale {
          animation: fade-in-scale 0.2s ease-out;
        }
      `}</style>
    </div>
  );
}