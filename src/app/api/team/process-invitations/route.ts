// src/app/api/team/process-invitations/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext } from '@/lib/api/auth-middleware';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  setDoc, 
  updateDoc,
  Timestamp,
  serverTimestamp 
} from 'firebase/firestore';
import { serverDb } from '@/lib/firebase/server-init';
import { TeamMember } from '@/types/international';
import { getTeamInvitationEmailTemplate } from '@/lib/email/team-invitation-templates';

interface ProcessResult {
  processed: number;
  failed: number;
  errors: string[];
  details: Array<{
    email: string;
    status: 'success' | 'failed';
    error?: string;
  }>;
}

// GET endpoint für Status-Check
export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Checking pending invitations...');
    
    // Auth ist optional für GET
    const authContext = await getAuthContext(request);
    
    // Wenn kein Auth Context, gebe 0 zurück
    if (!authContext) {
      return NextResponse.json({
        pending: 0,
        message: 'Nicht authentifiziert'
      });
    }
    
    try {
      // Zähle unverarbeitete Einladungen
      const pendingQuery = query(
        collection(serverDb, 'notifications'),
        where('userId', '==', authContext.userId),
        where('category', '==', 'team_invitation'),
        where('isProcessed', '!=', true)
      );
      
      const pendingSnapshot = await getDocs(pendingQuery);
      
      return NextResponse.json({
        pending: pendingSnapshot.size,
        message: `${pendingSnapshot.size} Einladungen warten auf Verarbeitung`
      });
    } catch (firestoreError: any) {
      console.error('Firestore query error:', firestoreError);
      
      // Bei Firestore-Fehlern, gebe 0 zurück statt 500
      return NextResponse.json({
        pending: 0,
        message: 'Konnte Einladungen nicht prüfen',
        error: firestoreError.message
      });
    }
    
  } catch (error: any) {
    console.error('GET /api/team/process-invitations error:', error);
    
    // Gebe 200 mit error info zurück statt 500
    return NextResponse.json({
      pending: 0,
      message: 'Fehler beim Prüfen der Einladungen',
      error: error.message
    });
  }
}

