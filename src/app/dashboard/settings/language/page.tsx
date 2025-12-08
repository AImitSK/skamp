// src/app/dashboard/settings/language/page.tsx
"use client";

import { useState, useEffect, useMemo } from "react";
import { useTranslations } from 'next-intl';
import { useAuth } from "@/context/AuthContext";
import { useOrganization } from "@/context/OrganizationContext";
import { Heading } from "@/components/ui/heading";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Field } from "@/components/ui/fieldset";
import { SettingsNav } from '@/components/SettingsNav';
import { toastService } from "@/lib/utils/toast";
import {
  LanguageIcon,
  BookOpenIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  PencilIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { SUPPORTED_UI_LANGUAGES, LANGUAGE_NAMES as UI_LANGUAGE_NAMES, UILanguage, DEFAULT_LANGUAGE } from "@/config/i18n";
import { LANGUAGE_NAMES, LanguageCode } from "@/types/international";
import { LanguageFlagIcon } from "@/components/ui/language-flag-icon";
import { GlossaryEntryModal } from "@/components/settings/GlossaryEntryModal";
import {
  useGlossaryEntries,
  useCreateGlossaryEntry,
  useUpdateGlossaryEntry,
  useDeleteGlossaryEntry,
} from "@/lib/hooks/useGlossary";
import { useCompanies } from "@/lib/hooks/useEditorsData";
import { CustomerGlossaryEntry, CreateGlossaryEntryInput } from "@/types/glossary";

export default function LanguageSettingsPage() {
  const t = useTranslations('settings.language');
  const tCommon = useTranslations('common');
  const { user, loading: authLoading } = useAuth();
  const { currentOrganization, loading: orgLoading } = useOrganization();

  const [saving, setSaving] = useState(false);

  // UI-Sprache (User-Level)
  const [uiLanguage, setUiLanguage] = useState<UILanguage>(DEFAULT_LANGUAGE);

  // Glossar-Suche & Filter
  const [glossarySearch, setGlossarySearch] = useState('');
  const [glossaryCustomerFilter, setGlossaryCustomerFilter] = useState<string>('all');

  // Modal State
  const [showGlossaryModal, setShowGlossaryModal] = useState(false);
  const [editingEntry, setEditingEntry] = useState<CustomerGlossaryEntry | null>(null);

  // Daten laden
  const organizationId = currentOrganization?.id;

  const { data: glossaryEntries, isLoading: glossaryLoading } = useGlossaryEntries(
    organizationId,
    glossaryCustomerFilter !== 'all' ? { customerId: glossaryCustomerFilter } : undefined
  );

  const { data: companies, isLoading: companiesLoading } = useCompanies(organizationId);

  // Mutations
  const { mutateAsync: createEntry, isPending: isCreating } = useCreateGlossaryEntry();
  const { mutateAsync: updateEntry, isPending: isUpdating } = useUpdateGlossaryEntry();
  const { mutateAsync: deleteEntry, isPending: isDeleting } = useDeleteGlossaryEntry();

  // Gefilterte Einträge (Suche)
  const filteredEntries = useMemo(() => {
    if (!glossaryEntries) return [];
    if (!glossarySearch.trim()) return glossaryEntries;

    const search = glossarySearch.toLowerCase();
    return glossaryEntries.filter(entry => {
      // Suche in allen Übersetzungen
      return Object.values(entry.translations).some(
        term => term.toLowerCase().includes(search)
      ) || entry.context?.toLowerCase().includes(search);
    });
  }, [glossaryEntries, glossarySearch]);

  // Kunden für Dropdown
  const customerOptions = useMemo(() => {
    return (companies || [])
      .filter(c => c.id) // Nur Unternehmen mit ID
      .map(c => ({
        id: c.id!,
        name: c.name,
      }));
  }, [companies]);

  // Kunden-Name Helper
  const getCustomerName = (customerId: string) => {
    const customer = companies?.find(c => c.id === customerId);
    return customer?.name || 'Unbekannt';
  };

  const handleUiLanguageChange = async (newLanguage: UILanguage) => {
    setSaving(true);
    try {
      // TODO: Speichern in User-Preferences
      setUiLanguage(newLanguage);
      toastService.success('UI-Sprache geändert');
    } catch (error) {
      toastService.error('Fehler beim Speichern');
    } finally {
      setSaving(false);
    }
  };

  // Glossar Entry erstellen/bearbeiten
  const handleSaveGlossaryEntry = async (input: CreateGlossaryEntryInput) => {
    if (!organizationId || !user?.uid) {
      throw new Error('Organization oder User nicht verfügbar');
    }

    if (editingEntry) {
      // Bearbeiten
      await updateEntry({
        organizationId,
        entryId: editingEntry.id,
        input: {
          translations: input.translations,
          context: input.context,
        },
      });
      toastService.success('Glossar-Eintrag aktualisiert');
    } else {
      // Neu erstellen
      await createEntry({
        organizationId,
        userId: user.uid,
        input,
      });
      toastService.success('Glossar-Eintrag erstellt');
    }
  };

  // Glossar Entry löschen
  const handleDeleteEntry = async (entry: CustomerGlossaryEntry) => {
    if (!organizationId) return;

    if (!confirm(`Möchten Sie den Eintrag "${entry.translations.de}" wirklich löschen?`)) {
      return;
    }

    try {
      await deleteEntry({
        organizationId,
        entryId: entry.id,
      });
      toastService.success('Glossar-Eintrag gelöscht');
    } catch (error) {
      toastService.error('Fehler beim Löschen');
    }
  };

  // Modal öffnen
  const handleNewEntry = () => {
    setEditingEntry(null);
    setShowGlossaryModal(true);
  };

  const handleEditEntry = (entry: CustomerGlossaryEntry) => {
    setEditingEntry(entry);
    setShowGlossaryModal(true);
  };

  const loading = authLoading || orgLoading;

  return (
    <div className="flex flex-col gap-10 lg:flex-row">
      <aside className="w-full lg:w-64 lg:flex-shrink-0">
        <SettingsNav />
      </aside>

      <div className="flex-1">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#005fab] mx-auto"></div>
              <Text className="mt-4">{tCommon('loading')}</Text>
            </div>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="md:flex md:items-center md:justify-between mb-8">
              <div className="min-w-0 flex-1">
                <Heading level={1}>{t('title')}</Heading>
                <Text className="mt-2 text-gray-600">
                  Verwalten Sie die UI-Sprache und das Glossar für KI-Übersetzungen
                </Text>
              </div>
            </div>

            <div className="space-y-6 max-w-4xl">
              {/* Box 1: UI-Sprache */}
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <LanguageIcon className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">{t('uiLanguage')}</h2>
                    <Text className="text-sm text-gray-600">{t('uiLanguageDescription')}</Text>
                  </div>
                </div>

                <Field className="max-w-xs">
                  <Select
                    value={uiLanguage}
                    onChange={(e) => handleUiLanguageChange(e.target.value as UILanguage)}
                    disabled={saving}
                  >
                    {SUPPORTED_UI_LANGUAGES.map((lang) => (
                      <option key={lang} value={lang}>
                        {UI_LANGUAGE_NAMES[lang]}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>

              {/* Box 2: Glossar */}
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-50 rounded-lg">
                      <BookOpenIcon className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900">{t('glossary')}</h2>
                      <Text className="text-sm text-gray-600">{t('glossaryDescription')}</Text>
                    </div>
                  </div>
                  <Button
                    onClick={handleNewEntry}
                    className="bg-[#005fab] hover:bg-[#004a8c] text-white"
                  >
                    <PlusIcon className="h-4 w-4 mr-1" />
                    {t('newEntry')}
                  </Button>
                </div>

                {/* Filter & Suche */}
                <div className="flex flex-col sm:flex-row gap-3 mb-4">
                  <div className="relative flex-1">
                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder={tCommon('search') + '...'}
                      value={glossarySearch}
                      onChange={(e) => setGlossarySearch(e.target.value)}
                      className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:border-[#005fab] focus:ring-[#005fab]"
                    />
                  </div>
                  <select
                    value={glossaryCustomerFilter}
                    onChange={(e) => setGlossaryCustomerFilter(e.target.value)}
                    className="block w-full sm:w-48 rounded-md border-gray-300 shadow-sm focus:border-[#005fab] focus:ring-[#005fab] sm:text-sm"
                  >
                    <option value="all">{tCommon('all')} Kunden</option>
                    {customerOptions.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                {/* Glossar-Tabelle */}
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {t('customer')}
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Begriff (DE)
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Übersetzungen
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {tCommon('actions')}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {glossaryLoading ? (
                        <tr>
                          <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#005fab] mx-auto"></div>
                            <Text className="mt-2">Lade Glossar...</Text>
                          </td>
                        </tr>
                      ) : filteredEntries.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                            <BookOpenIcon className="h-8 w-8 mx-auto text-gray-300 mb-2" />
                            <Text>
                              {glossarySearch
                                ? 'Keine Einträge gefunden'
                                : 'Noch keine Glossar-Einträge vorhanden'}
                            </Text>
                            {!glossarySearch && (
                              <Text className="text-sm">
                                Klicken Sie auf "{t('newEntry')}" um einen Begriff hinzuzufügen
                              </Text>
                            )}
                          </td>
                        </tr>
                      ) : (
                        filteredEntries.map((entry) => (
                          <tr key={entry.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3">
                              <Text className="text-sm font-medium">
                                {getCustomerName(entry.customerId)}
                              </Text>
                            </td>
                            <td className="px-4 py-3">
                              <Text className="text-sm font-medium">
                                {entry.translations.de}
                              </Text>
                              {entry.context && (
                                <Text className="text-xs text-gray-500 mt-0.5">
                                  {entry.context}
                                </Text>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex flex-wrap gap-1">
                                {Object.entries(entry.translations)
                                  .filter(([lang]) => lang !== 'de')
                                  .slice(0, 4)
                                  .map(([lang, term]) => (
                                    <Badge key={lang} color="zinc" className="text-xs">
                                      <LanguageFlagIcon
                                        languageCode={lang as LanguageCode}
                                        className="h-2.5 w-4 mr-1"
                                      />
                                      {term}
                                    </Badge>
                                  ))}
                                {Object.keys(entry.translations).length > 5 && (
                                  <Badge color="zinc" className="text-xs">
                                    +{Object.keys(entry.translations).length - 5}
                                  </Badge>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  onClick={() => handleEditEntry(entry)}
                                  className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                                  title="Bearbeiten"
                                >
                                  <PencilIcon className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteEntry(entry)}
                                  className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                                  title="Löschen"
                                  disabled={isDeleting}
                                >
                                  <TrashIcon className="h-4 w-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Anzahl */}
                {filteredEntries.length > 0 && (
                  <div className="mt-3 text-sm text-gray-500">
                    {filteredEntries.length} Eintrag{filteredEntries.length !== 1 ? 'e' : ''}
                    {glossarySearch && ` für "${glossarySearch}"`}
                  </div>
                )}
              </div>

              {/* Info-Box */}
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <div className="flex">
                  <BookOpenIcon className="h-5 w-5 text-purple-400 mr-2 flex-shrink-0" />
                  <div className="text-sm text-purple-800">
                    <p className="font-medium mb-1">Hinweis zum Glossar</p>
                    <p>
                      Das <strong>Glossar</strong> definiert kundenspezifische Fachbegriffe, die bei
                      KI-Übersetzungen exakt so übersetzt werden sollen. Jeder Eintrag ist einem
                      Kunden zugeordnet und wird automatisch bei Übersetzungen für diesen Kunden verwendet.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Glossar Modal */}
      <GlossaryEntryModal
        isOpen={showGlossaryModal}
        onClose={() => {
          setShowGlossaryModal(false);
          setEditingEntry(null);
        }}
        onSave={handleSaveGlossaryEntry}
        entry={editingEntry}
        customers={customerOptions}
        defaultCustomerId={glossaryCustomerFilter !== 'all' ? glossaryCustomerFilter : undefined}
      />
    </div>
  );
}
