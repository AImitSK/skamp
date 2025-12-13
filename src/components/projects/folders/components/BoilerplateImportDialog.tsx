'use client';

import React, { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { Dialog, DialogTitle, DialogBody, DialogActions } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Field, Label } from '@/components/ui/fieldset';
import { BookmarkIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { boilerplatesService } from '@/lib/firebase/boilerplate-service';
import type { Boilerplate } from '@/types/crm-enhanced';

interface BoilerplateImportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  organizationId: string;
  customerId?: string; // Kunden-ID für Filterung
  onImport: (boilerplate: Boilerplate) => Promise<void>;
}

// Kategorie-Werte als Keys für Übersetzungen
const CATEGORY_KEYS = ['all', 'company', 'contact', 'legal', 'product', 'custom'] as const;

export default function BoilerplateImportDialog({
  isOpen,
  onClose,
  organizationId,
  customerId,
  onImport
}: BoilerplateImportDialogProps) {
  const t = useTranslations('projects.folders.boilerplateImport');
  const [boilerplates, setBoilerplates] = useState<Boilerplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Lade Boilerplates beim Öffnen
  React.useEffect(() => {
    if (isOpen && organizationId) {
      loadBoilerplates();
    }
  }, [isOpen, organizationId, customerId]);

  const loadBoilerplates = async () => {
    setLoading(true);
    try {
      // Lade alle Boilerplates der Organisation
      const allBoilerplates = await boilerplatesService.getAll(organizationId);

      // Filtere nach Kunden-ID (wenn vorhanden)
      // Zeige NUR Boilerplates die dem gleichen Kunden zugeordnet sind
      const customerSpecific = customerId
        ? allBoilerplates.filter(bp => !bp.isGlobal && bp.clientId === customerId)
        : allBoilerplates.filter(bp => !bp.isGlobal); // Fallback: alle nicht-globalen

      setBoilerplates(customerSpecific);
    } catch (error) {
      console.error('Fehler beim Laden der Boilerplates:', error);
    } finally {
      setLoading(false);
    }
  };

  // Gefilterte Boilerplates
  const filteredBoilerplates = useMemo(() => {
    let filtered = boilerplates;

    // Filter nach Kategorie
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(bp => bp.category === selectedCategory);
    }

    // Filter nach Suchtext
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(bp =>
        bp.name.toLowerCase().includes(query) ||
        bp.description?.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [boilerplates, selectedCategory, searchQuery]);

  const handleImport = async (boilerplate: Boilerplate) => {
    setImporting(true);
    try {
      await onImport(boilerplate);
      onClose();
    } catch (error) {
      console.error('Fehler beim Importieren:', error);
      alert('Fehler beim Importieren des Dokuments');
    } finally {
      setImporting(false);
    }
  };

  const handleClose = () => {
    setSearchQuery('');
    setSelectedCategory('all');
    onClose();
  };

  return (
    <Dialog open={isOpen} onClose={handleClose} size="3xl">
      <DialogTitle>{t('title')}</DialogTitle>

      <DialogBody>
        {/* Filter & Suche */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <Field>
            <Label>{t('categoryLabel')}</Label>
            <Select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              {CATEGORY_KEYS.map((categoryKey) => (
                <option key={categoryKey} value={categoryKey}>
                  {t(`categories.${categoryKey}`)}
                </option>
              ))}
            </Select>
          </Field>

          <Field className="relative">
            <Label>{t('searchLabel')}</Label>
            <Input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('searchPlaceholder')}
              className="pr-10"
            />
            <MagnifyingGlassIcon className="absolute right-3 bottom-2.5 w-5 h-5 text-gray-400 pointer-events-none" />
          </Field>
        </div>

        {/* Boilerplate Liste */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : filteredBoilerplates.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <BookmarkIcon className="w-12 h-12 mx-auto mb-3 text-gray-400" />
            <p>{t('emptyState.noBoilerplates')}</p>
            {searchQuery && (
              <p className="text-sm mt-2">{t('emptyState.tryOtherSearch')}</p>
            )}
          </div>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {filteredBoilerplates.map((boilerplate) => (
              <div
                key={boilerplate.id}
                className="border border-gray-200 rounded-lg p-4 hover:border-primary hover:bg-blue-50 transition-colors cursor-pointer"
                onClick={() => handleImport(boilerplate)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium text-gray-900">{boilerplate.name}</h4>
                      <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded">
                        {t(`categories.${boilerplate.category}`)}
                      </span>
                      {boilerplate.isGlobal && (
                        <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-600 rounded">
                          {t('globalBadge')}
                        </span>
                      )}
                    </div>
                    {boilerplate.description && (
                      <p className="text-sm text-gray-600 mt-1">
                        {boilerplate.description}
                      </p>
                    )}
                    {/* Vorschau des Inhalts (erste 100 Zeichen, HTML entfernt) */}
                    <p className="text-xs text-gray-500 mt-2 line-clamp-2">
                      {boilerplate.content.replace(/<[^>]*>/g, '').substring(0, 100)}...
                    </p>
                  </div>
                  <BookmarkIcon className="w-5 h-5 text-primary flex-shrink-0 ml-3" />
                </div>
              </div>
            ))}
          </div>
        )}
      </DialogBody>

      <DialogActions>
        <Button plain onClick={handleClose} disabled={importing}>
          {t('cancel')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
