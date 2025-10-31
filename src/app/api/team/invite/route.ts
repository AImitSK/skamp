// src/app/api/team/invite/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext } from '@/lib/api/auth-middleware';
import { Timestamp, collection, query, where, getDocs, doc, setDoc, serverTimestamp, addDoc } from 'firebase/firestore';
import { serverDb } from '@/lib/firebase/server-init';
import { adminDb } from '@/lib/firebase/admin-init';
import { UserRole, TeamMember } from '@/types/international';
import { getTeamInvitationEmailTemplate } from '@/lib/email/team-invitation-templates';
import { SUBSCRIPTION_LIMITS } from '@/config/subscription-limits';

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
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const response = await fetch(`${baseUrl}/api/email/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: [{ email: data.to }],
        subject: data.subject,
        htmlContent: data.html,
        textContent: data.text,
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

export async function POST(request: NextRequest) {
  try {
    // 1. Auth prüfen
    const authContext = await getAuthContext(request);
    if (!authContext) {
      return NextResponse.json(
        { error: 'Nicht authentifiziert' },
        { status: 401 }
      );
    }

    const { userId, email: inviterEmail } = authContext;

    // 2. Request Body parsen
    const body = await request.json();
    const { email, role, organizationId } = body;

    // 3. Validierung
    if (!email || !role || !organizationId) {
      return NextResponse.json(
        { error: 'E-Mail, Rolle und Organisation sind erforderlich' },
        { status: 400 }
      );
    }

    // Validiere E-Mail-Format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Ungültiges E-Mail-Format' },
        { status: 400 }
      );
    }

    // Validiere Rolle
    const validRoles: UserRole[] = ['admin', 'member', 'client', 'guest'];
    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { error: 'Ungültige Rolle' },
        { status: 400 }
      );
    }

    // 4. Vereinfachte Autorisierung: User muss Organization Owner sein
    if (userId !== organizationId) {
      return NextResponse.json(
        { error: 'Nur der Organization Owner kann Team-Mitglieder einladen' },
        { status: 403 }
      );
    }

    // 5. Team Member Limit prüfen
    try {
      const orgDoc = await adminDb.collection('organizations').doc(organizationId).get();

      if (orgDoc.exists) {
        const orgData = orgDoc.data();
        const tier = orgData?.tier || 'STARTER';
        const teamLimit = SUBSCRIPTION_LIMITS[tier as keyof typeof SUBSCRIPTION_LIMITS]?.users || 1;

        // Zähle aktive + eingeladene Members (außer inactive)
        const membersSnapshot = await adminDb
          .collection('team_members')
          .where('organizationId', '==', organizationId)
          .where('status', 'in', ['active', 'invited'])
          .get();

        const currentMemberCount = membersSnapshot.size;

        // Prüfe Limit (-1 = unlimited)
        if (teamLimit !== -1 && currentMemberCount >= teamLimit) {
          return NextResponse.json(
            {
              error: `Team-Limit erreicht. Ihr ${SUBSCRIPTION_LIMITS[tier as keyof typeof SUBSCRIPTION_LIMITS]?.name || tier} Plan erlaubt maximal ${teamLimit} Team-Mitglieder.`,
              currentCount: currentMemberCount,
              limit: teamLimit
            },
            { status: 403 }
          );
        }

        console.log(`✅ Team Limit Check: ${currentMemberCount}/${teamLimit === -1 ? '∞' : teamLimit}`);
      }
    } catch (limitError) {
      console.error('Error checking team limit:', limitError);
      // Don't block invite if limit check fails
    }

    // 6. Prüfe ob E-Mail bereits existiert (inkl. inaktive)
    const existingQuery = query(
      collection(serverDb, 'team_members'),
      where('email', '==', email),
      where('organizationId', '==', organizationId)
    );
    
    let existingMember: any = null;
    try {
      const existingSnapshot = await getDocs(existingQuery);
      if (!existingSnapshot.empty) {
        existingMember = {
          id: existingSnapshot.docs[0].id,
          ...existingSnapshot.docs[0].data()
        };
        
        // Wenn inaktiv, reaktiviere statt neu zu erstellen
        if (existingMember.status === 'inactive') {
          console.log('🔄 Reactivating inactive member:', email);
          // Fahre fort mit Reaktivierung
        } else {
          return NextResponse.json(
            { error: 'Diese E-Mail-Adresse wurde bereits eingeladen oder ist bereits Mitglied' },
            { status: 409 }
          );
        }
      }
    } catch (e) {
      console.log('Could not check existing members:', e);
    }

    // 7. Stelle sicher, dass Owner existiert
    const ownerId = `${userId}_${organizationId}`;
    const ownerRef = doc(serverDb, 'team_members', ownerId);
    
    try {
      const ownerDoc = await getDocs(query(
        collection(serverDb, 'team_members'),
        where('organizationId', '==', organizationId),
        where('role', '==', 'owner')
      ));
      
      if (ownerDoc.empty) {
        console.log('🚀 Creating owner entry first');
        
        // Owner direkt erstellen
        await setDoc(ownerRef, {
          id: ownerId,
          userId,
          organizationId,
          email: inviterEmail || '',
          displayName: inviterEmail?.split('@')[0] || 'Owner',
          role: 'owner' as UserRole,
          status: 'active' as const,
          invitedAt: serverTimestamp(),
          invitedBy: userId,
          joinedAt: serverTimestamp(),
          lastActiveAt: serverTimestamp(),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        
        console.log('✅ Owner created successfully');
      }
    } catch (e) {
      console.log('Could not check/create owner:', e);
    }

    // 8. Erstelle oder aktualisiere Team-Mitglied
    const invitationToken = generateInvitationToken();
    const tokenExpiry = Timestamp.fromDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)); // 7 Tage
    
    let memberId: string;
    let createdDirectly = false;
    
    try {
      if (existingMember && existingMember.status === 'inactive') {
        // Reaktiviere inaktives Mitglied
        memberId = existingMember.id;
        const memberRef = doc(serverDb, 'team_members', memberId);
        
        await setDoc(memberRef, {
          ...existingMember,
          role, // Aktualisiere Rolle
          status: 'invited',
          invitedAt: serverTimestamp(),
          invitedBy: userId,
          invitationToken,
          invitationTokenExpiry: tokenExpiry,
          updatedAt: serverTimestamp()
        });
        
        createdDirectly = true;
        console.log('✅ Reactivated team member:', memberId);
      } else {
        // Erstelle neues Mitglied
        memberId = `invite_${Date.now()}_${email.replace('@', '_at_')}`;
        const memberData: Partial<TeamMember> = {
          id: memberId,
          userId: '', // Wird beim Accept gesetzt
          organizationId,
          email,
          displayName: email.split('@')[0],
          role,
          status: 'invited',
          invitedAt: serverTimestamp() as Timestamp,
          invitedBy: userId,
          lastActiveAt: serverTimestamp() as Timestamp
        };

        // Speichere mit zusätzlichen Feldern, die nicht in TeamMember Type sind
        await setDoc(doc(serverDb, 'team_members', memberId), {
          ...memberData,
          invitationToken,
          invitationTokenExpiry: tokenExpiry,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        
        createdDirectly = true;
        console.log('✅ Created new team member:', memberId);
      }
    } catch (firestoreError: any) {
      console.log('❌ Direct write failed, falling back to notification workaround:', firestoreError.message);
      
      // FALLBACK: Nutze Notification-Workaround bei Permission-Fehler
      if (firestoreError.code === 'permission-denied') {
        const invitationNotification = {
          userId: organizationId, // Für notification rules
          type: 'system',
          category: 'team_invitation',
          title: 'Neue Team-Einladung',
          body: `Einladung für ${email} als ${role}`,
          data: {
            action: 'create_team_member',
            memberData: {
              email,
              organizationId,
              role,
              displayName: email.split('@')[0],
              status: 'invited',
              invitedAt: Timestamp.now(),
              invitedBy: userId,
              userId: '', // Wird beim Accept gesetzt
              lastActiveAt: Timestamp.now()
            },
            invitationToken,
            invitationTokenExpiry: tokenExpiry
          },
          isRead: false,
          createdAt: Timestamp.now()
        };

        const notificationRef = await addDoc(collection(serverDb, 'notifications'), invitationNotification);
        memberId = notificationRef.id;
        createdDirectly = false;
        
        console.log('✅ Team invitation created via notification workaround:', memberId);
      } else {
        // Andere Fehler werfen
        throw firestoreError;
      }
    }

    // 9. Hole Inviter-Name für E-Mail
    let inviterName = 'Das Team';
    let organizationName = 'CeleroPress';
    
    try {
      // Versuche Owner-Daten zu holen
      const ownerDoc = await getDocs(query(
        collection(serverDb, 'team_members'),
        where('organizationId', '==', organizationId),
        where('userId', '==', userId)
      ));
      
      if (!ownerDoc.empty) {
        const ownerData = ownerDoc.docs[0].data();
        inviterName = ownerData.displayName || ownerData.email || inviterName;
      }
    } catch (e) {
      console.log('Could not get inviter info:', e);
    }

    // 10. Sende Einladungs-E-Mail DIREKT (nur wenn direkt erstellt)
    if (createdDirectly) {
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
      const invitationUrl = `${baseUrl}/invite/${invitationToken}?id=${memberId}`;
      
      const emailData = getTeamInvitationEmailTemplate({
        recipientName: email.split('@')[0],
        recipientEmail: email,
        inviterName,
        organizationName,
        role,
        invitationUrl,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      });

      const emailResult = await sendInvitationEmail({
        to: email,
        subject: emailData.subject,
        html: emailData.html,
        text: emailData.text
      });

      if (!emailResult.success) {
        // E-Mail fehlgeschlagen - trotzdem erfolgreich, da Mitglied erstellt wurde
        console.error('❌ Failed to send invitation email:', emailResult.error);
        
        return NextResponse.json({
          success: true,
          memberId,
          message: 'Einladung wurde erstellt, aber E-Mail konnte nicht versendet werden',
          emailError: emailResult.error,
          requiresManualSend: true
        });
      }

      console.log('✅ Invitation email sent successfully to:', email);

      // 11. Erfolg
      return NextResponse.json({
        success: true,
        memberId,
        message: existingMember ? 
          'Mitglied wurde reaktiviert und Einladung wurde versendet' : 
          'Einladung wurde erfolgreich versendet',
        invitationUrl // Für Debug/Testing
      });
    } else {
      // Notification-Workaround wurde genutzt
      return NextResponse.json({
        success: true,
        memberId,
        message: 'Einladung wurde erstellt. Bitte laden Sie die Seite neu.',
        requiresProcessing: true // Signal für Frontend
      });
    }

  } catch (error: any) {
    console.error('Error in team invite API:', error);
    
    return NextResponse.json(
      { error: error.message || 'Interner Serverfehler' },
      { status: 500 }
    );
  }
}