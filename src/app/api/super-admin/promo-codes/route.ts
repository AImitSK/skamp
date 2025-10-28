/**
 * Super-Admin API: Promo Codes Management
 * POST - Create new promo code
 * GET - List all promo codes
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthContext } from '@/lib/api/auth-middleware';
import { promoCodeService } from '@/lib/organization/promo-code-service';
import { isSuperAdmin } from '@/lib/api/super-admin-check';

/**
 * POST /api/super-admin/promo-codes
 * Create a new promo code (Super-Admin only)
 */
export async function POST(request: NextRequest) {
  return withAuth(request, async (req, auth: AuthContext) => {
    try {
      // Super-Admin Check
      const isSA = await isSuperAdmin(auth.userId);
      if (!isSA) {
        return NextResponse.json(
          { error: 'Unauthorized - Super-Admin access required' },
          { status: 403 }
        );
      }

      const body = await req.json();
      const { code, tier, maxUses, validityMonths, expiresAt } = body;

      // Validation
      if (!code || !tier) {
        return NextResponse.json(
          { error: 'Missing required fields: code, tier' },
          { status: 400 }
        );
      }

      if (!['BUSINESS', 'AGENTUR'].includes(tier)) {
        return NextResponse.json(
          { error: 'Invalid tier. Must be BUSINESS or AGENTUR' },
          { status: 400 }
        );
      }

      // Create promo code
      const promoId = await promoCodeService.createPromoCode(
        code,
        tier,
        maxUses ?? -1, // Default: unlimited
        validityMonths ?? null, // Default: unlimited duration
        expiresAt ? new Date(expiresAt) : null,
        auth.userId
      );

      return NextResponse.json({
        success: true,
        promoId,
        message: `Promo-Code "${code}" erfolgreich erstellt`,
      });
    } catch (error: any) {
      console.error('Error creating promo code:', error);
      return NextResponse.json(
        { error: error.message || 'Fehler beim Erstellen des Promo-Codes' },
        { status: 400 }
      );
    }
  });
}

/**
 * GET /api/super-admin/promo-codes
 * List all promo codes (Super-Admin only)
 */
export async function GET(request: NextRequest) {
  return withAuth(request, async (req, auth: AuthContext) => {
    try {
      // Super-Admin Check
      const isSA = await isSuperAdmin(auth.userId);
      if (!isSA) {
        return NextResponse.json(
          { error: 'Unauthorized - Super-Admin access required' },
          { status: 403 }
        );
      }

      const promoCodes = await promoCodeService.listPromoCodes();

      return NextResponse.json({
        success: true,
        promoCodes,
        total: promoCodes.length,
      });
    } catch (error: any) {
      console.error('Error listing promo codes:', error);
      return NextResponse.json(
        { error: error.message || 'Fehler beim Laden der Promo-Codes' },
        { status: 500 }
      );
    }
  });
}
