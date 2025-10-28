/**
 * Super-Admin Organizations API - Change Tier
 * POST /api/super-admin/organizations/[id]/change-tier
 */

import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin-init';
import { isSuperAdmin } from '@/lib/api/super-admin-check';
import { withAuth, AuthContext } from '@/lib/api/auth-middleware';

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
      const { tier } = await req.json();
      const organizationId = params.id;

      // Validate tier
      if (!['STARTER', 'BUSINESS', 'AGENTUR'].includes(tier)) {
        return NextResponse.json(
          { error: 'Invalid tier. Must be STARTER, BUSINESS, or AGENTUR' },
          { status: 400 }
        );
      }

      // Update organization tier
      await adminDb.collection('organizations').doc(organizationId).update({
        tier,
        updatedAt: new Date(),
      });

      console.log(`✅ Tier changed to ${tier} for organization ${organizationId}`);

      return NextResponse.json({ success: true });
    } catch (error: any) {
      console.error('Error changing tier:', error);
      return NextResponse.json(
        { error: error.message || 'Internal server error' },
        { status: 500 }
      );
    }
  });
}
