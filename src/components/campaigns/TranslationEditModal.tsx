// src/components/campaigns/TranslationEditModal.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { Dialog, DialogTitle, DialogBody, DialogActions } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { Field, Label } from "@/components/ui/fieldset";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Disclosure, DisclosureButton, DisclosurePanel } from "@headlessui/react";
import {
  PencilIcon,
  SparklesIcon,
  CheckIcon,
  XMarkIcon,
  ChevronDownIcon,
  DocumentTextIcon,
  UserIcon,
  ChatBubbleBottomCenterTextIcon,
  PhoneIcon,
  DocumentIcon,
} from "@heroicons/react/24/outline";
import { ProjectTranslation, UpdateTranslationInput } from "@/types/translation";
import { PRCampaign } from "@/types/pr";
import { LANGUAGE_NAMES } from "@/types/international";
import { LanguageFlagIcon } from "@/components/ui/language-flag-icon";
import { useUpdateTranslation } from "@/lib/hooks/useTranslations";
import { toastService } from "@/lib/utils/toast";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/client-init";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";

// TranslationEditor dynamisch laden
const TranslationEditor = dynamic(
  () => import("@/components/campaigns/TranslationEditor").then((mod) => mod.TranslationEditor),
  { ssr: false, loading: () => <div className="h-48 bg-gray-100 rounded-md animate-pulse" /> }
);

interface TranslationEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  translation: ProjectTranslation | null;
  organizationId: string;
  projectId: string;
  onSaved?: () => void;
}

/** Angereicherte Boilerplate mit Original-Daten */
interface EnrichedBoilerplate {
  id: string;
  translatedContent: string;
  translatedTitle?: string | null;
  originalContent: string;
  originalTitle?: string;
  type: string;
  displayName: string;
}

/** Icon für Boilerplate-Typ */
const getBoilerplateIcon = (type: string) => {
  switch (type) {
    case 'lead':
      return <DocumentTextIcon className="h-4 w-4" />;
    case 'quote':
      return <ChatBubbleBottomCenterTextIcon className="h-4 w-4" />;
    case 'contact':
      return <PhoneIcon className="h-4 w-4" />;
    case 'boilerplate':
      return <UserIcon className="h-4 w-4" />;
    default:
      return <DocumentIcon className="h-4 w-4" />;
  }
};

/** Anzeige-Name für Boilerplate-Typ */
const getBoilerplateDisplayName = (
  type?: string,
  customTitle?: string,
  t?: (key: string) => string
): string => {
  if (customTitle) return customTitle;
  if (!t) return type || 'Boilerplate';

  const typeKey = type || 'default';
  return t(`boilerplateTypes.${typeKey}`);
};

/**
 * Modal zum Bearbeiten einer KI-generierten Übersetzung
 * Side-by-Side Ansicht: Original (DE) | Übersetzung (editierbar)
 */
