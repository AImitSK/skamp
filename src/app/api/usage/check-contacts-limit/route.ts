/**
 * Check Contacts Limit API
 * GET /api/usage/check-contacts-limit?count=1
 *
 * Checks if the organization can add N more contacts
 * Used by frontend before creating contacts or importing journalist references
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthContext } from '@/lib/api/auth-middleware';
import { checkContactsLimit } from '@/lib/usage/usage-tracker';

export async function GET(request: NextRequest) {
  return withAuth(request, async (req, auth: AuthContext) => {
    try {
      const { searchParams } = new URL(request.url);
      const count = parseInt(searchParams.get('count') || '1', 10);

      if (isNaN(count) || count < 1) {
        return NextResponse.json(
          { error: 'Invalid count parameter' },
          { status: 400 }
        );
      }

      const result = await checkContactsLimit(auth.organizationId, count);

      return NextResponse.json({
        allowed: result.allowed,
        current: result.current,
        limit: result.limit,
        remaining: result.remaining,
        wouldExceed: result.wouldExceed,
      });
    } catch (error: any) {
      console.error('[Check Contacts Limit] Error:', error);
      return NextResponse.json(
        { error: error.message || 'Failed to check limit' },
        { status: 500 }
      );
    }
  });
}
