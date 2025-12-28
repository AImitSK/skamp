// src/app/api/media/share/[shareId]/route.ts
// API Route: Share-Link laden/löschen (Server-Side)
// Phase 6.2: Admin SDK Migration

import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin-init';
import admin from '@/lib/firebase/admin-init';

// GET - Load Share-Link (Public Access)
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ shareId: string }> }
) {
  try {
    const { shareId } = await params;

    if (!shareId) {
      return NextResponse.json(
        { error: 'Share ID required' },
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
    const shareData = shareDoc.data();

    // Check expiration
    if (shareData.settings?.expiresAt) {
      const expiresAt = shareData.settings.expiresAt.toDate();
      if (new Date() > expiresAt) {
        return NextResponse.json(
          { error: 'Share link has expired' },
          { status: 410 } // Gone
        );
      }
    }

    // Prepare response (ohne Passwort-Hash!)
    const responseData: any = {
      id: shareDoc.id,
      shareId: shareData.shareId,
      organizationId: shareData.organizationId,
      targetId: shareData.targetId,
      type: shareData.type,
      title: shareData.title,
      description: shareData.description,
      settings: {
        ...shareData.settings,
        passwordRequired: undefined, // KEIN Passwort-Hash an Client senden!
        requirePassword: !!shareData.settings?.passwordRequired, // Nur Boolean
      },
      assetIds: shareData.assetIds,
      folderIds: shareData.folderIds,
      accessCount: shareData.accessCount,
      createdAt: shareData.createdAt,
      updatedAt: shareData.updatedAt,
    };

    // Log access
    await adminDb.collection('audit_logs').add({
      action: 'share_accessed',
      shareId,
      documentId: shareDoc.id,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });

    return NextResponse.json(responseData, { status: 200 });
  } catch (error) {
    console.error('Error loading share:', error);
    return NextResponse.json(
      { error: 'Failed to load share' },
      { status: 500 }
    );
  }
}

// DELETE - Delete Share-Link (Authenticated)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ shareId: string }> }
) {
  try {
    const { shareId } = await params;

    if (!shareId) {
      return NextResponse.json(
        { error: 'Share ID required' },
        { status: 400 }
      );
    }

    // Find Share-Link
    const snapshot = await adminDb
      .collection('media_shares')
      .where('shareId', '==', shareId)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return NextResponse.json(
        { error: 'Share not found' },
        { status: 404 }
      );
    }

    const shareDoc = snapshot.docs[0];

    // Delete Share-Link
    await adminDb.collection('media_shares').doc(shareDoc.id).delete();

    // Audit-Log
    await adminDb.collection('audit_logs').add({
      action: 'share_deleted',
      shareId,
      documentId: shareDoc.id,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });

    return NextResponse.json(
      { message: 'Share deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error deleting share:', error);
    return NextResponse.json(
      { error: 'Failed to delete share' },
      { status: 500 }
    );
  }
}
