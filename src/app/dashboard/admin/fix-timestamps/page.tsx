"use client";

import { useState } from "react";
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
      setProgress("❌ Nicht angemeldet");
      return;
    }

    setLoading(true);
    setProgress("🔍 Lade Kampagnen...");
    setResults(null);

    try {
      // Hole alle PR Kampagnen
      const campaignsRef = collection(db, 'pr_campaigns');
      const snapshot = await getDocs(campaignsRef);
      
      const total = snapshot.size;
      let fixed = 0;
      let skipped = 0;
      const errors: string[] = [];
      
      setProgress(`📊 ${total} Kampagnen gefunden. Starte Korrektur...`);

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
          
          setProgress(`⚙️ Korrigiere Kampagne ${fixed}/${total}: "${data.title}"`);
          
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
      
      setProgress("✅ Migration abgeschlossen!");
      
    } catch (error: any) {
      console.error('❌ Migration fehlgeschlagen:', error);
      setProgress(`❌ Fehler: ${error.message}`);
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
        <Heading>Timestamp Reparatur Tool</Heading>
        <Text className="mt-2 mb-6">
          Dieses Tool korrigiert fehlerhafte serverTimestamp() Platzhalter in PR Kampagnen.
        </Text>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-yellow-900 mb-2">⚠️ Wichtiger Hinweis</h3>
          <p className="text-yellow-800 text-sm">
            Diese Aktion wird alle Kampagnen mit fehlerhaften Timestamps korrigieren. 
            Die Operation kann nicht rückgängig gemacht werden. Stelle sicher, dass du ein Backup hast.
          </p>
        </div>

        {!results && (
          <div className="space-y-4">
            <Button 
              onClick={fixTimestamps} 
              disabled={loading}
              className="w-full"
            >
              {loading ? "Repariere Timestamps..." : "Timestamp Reparatur starten"}
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
                <p className="font-semibold">Migration abgeschlossen!</p>
                <ul className="text-sm space-y-1">
                  <li>📊 Gesamt: {results.total} Kampagnen</li>
                  <li>✅ Korrigiert: {results.fixed} Kampagnen</li>
                  <li>⏭️ Übersprungen: {results.skipped} Kampagnen (bereits korrekt)</li>
                  {results.errors.length > 0 && (
                    <li>❌ Fehler: {results.errors.length}</li>
                  )}
                </ul>
              </div>
            </div>

            {results.errors.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="space-y-2">
                  <p className="font-semibold text-red-900">Fehler aufgetreten:</p>
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
                Zu den Kampagnen
              </Button>
              <Button 
                onClick={() => {
                  setResults(null);
                  setProgress("");
                }}
color="zinc"
                className="flex-1"
              >
                Erneut prüfen
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}