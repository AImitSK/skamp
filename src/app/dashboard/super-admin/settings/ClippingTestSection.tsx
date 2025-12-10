'use client';

/**
 * ClippingTestSection
 *
 * Plan 05: Test-Tools für das Clipping/Monitoring-System
 * Ermöglicht das Testen von Keyword-Extraktion, Match-Scores und Artikel-Simulation
 */

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  BeakerIcon,
  SparklesIcon,
  TrashIcon,
  CheckCircleIcon,
  XCircleIcon,
  DocumentTextIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { useAuth } from '@/hooks/useAuth';
import { useOrganization } from '@/context/OrganizationContext';

// Typen für die Test-Ergebnisse
interface KeywordExtractionResult {
  primary: string;
  all: string[];
  removedLegalForms: string[];
}

interface MatchScoreResult {
  shouldConfirm: boolean;
  reason: 'company_in_title' | 'company_plus_seo' | 'company_only' | 'no_company_match';
  companyMatch: {
    found: boolean;
    inTitle: boolean;
    matchedKeyword: string | null;
  };
  seoScore: number;
  confidence: 'low' | 'medium' | 'high' | 'very_high';
}

interface TestDataStats {
  projects: number;
  companies: number;
  campaigns: number;
  clippings: number;
  suggestions: number;
}

