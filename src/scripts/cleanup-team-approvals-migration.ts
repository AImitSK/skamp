// cleanup-team-approvals-migration.ts - Finale Bereinigung des Team-Approval Systems
import { db } from '@/lib/firebase/client-init';
import { 
  collection, 
  getDocs, 
  writeBatch, 
  query, 
  where, 
  doc,
  updateDoc,
  serverTimestamp 
} from 'firebase/firestore';

interface MigrationResult {
  teamApprovalsDeleted: number;
  campaignsUpdated: number;
  pdfVersionsUpdated: number;
  errors: string[];
}

/**
 * FINALE TEAM-APPROVAL BEREINIGUNG
 * 
 * Diese Migration:
 * 1. Löscht alle team-approvals Collections
 * 2. Bereinigt Campaign approvalData (entfernt Team-Felder)
 * 3. Konvertiert pending_team PDF-Status zu pending_customer
 * 4. Erstellt Backup-Log der gelöschten Daten
 */
export async function cleanupTeamApprovals(): Promise<MigrationResult> {
  const result: MigrationResult = {
    teamApprovalsDeleted: 0,
    campaignsUpdated: 0,
    pdfVersionsUpdated: 0,
    errors: []
  };

  console.log('🔄 Starte Team-Approval Bereinigung...');

  try {
    
    // 1. LÖSCHE TEAM-APPROVALS COLLECTION
    console.log('📂 Lösche team-approvals Collection...');
    
    const teamApprovalsRef = collection(db, 'team-approvals');
    const teamApprovalsSnapshot = await getDocs(teamApprovalsRef);
    
    if (teamApprovalsSnapshot.size > 0) {
      const teamApprovalsBatch = writeBatch(db);
      
      teamApprovalsSnapshot.docs.forEach(docSnapshot => {
        // Backup-Log der gelöschten Daten
        console.log('🗑️ Lösche Team-Approval:', docSnapshot.id, docSnapshot.data());
        teamApprovalsBatch.delete(docSnapshot.ref);
        result.teamApprovalsDeleted++;
      });
      
      await teamApprovalsBatch.commit();
      console.log(`✅ ${result.teamApprovalsDeleted} Team-Approvals gelöscht`);
    } else {
      console.log('ℹ️ Keine Team-Approvals gefunden');
    }

    // 2. BEREINIGE CAMPAIGN APPROVAL-DATA
    console.log('📝 Bereinige Campaign approvalData...');
    
    const campaignsRef = collection(db, 'campaigns');
    const campaignsWithTeamApprovalQuery = query(
      campaignsRef, 
      where('approvalData.teamApprovalRequired', '==', true)
    );
    
    const campaignsSnapshot = await getDocs(campaignsWithTeamApprovalQuery);
    
    if (campaignsSnapshot.size > 0) {
      const campaignsBatch = writeBatch(db);
      
      campaignsSnapshot.docs.forEach(docSnapshot => {
        const data = docSnapshot.data();
        console.log('🔧 Bereinige Campaign:', docSnapshot.id);
        
        // Bereinige approvalData - entferne alle Team-Felder
        const cleanedApprovalData = {
          customerApprovalRequired: data.approvalData?.customerApprovalRequired || false,
          customerContact: data.approvalData?.customerContact,
          customerApprovalMessage: data.approvalData?.customerApprovalMessage,
          // ENTFERNT: teamApprovalRequired, teamApprovers, teamApprovalMessage
          currentStage: 'customer', // Immer Customer
          status: data.approvalData?.status || 'pending',
          shareId: data.approvalData?.shareId,
          workflowId: data.approvalData?.workflowId
        };
        
        campaignsBatch.update(docSnapshot.ref, {
          'approvalData': cleanedApprovalData,
          'approvalRequired': cleanedApprovalData.customerApprovalRequired,
          updatedAt: serverTimestamp()
        });
        
        result.campaignsUpdated++;
      });
      
      await campaignsBatch.commit();
      console.log(`✅ ${result.campaignsUpdated} Campaigns bereinigt`);
    } else {
      console.log('ℹ️ Keine Campaigns mit Team-Approval gefunden');
    }

    // 3. KONVERTIERE PDF-VERSIONEN STATUS
    console.log('📄 Konvertiere PDF-Status pending_team → pending_customer...');
    
    // Da pdfVersions in subcollections sind, müssen wir durch campaigns iterieren
    const allCampaignsSnapshot = await getDocs(collection(db, 'campaigns'));
    
    for (const campaignDoc of allCampaignsSnapshot.docs) {
      const pdfVersionsRef = collection(db, `campaigns/${campaignDoc.id}/pdfVersions`);
      const pdfQuery = query(pdfVersionsRef, where('status', '==', 'pending_team'));
      const pdfSnapshot = await getDocs(pdfQuery);
      
      if (pdfSnapshot.size > 0) {
        const pdfBatch = writeBatch(db);
        
        pdfSnapshot.docs.forEach(pdfDoc => {
          console.log('🔄 Konvertiere PDF Status:', campaignDoc.id, pdfDoc.id);
          pdfBatch.update(pdfDoc.ref, {
            status: 'pending_customer', // Team → Customer
            updatedAt: serverTimestamp()
          });
          result.pdfVersionsUpdated++;
        });
        
        await pdfBatch.commit();
      }
    }
    
    console.log(`✅ ${result.pdfVersionsUpdated} PDF-Versionen Status konvertiert`);

    // 4. ERSTELLE MIGRATION-LOG
    const migrationLogRef = doc(collection(db, 'migration-logs'));
    await updateDoc(migrationLogRef, {
      type: 'team-approval-cleanup',
      timestamp: serverTimestamp(),
      result: result,
      description: 'Team-Approval System vollständig entfernt - Rückbau zu Customer-Only System'
    });

    console.log('🎉 Team-Approval Bereinigung ERFOLGREICH abgeschlossen!');
    console.log('📊 Ergebnis:', result);
    
    return result;

  } catch (error) {
    console.error('❌ Fehler bei Team-Approval Bereinigung:', error);
    result.errors.push(error instanceof Error ? error.message : 'Unbekannter Fehler');
    throw error;
  }
}

/**
 * ROLLBACK-FUNKTION (Falls erforderlich)
 * WICHTIG: Kann nur verwendet werden wenn Backup-Daten vorhanden sind
 */
export async function rollbackTeamApprovalCleanup(): Promise<void> {
  console.log('⚠️ ROLLBACK: Team-Approval System wiederherstellen...');
  console.log('❌ ROLLBACK NICHT VERFÜGBAR - Backup-System nicht implementiert');
  console.log('💡 Falls Rollback erforderlich: Git-Reset auf vorherigen Commit verwenden');
  throw new Error('Rollback nicht verfügbar - Git-Reset verwenden');
}

// CLI-Execution für direkte Ausführung
if (require.main === module) {
  cleanupTeamApprovals()
    .then((result) => {
      console.log('✅ Migration erfolgreich:', result);
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Migration fehlgeschlagen:', error);
      process.exit(1);
    });
}