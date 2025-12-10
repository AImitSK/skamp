'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { findOrCreateCompany } from '@/lib/matching/company-finder';
import { findPublications } from '@/lib/matching/publication-finder';
import { calculateSimilarity, findBestCompanyMatches } from '@/lib/matching/string-similarity';
import { useOrganization } from '@/context/OrganizationContext';
import { useAuth } from '@/context/AuthContext';
import toast from 'react-hot-toast';

export default function MatchingTestSection() {
  const t = useTranslations('superadmin.settings.matchingTest');
  const { currentOrganization } = useOrganization();
  const { user } = useAuth();

  // Test 1: String Similarity
  const [testName1, setTestName1] = useState('');
  const [testName2, setTestName2] = useState('');
  const [similarityResult, setSimilarityResult] = useState<any>(null);

  // Test 2: Company Finder
  const [companyTestName, setCompanyTestName] = useState('');
  const [companyTestDomain, setCompanyTestDomain] = useState('');
  const [companyResults, setCompanyResults] = useState<any[]>([]);

  // Test 3: Publication Finder
  const [pubTestName, setPubTestName] = useState('');
  const [pubResults, setPubResults] = useState<any[]>([]);

  /**
   * Test 1: String Similarity
   */
  const handleTestSimilarity = () => {
    if (!testName1 || !testName2) {
      toast.error(t('similarityTest.errorBothNames'));
      return;
    }

    const similarity = calculateSimilarity(testName1, testName2);
    setSimilarityResult({
      name1: testName1,
      name2: testName2,
      similarity: similarity,
      match: similarity >= 80
    });
  };

  /**
   * Test 2: Company Finder
   */
  const handleTestCompanyFinder = async () => {
    if (!currentOrganization || !user) {
      toast.error(t('companyTest.errorNotLoggedIn'));
      return;
    }

    if (!companyTestName && !companyTestDomain) {
      toast.error(t('companyTest.errorNameOrDomain'));
      return;
    }

    try {
      // Erstelle Test-Varianten
      const testVariants = [{
        organizationId: 'test',
        organizationName: 'Test Org',
        contactId: 'test-contact',
        contactData: {
          name: { firstName: 'Test', lastName: 'User' },
          displayName: 'Test User',
          emails: companyTestDomain ? [{ email: `test@${companyTestDomain}`, type: 'business' as const, isPrimary: true }] : [],
          companyName: companyTestName || undefined,
          hasMediaProfile: false
        }
      }];

      const result = await findOrCreateCompany(testVariants, currentOrganization.id, user.uid);
      setCompanyResults([result]);

    } catch (error) {
      console.error('Company test failed:', error);
      toast.error(t('companyTest.errorFailed'));
    }
  };

  /**
   * Test 3: Publication Finder
   */
  const handleTestPublicationFinder = async () => {
    if (!currentOrganization) {
      toast.error(t('publicationTest.errorNoOrganization'));
      return;
    }

    if (!pubTestName) {
      toast.error(t('publicationTest.errorNoName'));
      return;
    }

    try {
      // Erstelle Test-Varianten
      const testVariants = [{
        organizationId: 'test',
        organizationName: 'Test Org',
        contactId: 'test-contact',
        contactData: {
          name: { firstName: 'Test', lastName: 'User' },
          displayName: 'Test User',
          emails: [],
          hasMediaProfile: true,
          publications: [pubTestName]
        }
      }];

      const results = await findPublications(null, testVariants, currentOrganization.id);
      setPubResults(results);

    } catch (error) {
      console.error('Publication test failed:', error);
      toast.error(t('publicationTest.errorFailed'));
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">
          {t('title')}
        </h2>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          {t('description')}
        </p>
      </div>

      {/* Test 1: String Similarity */}
      <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-6">
        <h3 className="text-base font-semibold text-zinc-900 dark:text-white mb-4">
          {t('similarityTest.title')}
        </h3>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              {t('similarityTest.name1Label')}
            </label>
            <input
              type="text"
              value={testName1}
              onChange={(e) => setTestName1(e.target.value)}
              placeholder={t('similarityTest.name1Placeholder')}
              className="w-full px-3 py-2 border border-zinc-200 dark:border-zinc-700 rounded-md"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              {t('similarityTest.name2Label')}
            </label>
            <input
              type="text"
              value={testName2}
              onChange={(e) => setTestName2(e.target.value)}
              placeholder={t('similarityTest.name2Placeholder')}
              className="w-full px-3 py-2 border border-zinc-200 dark:border-zinc-700 rounded-md"
            />
          </div>
        </div>

        <Button onClick={handleTestSimilarity}>
          {t('similarityTest.calculateButton')}
        </Button>

        {similarityResult && (
          <div className="mt-4 p-4 bg-zinc-50 dark:bg-zinc-800 rounded-lg">
            <div className="text-sm">
              <strong>"{similarityResult.name1}"</strong> vs <strong>"{similarityResult.name2}"</strong>
            </div>
            <div className="mt-2">
              {t('similarityTest.similarity')}: <Badge color={similarityResult.match ? 'green' : 'red'}>
                {similarityResult.similarity}%
              </Badge>
            </div>
          </div>
        )}
      </div>

      {/* Test 2: Company Finder */}
      <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-6">
        <h3 className="text-base font-semibold text-zinc-900 dark:text-white mb-4">
          {t('companyTest.title')}
        </h3>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              {t('companyTest.nameLabel')}
            </label>
            <input
              type="text"
              value={companyTestName}
              onChange={(e) => setCompanyTestName(e.target.value)}
              placeholder={t('companyTest.namePlaceholder')}
              className="w-full px-3 py-2 border border-zinc-200 dark:border-zinc-700 rounded-md"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              {t('companyTest.domainLabel')}
            </label>
            <input
              type="text"
              value={companyTestDomain}
              onChange={(e) => setCompanyTestDomain(e.target.value)}
              placeholder={t('companyTest.domainPlaceholder')}
              className="w-full px-3 py-2 border border-zinc-200 dark:border-zinc-700 rounded-md"
            />
          </div>
        </div>

        <Button onClick={handleTestCompanyFinder}>
          {t('companyTest.findButton')}
        </Button>

        {companyResults.length > 0 && (
          <div className="mt-4 space-y-2">
            {companyResults.map((result, index) => (
              <div key={index} className="p-4 bg-zinc-50 dark:bg-zinc-800 rounded-lg">
                <div className="text-sm">
                  <strong>{result.companyName || t('companyTest.noCompanyFound')}</strong>
                </div>
                <div className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
                  {t('companyTest.method')}: {result.method} |
                  {t('companyTest.confidence')}: <Badge color={result.confidence === 'high' ? 'green' : 'yellow'}>
                    {result.confidence}
                  </Badge> |
                  {t('companyTest.created')}: {result.wasCreated ? t('common.yes') : t('common.no')}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Test 3: Publication Finder */}
      <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-6">
        <h3 className="text-base font-semibold text-zinc-900 dark:text-white mb-4">
          {t('publicationTest.title')}
        </h3>

        <div className="mb-4">
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
            {t('publicationTest.nameLabel')}
          </label>
          <input
            type="text"
            value={pubTestName}
            onChange={(e) => setPubTestName(e.target.value)}
            placeholder={t('publicationTest.namePlaceholder')}
            className="w-full px-3 py-2 border border-zinc-200 dark:border-zinc-700 rounded-md"
          />
        </div>

        <Button onClick={handleTestPublicationFinder}>
          {t('publicationTest.findButton')}
        </Button>

        {pubResults.length > 0 && (
          <div className="mt-4 space-y-2">
            {pubResults.map((result, index) => (
              <div key={index} className="p-4 bg-zinc-50 dark:bg-zinc-800 rounded-lg">
                <div className="text-sm">
                  <strong>{result.publicationName}</strong>
                </div>
                <div className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
                  {t('publicationTest.matchType')}: {result.matchType} |
                  {t('publicationTest.confidence')}: <Badge color={result.confidence > 0.8 ? 'green' : 'yellow'}>
                    {Math.round(result.confidence * 100)}%
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}