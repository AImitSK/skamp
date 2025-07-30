// src/app/api/team/invite/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { teamMemberService } from '@/lib/firebase/organization-service';
import { getAuthContext } from '@/lib/api/auth-middleware';
import { Timestamp } from 'firebase/firestore';
import { UserRole } from '@/types/international';

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

    // 4. Prüfe ob User berechtigt ist (muss Owner oder Admin sein)
    const userMember = await teamMemberService.getByUserAndOrg(userId, organizationId);
    
    // Spezialfall: Wenn es noch keine Team-Mitglieder gibt und der User die gleiche ID wie die Org hat,
    // dann ist es der Owner der seine erste Einladung macht
    if (!userMember) {
      const memberCount = await teamMemberService.countActiveMembers(organizationId);
      
      // Wenn keine Mitglieder existieren und userId === organizationId, dann ist es der Owner
      if (memberCount === 0 && userId === organizationId) {
        console.log('🚀 First team member - creating owner entry');
        
        // Erstelle den Owner als erstes Team-Mitglied
        const ownerData = {
          userId,
          organizationId,
          email: authContext.email || '',
          displayName: authContext.email?.split('@')[0] || 'Owner',
          role: 'owner' as const,
          status: 'active' as const,
          invitedAt: Timestamp.now(),
          invitedBy: userId,
          joinedAt: Timestamp.now(),
          lastActiveAt: Timestamp.now()
        };
        
        await teamMemberService.createDirectly(ownerData);
        
        // Fahre mit der Einladung fort
      } else {
        return NextResponse.json(
          { error: 'Sie sind kein Mitglied dieser Organisation' },
          { status: 403 }
        );
      }
    } else if (userMember.role !== 'owner' && userMember.role !== 'admin') {
      return NextResponse.json(
        { error: 'Nur Owner und Admins können Team-Mitglieder einladen' },
        { status: 403 }
      );
    }

    // 5. Prüfe ob E-Mail bereits existiert
    const existingMember = await teamMemberService.getByEmailAndOrg(email, organizationId);
    if (existingMember) {
      return NextResponse.json(
        { error: 'Diese E-Mail-Adresse wurde bereits eingeladen oder ist bereits Mitglied' },
        { status: 409 }
      );
    }

    // 6. Team-Mitglied erstellen
    const newMember = {
      email,
      organizationId,
      role,
      displayName: email.split('@')[0], // Temporärer Name
      status: 'invited' as const,
      invitedAt: Timestamp.now(),
      invitedBy: userId,
      userId: '', // Wird beim Accept gesetzt
      lastActiveAt: Timestamp.now()
    };

    // Verwende createDirectly für die Erstellung
    const memberId = await teamMemberService.createDirectly(newMember);

    console.log('✅ Team member invited:', memberId);

    // 7. TODO: E-Mail-Einladung versenden
    // Hier würde normalerweise eine E-Mail mit Einladungslink versendet

    return NextResponse.json({
      success: true,
      memberId,
      message: 'Einladung wurde erfolgreich erstellt'
    });

  } catch (error: any) {
    console.error('Error in team invite API:', error);
    
    // Spezifische Fehlerbehandlung für Firestore-Berechtigungen
    if (error.code === 'permission-denied') {
      return NextResponse.json(
        { error: 'Fehlende Berechtigung zum Erstellen von Team-Mitgliedern' },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { error: error.message || 'Interner Serverfehler' },
      { status: 500 }
    );
  }
}