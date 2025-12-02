// src/app/api/threads/update-status/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin-init';
import { FieldValue } from 'firebase-admin/firestore';

export async function POST(request: NextRequest) {
  try {
    const { threadId, status } = await request.json();

    // Validate input
    if (!threadId || !status) {
      return NextResponse.json(
        { error: 'Missing threadId or status' },
        { status: 400 }
      );
    }

    // Update thread status direkt in Firestore (threadMatcherService hat keine updateThreadStatus Methode)
    await adminDb.collection('email_threads').doc(threadId).update({
      status,
      updatedAt: FieldValue.serverTimestamp()
    });

    return NextResponse.json({
      success: true,
      threadId,
      status
    });

  } catch (error) {
    console.error('❌ Failed to update thread status:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update thread status' },
      { status: 500 }
    );
  }
}
