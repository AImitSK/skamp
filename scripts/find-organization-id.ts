// scripts/find-organization-id.ts
/**
 * Findet die organizationId für einen User
 *
 * Usage:
 * npx tsx scripts/find-organization-id.ts <userEmail>
 *
 * Beispiel:
 * npx tsx scripts/find-organization-id.ts user@example.com
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// Initialize Firebase Admin
if (getApps().length === 0) {
  const serviceAccount = {
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  };

  initializeApp({
    credential: cert(serviceAccount as any),
  });
}

const db = getFirestore();
const auth = getAuth();

async function findOrganizationId(userEmail: string) {
  console.log('\n=== Organization Finder ===\n');
  console.log(`🔍 Suche Organisationen für User: ${userEmail}\n`);

  try {
    // Finde User
    const userRecord = await auth.getUserByEmail(userEmail);
    console.log('✅ User gefunden:');
    console.log(`   UID: ${userRecord.uid}`);
    console.log(`   Email: ${userRecord.email}`);
    console.log(`   Display Name: ${userRecord.displayName || 'N/A'}\n`);

    // Finde Team-Memberships
    const teamMembersRef = db.collection('team_members');
    const membershipSnapshot = await teamMembersRef
      .where('userId', '==', userRecord.uid)
      .where('status', '==', 'active')
      .get();

    if (membershipSnapshot.empty) {
      console.log('❌ Keine aktiven Team-Memberships gefunden!');
      return;
    }

    console.log(`📋 Gefundene Organisationen (${membershipSnapshot.size}):\n`);

    // Hole Details für jede Organisation
    for (const doc of membershipSnapshot.docs) {
      const membership = doc.data();
      const orgId = membership.organizationId;

      // Hole Organisation Details
      const orgDoc = await db.collection('organizations').doc(orgId).get();
      const orgData = orgDoc.data();

      console.log('─────────────────────────────────────────');
      console.log(`📁 Organization ID: ${orgId}`);
      console.log(`   Name: ${orgData?.name || 'N/A'}`);
      console.log(`   Rolle: ${membership.role}`);
      console.log(`   Status: ${membership.status}`);
      console.log(`   Account Type: ${orgData?.accountType || 'N/A'}`);

      if (orgData?.customDomain) {
        console.log(`   Custom Domain: ${orgData.customDomain}`);
      }

      console.log('─────────────────────────────────────────\n');
    }

    // Zeige die neueste/aktive Organisation
    const latestMembership = membershipSnapshot.docs[0].data();
    const latestOrgId = latestMembership.organizationId;

    console.log('💡 Für die Domain-Migration verwenden Sie:\n');
    console.log(`   npx tsx scripts/migrate-domain-organization.ts celeropress.com ${latestOrgId}\n`);

  } catch (error) {
    console.error('❌ Fehler:', error);
    if (error instanceof Error) {
      console.error('   Details:', error.message);
    }
  }
}

// Script ausführen
const args = process.argv.slice(2);

if (args.length !== 1) {
  console.log('❌ Falsche Anzahl von Argumenten!');
  console.log('\nUsage:');
  console.log('  npx tsx scripts/find-organization-id.ts <userEmail>');
  console.log('\nBeispiel:');
  console.log('  npx tsx scripts/find-organization-id.ts user@example.com');
  process.exit(1);
}

const [userEmail] = args;

findOrganizationId(userEmail)
  .then(() => {
    console.log('✅ Script abgeschlossen\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script fehlgeschlagen:', error);
    process.exit(1);
  });
