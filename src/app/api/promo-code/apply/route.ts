/**
 * Promo Code Apply API
 * POST - Apply promo code to organization
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthContext } from '@/lib/api/auth-middleware';
import { promoCodeService } from '@/lib/organization/promo-code-service';

/**
 * POST /api/promo-code/apply
 * Apply a promo code to the current organization
 */
export async function POST(request: NextRequest) {
  return withAuth(request, async (req, auth: AuthContext) => {
    try {
      const body = await req.json();
      const { code } = body;

      // Validation
      if (!code || typeof code !== 'string') {
        return NextResponse.json(
          { error: 'Ungültiger Promo-Code' },
          { status: 400 }
        );
      }

      // Apply promo code
      const result = await promoCodeService.applyPromoCode(
        auth.organizationId,
        code
      );

      if (result.valid) {
        return NextResponse.json({
          success: true,
          tier: result.tier,
          message: `Promo-Code erfolgreich eingelöst! Ihr Account wurde auf ${result.tier} upgradet.`,
        });
      } else {
        return NextResponse.json(
          {
            success: false,
            error: result.error || 'Promo-Code konnte nicht eingelöst werden',
          },
          { status: 400 }
        );
      }
    } catch (error: any) {
      console.error('Error applying promo code:', error);
      return NextResponse.json(
        { error: error.message || 'Fehler beim Einlösen des Promo-Codes' },
        { status: 500 }
      );
    }
  });
}
