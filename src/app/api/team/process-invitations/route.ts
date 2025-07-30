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
import { apiClient } from '@/lib/api/api-client';

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

export async function POST(request: NextRequest) {
  try {
    // 1. Auth prüfen (optional für manuelle Ausführung, required für Cron)
    const authContext = await getAuthContext(request);
    
    console.log('🔄 Processing team invitations...');
    
    const result: ProcessResult = {
      processed: 0,
      failed: 0,
      errors: [],
      details: []
    };

    // 2. Hole alle unverarbeiteten Team-Einladungen
    const invitationsQuery = query(
      collection(serverDb, 'notifications'),
      where('category', '==', 'team_invitation'),
      where('isProcessed', '!=', true)
    );

    const invitationsSnapshot = await getDocs(invitationsQuery);
    console.log(`📬 Found ${invitationsSnapshot.size} unprocessed invitations`);

    // 3. Verarbeite jede Einladung
    for (const inviteDoc of invitationsSnapshot.docs) {
      const notification = inviteDoc.data();
      const memberData = notification.data?.memberData;
      
      if (!memberData) {
        result.failed++;
        result.errors.push(`Keine Mitgliedsdaten in Notification ${inviteDoc.id}`);
        continue;
      }

      try {
        // 4. Erstelle Team-Mitglied in team_members
        const memberId = `invite_${Date.now()}_${memberData.email.replace('@', '_at_')}`;
        const teamMember: Partial<TeamMember> = {
          ...memberData,
          id: memberId,
          createdAt: serverTimestamp() as Timestamp,
          updatedAt: serverTimestamp() as Timestamp
        };

        await setDoc(doc(serverDb, 'team_members', memberId), teamMember);
        console.log(`✅ Created team member: ${memberId}`);

        // 5. Generiere Einladungslink
        const invitationToken = generateInvitationToken();
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://www.celeropress.com';
        const invitationUrl = `${baseUrl}/auth/accept-invitation?token=${invitationToken}&id=${memberId}`;

        // Speichere Token in team_members für Verifizierung
        await updateDoc(doc(serverDb, 'team_members', memberId), {
          invitationToken,
          invitationTokenExpiry: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 Tage
        });

        // 6. Hole Inviter-Informationen
        let inviterName = 'Das Team';
        let organizationName = 'CeleroPress';
        
        // Versuche Owner-Info aus notifications zu holen
        if (notification.userId) {
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
        }

        // 7. Sende Einladungs-E-Mail
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
          // 8. Markiere Notification als verarbeitet
          await updateDoc(doc(serverDb, 'notifications', inviteDoc.id), {
            isProcessed: true,
            processedAt: serverTimestamp(),
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
        await updateDoc(doc(serverDb, 'notifications', inviteDoc.id), {
          isProcessed: true,
          processedAt: serverTimestamp(),
          processingError: error.message
        });
      }
    }

    // 9. Verarbeite auch Owner-Initialisierungen
    const ownerInitQuery = query(
      collection(serverDb, 'notifications'),
      where('category', '==', 'team_owner_init'),
      where('isProcessed', '!=', true)
    );

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
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });

        // Markiere als verarbeitet
        await updateDoc(doc(serverDb, 'notifications', ownerDoc.id), {
          isProcessed: true,
          processedAt: serverTimestamp()
        });

        console.log(`✅ Owner initialized: ${ownerId}`);
        result.processed++;

      } catch (error: any) {
        console.error('❌ Error initializing owner:', error);
        result.failed++;
        result.errors.push(`Owner init: ${error.message}`);
      }
    }

    console.log('✅ Processing complete:', result);

    return NextResponse.json({
      success: true,
      result
    });

  } catch (error: any) {
    console.error('Error processing invitations:', error);
    
    return NextResponse.json(
      { 
        success: false,
        error: error.message || 'Interner Serverfehler' 
      },
      { status: 500 }
    );
  }
}

// GET endpoint für manuellen Trigger oder Status-Check
export async function GET(request: NextRequest) {
  try {
    // Prüfe ob Auth vorhanden (optional)
    const authContext = await getAuthContext(request);
    
    // Zähle unverarbeitete Einladungen
    const pendingQuery = query(
      collection(serverDb, 'notifications'),
      where('category', '==', 'team_invitation'),
      where('isProcessed', '!=', true)
    );
    
    const pendingSnapshot = await getDocs(pendingQuery);
    
    return NextResponse.json({
      pending: pendingSnapshot.size,
      message: `${pendingSnapshot.size} Einladungen warten auf Verarbeitung`
    });
    
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Interner Serverfehler' },
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
    // Nutze die bestehende SendGrid API Route
    const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/sendgrid/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Keine Auth nötig für interne API Calls
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