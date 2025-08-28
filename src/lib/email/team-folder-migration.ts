// src/lib/email/team-folder-migration.ts
import {
  collection,
  getDocs,
  query,
  where,
  writeBatch,
  serverTimestamp,
  doc
} from 'firebase/firestore';
import { db } from '@/lib/firebase/client-init';
import { teamFolderService } from './team-folder-service';
import { teamMemberService } from '@/lib/firebase/organization-service';

// ============================================================================
// TEAM FOLDER SYSTEM MIGRATION
// ============================================================================

interface MigrationResult {
  success: boolean;
  processed: number;
  created: number;
  skipped: number;
  errors: string[];
}

/**
 * Migriert alle bestehenden Organisationen zum Team-Folder System
 */
export async function migrateAllOrganizations(): Promise<MigrationResult> {
  const result: MigrationResult = {
    success: true,
    processed: 0,
    created: 0,
    skipped: 0,
    errors: []
  };

  try {
    // Alle Organisationen über Team-Mitglieder finden
    const allTeamMembers = await getAllTeamMembers();
    const organizations = getUniqueOrganizations(allTeamMembers);


    for (const org of organizations) {
      try {
        result.processed++;
        
        // Prüfen ob bereits System-Ordner existieren
        const existingFolders = await teamFolderService.search(org.organizationId, {
          isSystem: true
        });

        if (existingFolders.length > 0) {
          result.skipped++;
          continue;
        }

        // System-Ordner für jedes Team-Mitglied erstellen
        const orgMembers = allTeamMembers.filter(m => m.organizationId === org.organizationId);
        
        // 1. Allgemeine Anfragen erstellen (einmalig pro Organisation)
        await createGeneralInboxFolder(org.organizationId, orgMembers[0]);
        result.created++;

        // 2. Persönliche Ordner für jedes Team-Mitglied
        for (const member of orgMembers) {
          await createPersonalFolder(org.organizationId, member);
          result.created++;
        }


      } catch (error) {
        const errorMsg = `Fehler bei Organisation ${org.organizationId}: ${error instanceof Error ? error.message : 'Unbekannt'}`;
        result.errors.push(errorMsg);
        result.success = false;
      }
    }


    return result;

  } catch (error) {
    result.success = false;
    result.errors.push(error instanceof Error ? error.message : 'Unbekannt');
    return result;
  }
}

/**
 * Migriert eine spezifische Organisation
 */
export async function migrateOrganization(organizationId: string): Promise<MigrationResult> {
  const result: MigrationResult = {
    success: true,
    processed: 0,
    created: 0,
    skipped: 0,
    errors: []
  };

  try {
    // Team-Mitglieder laden
    const members = await teamMemberService.getByOrganization(organizationId);
    
    if (members.length === 0) {
      throw new Error(`Keine Team-Mitglieder für Organisation ${organizationId} gefunden`);
    }

    // Prüfen ob bereits System-Ordner existieren
    const existingFolders = await teamFolderService.search(organizationId, {
      isSystem: true
    });

    if (existingFolders.length > 0) {
      result.skipped = 1;
      return result;
    }

    // 1. Allgemeine Anfragen erstellen
    await createGeneralInboxFolder(organizationId, members[0]);
    result.created++;

    // 2. Persönliche Ordner für jedes Team-Mitglied
    for (const member of members) {
      await createPersonalFolder(organizationId, member);
      result.created++;
    }

    return result;

  } catch (error) {
    result.success = false;
    result.errors.push(error instanceof Error ? error.message : 'Unbekannt');
    return result;
  }
}

/**
 * Migriert bestehende E-Mails zum Team-Folder System
 */
