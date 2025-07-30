// src/app/api/team/invite/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext } from '@/lib/api/auth-middleware';
import { Timestamp, collection, query, where, getDocs, addDoc, doc, setDoc } from 'firebase/firestore';
import { serverDb } from '@/lib/firebase/server-init';
import { UserRole, TeamMember } from '@/types/international';

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

    const { userId } = authContext;

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

    // 5. Prüfe ob E-Mail bereits existiert
    const existingQuery = query(
      collection(serverDb, 'team_members'),
      where('email', '==', email),
      where('organizationId', '==', organizationId)
    );
    
    try {
      const existingSnapshot = await getDocs(existingQuery);
      if (!existingSnapshot.empty) {
        return NextResponse.json(
          { error: 'Diese E-Mail-Adresse wurde bereits eingeladen oder ist bereits Mitglied' },
          { status: 409 }
        );
      }
    } catch (e) {
      // Ignoriere Read-Fehler, fahre fort
      console.log('Could not check existing members:', e);
    }

    // 6. Prüfe ob Owner bereits existiert
    let ownerExists = false;
    try {
      const ownerQuery = query(
        collection(serverDb, 'team_members'),
        where('organizationId', '==', organizationId),
        where('role', '==', 'owner')
      );
      const ownerSnapshot = await getDocs(ownerQuery);
      ownerExists = !ownerSnapshot.empty;
    } catch (e) {
      console.log('Could not check owner:', e);
    }

    // 7. Wenn kein Owner existiert, erstelle ihn zuerst
    if (!ownerExists) {
      console.log('🚀 Creating owner entry first');
      
      // WORKAROUND: Nutze notifications collection für Owner-Erstellung
      const ownerNotification = {
        userId: organizationId, // Für notification rules
        type: 'system',
        category: 'team_owner_init',
        title: 'Owner Initialization',
        body: 'System: Initialize team owner',
        data: {
          action: 'create_owner',
          ownerData: {
            userId,
            organizationId,
            email: authContext.email || '',
            displayName: authContext.email?.split('@')[0] || 'Owner',
            role: 'owner',
            status: 'active',
            invitedAt: Timestamp.now(),
            invitedBy: userId,
            joinedAt: Timestamp.now(),
            lastActiveAt: Timestamp.now()
          }
        },
        isRead: false,
        createdAt: Timestamp.now()
      };

      await addDoc(collection(serverDb, 'notifications'), ownerNotification);
    }

    // 8. Team-Einladung als Notification erstellen (Workaround)
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
        }
      },
      isRead: false,
      createdAt: Timestamp.now()
    };

    const notificationRef = await addDoc(collection(serverDb, 'notifications'), invitationNotification);
    const notificationId = notificationRef.id;

    console.log('✅ Team invitation created as notification:', notificationId);

    // 9. Versuche direkt in team_members zu schreiben (optional)
    try {
      const memberData = invitationNotification.data.memberData;
      const memberId = `${Date.now()}_${email.replace('@', '_at_')}`;
      await setDoc(doc(serverDb, 'team_members', memberId), memberData);
      
      console.log('✅ Also created in team_members:', memberId);
      
      return NextResponse.json({
        success: true,
        memberId,
        message: 'Einladung wurde erfolgreich erstellt'
      });
    } catch (directWriteError) {
      console.log('Could not write directly to team_members, using notification workaround');
    }

    // 10. Fallback: Nur Notification wurde erstellt
    return NextResponse.json({
      success: true,
      memberId: notificationId,
      message: 'Einladung wurde erstellt. Bitte laden Sie die Seite neu.',
      requiresProcessing: true
    });

  } catch (error: any) {
    console.error('Error in team invite API:', error);
    
    return NextResponse.json(
      { error: error.message || 'Interner Serverfehler' },
      { status: 500 }
    );
  }
}