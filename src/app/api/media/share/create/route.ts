// src/app/api/media/share/create/route.ts
// API Route: Share-Link erstellen (Server-Side mit bcrypt)
// Phase 6.2: Admin SDK Migration

import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin-init';
import bcrypt from 'bcryptjs';
import { nanoid } from 'nanoid';
import admin from '@/lib/firebase/admin-init';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      targetId,
      type,
      title,
      description,
      settings,
      assetIds,
      folderIds,
      organizationId,
      createdBy
    } = body;

    // Validierung
    if (!organizationId || !createdBy || !targetId || !type || !title) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Generate unique shareId (10 Zeichen für kurze URLs)
    const shareId = nanoid(10);

    // Hash password (wenn vorhanden)
    let processedSettings = { ...settings };
    if (settings?.passwordRequired) {
      const hashedPassword = await bcrypt.hash(settings.passwordRequired, 10);
      processedSettings = {
        ...settings,
        passwordRequired: hashedPassword, // Gehashtes Passwort speichern
      };
    }

    // Create Share-Link
    const shareLink: any = {
      shareId,
      organizationId,
      createdBy,
      targetId,
      type,
      title,
      settings: processedSettings,
      active: true,
      accessCount: 0,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    // Nur definierte Werte hinzufügen
    if (description !== undefined && description !== null) {
      shareLink.description = description;
    }
    if (assetIds && assetIds.length > 0) {
      shareLink.assetIds = assetIds;
    }
    if (folderIds && folderIds.length > 0) {
      shareLink.folderIds = folderIds;
    }

    // In Firestore speichern
    const docRef = await adminDb.collection('media_shares').add(shareLink);

    // Audit-Log erstellen
    await adminDb.collection('audit_logs').add({
      action: 'share_created',
      shareId,
      documentId: docRef.id,
      userId: createdBy,
      organizationId,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });

    return NextResponse.json({
      id: docRef.id,
      shareId,
      message: 'Share link created successfully'
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating share:', error);
    return NextResponse.json(
      { error: 'Failed to create share' },
      { status: 500 }
    );
  }
}