export default function ClippingTestSection() {
  const t = useTranslations('superadmin.settings.clippingTest');
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();
  const [loading, setLoading] = useState(false);

  // 1. Keyword-Extraktion State
  const [companyName, setCompanyName] = useState('');
  const [officialName, setOfficialName] = useState('');
  const [tradingName, setTradingName] = useState('');
  const [keywordResult, setKeywordResult] = useState<KeywordExtractionResult | null>(null);

  // 2. Match-Score State
  const [testFirmenname, setTestFirmenname] = useState('');
  const [testTitel, setTestTitel] = useState('');
  const [testContent, setTestContent] = useState('');
  const [testSeoKeywords, setTestSeoKeywords] = useState('');
  const [matchResult, setMatchResult] = useState<MatchScoreResult | null>(null);

  // 4. Test-Daten State
  const [testDataStats, setTestDataStats] = useState<TestDataStats | null>(null);

  /**
   * 1. Keyword-Extraktion testen
   */
  const handleTestKeywordExtraction = async () => {
    if (!companyName.trim()) {
      toast.error(t('keywordTest.errorNoName'));
      return;
    }

    setLoading(true);
    try {
      // Importiere die Browser-kompatible Version
      const { extractCompanyKeywords } = await import('@/lib/clipping/keyword-utils');

      const result = extractCompanyKeywords({
        name: companyName,
        officialName: officialName || undefined,
        tradingName: tradingName || undefined
      });

      // Finde entfernte Rechtsformen
      const legalForms = ['GmbH', 'AG', 'Ltd.', 'Inc.', 'LLC', 'UG', 'KG', 'e.V.', 'SE', 'OHG'];
      const removedLegalForms = legalForms.filter(form =>
        companyName.includes(form) || officialName?.includes(form) || tradingName?.includes(form)
      );

      setKeywordResult({
        primary: result.primary,
        all: result.all,
        removedLegalForms
      });

      toast.success(t('keywordTest.success', { count: result.all.length }));
    } catch (error) {
      console.error('Keyword extraction failed:', error);
      toast.error(t('keywordTest.error'));
    } finally {
      setLoading(false);
    }
  };

  /**
   * 2. Match-Score testen
   */
  const handleTestMatchScore = async () => {
    if (!testFirmenname.trim() || !testTitel.trim()) {
      toast.error(t('matchScoreTest.errorNameAndTitle'));
      return;
    }

    setLoading(true);
    try {
      // Importiere die Browser-kompatible Version
      const { extractCompanyKeywords, checkAutoConfirm, determineConfidence } =
        await import('@/lib/clipping/keyword-utils');

      // Keywords aus Firmennamen extrahieren
      const keywords = extractCompanyKeywords({ name: testFirmenname });

      // SEO-Keywords parsen (kommasepariert)
      const seoKeywords = testSeoKeywords
        .split(',')
        .map(k => k.trim())
        .filter(k => k.length > 0);

      // Auto-Confirm prüfen
      const result = checkAutoConfirm(
        { title: testTitel, content: testContent },
        keywords.all,
        seoKeywords
      );

      const confidence = determineConfidence(result);

      setMatchResult({
        ...result,
        confidence
      });

      toast.success(t('matchScoreTest.success'));
    } catch (error) {
      console.error('Match score test failed:', error);
      toast.error(t('matchScoreTest.error'));
    } finally {
      setLoading(false);
    }
  };

  /**
   * 4a. Test-Daten erstellen
   * TODO: Modul '@/lib/clipping/seed-clipping-test-data' muss noch erstellt werden
   */
  const handleSeedTestData = async () => {
    if (!user || !currentOrganization) {
      toast.error(t('testData.errorNotAuthenticated'));
      return;
    }

    if (!confirm(t('testData.confirmCreate'))) {
      return;
    }

    const toastId = toast.loading(t('testData.creating'));
    setLoading(true);

    try {
      // TODO: Implementierung fehlt - Modul existiert noch nicht
      // const { seedClippingTestData } = await import('@/lib/clipping/seed-clipping-test-data');
      // const stats = await seedClippingTestData(currentOrganization.id, user.uid);

      // Temporäre Dummy-Daten
      const stats: TestDataStats = {
        projects: 0,
        companies: 0,
        campaigns: 0,
        clippings: 0,
        suggestions: 0
      };

      setTestDataStats(stats);
      toast.error(t('testData.notImplemented'), { id: toastId });
    } catch (error) {
      console.error('Seed test data failed:', error);
      toast.error(t('testData.errorCreating'), { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  /**
   * 4b. Test-Daten löschen
   * TODO: Modul '@/lib/clipping/seed-clipping-test-data' muss noch erstellt werden
   */
  const handleCleanupTestData = async () => {
    if (!currentOrganization) {
      toast.error(t('testData.errorNoOrganization'));
      return;
    }

    if (!confirm(t('testData.confirmDelete'))) {
      return;
    }

    const toastId = toast.loading(t('testData.deleting'));
    setLoading(true);

    try {
      // TODO: Implementierung fehlt - Modul existiert noch nicht
      // const { cleanupClippingTestData } = await import('@/lib/clipping/seed-clipping-test-data');
      // await cleanupClippingTestData(currentOrganization.id);

      setTestDataStats(null);
      toast.error(t('testData.notImplemented'), { id: toastId });
    } catch (error) {
      console.error('Cleanup test data failed:', error);
      toast.error(t('testData.errorDeleting'), { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Keyword-Extraktion Test */}
      <div className="p-4 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50">
        <div className="flex items-center gap-2 mb-3">
          <MagnifyingGlassIcon className="size-5 text-blue-600" />
          <h4 className="font-medium text-zinc-900 dark:text-white">
            {t('keywordTest.title')}
          </h4>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
          <input
            type="text"
            placeholder={t('keywordTest.namePlaceholder')}
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            className="px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-md bg-white dark:bg-zinc-800 text-sm"
          />
          <input
            type="text"
            placeholder={t('keywordTest.officialNamePlaceholder')}
            value={officialName}
            onChange={(e) => setOfficialName(e.target.value)}
            className="px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-md bg-white dark:bg-zinc-800 text-sm"
          />
          <input
            type="text"
            placeholder={t('keywordTest.tradingNamePlaceholder')}
            value={tradingName}
            onChange={(e) => setTradingName(e.target.value)}
            className="px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-md bg-white dark:bg-zinc-800 text-sm"
          />
        </div>

        <Button
          color="primary"
          onClick={handleTestKeywordExtraction}
          disabled={loading || !companyName.trim()}
          className="mb-3"
        >
          <BeakerIcon className="size-4" />
          {t('keywordTest.extractButton')}
        </Button>

        {keywordResult && (
          <div className="p-3 bg-white dark:bg-zinc-800 rounded border border-zinc-200 dark:border-zinc-700">
            <div className="text-sm mb-2">
              <span className="text-zinc-500">{t('keywordTest.primaryLabel')}:</span>{' '}
              <span className="font-medium text-zinc-900 dark:text-white">{keywordResult.primary}</span>
            </div>
            <div className="flex flex-wrap gap-1 mb-2">
              {keywordResult.all.map((kw, i) => (
                <Badge key={i} color="blue">{kw}</Badge>
              ))}
            </div>
            {keywordResult.removedLegalForms.length > 0 && (
              <div className="text-xs text-zinc-500">
                {t('keywordTest.legalFormsLabel')}: {keywordResult.removedLegalForms.join(', ')}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 2. Match-Score Test */}
      <div className="p-4 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50">
        <div className="flex items-center gap-2 mb-3">
          <SparklesIcon className="size-5 text-purple-600" />
          <h4 className="font-medium text-zinc-900 dark:text-white">
            {t('matchScoreTest.title')}
          </h4>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
          <input
            type="text"
            placeholder={t('matchScoreTest.companyPlaceholder')}
            value={testFirmenname}
            onChange={(e) => setTestFirmenname(e.target.value)}
            className="px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-md bg-white dark:bg-zinc-800 text-sm"
          />
          <input
            type="text"
            placeholder={t('matchScoreTest.seoPlaceholder')}
            value={testSeoKeywords}
            onChange={(e) => setTestSeoKeywords(e.target.value)}
            className="px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-md bg-white dark:bg-zinc-800 text-sm"
          />
        </div>

        <input
          type="text"
          placeholder={t('matchScoreTest.titlePlaceholder')}
          value={testTitel}
          onChange={(e) => setTestTitel(e.target.value)}
          className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-md bg-white dark:bg-zinc-800 text-sm mb-3"
        />

        <textarea
          placeholder={t('matchScoreTest.contentPlaceholder')}
          value={testContent}
          onChange={(e) => setTestContent(e.target.value)}
          rows={3}
          className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-md bg-white dark:bg-zinc-800 text-sm mb-3"
        />

        <Button
          color="indigo"
          onClick={handleTestMatchScore}
          disabled={loading || !testFirmenname.trim() || !testTitel.trim()}
          className="mb-3"
        >
          <BeakerIcon className="size-4" />
          {t('matchScoreTest.calculateButton')}
        </Button>

        {matchResult && (
          <div className="p-3 bg-white dark:bg-zinc-800 rounded border border-zinc-200 dark:border-zinc-700">
            <div className="flex items-center gap-3 mb-3">
              {matchResult.shouldConfirm ? (
                <Badge color="green" className="flex items-center gap-1">
                  <CheckCircleIcon className="size-4" />
                  AUTO-CONFIRM
                </Badge>
              ) : (
                <Badge color="amber" className="flex items-center gap-1">
                  <XCircleIcon className="size-4" />
                  MANUAL REVIEW
                </Badge>
              )}
              <Badge color={
                matchResult.confidence === 'very_high' ? 'green' :
                matchResult.confidence === 'high' ? 'blue' :
                matchResult.confidence === 'medium' ? 'amber' : 'zinc'
              }>
                {matchResult.confidence}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-zinc-500">{t('matchScoreTest.reasonLabel')}:</span>{' '}
                <span className="font-medium">{matchResult.reason}</span>
              </div>
              <div>
                <span className="text-zinc-500">{t('matchScoreTest.seoScoreLabel')}:</span>{' '}
                <span className="font-medium">{matchResult.seoScore}%</span>
              </div>
              <div>
                <span className="text-zinc-500">{t('matchScoreTest.companyFoundLabel')}:</span>{' '}
                <span className="font-medium">{matchResult.companyMatch.found ? t('common.yes') : t('common.no')}</span>
              </div>
              <div>
                <span className="text-zinc-500">{t('matchScoreTest.inTitleLabel')}:</span>{' '}
                <span className="font-medium">{matchResult.companyMatch.inTitle ? t('common.yes') : t('common.no')}</span>
              </div>
            </div>

            {matchResult.companyMatch.matchedKeyword && (
              <div className="mt-2 text-sm">
                <span className="text-zinc-500">{t('matchScoreTest.matchedKeywordLabel')}:</span>{' '}
                <Badge color="blue">{matchResult.companyMatch.matchedKeyword}</Badge>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 4. Test-Daten Generator */}
      <div className="p-4 rounded-lg border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/10">
        <div className="flex items-center gap-2 mb-3">
          <DocumentTextIcon className="size-5 text-green-600" />
          <h4 className="font-medium text-zinc-900 dark:text-white">
            {t('testData.title')}
          </h4>
        </div>

        <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
          {t('testData.description')}
        </p>

        <div className="flex flex-wrap gap-3 mb-3">
          <Button
            color="primary"
            onClick={handleSeedTestData}
            disabled={loading}
          >
            <SparklesIcon className="size-4" />
            {t('testData.createButton')}
          </Button>

          <Button
            color="secondary"
            onClick={handleCleanupTestData}
            disabled={loading}
          >
            <TrashIcon className="size-4" />
            {t('testData.deleteButton')}
          </Button>
        </div>

        {testDataStats && (
          <div className="p-3 bg-white dark:bg-zinc-800 rounded border border-green-200 dark:border-green-700">
            <div className="text-sm text-zinc-600 dark:text-zinc-400">
              {t('testData.statsLabel', {
                projects: testDataStats.projects,
                companies: testDataStats.companies,
                campaigns: testDataStats.campaigns,
                clippings: testDataStats.clippings,
                suggestions: testDataStats.suggestions
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
