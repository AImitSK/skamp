/**
 * Super-Admin Organizations API - Extend Promo
 * POST /api/super-admin/organizations/[id]/extend-promo
 */

import { NextRequest, NextResponse } from 'next/server';
import { isSuperAdmin } from '@/lib/api/super-admin-check';
import { withAuth, AuthContext } from '@/lib/api/auth-middleware';
import { accountTypeService } from '@/lib/organization/account-type-service';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: organizationId } = await params;

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
      const { months } = await req.json();

      // Validate months
      if (typeof months !== 'number' || months <= 0) {
        return NextResponse.json(
          { error: 'Invalid months value. Must be a positive number' },
          { status: 400 }
        );
      }

      // Extend promo
      await accountTypeService.extendPromo(organizationId, months);

      console.log(`✅ Promo extended by ${months} months for organization ${organizationId}`);

      return NextResponse.json({ success: true });
    } catch (error: any) {
      console.error('Error extending promo:', error);
      return NextResponse.json(
        { error: error.message || 'Internal server error' },
        { status: 500 }
      );
    }
  });
}