export function TranslationEditModal({
  isOpen,
  onClose,
  translation,
  organizationId,
  projectId,
  onSaved,
}: TranslationEditModalProps) {
  const t = useTranslations('campaigns.translationEdit');

  // Campaign für Original-Daten
  const [campaign, setCampaign] = useState<PRCampaign | null>(null);
  const [loadingCampaign, setLoadingCampaign] = useState(false);

  // Form State
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [enrichedBoilerplates, setEnrichedBoilerplates] = useState<EnrichedBoilerplate[]>([]);

  // Mutation
  const { mutate: updateTranslation, isPending: isSaving } = useUpdateTranslation();

  // Campaign laden wenn Modal öffnet
  useEffect(() => {
    if (isOpen && translation?.campaignId) {
      loadCampaign(translation.campaignId);
    }
  }, [isOpen, translation?.campaignId]);

  // Campaign aus Firestore laden
  const loadCampaign = async (campaignId: string) => {
    setLoadingCampaign(true);
    try {
      const campaignDoc = await getDoc(doc(db, 'pr_campaigns', campaignId));
      if (campaignDoc.exists()) {
        const campaignData = { id: campaignDoc.id, ...campaignDoc.data() } as PRCampaign;
        setCampaign(campaignData);
      }
    } catch (error) {
      console.error('Fehler beim Laden der Campaign:', error);
    } finally {
      setLoadingCampaign(false);
    }
  };

  // Initialisiere Form wenn Modal öffnet oder Campaign geladen wurde
  useEffect(() => {
    if (isOpen && translation) {
      setTitle(translation.title || "");
      setContent(translation.content || "");

      // Boilerplates anreichern wenn Campaign geladen
      if (campaign) {
        const enriched = (translation.translatedBoilerplates || []).map(tb => {
          const original = campaign.boilerplateSections?.find(s => s.id === tb.id);
          return {
            id: tb.id,
            translatedContent: tb.translatedContent,
            translatedTitle: tb.translatedTitle,
            originalContent: original?.content || '',
            originalTitle: original?.customTitle,
            type: original?.type || 'boilerplate',
            displayName: getBoilerplateDisplayName(original?.type, original?.customTitle, t),
          };
        });
        setEnrichedBoilerplates(enriched);
      } else {
        // Fallback ohne Campaign-Daten
        const basic = (translation.translatedBoilerplates || []).map((tb, idx) => ({
          id: tb.id,
          translatedContent: tb.translatedContent,
          translatedTitle: tb.translatedTitle,
          originalContent: '',
          originalTitle: undefined,
          type: 'boilerplate',
          displayName: t('boilerplateFallback', { number: idx + 1 }),
        }));
        setEnrichedBoilerplates(basic);
      }
    }
  }, [isOpen, translation, campaign, t]);

  // Content-Änderung vom Editor
  const handleContentChange = useCallback((html: string) => {
    setContent(html);
  }, []);

  // Boilerplate-Content ändern
  const handleBoilerplateContentChange = useCallback((id: string, newContent: string) => {
    setEnrichedBoilerplates(prev =>
      prev.map(bp =>
        bp.id === id ? { ...bp, translatedContent: newContent } : bp
      )
    );
  }, []);

  // Speichern
  const handleSave = () => {
    if (!translation) return;

    const input: UpdateTranslationInput = {
      title: title.trim(),
      content: content,
      // Boilerplates zurück in das ursprüngliche Format konvertieren
      translatedBoilerplates: enrichedBoilerplates.map(bp => ({
        id: bp.id,
        translatedContent: bp.translatedContent,
        translatedTitle: bp.translatedTitle,
      })),
    };

    updateTranslation(
      {
        organizationId,
        projectId,
        translationId: translation.id,
        input,
      },
      {
        onSuccess: () => {
          toastService.success("Übersetzung gespeichert");
          onSaved?.();
          onClose();
        },
        onError: (error) => {
          toastService.error(`Fehler beim Speichern: ${error.message}`);
        },
      }
    );
  };

  if (!translation) return null;

  return (
    <Dialog open={isOpen} onClose={onClose} size="5xl">
      <DialogTitle>
        <div className="flex items-center gap-3">
          <PencilIcon className="h-5 w-5 text-purple-600" />
          <span>{t('title')}</span>
          <div className="flex items-center gap-2 ml-4">
            <LanguageFlagIcon languageCode={translation.language} />
            <Text className="text-base font-normal text-gray-600">
              {LANGUAGE_NAMES[translation.language] || translation.language}
            </Text>
          </div>
          <Badge color="purple" className="ml-auto text-xs">
            <SparklesIcon className="h-3 w-3 mr-1" />
            {t('aiGenerated')}
          </Badge>
        </div>
      </DialogTitle>

      <DialogBody className="space-y-6 max-h-[70vh] overflow-y-auto">
        {loadingCampaign ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600" />
          </div>
        ) : (
          <>
            {/* Titel */}
            <div className="bg-gray-50 rounded-lg p-4">
              <Text className="text-sm font-medium text-gray-700 mb-3">{t('sections.titleLabel')}</Text>
              <div className="grid grid-cols-2 gap-4">
                {/* Original */}
                <div>
                  <Text className="text-xs text-gray-500 mb-1">{t('sections.original')}</Text>
                  <div className="bg-white border border-gray-200 rounded-md p-3 text-sm text-gray-700">
                    {campaign?.title || '–'}
                  </div>
                </div>
                {/* Übersetzung */}
                <div>
                  <Text className="text-xs text-gray-500 mb-1">{t('sections.translation')}</Text>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder={t('sections.titlePlaceholder')}
                    disabled={isSaving}
                  />
                </div>
              </div>
            </div>

            {/* Hauptinhalt */}
            <div className="bg-gray-50 rounded-lg p-4">
              <Text className="text-sm font-medium text-gray-700 mb-3">{t('sections.mainContent')}</Text>
              <div className="grid grid-cols-2 gap-4">
                {/* Original */}
                <div>
                  <Text className="text-xs text-gray-500 mb-1">{t('sections.original')}</Text>
                  <div
                    className="bg-white border border-gray-200 rounded-md p-3 text-sm text-gray-700 prose prose-sm max-w-none overflow-y-auto"
                    style={{ minHeight: '200px', maxHeight: '400px' }}
                    dangerouslySetInnerHTML={{ __html: campaign?.mainContent || `<p class="text-gray-400">${t('sections.noOriginalContent')}</p>` }}
                  />
                </div>
                {/* Übersetzung */}
                <div>
                  <Text className="text-xs text-gray-500 mb-1">{t('sections.translation')}</Text>
                  <TranslationEditor
                    content={content}
                    onChange={handleContentChange}
                    disabled={isSaving}
                    minHeight="200px"
                  />
                </div>
              </div>
            </div>

            {/* Boilerplates */}
            {enrichedBoilerplates.length > 0 && (
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Text className="text-sm font-medium text-gray-700">{t('sections.boilerplates')}</Text>
                  <Badge color="zinc" className="text-xs">
                    {enrichedBoilerplates.length}
                  </Badge>
                </div>

                <div className="space-y-2">
                  {enrichedBoilerplates.map((bp, index) => (
                    <Disclosure key={bp.id} defaultOpen={index === 0}>
                      {({ open }) => (
                        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                          <DisclosureButton className="flex items-center justify-between w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors">
                            <div className="flex items-center gap-2">
                              <span className="text-gray-500">
                                {getBoilerplateIcon(bp.type)}
                              </span>
                              <span className="text-sm font-medium text-gray-700">
                                {bp.displayName}
                              </span>
                              <Badge color="zinc" className="text-xs">
                                {bp.type}
                              </Badge>
                            </div>
                            <ChevronDownIcon
                              className={`h-4 w-4 text-gray-500 transition-transform ${open ? 'rotate-180' : ''}`}
                            />
                          </DisclosureButton>

                          <DisclosurePanel className="px-4 pb-4">
                            <div className="grid grid-cols-2 gap-4 pt-2">
                              {/* Original */}
                              <div>
                                <Text className="text-xs text-gray-500 mb-1">{t('sections.original')}</Text>
                                <div
                                  className="bg-gray-50 border border-gray-200 rounded-md p-3 text-sm text-gray-700 prose prose-sm max-w-none overflow-y-auto"
                                  style={{ minHeight: '120px', maxHeight: '300px' }}
                                  dangerouslySetInnerHTML={{
                                    __html: bp.originalContent || `<p class="text-gray-400 italic">${t('sections.noOriginalAvailable')}</p>`
                                  }}
                                />
                              </div>
                              {/* Übersetzung */}
                              <div>
                                <Text className="text-xs text-gray-500 mb-1">{t('sections.translation')}</Text>
                                <TranslationEditor
                                  content={bp.translatedContent}
                                  onChange={(html) => handleBoilerplateContentChange(bp.id, html)}
                                  disabled={isSaving}
                                  minHeight="120px"
                                />
                              </div>
                            </div>
                          </DisclosurePanel>
                        </div>
                      )}
                    </Disclosure>
                  ))}
                </div>
              </div>
            )}

            {/* Hinweis */}
            <div className="p-3 bg-purple-50 border border-purple-100 rounded-lg">
              <div className="flex items-start gap-2">
                <SparklesIcon className="h-5 w-5 text-purple-500 shrink-0" />
                <Text className="text-sm text-purple-700">
                  {t.rich('hint', {
                    cta: (chunks) => <span className="font-bold mx-1">{chunks}</span>,
                    hashtags: (chunks) => <span className="text-blue-600 font-semibold mx-1">{chunks}</span>,
                    quotes: (chunks) => <span className="italic mx-1">{chunks}</span>,
                  })}
                </Text>
              </div>
            </div>
          </>
        )}
      </DialogBody>

      <DialogActions>
        <Button plain onClick={onClose} disabled={isSaving}>
          <XMarkIcon className="h-4 w-4 mr-1" />
          {t('actions.cancel')}
        </Button>
        <Button
          color="primary"
          onClick={handleSave}
          disabled={isSaving || !content.trim() || loadingCampaign}
          className="!bg-purple-600 hover:!bg-purple-700"
        >
          {isSaving ? (
            t('actions.saving')
          ) : (
            <>
              <CheckIcon className="h-4 w-4 mr-1" />
              {t('actions.save')}
            </>
          )}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default TranslationEditModal;