export async function migrateExistingEmails(organizationId?: string): Promise<MigrationResult> {
  const result: MigrationResult = {
    success: true,
    processed: 0,
    created: 0,
    skipped: 0,
    errors: []
  };

  try {

    // Alle E-Mail-Threads laden
    const emailThreadsRef = collection(db, 'email_threads');
    let threadsQuery = query(emailThreadsRef);
    
    if (organizationId) {
      threadsQuery = query(emailThreadsRef, where('organizationId', '==', organizationId));
    }

    const threadsSnapshot = await getDocs(threadsQuery);
    const threads = threadsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as any[];


    for (const thread of threads) {
      try {
        result.processed++;

        // Prüfen ob bereits Folder-Assignments existieren
        const existingAssignments = await teamFolderService.search((thread as any).organizationId, {
          threadId: thread.id
        });

        if (existingAssignments.length > 0) {
          result.skipped++;
          continue;
        }

        // System-Ordner "Allgemeine Anfragen" finden
        const generalInboxFolder = await teamFolderService.search((thread as any).organizationId, {
          isSystem: true,
          name: "📥 Allgemeine Anfragen"
        });

        if (generalInboxFolder.length === 0) {
          result.errors.push(`Allgemeine Anfragen Ordner nicht gefunden für Organisation ${(thread as any).organizationId}`);
          continue;
        }

        // E-Mail zu "Allgemeine Anfragen" zuweisen
        await (teamFolderService as any).moveEmailToFolder(
          thread.id,
          generalInboxFolder[0].id!,
          'migration',
          (thread as any).organizationId,
          true // isPrimary
        );

        // Falls bereits einem Team-Mitglied zugewiesen, auch in dessen persönlichen Ordner
        if ((thread as any).assignedToUserId) {
          const personalFolders = await teamFolderService.search((thread as any).organizationId, {
            isSystem: true,
            ownerId: (thread as any).assignedToUserId
          });

          if (personalFolders.length > 0) {
            await (teamFolderService as any).moveEmailToFolder(
              thread.id,
              personalFolders[0].id!,
              'migration',
              (thread as any).organizationId,
              false // nicht primary
            );
          }
        }

        result.created++;

        if (result.processed % 100 === 0) {
        }

      } catch (error) {
        const errorMsg = `E-Mail ${thread.id}: ${error instanceof Error ? error.message : 'Unbekannt'}`;
        result.errors.push(errorMsg);
      }
    }


    return result;

  } catch (error) {
    result.success = false;
    result.errors.push(error instanceof Error ? error.message : 'Unbekannt');
    return result;
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Lädt alle Team-Mitglieder aus der Datenbank
 */
async function getAllTeamMembers() {
  try {
    const q = query(collection(db, 'team_members'));
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as any[];
  } catch (error) {
    return [];
  }
}

/**
 * Extrahiert eindeutige Organisationen aus Team-Mitgliedern
 */
function getUniqueOrganizations(teamMembers: any[]): Array<{ 
  organizationId: string; 
  organizationName: string; 
}> {
  const orgMap = new Map<string, string>();
  
  teamMembers.forEach(member => {
    if (member.organizationId && !orgMap.has(member.organizationId)) {
      orgMap.set(member.organizationId, member.organizationName || member.organizationId);
    }
  });

  return Array.from(orgMap.entries()).map(([id, name]) => ({
    organizationId: id,
    organizationName: name
  }));
}

/**
 * Erstellt "Allgemeine Anfragen" Ordner
 */
async function createGeneralInboxFolder(organizationId: string, creator: any) {
  const folderData = {
    name: "📥 Allgemeine Anfragen",
    description: "Geteilter Posteingang für alle Team-Mitglieder",
    icon: "📥",
    color: "#3B82F6",
    ownerId: "system",
    ownerName: "System",
    path: ["Allgemeine Anfragen"],
    isShared: true,
    isSystem: true,
    autoAssignRules: [],
    organizationId,
    userId: creator.userId,
    unreadCount: 0,
    level: 0,
    emailCount: 0
  } as any;

  return await teamFolderService.create(folderData, {
    organizationId,
    userId: creator.userId
  });
}

/**
 * Erstellt persönlichen Ordner für Team-Mitglied
 */
async function createPersonalFolder(organizationId: string, member: any) {
  const folderData = {
    name: `👤 ${member.displayName}`,
    description: `Persönlicher Ordner für ${member.displayName}`,
    icon: "👤",
    color: "#10B981",
    ownerId: member.userId,
    ownerName: member.displayName,
    path: [member.displayName],
    isShared: false,
    isSystem: true,
    autoAssignRules: [],
    organizationId,
    userId: member.userId,
    unreadCount: 0,
    level: 0,
    emailCount: 0
  } as any;

  return await teamFolderService.create(folderData, {
    organizationId,
    userId: member.userId
  });
}

/**
 * CLI-Interface für Migration
 */
export async function runMigration(args: {
  type: 'folders' | 'emails' | 'all';
  organizationId?: string;
  dryRun?: boolean;
}) {
  
  if (args.dryRun) {
  }

  let results: MigrationResult[] = [];

  switch (args.type) {
    case 'folders':
      if (args.organizationId) {
        results.push(await migrateOrganization(args.organizationId));
      } else {
        results.push(await migrateAllOrganizations());
      }
      break;

    case 'emails':
      results.push(await migrateExistingEmails(args.organizationId));
      break;

    case 'all':
      if (args.organizationId) {
        results.push(await migrateOrganization(args.organizationId));
        results.push(await migrateExistingEmails(args.organizationId));
      } else {
        results.push(await migrateAllOrganizations());
        results.push(await migrateExistingEmails());
      }
      break;
  }

  // Zusammenfassung
  const totalProcessed = results.reduce((sum, r) => sum + r.processed, 0);
  const totalCreated = results.reduce((sum, r) => sum + r.created, 0);
  const totalSkipped = results.reduce((sum, r) => sum + r.skipped, 0);
  const allErrors = results.flatMap(r => r.errors);


  if (allErrors.length > 0) {
  }

  return {
    success: results.every(r => r.success),
    totalProcessed,
    totalCreated,
    totalSkipped,
    errors: allErrors
  };
}