// POST endpoint für Verarbeitung
export async function POST(request: NextRequest) {
  try {
    // Auth ist optional für POST (für Cron Jobs)
    const authContext = await getAuthContext(request);
    
    console.log('🔄 Processing team invitations...', {
      hasAuth: !!authContext,
      userId: authContext?.userId
    });
    
    const result: ProcessResult = {
      processed: 0,
      failed: 0,
      errors: [],
      details: []
    };

    // Wenn authentifiziert, nur Invitations für diesen User
    // Wenn nicht authentifiziert (Cron), verarbeite alle
    let invitationsQuery;
    
    if (authContext) {
      invitationsQuery = query(
        collection(serverDb, 'notifications'),
        where('userId', '==', authContext.userId),
        where('category', '==', 'team_invitation'),
        where('isProcessed', '!=', true)
      );
    } else {
      // Für Cron Jobs - verarbeite alle unverarbeiteten
      invitationsQuery = query(
        collection(serverDb, 'notifications'),
        where('category', '==', 'team_invitation'),
        where('isProcessed', '!=', true)
      );
    }

    let invitationsSnapshot;
    try {
      invitationsSnapshot = await getDocs(invitationsQuery);
    } catch (queryError: any) {
      console.error('Failed to query notifications:', queryError);
      return NextResponse.json({
        success: false,
        error: 'Konnte Benachrichtigungen nicht abrufen',
        details: queryError.message
      });
    }
    
    console.log(`📬 Found ${invitationsSnapshot.size} unprocessed invitations`);

    // Verarbeite jede Einladung
    for (const inviteDoc of invitationsSnapshot.docs) {
      const notification = inviteDoc.data();
      const memberData = notification.data?.memberData;
      
      if (!memberData) {
        result.failed++;
        result.errors.push(`Keine Mitgliedsdaten in Notification ${inviteDoc.id}`);
        continue;
      }

      try {
        // Erstelle Team-Mitglied in team_members
        const memberId = `invite_${Date.now()}_${memberData.email.replace('@', '_at_')}`;
        const teamMember: Partial<TeamMember> = {
          ...memberData,
          id: memberId,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now()
        };

        await setDoc(doc(serverDb, 'team_members', memberId), teamMember);
        console.log(`✅ Created team member: ${memberId}`);

        // Generiere Einladungslink
        const invitationToken = generateInvitationToken();
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://www.celeropress.com';
        const invitationUrl = `${baseUrl}/auth/accept-invitation?token=${invitationToken}&id=${memberId}`;

        // Speichere Token
        await updateDoc(doc(serverDb, 'team_members', memberId), {
          invitationToken,
          invitationTokenExpiry: Timestamp.fromDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000))
        });

        // Hole Inviter-Informationen
        let inviterName = 'Das Team';
        let organizationName = 'CeleroPress';
        
        // Versuche Owner-Info zu holen
        if (notification.userId) {
          try {
            const ownerQuery = query(
              collection(serverDb, 'notifications'),
              where('userId', '==', notification.userId),
              where('category', '==', 'team_owner_init')
            );
            const ownerSnapshot = await getDocs(ownerQuery);
            if (!ownerSnapshot.empty) {
              const ownerData = ownerSnapshot.docs[0].data()?.data?.ownerData;
              if (ownerData) {
                inviterName = ownerData.displayName || ownerData.email;
                organizationName = ownerData.displayName || 'CeleroPress';
              }
            }
          } catch (e) {
            console.log('Could not get owner info:', e);
          }
        }

        // Sende Einladungs-E-Mail
        const emailData = getTeamInvitationEmailTemplate({
          recipientName: memberData.displayName || memberData.email.split('@')[0],
          recipientEmail: memberData.email,
          inviterName,
          organizationName,
          role: memberData.role,
          invitationUrl,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        });

        // Sende über SendGrid API
        const emailResult = await sendInvitationEmail({
          to: memberData.email,
          subject: emailData.subject,
          html: emailData.html,
          text: emailData.text
        });

        if (emailResult.success) {
          // Markiere als verarbeitet
          await updateDoc(doc(serverDb, 'notifications', inviteDoc.id), {
            isProcessed: true,
            processedAt: Timestamp.now(),
            emailSent: true,
            invitationUrl
          });

          result.processed++;
          result.details.push({
            email: memberData.email,
            status: 'success'
          });
          
          console.log(`✅ Invitation sent to ${memberData.email}`);
        } else {
          throw new Error(emailResult.error || 'E-Mail-Versand fehlgeschlagen');
        }

      } catch (error: any) {
        console.error(`❌ Error processing invitation for ${memberData.email}:`, error);
        result.failed++;
        result.errors.push(`${memberData.email}: ${error.message}`);
        result.details.push({
          email: memberData.email,
          status: 'failed',
          error: error.message
        });

        // Markiere als fehlgeschlagen
        try {
          await updateDoc(doc(serverDb, 'notifications', inviteDoc.id), {
            isProcessed: true,
            processedAt: Timestamp.now(),
            processingError: error.message
          });
        } catch (updateError) {
          console.error('Could not update notification:', updateError);
        }
      }
    }

    // Verarbeite auch Owner-Initialisierungen
    if (authContext) {
      const ownerInitQuery = query(
        collection(serverDb, 'notifications'),
        where('userId', '==', authContext.userId),
        where('category', '==', 'team_owner_init'),
        where('isProcessed', '!=', true)
      );

      try {
        const ownerInitSnapshot = await getDocs(ownerInitQuery);
        
        for (const ownerDoc of ownerInitSnapshot.docs) {
          const notification = ownerDoc.data();
          const ownerData = notification.data?.ownerData;
          
          if (!ownerData) continue;

          try {
            // Erstelle Owner in team_members
            const ownerId = `${ownerData.userId}_${ownerData.organizationId}`;
            await setDoc(doc(serverDb, 'team_members', ownerId), {
              ...ownerData,
              id: ownerId,
              createdAt: Timestamp.now(),
              updatedAt: Timestamp.now()
            });

            // Markiere als verarbeitet
            await updateDoc(doc(serverDb, 'notifications', ownerDoc.id), {
              isProcessed: true,
              processedAt: Timestamp.now()
            });

            console.log(`✅ Owner initialized: ${ownerId}`);
            result.processed++;

          } catch (error: any) {
            console.error('❌ Error initializing owner:', error);
            result.failed++;
            result.errors.push(`Owner init: ${error.message}`);
          }
        }
      } catch (e) {
        console.log('Could not process owner inits:', e);
      }
    }

    console.log('✅ Processing complete:', result);

    return NextResponse.json({
      success: true,
      result
    });

  } catch (error: any) {
    console.error('POST /api/team/process-invitations error:', error);
    
    return NextResponse.json(
      { 
        success: false,
        error: error.message || 'Interner Serverfehler',
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

// Helper: Einladungstoken generieren
function generateInvitationToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < 32; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

// Helper: E-Mail über SendGrid senden
async function sendInvitationEmail(data: {
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    // Nutze die SendGrid API Route direkt
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://www.celeropress.com';
    const response = await fetch(`${baseUrl}/api/sendgrid/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: data.to,
        subject: data.subject,
        html: data.html,
        text: data.text,
        from: {
          email: process.env.SENDGRID_FROM_EMAIL || 'noreply@celeropress.com',
          name: 'CeleroPress Team'
        }
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(error);
    }

    return { success: true };
  } catch (error: any) {
    console.error('SendGrid error:', error);
    return { 
      success: false, 
      error: error.message || 'E-Mail-Versand fehlgeschlagen' 
    };
  }
}