// src/app/api/media/share/validate/route.ts
// API Route: Share-Link Passwort validieren (Server-Side mit bcrypt)
// Phase 6.2: Admin SDK Migration

import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin-init';
import bcrypt from 'bcryptjs';
import admin from '@/lib/firebase/admin-init';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { shareId, password } = body;

    if (!shareId || !password) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Load Share-Link
    const snapshot = await adminDb
      .collection('media_shares')
      .where('shareId', '==', shareId)
      .where('active', '==', true)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return NextResponse.json(
        { error: 'Share not found' },
        { status: 404 }
      );
    }

    const shareDoc = snapshot.docs[0];
    const shareLink = shareDoc.data();

    // Validate Password
    const requiredPassword = shareLink.settings?.passwordRequired;

    if (!requiredPassword) {
      // No password required
      return NextResponse.json({ valid: true }, { status: 200 });
    }

    const isValid = await bcrypt.compare(password, requiredPassword);

    if (!isValid) {
      // Log failed attempt
      await adminDb.collection('audit_logs').add({
        action: 'share_password_failed',
        shareId,
        documentId: shareDoc.id,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      });

      return NextResponse.json(
        { error: 'Invalid password', valid: false },
        { status: 401 }
      );
    }

    // Log successful access
    await adminDb.collection('audit_logs').add({
      action: 'share_password_success',
      shareId,
      documentId: shareDoc.id,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Increment Access-Count
    await adminDb.collection('media_shares').doc(shareDoc.id).update({
      accessCount: admin.firestore.FieldValue.increment(1),
      lastAccessedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ valid: true }, { status: 200 });
  } catch (error) {
    console.error('Error validating share password:', error);
    return NextResponse.json(
      { error: 'Failed to validate password' },
      { status: 500 }
    );
  }
}
