// src/app/api/admin/migrate-domain/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin-init';
import { FieldValue } from 'firebase-admin/firestore';

export async function POST(request: NextRequest) {
  try {
    const { domainName, newOrganizationId, userId } = await request.json();

    if (!domainName || !newOrganizationId || !userId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Normalisiere Domain-Namen
    const normalizedDomain = domainName.toLowerCase().replace(/^www\./, '');

    console.log('🔍 Suche Domain:', normalizedDomain);

    // Suche Domain
    const domainsRef = adminDb.collection('email_domains_enhanced');
    const snapshot = await domainsRef
      .where('domain', '==', normalizedDomain)
      .get();

    if (snapshot.empty) {
      // Versuche mit www.
      const altSnapshot = await domainsRef
        .where('domain', '==', `www.${normalizedDomain}`)
        .get();

      if (altSnapshot.empty) {
        return NextResponse.json(
          { error: 'Domain nicht gefunden' },
          { status: 404 }
        );
      }

      // Verwende alternative Suche
      return await processMigration(altSnapshot, newOrganizationId, userId);
    }

    return await processMigration(snapshot, newOrganizationId, userId);

  } catch (error: any) {
    console.error('Migration error:', error);
    return NextResponse.json(
      { error: error.message || 'Migration fehlgeschlagen' },
      { status: 500 }
    );
  }
}

async function processMigration(
  snapshot: FirebaseFirestore.QuerySnapshot,
  newOrganizationId: string,
  userId: string
) {
  const doc = snapshot.docs[0];
  const domainData = doc.data();

  console.log('✅ Domain gefunden:', {
    id: doc.id,
    domain: domainData.domain,
    currentOrgId: domainData.organizationId,
    status: domainData.status
  });

  // Prüfe ob Migration notwendig
  if (domainData.organizationId === newOrganizationId) {
    return NextResponse.json({
      success: true,
      message: 'Domain hat bereits die korrekte organizationId',
      alreadyMigrated: true,
      domain: domainData
    });
  }

  // Backup der alten organizationId
  const backupData = {
    oldOrganizationId: domainData.organizationId,
    migratedAt: FieldValue.serverTimestamp(),
    migratedBy: userId
  };

  // Update durchführen
  await doc.ref.update({
    organizationId: newOrganizationId,
    updatedAt: FieldValue.serverTimestamp(),
    updatedBy: userId,
    migrationBackup: backupData
  });

  // Verifiziere
  const updatedDoc = await doc.ref.get();
  const updatedData = updatedDoc.data();

  return NextResponse.json({
    success: true,
    message: 'Migration erfolgreich',
    migration: {
      domainId: doc.id,
      domain: updatedData?.domain,
      oldOrganizationId: backupData.oldOrganizationId,
      newOrganizationId: updatedData?.organizationId,
      migratedAt: new Date().toISOString()
    }
  });
}
