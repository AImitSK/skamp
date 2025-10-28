// src/app/api/team/accept-invitation/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext } from '@/lib/api/auth-middleware';
import { doc, getDoc, updateDoc, serverTimestamp, collection, query, where, getDocs } from 'firebase/firestore';
import { serverDb } from '@/lib/firebase/server-init';
import { getTeamInvitationAcceptedEmailTemplate } from '@/lib/email/team-invitation-templates';
import { adminDb } from '@/lib/firebase/admin-init';
import { updateTeamMembersUsage } from '@/lib/usage/usage-tracker';

export async function POST(request: NextRequest) {
  try {
    // 1. Auth prüfen - User muss eingeloggt sein
    const authContext = await getAuthContext(request);
    if (!authContext) {
      return NextResponse.json(
        { error: 'Nicht authentifiziert. Bitte melden Sie sich zuerst an.' },
        { status: 401 }
      );
    }

    const { userId, email: userEmail } = authContext;

    // 2. Request Body parsen
    const body = await request.json();
    const { token, invitationId } = body;

    if (!token || !invitationId) {
      return NextResponse.json(
        { error: 'Token und Einladungs-ID erforderlich' },
        { status: 400 }
      );
    }

    // 3. Lade Team-Mitglied-Einladung
    const memberRef = doc(serverDb, 'team_members', invitationId);
    const memberDoc = await getDoc(memberRef);

    if (!memberDoc.exists()) {
      return NextResponse.json(
        { error: 'Einladung nicht gefunden' },
        { status: 404 }
      );
    }

    const memberData = memberDoc.data();

    // 4. Validierungen
    if (memberData.status !== 'invited') {
      return NextResponse.json(
        { error: 'Diese Einladung wurde bereits angenommen oder ist ungültig' },
        { status: 400 }
      );
    }

    if (memberData.invitationToken !== token) {
      return NextResponse.json(
        { error: 'Ungültiger Einladungstoken' },
        { status: 400 }
      );
    }

    // Prüfe Token-Ablauf
    if (memberData.invitationTokenExpiry && memberData.invitationTokenExpiry.toDate() < new Date()) {
      return NextResponse.json(
        { error: 'Diese Einladung ist abgelaufen' },
        { status: 400 }
      );
    }

    // Prüfe E-Mail-Übereinstimmung (optional, aber empfohlen)
    if (memberData.email !== userEmail) {
      return NextResponse.json(
        { 
          error: 'Diese Einladung wurde an eine andere E-Mail-Adresse gesendet. Bitte melden Sie sich mit der korrekten E-Mail-Adresse an.' 
        },
        { status: 400 }
      );
    }

    // 5. Akzeptiere Einladung
    await updateDoc(memberRef, {
      userId, // Setze die echte User-ID
      status: 'active',
      joinedAt: serverTimestamp(),
      lastActiveAt: serverTimestamp(),
      invitationToken: null, // Token löschen
      invitationTokenExpiry: null,
      updatedAt: serverTimestamp()
    });

    console.log(`✅ Invitation accepted by ${userEmail} for organization ${memberData.organizationId}`);

    // 5.5. Update Team Members Usage
    try {
      // Count active members
      const activeMembersSnapshot = await adminDb
        .collection('team_members')
        .where('organizationId', '==', memberData.organizationId)
        .where('status', '==', 'active')
        .get();

      const activeCount = activeMembersSnapshot.size;

      await updateTeamMembersUsage(memberData.organizationId, activeCount);

      console.log(`📊 Updated team members usage: ${activeCount} active members`);
    } catch (usageError) {
      console.error('Error updating team members usage:', usageError);
      // Don't block the acceptance if usage tracking fails
    }

    // 6. Sende Benachrichtigung an Inviter
    try {
      // Hole Inviter-Informationen
      if (memberData.invitedBy) {
        // Suche nach dem Inviter in team_members
        const inviterQuery = doc(serverDb, 'team_members', `${memberData.invitedBy}_${memberData.organizationId}`);
        const inviterDoc = await getDoc(inviterQuery);
        
        if (inviterDoc.exists()) {
          const inviterData = inviterDoc.data();
          
          // Sende E-Mail an Inviter
          const emailData = getTeamInvitationAcceptedEmailTemplate({
            inviterName: inviterData.displayName || inviterData.email,
            inviterEmail: inviterData.email,
            newMemberName: memberData.displayName || userEmail || 'Neues Mitglied',
            newMemberEmail: userEmail || memberData.email,
            organizationName: memberData.organizationId, // TODO: Echter Org-Name
            role: memberData.role
          });

          // Sende über interne API
          await sendNotificationEmail({
            to: inviterData.email,
            subject: emailData.subject,
            html: emailData.html,
            text: emailData.text
          });
        }
      }
    } catch (notifyError) {
      console.error('Error notifying inviter:', notifyError);
      // Fehler beim Benachrichtigen sollte nicht die Annahme blockieren
    }

    return NextResponse.json({
      success: true,
      message: 'Einladung erfolgreich angenommen',
      organization: {
        id: memberData.organizationId,
        role: memberData.role
      }
    });

  } catch (error: any) {
    console.error('Error accepting invitation:', error);
    
    return NextResponse.json(
      { error: error.message || 'Fehler beim Annehmen der Einladung' },
      { status: 500 }
    );
  }
}

// GET endpoint zum Prüfen einer Einladung
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');
    const invitationId = searchParams.get('id');

    if (!token || !invitationId) {
      return NextResponse.json(
        { error: 'Token und ID erforderlich' },
        { status: 400 }
      );
    }

    // Lade Einladung
    const memberRef = doc(serverDb, 'team_members', invitationId);
    const memberDoc = await getDoc(memberRef);

    if (!memberDoc.exists()) {
      return NextResponse.json(
        { valid: false, error: 'Einladung nicht gefunden' },
        { status: 404 }
      );
    }

    const memberData = memberDoc.data();

    // Validiere
    if (memberData.invitationToken !== token) {
      return NextResponse.json(
        { valid: false, error: 'Ungültiger Token' }
      );
    }

    if (memberData.status !== 'invited') {
      return NextResponse.json(
        { valid: false, error: 'Einladung bereits verwendet' }
      );
    }

    if (memberData.invitationTokenExpiry && memberData.invitationTokenExpiry.toDate() < new Date()) {
      return NextResponse.json(
        { valid: false, error: 'Einladung abgelaufen' }
      );
    }

    return NextResponse.json({
      valid: true,
      invitation: {
        email: memberData.email,
        role: memberData.role,
        organizationId: memberData.organizationId,
        invitedBy: memberData.invitedBy
      }
    });

  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Fehler beim Prüfen der Einladung' },
      { status: 500 }
    );
  }
}

// Helper: E-Mail senden
async function sendNotificationEmail(data: {
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<void> {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/sendgrid/send`, {
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
      console.error('Failed to send notification email');
    }
  } catch (error) {
    console.error('Error sending notification email:', error);
  }
}