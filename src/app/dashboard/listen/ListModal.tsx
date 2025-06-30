// src/app/dashboard/listen/ListModal.tsx
"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { Dialog, DialogTitle, DialogBody, DialogActions } from "@/components/dialog";
import { Field, Label, FieldGroup, Description } from "@/components/fieldset";
import { Input } from "@/components/input";
import { Textarea } from "@/components/textarea";
import { Select } from "@/components/select";
import { Button } from "@/components/button";
import { Badge } from "@/components/badge";
import { Radio, RadioGroup, RadioField } from "@/components/radio";
import { MultiSelectDropdown } from "@/components/MultiSelectDropdown";
import { listsService } from "@/lib/firebase/lists-service";
import { useCrmData } from "@/context/CrmDataContext";
import { DistributionList, ListFilters, LIST_TEMPLATES, ExtendedCompanyType } from "@/types/lists";
import { Contact } from "@/types/crm";
import clsx from "clsx";
import ContactSelectorModal from "./ContactSelectorModal";
import {
  SparklesIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  XMarkIcon,
  UsersIcon,
  BuildingOfficeIcon,
  TagIcon,
  GlobeAltIcon,
  NewspaperIcon,
  EnvelopeIcon,
  PhoneIcon,
  CalendarIcon,
  MapPinIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  FunnelIcon,
  Squares2X2Icon
} from "@heroicons/react/24/outline";

// Toast Types
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
    <div className="fixed bottom-0 right-0 p-6 space-y-4 z-[60]">
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

// Toast Hook
function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  
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

  return { toasts, showToast, removeToast };
}

