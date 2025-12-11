"use client";

import { useState } from "react";
import { useTranslations } from 'next-intl';
import { useAuth } from "@/context/AuthContext";
import { useOrganization } from "@/context/OrganizationContext";
import { Heading } from "@/components/ui/heading";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/common/Alert";
import {
  collection,
  getDocs,
  updateDoc,
  doc,
  Timestamp,
  writeBatch
} from 'firebase/firestore';
import { db } from '@/lib/firebase/client-init';

export default function FixTimestampsPage() {
  const t = useTranslations('admin.fixTimestamps');
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<{
    total: number;
    fixed: number;
    skipped: number;
    errors: string[];
  } | null>(null);
  const [progress, setProgress] = useState<string>("");

  const fixTimestamps = async () => {
    if (!user || !currentOrganization) {
      setProgress(t('progress.notAuthenticated'));
      return;
    }

    setLoading(true);
    setProgress(t('progress.loading'));
    setResults(null);

    try {
      // Hole alle PR Kampagnen
      const campaignsRef = collection(db, 'pr_campaigns');
      const snapshot = await getDocs(campaignsRef);

      const total = snapshot.size;
      let fixed = 0;
      let skipped = 0;
      const errors: string[] = [];

      setProgress(t('progress.found', { total }));

      // Batch für Updates
      const batch = writeBatch(db);
      let batchCount = 0;
      
      for (const docSnap of snapshot.docs) {
        const data = docSnap.data();
        const updates: any = {};
        let needsUpdate = false;
        
        // Prüfe createdAt
        if (data.createdAt && 
            typeof data.createdAt === 'object' && 
            '_methodName' in data.createdAt &&
            (data.createdAt as any)._methodName === 'serverTimestamp') {
          
          console.log(`🔍 Kampagne "${data.title}" hat ungültiges createdAt`);
          
          // Erstelle einen Fallback-Timestamp
          const fallbackDate = new Date();
          
          // Nutze andere Daten als Referenz falls vorhanden
          if (data.sentAt && data.sentAt.toDate) {
            const sentDate = data.sentAt.toDate();
            fallbackDate.setTime(sentDate.getTime() - 24 * 60 * 60 * 1000); // 1 Tag vor Versand
          } else if (data.scheduledAt && data.scheduledAt.toDate) {
            const scheduledDate = data.scheduledAt.toDate();
            fallbackDate.setTime(scheduledDate.getTime() - 24 * 60 * 60 * 1000); // 1 Tag vor Planung
          } else {
            // Zufälliger Zeitpunkt in den letzten 30 Tagen
            const daysAgo = Math.floor(Math.random() * 30) + 1;
            fallbackDate.setTime(Date.now() - (daysAgo * 24 * 60 * 60 * 1000));
          }
          
          updates.createdAt = Timestamp.fromDate(fallbackDate);
          needsUpdate = true;
        }
        
        // Prüfe updatedAt
        if (data.updatedAt && 
            typeof data.updatedAt === 'object' && 
            '_methodName' in data.updatedAt &&
            (data.updatedAt as any)._methodName === 'serverTimestamp') {
          
          console.log(`🔍 Kampagne "${data.title}" hat ungültiges updatedAt`);
          updates.updatedAt = updates.createdAt || Timestamp.now();
          needsUpdate = true;
        }

        // Update zur Batch hinzufügen
        if (needsUpdate) {
          batch.update(doc(db, 'pr_campaigns', docSnap.id), updates);
          batchCount++;
          fixed++;

          setProgress(t('progress.fixing', { current: fixed, total, title: data.title }));

          // Commit batch alle 500 Dokumente (Firestore Limit)
          if (batchCount >= 500) {
            await batch.commit();
            console.log(`💾 Batch mit ${batchCount} Updates committed`);
            batchCount = 0;
          }
        } else {
          skipped++;
        }
      }

      // Commit verbleibende Updates
      if (batchCount > 0) {
        await batch.commit();
        console.log(`💾 Finaler Batch mit ${batchCount} Updates committed`);
      }

      setResults({
        total,
        fixed,
        skipped,
        errors
      });

      setProgress(t('progress.completed'));

    } catch (error: any) {
      console.error('❌ Migration fehlgeschlagen:', error);
      setProgress(t('progress.error', { message: error.message }));
      setResults({
        total: 0,
        fixed: 0,
        skipped: 0,
        errors: [error.message]
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-3xl mx-auto">
        <Heading>{t('title')}</Heading>
        <Text className="mt-2 mb-6">
          {t('description')}
        </Text>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-yellow-900 mb-2">{t('warning.title')}</h3>
          <p className="text-yellow-800 text-sm">
            {t('warning.message')}
          </p>
        </div>

        {!results && (
          <div className="space-y-4">
            <Button
              onClick={fixTimestamps}
              disabled={loading}
              className="w-full"
            >
              {loading ? t('button.repairing') : t('button.start')}
            </Button>

            {progress && (
              <div className="bg-gray-50 rounded-lg p-4">
                <Text className="font-mono text-sm">{progress}</Text>
              </div>
            )}
          </div>
        )}

        {results && (
          <div className="space-y-4">
            <div className={`rounded-lg p-4 ${results.fixed > 0 ? 'bg-green-50 border border-green-200' : 'bg-blue-50 border border-blue-200'}`}>
              <div className="space-y-2">
                <p className="font-semibold">{t('results.completed')}</p>
                <ul className="text-sm space-y-1">
                  <li>{t('results.total', { count: results.total })}</li>
                  <li>{t('results.fixed', { count: results.fixed })}</li>
                  <li>{t('results.skipped', { count: results.skipped })}</li>
                  {results.errors.length > 0 && (
                    <li>{t('results.errors', { count: results.errors.length })}</li>
                  )}
                </ul>
              </div>
            </div>

            {results.errors.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="space-y-2">
                  <p className="font-semibold text-red-900">{t('results.errorsOccurred')}</p>
                  <ul className="text-sm space-y-1 text-red-800">
                    {results.errors.map((error, i) => (
                      <li key={i}>{error}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            <div className="flex gap-4">
              <Button
                onClick={() => window.location.href = '/dashboard/pr-tools/campaigns'}
                className="flex-1"
              >
                {t('button.toCampaigns')}
              </Button>
              <Button
                onClick={() => {
                  setResults(null);
                  setProgress("");
                }}
                color="zinc"
                className="flex-1"
              >
                {t('button.checkAgain')}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}