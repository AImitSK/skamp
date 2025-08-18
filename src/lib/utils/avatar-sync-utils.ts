// Avatar-Sync Utilities für Multi-Tenancy
import { auth } from '@/lib/firebase/client-init';
import { collection, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase/client-init';

/**
 * Synchronisiert alle TeamMember Avatare mit ihren Firebase Auth photoURLs
 * Nützlich für einmalige Migration oder Reparatur
 */
export async function syncAllTeamMemberAvatars(organizationId: string): Promise<{
  success: boolean;
  synced: number;
  errors: string[];
}> {
  console.log('🔄 Starte Avatar-Sync für Organisation:', organizationId);
  
  const errors: string[] = [];
  let synced = 0;
  
  try {
    // Alle TeamMembers der Organisation laden
    const teamMembersQuery = query(
      collection(db, 'team_members'),
      where('organizationId', '==', organizationId)
    );
    
    const teamMembersSnapshot = await getDocs(teamMembersQuery);
    
    console.log(`📊 Gefunden: ${teamMembersSnapshot.size} TeamMembers`);
    
    for (const teamMemberDoc of teamMembersSnapshot.docs) {
      const teamMember = teamMemberDoc.data();
      const userId = teamMember.userId;
      const displayName = teamMember.displayName || 'Unbekannt';
      
      try {
        console.log(`🔍 Prüfe Avatar für: ${displayName} (${userId})`);
        
        // Prüfe ob User eine Firebase Auth photoURL hat
        // HINWEIS: Wir können nur die aktuelle User-Session abfragen
        // Für andere User müssten wir Admin SDK verwenden (nicht erlaubt)
        
        if (auth.currentUser && auth.currentUser.uid === userId) {
          // Das ist der aktuell eingeloggte User
          const currentPhotoURL = auth.currentUser.photoURL;
          const currentTeamMemberPhotoUrl = teamMember.photoUrl;
          
          console.log(`👤 Aktueller User Avatar-Status:`, {
            firebaseAuth: currentPhotoURL ? 'VORHANDEN' : 'LEER',
            teamMember: currentTeamMemberPhotoUrl ? 'VORHANDEN' : 'LEER',
            match: currentPhotoURL === currentTeamMemberPhotoUrl
          });
          
          if (currentPhotoURL && currentPhotoURL !== currentTeamMemberPhotoUrl) {
            // Update TeamMember mit Firebase Auth URL
            await updateDoc(teamMemberDoc.ref, {
              photoUrl: currentPhotoURL,
              avatarSyncedAt: new Date(),
              syncedBy: 'manual-sync'
            });
            
            console.log(`✅ Avatar synchronisiert für ${displayName}`);
            synced++;
          } else if (!currentPhotoURL && currentTeamMemberPhotoUrl) {
            // Firebase Auth hat keinen Avatar, aber TeamMember hat einen - löschen
            await updateDoc(teamMemberDoc.ref, {
              photoUrl: null,
              avatarSyncedAt: new Date(),
              syncedBy: 'manual-sync'
            });
            
            console.log(`🗑️ Avatar entfernt für ${displayName}`);
            synced++;
          }
        } else {
          // Für andere User können wir nur loggen
          console.log(`ℹ️ Kann Avatar nicht prüfen für ${displayName} (nicht eingeloggt)`);
        }
        
      } catch (userError) {
        const errorMsg = `Fehler bei ${displayName}: ${userError}`;
        console.error(errorMsg);
        errors.push(errorMsg);
      }
    }
    
    console.log(`✅ Avatar-Sync abgeschlossen: ${synced} synchronisiert, ${errors.length} Fehler`);
    
    return {
      success: errors.length === 0,
      synced,
      errors
    };
    
  } catch (error) {
    const errorMsg = `Kritischer Fehler bei Avatar-Sync: ${error}`;
    console.error(errorMsg);
    errors.push(errorMsg);
    
    return {
      success: false,
      synced,
      errors
    };
  }
}

/**
 * Zeigt Debug-Informationen für Avatar-Status aller TeamMembers
 */
export async function debugTeamMemberAvatars(organizationId: string): Promise<void> {
  console.log('🔍 DEBUG: TeamMember Avatare für Organisation:', organizationId);
  
  try {
    const teamMembersQuery = query(
      collection(db, 'team_members'),
      where('organizationId', '==', organizationId)
    );
    
    const teamMembersSnapshot = await getDocs(teamMembersQuery);
    
    console.log('📊 TeamMember Avatar Status:');
    teamMembersSnapshot.docs.forEach((doc, index) => {
      const data = doc.data();
      console.log(`${index + 1}. ${data.displayName}:`, {
        userId: data.userId,
        photoUrl: data.photoUrl ? 'VORHANDEN' : 'LEER',
        photoUrlPreview: data.photoUrl ? data.photoUrl.substring(0, 50) + '...' : null,
        lastSync: data.avatarSyncedAt || 'nie'
      });
    });
    
  } catch (error) {
    console.error('Fehler beim Debug:', error);
  }
}