// Animated Progress Steps
function AnimatedProgressSteps({ 
  steps, 
  currentStepIndex 
}: { 
  steps: Array<{ id: string; name: string; icon: any; completed: boolean }>;
  currentStepIndex: number;
}) {
  return (
    <div className="relative mb-8">
      {/* Progress Line */}
      <div className="absolute top-5 left-0 right-0 h-0.5 bg-gray-200">
        <div 
          className="h-full bg-gradient-to-r from-indigo-500 to-purple-600 transition-all duration-700 ease-out"
          style={{ width: `${(steps.filter(s => s.completed).length / steps.length) * 100}%` }}
        />
      </div>
      
      {/* Steps */}
      <div className="relative flex justify-between">
        {steps.map((step, index) => {
          const Icon = step.icon;
          const isActive = index === currentStepIndex;
          const isCompleted = step.completed;
          
          return (
            <div 
              key={step.id}
              className={`flex flex-col items-center transition-all duration-300 ${
                isActive ? 'scale-110' : ''
              }`}
            >
              <div className={clsx(
                "rounded-full p-3 transition-all duration-300 transform",
                isCompleted && "bg-green-500 scale-100",
                isActive && !isCompleted && "bg-indigo-600 shadow-lg shadow-indigo-500/50 animate-pulse",
                !isCompleted && !isActive && "bg-gray-200"
              )}>
                {isCompleted ? (
                  <CheckCircleIcon className="h-6 w-6 text-white animate-scale-in" />
                ) : (
                  <Icon className={clsx("h-6 w-6", isActive ? "text-white" : "text-gray-400")} />
                )}
              </div>
              <span className={clsx(
                "mt-2 text-sm font-medium transition-colors",
                isActive && "text-indigo-600",
                isCompleted && "text-green-600",
                !isActive && !isCompleted && "text-gray-400"
              )}>
                {step.name}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Filter Group Component
function FilterGroup({ 
  title, 
  icon: Icon,
  isOpen, 
  onToggle, 
  children,
  badge 
}: { 
  title: string;
  icon: any;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  badge?: string;
}) {
  return (
    <div className="border rounded-lg overflow-hidden transition-all duration-300">
      <button
        type="button"
        onClick={onToggle}
        className={clsx(
          "w-full px-4 py-3 flex items-center justify-between transition-colors",
          isOpen ? "bg-indigo-50 border-b" : "bg-gray-50 hover:bg-gray-100"
        )}
      >
        <div className="flex items-center gap-3">
          <Icon className={clsx(
            "h-5 w-5 transition-colors",
            isOpen ? "text-indigo-600" : "text-gray-500"
          )} />
          <span className={clsx(
            "font-medium",
            isOpen ? "text-indigo-900" : "text-gray-700"
          )}>
            {title}
          </span>
          {badge && (
            <Badge color={isOpen ? "indigo" : "zinc"} className="text-xs">
              {badge}
            </Badge>
          )}
        </div>
        {isOpen ? (
          <ChevronUpIcon className="h-5 w-5 text-indigo-600" />
        ) : (
          <ChevronDownIcon className="h-5 w-5 text-gray-400" />
        )}
      </button>
      
      <div className={clsx(
        "transition-all duration-300 overflow-hidden",
        isOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
      )}>
        <div className="p-4 space-y-4 bg-white">
          {children}
        </div>
      </div>
    </div>
  );
}

// Keyboard Shortcuts Hook
function useKeyboardShortcuts({
  onSave,
  onClose
}: {
  onSave: () => void;
  onClose: () => void;
}) {
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Cmd/Ctrl + S = Speichern
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        onSave();
      }
      
      // Escape = Modal schließen
      if (e.key === 'Escape') {
        onClose();
      }
    };
    
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [onSave, onClose]);
}

interface ListModalProps {
  list?: DistributionList;
  onClose: () => void;
  onSave: (listData: Omit<DistributionList, 'id' | 'contactCount' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  userId: string;
}

export default function ListModal({ list, onClose, onSave, userId }: ListModalProps) {
  const { companies, contacts, tags } = useCrmData();
  const { toasts, showToast, removeToast } = useToast();

  const [formData, setFormData] = useState<Partial<DistributionList>>({
    name: '',
    description: '',
    type: 'dynamic',
    category: 'custom',
    color: 'blue',
    filters: {},
    contactIds: []
  });
  
  const [isContactSelectorOpen, setIsContactSelectorOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [previewContacts, setPreviewContacts] = useState<Contact[]>([]);
  const [previewCount, setPreviewCount] = useState(0);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  
  // Filter Group States
  const [openFilterGroups, setOpenFilterGroups] = useState<Record<string, boolean>>({
    basic: true,
    media: false,
    contact: false,
    advanced: false
  });

  // Extract Media Focus options
  const availableMediaFocus = useMemo(() => {
    const focusSet = new Set<string>();
    companies.forEach(company => {
      if (company.mediaFocus) {
        // Split by comma and trim
        const focuses = company.mediaFocus.split(',').map(f => f.trim()).filter(f => f);
        focuses.forEach(focus => focusSet.add(focus));
      }
    });
    return Array.from(focusSet).sort();
  }, [companies]);

  const availableIndustries = useMemo(() => Array.from(new Set(companies.map(c => c.industry).filter((item): item is string => !!item))).sort(), [companies]);
  const availablePositions = useMemo(() => Array.from(new Set(contacts.map(c => c.position).filter((item): item is string => !!item))).sort(), [contacts]);
  const availableCountries = useMemo(() => Array.from(new Set(companies.map(c => c.address?.country).filter((item): item is string => !!item))).sort(), [companies]);

  // Progress Steps
  const steps = [
    { 
      id: 'info', 
      name: 'Grundinfos', 
      icon: InformationCircleIcon,
      completed: !!formData.name && !!formData.category
    },
    { 
      id: 'type', 
      name: 'Listen-Typ', 
      icon: Squares2X2Icon,
      completed: !!formData.type
    },
    { 
      id: 'criteria', 
      name: formData.type === 'dynamic' ? 'Filter' : 'Kontakte', 
      icon: formData.type === 'dynamic' ? FunnelIcon : UsersIcon,
      completed: formData.type === 'dynamic' 
        ? Object.values(formData.filters || {}).some(v => v && (!Array.isArray(v) || v.length > 0))
        : (formData.contactIds?.length || 0) > 0
    },
    { 
      id: 'preview', 
      name: 'Vorschau', 
      icon: CheckCircleIcon,
      completed: false
    }
  ];

  const currentStepIndex = steps.findIndex(step => !step.completed);

  useEffect(() => {
    if (list) {
      setFormData({
        ...list,
        filters: list.filters || {},
        contactIds: list.contactIds || []
      });
    }
  }, [list]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (formData.type === 'dynamic') {
        updatePreview();
      } else if (formData.type === 'static') {
        updateStaticPreview();
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [formData.filters, formData.contactIds, formData.type]);

  const updatePreview = async () => {
    if (!formData.filters || !userId) return;
    setLoadingPreview(true);
    try {
      const contacts = await listsService.getContactsByFilters(formData.filters, userId);
      setPreviewContacts(contacts.slice(0, 10));
      setPreviewCount(contacts.length);
    } catch (error) {
      console.error("Fehler bei der Vorschau:", error);
      showToast('error', 'Fehler bei der Vorschau', 'Die Kontakte konnten nicht geladen werden.');
    } finally {
      setLoadingPreview(false);
    }
  };

  const updateStaticPreview = async () => {
    if (!formData.contactIds || formData.contactIds.length === 0) {
      setPreviewContacts([]);
      setPreviewCount(0);
      return;
    }
    setLoadingPreview(true);
    try {
      const contacts = await listsService.getContactsByIds(formData.contactIds);
      setPreviewContacts(contacts.slice(0, 10));
      setPreviewCount(contacts.length);
    } catch (error) {
      console.error("Fehler bei der Vorschau:", error);
      showToast('error', 'Fehler bei der Vorschau', 'Die Kontakte konnten nicht geladen werden.');
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleTemplateSelect = (templateId: string) => {
    const template = LIST_TEMPLATES.find(t => t.name === templateId);
    if (template) {
      setFormData(prev => ({ 
        ...prev, 
        name: template.name, 
        description: template.description, 
        category: template.category, 
        color: template.color, 
        type: 'dynamic', 
        filters: { ...template.filters } 
      }));
      setSelectedTemplate(templateId);
      showToast('success', 'Vorlage angewendet', `Die Vorlage "${template.name}" wurde übernommen.`);
    }
  };

  const handleFilterChange = (filterKey: keyof ListFilters, value: any) => {
    setFormData(prev => ({ ...prev, filters: { ...prev.filters, [filterKey]: value } }));
  };

  const handleSaveContactSelection = (selectedIds: string[]) => {
    setFormData(prev => ({ ...prev, contactIds: selectedIds }));
    setIsContactSelectorOpen(false);
    showToast('success', `${selectedIds.length} Kontakte ausgewählt`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) {
      showToast('error', 'Name erforderlich', 'Bitte geben Sie einen Namen für die Liste ein.');
      return;
    }
    
    setLoading(true);
    try {
      const dataToSave: Omit<DistributionList, 'id' | 'contactCount' | 'createdAt' | 'updatedAt'> = {
        name: formData.name, 
        description: formData.description || '', 
        type: formData.type!, 
        category: formData.category || 'custom',
        color: formData.color || 'blue', 
        userId: userId,
        filters: formData.type === 'dynamic' ? formData.filters : {},
        contactIds: formData.type === 'static' ? formData.contactIds : [],
      };
      await onSave(dataToSave);
      showToast('success', 'Liste gespeichert', `Die Liste "${formData.name}" wurde erfolgreich ${list ? 'aktualisiert' : 'erstellt'}.`);
      onClose();
    } catch (error) {
      console.error("Fehler beim Speichern der Liste:", error);
      showToast('error', 'Fehler beim Speichern', 'Die Liste konnte nicht gespeichert werden.');
    } finally {
      setLoading(false);
    }
  };

  const toggleFilterGroup = (group: string) => {
    setOpenFilterGroups(prev => ({ ...prev, [group]: !prev[group] }));
  };

  const activeFiltersCount = useMemo(() => {
    if (!formData.filters) return 0;
    return Object.values(formData.filters).filter(v => 
      v && (Array.isArray(v) ? v.length > 0 : true)
    ).length;
  }, [formData.filters]);

  // Use keyboard shortcuts
  useKeyboardShortcuts({
    onSave: () => {
      if (formData.name && !loading) {
        handleSubmit(new Event('submit') as any);
      }
    },
    onClose
  });

  const categoryOptions = [ 
    { value: 'press', label: 'Presse' }, 
    { value: 'customers', label: 'Kunden' }, 
    { value: 'partners', label: 'Partner' }, 
    { value: 'leads', label: 'Leads' }, 
    { value: 'custom', label: 'Benutzerdefiniert' }
  ];
  
  const colorOptions = [ 
    { value: 'blue', class: 'bg-blue-500' }, 
    { value: 'green', class: 'bg-green-500' }, 
    { value: 'purple', class: 'bg-purple-500' }, 
    { value: 'orange', class: 'bg-orange-500' }, 
    { value: 'red', class: 'bg-red-500' }, 
    { value: 'pink', class: 'bg-pink-500' }, 
    { value: 'yellow', class: 'bg-yellow-500' }, 
    { value: 'zinc', class: 'bg-zinc-500' }
  ];
  
  const companyTypeOptions = [ 
    { value: 'customer', label: 'Kunde' }, 
    { value: 'supplier', label: 'Lieferant' }, 
    { value: 'partner', label: 'Partner' }, 
    { value: 'publisher', label: 'Verlag' }, 
    { value: 'media_house', label: 'Medienhaus' }, 
    { value: 'agency', label: 'Agentur' }, 
    { value: 'other', label: 'Sonstiges' } 
  ];

  return (
    <>
      <Dialog open={true} onClose={onClose} size="5xl">
        <form onSubmit={handleSubmit}>
          <DialogTitle className="px-6 py-4 text-base font-semibold">
            {list ? 'Liste bearbeiten' : 'Neue Liste erstellen'}
          </DialogTitle>
          
          {/* Progress Steps */}
          <div className="px-6 pb-4">
            <AnimatedProgressSteps steps={steps} currentStepIndex={currentStepIndex === -1 ? steps.length : currentStepIndex} />
          </div>
          
          <DialogBody className="p-6 max-h-[70vh] overflow-y-auto">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-6">
                <FieldGroup>
                  {/* Template Selection */}
                  {!list && (
                    <Field>
                      <Label>Vorlage verwenden</Label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
                        {LIST_TEMPLATES.map(template => (
                          <button 
                            key={template.name} 
                            type="button" 
                            onClick={() => handleTemplateSelect(template.name)} 
                            className={clsx(
                              "text-left p-3 rounded-lg border-2 transition-all transform hover:scale-[1.02]",
                              selectedTemplate === template.name 
                                ? "border-indigo-500 bg-indigo-50 ring-2 ring-indigo-500" 
                                : "border-gray-200 hover:border-gray-300 bg-white"
                            )}
                          >
                            <div className="font-semibold">{template.name}</div>
                            <div className="text-gray-600 text-xs mt-1">{template.description}</div>
                          </button>
                        ))}
                      </div>
                    </Field>
                  )}
                  
                  {/* Basic Info */}
                  <Field>
                    <Label>Listen-Name *</Label>
                    <Input 
                      value={formData.name || ''} 
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })} 
                      required 
                      autoFocus
                      placeholder="z.B. Tech-Journalisten Deutschland"
                    />
                  </Field>
                  
                  <Field>
                    <Label>Beschreibung</Label>
                    <Textarea 
                      value={formData.description || ''} 
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })} 
                      rows={2} 
                      placeholder="Kurze Beschreibung der Liste..."
                    />
                  </Field>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <Field>
                      <Label>Kategorie</Label>
                      <Select 
                        value={formData.category || 'custom'} 
                        onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                      >
                        {categoryOptions.map(option => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </Select>
                    </Field>
                    
                    <Field>
                      <Label>Farbe</Label>
                      <div className="flex gap-2 mt-1">
                        {colorOptions.map(color => (
                          <button 
                            key={color.value} 
                            type="button" 
                            onClick={() => setFormData({ ...formData, color: color.value as any })} 
                            className={clsx(
                              "w-8 h-8 rounded-full border-2 transition-all transform hover:scale-110",
                              color.class, 
                              formData.color === color.value 
                                ? "border-indigo-600 ring-2 ring-indigo-300" 
                                : "border-gray-300 hover:border-indigo-400"
                            )} 
                          />
                        ))}
                      </div>
                    </Field>
                  </div>
                  
                  {/* List Type */}
                  <Field>
                    <Label>Listen-Typ</Label>
                    <RadioGroup 
                      value={formData.type} 
                      onChange={(value: 'dynamic' | 'static') => setFormData({ ...formData, type: value })} 
                      className="mt-2 space-y-4"
                    >
                      <RadioField>
                        <Radio value="dynamic" />
                        <div className="ml-3 text-sm leading-6">
                          <Label>Dynamische Liste</Label>
                          <Description>Kontakte werden automatisch basierend auf Filtern aktualisiert.</Description>
                        </div>
                      </RadioField>
                      <RadioField>
                        <Radio value="static" />
                        <div className="ml-3 text-sm leading-6">
                          <Label>Statische Liste</Label>
                          <Description>Kontakte werden manuell ausgewählt und bleiben fest.</Description>
                        </div>
                      </RadioField>
                    </RadioGroup>
                  </Field>
                  
                  {/* Dynamic Filters */}
                  {formData.type === 'dynamic' && (
                    <div className="space-y-4 animate-fade-in">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-medium text-zinc-900">Filter-Kriterien</h3>
                        {activeFiltersCount > 0 && (
                          <Badge color="indigo">{activeFiltersCount} aktive Filter</Badge>
                        )}
                      </div>
                      
                      {/* Basic Filters */}
                      <FilterGroup
                        title="Basis-Filter"
                        icon={BuildingOfficeIcon}
                        isOpen={openFilterGroups.basic}
                        onToggle={() => toggleFilterGroup('basic')}
                      >
                        <MultiSelectDropdown 
                          label="Firmentypen" 
                          placeholder="Alle Typen" 
                          options={companyTypeOptions} 
                          selectedValues={formData.filters?.companyTypes || []} 
                          onChange={(values) => handleFilterChange('companyTypes', values as ExtendedCompanyType[])}
                        />
                        <MultiSelectDropdown 
                          label="Tags" 
                          placeholder="Alle Tags" 
                          options={tags.map(tag => ({ value: tag.id!, label: tag.name }))} 
                          selectedValues={formData.filters?.tagIds || []} 
                          onChange={(values) => handleFilterChange('tagIds', values)}
                        />
                      </FilterGroup>
                      
                      {/* Media Filters */}
                      <FilterGroup
                        title="Medien-Filter"
                        icon={NewspaperIcon}
                        isOpen={openFilterGroups.media}
                        onToggle={() => toggleFilterGroup('media')}
                        badge="NEU"
                      >
                        <MultiSelectDropdown 
                          label="Medienschwerpunkte" 
                          placeholder="Alle Schwerpunkte" 
                          options={availableMediaFocus.map(f => ({ value: f, label: f }))} 
                          selectedValues={formData.filters?.mediaFocus || []} 
                          onChange={(values) => handleFilterChange('mediaFocus', values)}
                        />
                        <MultiSelectDropdown 
                          label="Branchen" 
                          placeholder="Alle Branchen" 
                          options={availableIndustries.map(i => ({ value: i, label: i }))} 
                          selectedValues={formData.filters?.industries || []} 
                          onChange={(values) => handleFilterChange('industries', values)}
                        />
                      </FilterGroup>
                      
                      {/* Contact Filters */}
                      <FilterGroup
                        title="Kontakt-Filter"
                        icon={UsersIcon}
                        isOpen={openFilterGroups.contact}
                        onToggle={() => toggleFilterGroup('contact')}
                      >
                        <MultiSelectDropdown 
                          label="Positionen" 
                          placeholder="Alle Positionen" 
                          options={availablePositions.map(p => ({ value: p, label: p }))} 
                          selectedValues={formData.filters?.positions || []} 
                          onChange={(values) => handleFilterChange('positions', values)}
                        />
                        <div className="grid grid-cols-2 gap-4">
                          <div className="relative flex items-center">
                            <input 
                              id="hasEmail" 
                              type="checkbox" 
                              checked={formData.filters?.hasEmail || false} 
                              onChange={(e) => handleFilterChange('hasEmail', e.target.checked)} 
                              className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600"
                            />
                            <label htmlFor="hasEmail" className="ml-3 flex items-center text-sm text-gray-900">
                              <EnvelopeIcon className="h-4 w-4 mr-1 text-gray-400" />
                              Hat E-Mail
                            </label>
                          </div>
                          <div className="relative flex items-center">
                            <input 
                              id="hasPhone" 
                              type="checkbox" 
                              checked={formData.filters?.hasPhone || false} 
                              onChange={(e) => handleFilterChange('hasPhone', e.target.checked)} 
                              className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600"
                            />
                            <label htmlFor="hasPhone" className="ml-3 flex items-center text-sm text-gray-900">
                              <PhoneIcon className="h-4 w-4 mr-1 text-gray-400" />
                              Hat Telefon
                            </label>
                          </div>
                        </div>
                      </FilterGroup>
                      
                      {/* Advanced Filters */}
                      <FilterGroup
                        title="Erweiterte Filter"
                        icon={GlobeAltIcon}
                        isOpen={openFilterGroups.advanced}
                        onToggle={() => toggleFilterGroup('advanced')}
                      >
                        <MultiSelectDropdown 
                          label="Länder" 
                          placeholder="Alle Länder" 
                          options={availableCountries.map(c => ({ value: c, label: c }))} 
                          selectedValues={formData.filters?.countries || []} 
                          onChange={(values) => handleFilterChange('countries', values)}
                        />
                      </FilterGroup>
                    </div>
                  )}
                  
                  {/* Static Contact Selection */}
                  {formData.type === 'static' && (
                    <div className="border rounded-lg p-4 bg-zinc-50/50 animate-fade-in">
                      <h3 className="font-medium mb-2 text-zinc-900">Manuelle Kontaktauswahl</h3>
                      <p className="text-sm text-zinc-600 mb-4">
                        Füge Kontakte manuell zu dieser Liste hinzu. Die Auswahl bleibt unverändert, bis du sie wieder anpasst.
                      </p>
                      <Button type="button" onClick={() => setIsContactSelectorOpen(true)}>
                        <UsersIcon className="h-4 w-4 mr-2" />
                        {(formData.contactIds?.length || 0).toLocaleString()} Kontakte auswählen
                      </Button>
                    </div>
                  )}
                </FieldGroup>
              </div>
              
              {/* Live Preview */}
              <div className="space-y-4">
                <div className="sticky top-6 border rounded-lg p-4 bg-white shadow-lg animate-fade-in-scale">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-medium text-zinc-900">Live-Vorschau</h3>
                    {loadingPreview ? (
                      <div className="flex items-center gap-2 text-sm text-zinc-500">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-600"></div>
                        <span>Lade...</span>
                      </div>
                    ) : (
                      <Badge color="blue">{previewCount.toLocaleString()} Kontakte</Badge>
                    )}
                  </div>
                  
                  {previewContacts.length > 0 ? (
                    <div className="space-y-1 max-h-96 overflow-y-auto">
                      {previewContacts.map((contact, index) => (
                        <div 
                          key={contact.id} 
                          className="flex items-center justify-between py-1.5 px-2 bg-zinc-50 rounded animate-fade-in"
                          style={{ animationDelay: `${index * 0.05}s` }}
                        >
                          <div>
                            <div className="font-medium text-sm text-zinc-800">
                              {contact.firstName} {contact.lastName}
                            </div>
                            <div className="text-xs text-zinc-500">
                              {contact.position && `${contact.position} • `}
                              {contact.companyName || 'Keine Firma'}
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            {contact.email && (
                              <EnvelopeIcon className="h-3 w-3 text-indigo-600" title="Hat E-Mail" />
                            )}
                            {contact.phone && (
                              <PhoneIcon className="h-3 w-3 text-green-600" title="Hat Telefon" />
                            )}
                          </div>
                        </div>
                      ))}
                      {previewCount > 10 && (
                        <div className="text-sm text-zinc-500 text-center pt-2">
                          ... und {(previewCount - 10).toLocaleString()} weitere Kontakte
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-zinc-500">
                      <UsersIcon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                      <div className="text-sm">
                        {formData.type === 'dynamic' 
                          ? "Keine Kontakte entsprechen den Filtern." 
                          : "Noch keine Kontakte ausgewählt."
                        }
                      </div>
                    </div>
                  )}
                  
                  {/* Keyboard Shortcuts */}
                  <div className="mt-4 pt-4 border-t">
                    <p className="text-xs font-medium text-gray-600 mb-2">Tastenkürzel</p>
                    <div className="space-y-1 text-xs text-gray-500">
                      <div className="flex justify-between">
                        <span>Speichern</span>
                        <span className="font-mono">⌘ S</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Schließen</span>
                        <span className="font-mono">Esc</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </DialogBody>
          
          <DialogActions className="px-6 py-4 flex justify-end gap-x-4">
            <Button plain onClick={onClose}>Abbrechen</Button>
            <Button 
              color="indigo" 
              type="submit" 
              disabled={loading || !formData.name}
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Speichert...
                </>
              ) : (
                'Speichern'
              )}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Contact Selector Modal */}
      {isContactSelectorOpen && (
        <ContactSelectorModal
          initialSelectedIds={formData.contactIds || []}
          onClose={() => setIsContactSelectorOpen(false)}
          onSave={handleSaveContactSelection}
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

        @keyframes scale-in {
          from {
            transform: scale(0.8);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
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

        .animate-scale-in {
          animation: scale-in 0.2s ease-out;
        }
      `}</style>
    </>
  );
}