/**
 * API Route: Matching Test-Daten Seed
 *
 * Erstellt Test-Organisationen und Kontakte für Matching-Tests
 * Nur für Development/Testing!
 *
 * POST /api/matching/seed
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  collection,
  addDoc,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';

export async function POST(request: NextRequest) {
  try {
    console.log('🚀 Starting test data seed...');

    // 1. Create Test Organizations
    const orgs = [
      { name: 'Premium Media GmbH', email: 'admin@premium-media.de', plan: 'premium' },
      { name: 'StartUp PR AG', email: 'info@startup-pr.de', plan: 'free' },
      { name: 'Agency Communications Ltd', email: 'contact@agency-comms.de', plan: 'free' },
      { name: 'Digital Media House', email: 'hello@digital-media.de', plan: 'premium' }
    ];

    const createdOrgs = [];

    for (const org of orgs) {
      const docRef = await addDoc(collection(db, 'organizations'), {
        ...org,
        type: 'agency',
        status: 'active',
        features: org.plan === 'premium' ? ['premium_library', 'analytics'] : [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      createdOrgs.push({ ...org, id: docRef.id });
    }

    // 2. Create Test Contacts
    const variants = [
      // Max Müller - 3 Varianten
      {
        orgId: createdOrgs[0].id,
        name: { firstName: 'Max', lastName: 'Müller' },
        displayName: 'Max Müller',
        emails: [{ type: 'business', email: 'm.mueller@spiegel.de', isPrimary: true }],
        phones: [{ type: 'business', number: '+49 40 1234567', isPrimary: true }],
        position: 'Politikredakteur',
        companyName: 'Der Spiegel',
        mediaProfile: {
          isJournalist: true,
          beats: ['Politik', 'Wirtschaft', 'Europa'],
          publicationIds: [],
          mediaTypes: ['print', 'online']
        }
      },
      {
        orgId: createdOrgs[1].id,
        name: { firstName: 'Maximilian', lastName: 'Müller' },
        displayName: 'Maximilian Müller',
        emails: [{ type: 'business', email: 'm.mueller@spiegel.de', isPrimary: true }],
        position: 'Redakteur',
        companyName: 'Spiegel Verlag',
        mediaProfile: {
          isJournalist: true,
          beats: ['Politik'],
          publicationIds: [],
          mediaTypes: ['online']
        }
      },
      {
        orgId: createdOrgs[2].id,
        name: { firstName: 'M.', lastName: 'Müller' },
        displayName: 'M. Müller',
        emails: [{ type: 'business', email: 'm.mueller@spiegel.de', isPrimary: true }],
        phones: [{ type: 'business', number: '+49 40 9876543', isPrimary: true }],
        position: 'Senior Journalist',
        companyName: 'Axel Springer',
        mediaProfile: {
          isJournalist: true,
          beats: ['Politik', 'Wirtschaft'],
          publicationIds: [],
          mediaTypes: ['print']
        }
      },
      // Anna Schmidt - 2 Varianten
      {
        orgId: createdOrgs[0].id,
        name: { firstName: 'Anna', lastName: 'Schmidt' },
        displayName: 'Anna Schmidt',
        emails: [{ type: 'business', email: 'a.schmidt@zeit.de', isPrimary: true }],
        phones: [{ type: 'business', number: '+49 40 3280 123', isPrimary: true }],
        position: 'Wirtschaftsredakteurin',
        companyName: 'Die Zeit',
        mediaProfile: {
          isJournalist: true,
          beats: ['Wirtschaft', 'Finanzen', 'Startups'],
          publicationIds: [],
          mediaTypes: ['print', 'online']
        }
      },
      {
        orgId: createdOrgs[3].id,
        name: { firstName: 'Anna', lastName: 'Schmidt' },
        displayName: 'Anna Schmidt',
        emails: [{ type: 'business', email: 'a.schmidt@zeit.de', isPrimary: true }],
        position: 'Redakteurin',
        companyName: 'Zeit Online',
        mediaProfile: {
          isJournalist: true,
          beats: ['Wirtschaft', 'Technologie'],
          publicationIds: [],
          mediaTypes: ['online']
        }
      },
      // Peter Weber - 1 Variante (sollte nicht matchen)
      {
        orgId: createdOrgs[1].id,
        name: { firstName: 'Peter', lastName: 'Weber' },
        displayName: 'Peter Weber',
        emails: [{ type: 'business', email: 'p.weber@faz.net', isPrimary: true }],
        position: 'Technikredakteur',
        companyName: 'FAZ',
        mediaProfile: {
          isJournalist: true,
          beats: ['Technologie', 'Digital'],
          publicationIds: [],
          mediaTypes: ['print', 'online']
        }
      }
    ];

    let contactsCreated = 0;
    for (const variant of variants) {
      const { orgId, ...contactData } = variant;
      await addDoc(collection(db, 'contacts_enhanced'), {
        ...contactData,
        organizationId: orgId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy: 'seed-api',
        updatedBy: 'seed-api',
        deletedAt: null,
        isGlobal: false
      });
      contactsCreated++;
    }

    console.log('✅ Test data seed completed');

    return NextResponse.json({
      success: true,
      message: 'Test-Daten erfolgreich erstellt',
      data: {
        organizations: createdOrgs.length,
        contacts: contactsCreated
      }
    });

  } catch (error) {
    console.error('❌ Seed failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Seed fehlgeschlagen',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
