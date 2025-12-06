// src/app/dashboard/contacts/lists/components/sections/index.tsx
"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Dialog, DialogTitle, DialogBody, DialogActions } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FunnelIcon, DocumentTextIcon } from "@heroicons/react/24/outline";
import PublicationFilterSection from "@/components/listen/PublicationFilterSection";
import { listsService } from "@/lib/firebase/lists-service";
import { DistributionList, ListFilters } from "@/types/lists";
import { ContactEnhanced } from "@/types/crm-enhanced";
import ContactSelectorModal from "../../ContactSelectorModal";
import { Alert } from '../shared/Alert';
import { BasicInfoSection } from './BasicInfoSection';
import { CompanyFiltersSection } from './CompanyFiltersSection';
import { PersonFiltersSection } from './PersonFiltersSection';
import { JournalistFiltersSection } from './JournalistFiltersSection';
import { PreviewSection } from './PreviewSection';
import { ContactSelectorSection } from './ContactSelectorSection';

interface ListModalProps {
  list?: DistributionList;
  onClose: () => void;
  onSave: (listData: Omit<DistributionList, 'id' | 'contactCount' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  userId: string;
  organizationId: string;
}

export default function ListModal({ list, onClose, onSave, userId, organizationId }: ListModalProps) {
  const [formData, setFormData] = useState<Partial<DistributionList>>({
    name: '',
    description: '',
    type: 'dynamic',
    category: 'custom',
    filters: {},
    contactIds: []
  });

  const [isContactSelectorOpen, setIsContactSelectorOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [previewContacts, setPreviewContacts] = useState<ContactEnhanced[]>([]);
  const [previewCount, setPreviewCount] = useState(0);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const formRef = useRef<HTMLFormElement>(null);

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
    if (!formData.filters || !organizationId) return;
    setLoadingPreview(true);
    try {
      const contacts = await listsService.getContactsByFilters(formData.filters, organizationId);
      setPreviewContacts(contacts.slice(0, 10));
      setPreviewCount(contacts.length);
    } catch (error) {
      // Error handled silently - user will see loading state timeout
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
      const contacts = await listsService.getContactsByIds(formData.contactIds, organizationId);
      setPreviewContacts(contacts.slice(0, 10));
      setPreviewCount(contacts.length);
    } catch (error) {
      console.error('Error loading static preview:', error);
      setPreviewCount(0);
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleFilterChange = useCallback((filterKey: keyof ListFilters, value: any) => {
    setFormData(prev => ({ ...prev, filters: { ...prev.filters, [filterKey]: value } }));
  }, []);

  const handleFormDataChange = useCallback((updates: Partial<DistributionList>) => {
    setFormData(prev => ({ ...prev, ...updates }));
  }, []);

  const handleSaveContactSelection = useCallback((selectedIds: string[]) => {
    setFormData(prev => ({ ...prev, contactIds: selectedIds }));
    setIsContactSelectorOpen(false);
  }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    // Validierung
    const errors: string[] = [];
    if (!formData.name?.trim()) {
      errors.push('Listenname ist erforderlich');
    }

    if (formData.type === 'dynamic' && (!formData.filters || Object.keys(formData.filters).length === 0)) {
      errors.push('Mindestens ein Filter muss für dynamische Listen ausgewählt werden');
    }

    if (formData.type === 'static' && (!formData.contactIds || formData.contactIds.length === 0)) {
      errors.push('Mindestens ein Kontakt muss für statische Listen ausgewählt werden');
    }

    if (errors.length > 0) {
      setValidationErrors(errors);
      return;
    }

    setValidationErrors([]);
    setLoading(true);

    try {
      const dataToSave: Omit<DistributionList, 'id' | 'contactCount' | 'createdAt' | 'updatedAt'> = {
        name: formData.name!,
        description: formData.description || '',
        type: formData.type!,
        category: formData.category || 'custom',
        userId: userId,
        organizationId: organizationId,
        filters: formData.type === 'dynamic' ? formData.filters : {},
        contactIds: formData.type === 'static' ? formData.contactIds : [],
      };
      await onSave(dataToSave);
      onClose();
    } catch (error) {
      setValidationErrors(['Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.']);
    } finally {
      setLoading(false);
    }
  }, [formData, userId, organizationId, onSave, onClose]);

  return (
    <>
      <Dialog open={true} onClose={onClose} size="5xl">
        <form ref={formRef} onSubmit={handleSubmit}>
          <DialogTitle>
            {list ? 'Liste bearbeiten' : 'Neue Liste erstellen'}
          </DialogTitle>

          <DialogBody className="px-6 py-6 h-[500px] overflow-y-auto overflow-x-hidden">
            {validationErrors.length > 0 && (
              <div className="mb-4">
                <Alert type="error" title="Validierungsfehler" message={validationErrors[0]} />
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-6">
                {/* Basic Info Section */}
                <BasicInfoSection
                  formData={formData}
                  onFormDataChange={handleFormDataChange}
                />

                {/* Dynamic Filters */}
                {formData.type === 'dynamic' && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-medium text-gray-900 flex items-center gap-2">
                        <FunnelIcon className="h-4 w-4" />
                        Filter-Kriterien
                      </h3>
                    </div>

                    {/* Company Filters */}
                    <CompanyFiltersSection
                      formData={formData}
                      onFilterChange={handleFilterChange}
                      onFormDataChange={handleFormDataChange}
                    />

                    {/* Person Filters */}
                    <PersonFiltersSection
                      formData={formData}
                      onFilterChange={handleFilterChange}
                      onFormDataChange={handleFormDataChange}
                    />

                    {/* Journalist Filters */}
                    <JournalistFiltersSection
                      formData={formData}
                      onFilterChange={handleFilterChange}
                      onFormDataChange={handleFormDataChange}
                      organizationId={organizationId}
                    />

                    {/* Publication Filters */}
                    <div className="space-y-4 rounded-md border p-4 bg-gray-50">
                      <div className="flex items-center gap-2 text-sm font-medium text-gray-900">
                        <DocumentTextIcon className="h-4 w-4 text-gray-400" />
                        Publikations-Filter
                      </div>

                      <PublicationFilterSection
                        filters={formData.filters?.publications}
                        organizationId={organizationId}
                        onChange={(publicationFilters) =>
                          handleFilterChange('publications', publicationFilters)
                        }
                      />
                    </div>
                  </div>
                )}

                {/* Static Contact Selection */}
                {formData.type === 'static' && (
                  <ContactSelectorSection
                    contactCount={formData.contactIds?.length || 0}
                    onOpenSelector={() => setIsContactSelectorOpen(true)}
                  />
                )}
              </div>

              {/* Live Preview */}
              <div className="space-y-4">
                <PreviewSection
                  previewContacts={previewContacts}
                  previewCount={previewCount}
                  loadingPreview={loadingPreview}
                  listType={formData.type || 'dynamic'}
                />
              </div>
            </div>
          </DialogBody>

          <DialogActions>
            <Button
              onClick={onClose}
              className="border border-zinc-300 bg-white text-zinc-700
                         hover:bg-zinc-50 font-medium whitespace-nowrap
                         focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary
                         h-10 px-6 rounded-lg transition-colors"
            >
              Abbrechen
            </Button>
            <Button
              type="submit"
              disabled={loading || !formData.name}
              className="bg-primary hover:bg-primary-hover text-white font-medium whitespace-nowrap
                         focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary
                         h-10 px-6 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Speichern...' : 'Speichern'}
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
    </>
  );
}
