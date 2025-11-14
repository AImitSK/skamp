/**
 * Script zum Abrufen des Einladungslinks aus Firestore
 * Wird von E2E-Tests verwendet
 */

import { adminDb } from '../src/lib/firebase/admin-init';

const email = process.argv[2];

if (!email) {
  console.error('Bitte E-Mail-Adresse angeben: tsx get-invitation-link.ts email@example.com');
  process.exit(1);
}

async function getInvitationLink() {
  try {
    // Finde die Einladung
    const membersSnapshot = await adminDb
      .collection('team_members')
      .where('email', '==', email)
      .where('status', '==', 'invited')
      .limit(1)
      .get();

    if (membersSnapshot.empty) {
      console.error(`Keine Einladung gefunden für: ${email}`);
      process.exit(1);
    }

    const memberDoc = membersSnapshot.docs[0];
    const memberData = memberDoc.data();

    const invitationToken = memberData.invitationToken;
    const invitationId = memberDoc.id;
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const invitationLink = `${baseUrl}/invite/${invitationToken}?id=${invitationId}`;

    // Ausgabe als JSON für einfaches Parsing
    console.log(JSON.stringify({
      token: invitationToken,
      id: invitationId,
      link: invitationLink,
      email: memberData.email,
      organizationId: memberData.organizationId,
      role: memberData.role
    }));

    process.exit(0);
  } catch (error) {
    console.error('Fehler beim Abrufen der Einladung:', error);
    process.exit(1);
  }
}

getInvitationLink();
