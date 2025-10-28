/**
 * Super-Admin Organizations API - Support Notes
 * POST /api/super-admin/organizations/[id]/notes
 */

import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin-init';
import { isSuperAdmin } from '@/lib/api/super-admin-check';
import { withAuth, AuthContext } from '@/lib/api/auth-middleware';
import { FieldValue } from 'firebase-admin/firestore';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withAuth(request, async (req, auth: AuthContext) => {
    // Super-Admin Check
    const isSA = await isSuperAdmin(auth.userId);

    if (!isSA) {
      return NextResponse.json(
        { error: 'Unauthorized - Super-Admin access required' },
        { status: 403 }
      );
    }

    try {
      const { note } = await req.json();
      const organizationId = params.id;

      // Validate note
      if (!note || typeof note !== 'string' || note.trim().length === 0) {
        return NextResponse.json(
          { error: 'Invalid note. Must be a non-empty string' },
          { status: 400 }
        );
      }

      // Add support note
      await adminDb.collection('organizations').doc(organizationId).update({
        supportNotes: FieldValue.arrayUnion({
          note: note.trim(),
          createdBy: auth.userId,
          createdByEmail: auth.email || 'unknown',
          createdAt: new Date(),
        }),
        updatedAt: new Date(),
      });

      console.log(`✅ Support note added for organization ${organizationId}`);

      return NextResponse.json({ success: true });
    } catch (error: any) {
      console.error('Error adding support note:', error);
      return NextResponse.json(
        { error: error.message || 'Internal server error' },
        { status: 500 }
      );
    }
  });
}
