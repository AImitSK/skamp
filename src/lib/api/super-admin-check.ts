/**
 * Super-Admin Check Helper
 * Prüft ob ein User Super-Admin Rechte hat
 *
 * LOGIK: Alle Mitglieder der Super-Admin Organization sind Super-Admins
 */

import { adminAuth, adminDb } from '@/lib/firebase/admin-init';
import { SUPER_ADMIN_OWNER_EMAIL } from '@/lib/config/super-admin';

// Cache für Super-Admin Organization ID
let cachedSuperAdminOrgId: string | null = null;

/**
 * Get Super-Admin Organization ID
 * Findet die Organization des Super-Admin Owner Users
 */
async function getSuperAdminOrganizationId(): Promise<string | null> {
  // Return cached value if available
  if (cachedSuperAdminOrgId) {
    return cachedSuperAdminOrgId;
  }

  try {
    // 1. Finde User mit Super-Admin Email
    const userRecord = await adminAuth.getUserByEmail(SUPER_ADMIN_OWNER_EMAIL);

    // 2. Finde Team-Membership für diesen User
    const teamMemberSnapshot = await adminDb
      .collection('team_members')
      .where('userId', '==', userRecord.uid)
      .where('status', '==', 'active')
      .limit(1)
      .get();

    if (teamMemberSnapshot.empty) {
      console.error('Super-Admin user has no organization membership');
      return null;
    }

    const orgId = teamMemberSnapshot.docs[0].data().organizationId;

    // Cache the result
    cachedSuperAdminOrgId = orgId;

    console.log(`✅ Super-Admin Organization ID: ${orgId}`);
    return orgId;
  } catch (error) {
    console.error('Error getting super-admin organization ID:', error);
    return null;
  }
}

/**
 * Check if user is super-admin
 * Returns true if user is member of Super-Admin Organization
 */
export async function isSuperAdmin(userId: string): Promise<boolean> {
  try {
    // 1. Get Super-Admin Organization ID
    const superAdminOrgId = await getSuperAdminOrganizationId();

    if (!superAdminOrgId) {
      return false;
    }

    // 2. Check if user is member of Super-Admin Organization
    const teamMemberSnapshot = await adminDb
      .collection('team_members')
      .where('userId', '==', userId)
      .where('organizationId', '==', superAdminOrgId)
      .where('status', '==', 'active')
      .limit(1)
      .get();

    const isAdmin = !teamMemberSnapshot.empty;

    if (isAdmin) {
      console.log(`✅ User ${userId} is Super-Admin (member of org ${superAdminOrgId})`);
    }

    return isAdmin;
  } catch (error) {
    console.error('Error checking super-admin status:', error);
    return false;
  }
}

/**
 * Check if organization is the Super-Admin Organization
 */
export async function isSuperAdminOrganization(organizationId: string): Promise<boolean> {
  const superAdminOrgId = await getSuperAdminOrganizationId();
  return organizationId === superAdminOrgId;
}

/**
 * Set super-admin custom claim for a user
 * Nur für initial setup / migration
 */
export async function setSuperAdminClaim(userId: string): Promise<void> {
  try {
    await adminAuth.setCustomUserClaims(userId, { role: 'super-admin' });
    console.log(`✅ Set super-admin claim for user: ${userId}`);
  } catch (error) {
    console.error('Error setting super-admin claim:', error);
    throw error;
  }
}

/**
 * Remove super-admin claim from user
 */
export async function removeSuperAdminClaim(userId: string): Promise<void> {
  try {
    await adminAuth.setCustomUserClaims(userId, { role: null });
    console.log(`✅ Removed super-admin claim from user: ${userId}`);
  } catch (error) {
    console.error('Error removing super-admin claim:', error);
    throw error;
  }
}
