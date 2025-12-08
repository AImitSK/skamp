// src/app/dashboard/settings/language/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useTranslations } from 'next-intl';
import { useAuth } from "@/context/AuthContext";
import { useOrganization } from "@/context/OrganizationContext";
import { Heading } from "@/components/ui/heading";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Field, Label } from "@/components/ui/fieldset";
import { SettingsNav } from '@/components/SettingsNav';
import { toastService } from "@/lib/utils/toast";
import {
  LanguageIcon,
  BookOpenIcon,
  PlusIcon,
  MagnifyingGlassIcon,
} from "@heroicons/react/24/outline";
import { SUPPORTED_UI_LANGUAGES, LANGUAGE_NAMES, UILanguage, DEFAULT_LANGUAGE } from "@/config/i18n";

export default function LanguageSettingsPage() {
  const t = useTranslations('settings.language');
  const tCommon = useTranslations('common');
  const { user, loading: authLoading } = useAuth();
  const { currentOrganization, loading: orgLoading } = useOrganization();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // UI-Sprache (User-Level)
  const [uiLanguage, setUiLanguage] = useState<UILanguage>(DEFAULT_LANGUAGE);

  // Glossar-Suche
  const [glossarySearch, setGlossarySearch] = useState('');
  const [glossaryCustomerFilter, setGlossaryCustomerFilter] = useState<string>('all');

  useEffect(() => {
    if (!authLoading && !orgLoading && user && currentOrganization) {
      loadSettings();
    }
  }, [authLoading, orgLoading, user, currentOrganization]);

  const loadSettings = async () => {
    try {
      setLoading(true);
      // TODO: Lade UI-Sprache aus User-Preferences
      // TODO: Lade Glossar-Einträge

      // Placeholder für jetzt
      setUiLanguage(DEFAULT_LANGUAGE);
    } catch (error) {
      toastService.error('Fehler beim Laden der Einstellungen');
    } finally {
      setLoading(false);
    }
  };

  const handleUiLanguageChange = async (newLanguage: UILanguage) => {
    setSaving(true);
    try {
      // TODO: Speichern in User-Preferences
      setUiLanguage(newLanguage);
      toastService.success('UI-Sprache geändert');
      // TODO: Locale im Provider aktualisieren (erfordert Page-Reload oder Context-Update)
    } catch (error) {
      toastService.error('Fehler beim Speichern');
    } finally {
      setSaving(false);
    }
  };

  const handleNewGlossaryEntry = () => {
    // TODO: Glossar-Modal öffnen
    toastService.success('Glossar-Modal öffnen (TODO)');
  };

  return (
    <div className="flex flex-col gap-10 lg:flex-row">
      <aside className="w-full lg:w-64 lg:flex-shrink-0">
        <SettingsNav />
      </aside>

      <div className="flex-1">
        {(authLoading || orgLoading || loading) ? (
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
                  Verwalten Sie die Sprachen für Benutzeroberfläche und Inhalte
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
                        {LANGUAGE_NAMES[lang]}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>

              {/* Box 2: Glossar */}
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-50 rounded-lg">
                      <BookOpenIcon className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900">{t('glossary')}</h2>
                      <Text className="text-sm text-gray-600">{t('glossaryDescription')}</Text>
                    </div>
                  </div>
                  <Button
                    onClick={handleNewGlossaryEntry}
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
                    {/* TODO: Kunden-Liste laden */}
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
                      {/* Placeholder - keine Einträge */}
                      <tr>
                        <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                          <BookOpenIcon className="h-8 w-8 mx-auto text-gray-300 mb-2" />
                          <Text>Noch keine Glossar-Einträge vorhanden</Text>
                          <Text className="text-sm">Klicken Sie auf "{t('newEntry')}" um einen Begriff hinzuzufügen</Text>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Info-Box */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex">
                  <LanguageIcon className="h-5 w-5 text-blue-400 mr-2 flex-shrink-0" />
                  <div className="text-sm text-blue-800">
                    <p className="font-medium mb-1">Hinweis zum Glossar</p>
                    <p>
                      Das <strong>Glossar</strong> definiert kundenspezifische Fachbegriffe, die bei
                      KI-Übersetzungen exakt so übersetzt werden sollen. Jeder Eintrag ist einem
                      Kunden zugeordnet.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
