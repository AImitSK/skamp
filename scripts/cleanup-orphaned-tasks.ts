/**
 * Cleanup-Script für verwaiste Tasks
 *
 * Dieses Script findet und löscht Tasks, deren zugehöriges Projekt
 * nicht mehr existiert.
 *
 * Ausführung:
 * npx tsx scripts/cleanup-orphaned-tasks.ts
 *
 * WICHTIG: Vor der Ausführung sicherstellen, dass die Firebase-Credentials
 * korrekt konfiguriert sind (GOOGLE_APPLICATION_CREDENTIALS oder .env)
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Lade .env.local
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

// Firebase Admin initialisieren (falls noch nicht geschehen)
if (getApps().length === 0) {
  // Versuche Service Account aus FIREBASE_ADMIN_SERVICE_ACCOUNT (JSON-String)
  const serviceAccountJson = process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT;

  if (serviceAccountJson) {
    try {
      const serviceAccount = JSON.parse(serviceAccountJson);
      initializeApp({
        credential: cert(serviceAccount)
      });
      console.log('Firebase Admin mit FIREBASE_ADMIN_SERVICE_ACCOUNT initialisiert.');
    } catch (e) {
      console.error('Fehler beim Parsen von FIREBASE_ADMIN_SERVICE_ACCOUNT:', e);
      process.exit(1);
    }
  } else {
    // Fallback: Versuche aus Datei zu laden
    const serviceAccountPath = process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT_PATH;
    if (serviceAccountPath) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const serviceAccountKey = require(serviceAccountPath);
        initializeApp({
          credential: cert(serviceAccountKey)
        });
        console.log('Firebase Admin mit Service Account Datei initialisiert.');
      } catch {
        console.error('Fehler: Service Account Datei nicht gefunden:', serviceAccountPath);
        process.exit(1);
      }
    } else {
      console.error('Fehler: Keine Firebase-Credentials gefunden.');
      console.error('Bitte FIREBASE_ADMIN_SERVICE_ACCOUNT oder FIREBASE_ADMIN_SERVICE_ACCOUNT_PATH in .env.local setzen.');
      process.exit(1);
    }
  }
}

const db = getFirestore();

interface CleanupResult {
  organizationId: string;
  totalTasks: number;
  orphanedTasks: number;
  deletedTasks: string[];
  errors: string[];
}

async function cleanupOrphanedTasks(dryRun: boolean = true): Promise<CleanupResult[]> {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Cleanup verwaister Tasks - ${dryRun ? 'DRY RUN (keine Änderungen)' : 'LIVE MODE'}`);
  console.log(`${'='.repeat(60)}\n`);

  const results: CleanupResult[] = [];

  try {
    // Hole alle Organisationen (aus tasks, da wir dort suchen)
    const tasksSnapshot = await db.collection('tasks').get();
    const organizationIds = new Set<string>();

    tasksSnapshot.docs.forEach(doc => {
      const orgId = doc.data().organizationId;
      if (orgId) organizationIds.add(orgId);
    });

    console.log(`Gefundene Organisationen: ${organizationIds.size}`);

    for (const organizationId of organizationIds) {
      console.log(`\n--- Organisation: ${organizationId} ---`);

      const result: CleanupResult = {
        organizationId,
        totalTasks: 0,
        orphanedTasks: 0,
        deletedTasks: [],
        errors: []
      };

      try {
        // Hole alle Projekte der Organisation
        const projectsSnapshot = await db
          .collection('projects')
          .where('organizationId', '==', organizationId)
          .get();

        const validProjectIds = new Set(projectsSnapshot.docs.map(d => d.id));
        console.log(`  Gültige Projekte: ${validProjectIds.size}`);

        // Hole alle Tasks der Organisation
        const orgTasksSnapshot = await db
          .collection('tasks')
          .where('organizationId', '==', organizationId)
          .get();

        result.totalTasks = orgTasksSnapshot.size;
        console.log(`  Gesamte Tasks: ${result.totalTasks}`);

        // Finde verwaiste Tasks
        for (const taskDoc of orgTasksSnapshot.docs) {
          const data = taskDoc.data();
          const taskProjectId = data.projectId || data.linkedProjectId;

          if (taskProjectId && !validProjectIds.has(taskProjectId)) {
            result.orphanedTasks++;

            console.log(`  [VERWAIST] Task "${data.title || taskDoc.id}" -> Projekt ${taskProjectId} existiert nicht`);

            if (!dryRun) {
              try {
                await db.collection('tasks').doc(taskDoc.id).delete();
                result.deletedTasks.push(taskDoc.id);
                console.log(`    -> GELÖSCHT`);
              } catch (error) {
                const errorMsg = `Fehler beim Löschen von Task ${taskDoc.id}: ${error}`;
                result.errors.push(errorMsg);
                console.error(`    -> FEHLER: ${error}`);
              }
            }
          }
        }

        console.log(`  Verwaiste Tasks: ${result.orphanedTasks}`);
        if (!dryRun) {
          console.log(`  Gelöschte Tasks: ${result.deletedTasks.length}`);
        }

      } catch (error) {
        result.errors.push(`Fehler bei Organisation ${organizationId}: ${error}`);
        console.error(`  FEHLER: ${error}`);
      }

      results.push(result);
    }

  } catch (error) {
    console.error('Kritischer Fehler:', error);
  }

  // Zusammenfassung
  console.log(`\n${'='.repeat(60)}`);
  console.log('ZUSAMMENFASSUNG');
  console.log(`${'='.repeat(60)}`);

  let totalOrphaned = 0;
  let totalDeleted = 0;

  for (const result of results) {
    totalOrphaned += result.orphanedTasks;
    totalDeleted += result.deletedTasks.length;
  }

  console.log(`Geprüfte Organisationen: ${results.length}`);
  console.log(`Verwaiste Tasks gefunden: ${totalOrphaned}`);

  if (!dryRun) {
    console.log(`Gelöschte Tasks: ${totalDeleted}`);
  } else {
    console.log(`\nUm die Tasks zu löschen, führe das Script mit --live aus:`);
    console.log(`npx tsx scripts/cleanup-orphaned-tasks.ts --live`);
  }

  return results;
}

// Script ausführen
const args = process.argv.slice(2);
const dryRun = !args.includes('--live');

cleanupOrphanedTasks(dryRun)
  .then(() => {
    console.log('\nCleanup abgeschlossen.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Script fehlgeschlagen:', error);
    process.exit(1);
  });
