/**
 * Super-Admin Check Helper
 * Prüft ob ein User Super-Admin Rechte hat
 */

import { adminAuth } from '@/lib/firebase/admin-init';

/**
 * Check if user is super-admin
 * Uses Firebase Custom Claims
 */
export async function isSuperAdmin(userId: string): Promise<boolean> {
  try {
    const user = await adminAuth.getUser(userId);
    const customClaims = user.customClaims || {};

    // Prüfe ob User das super-admin Custom Claim hat
    return customClaims.role === 'super-admin';
  } catch (error) {
    console.error('Error checking super-admin status:', error);
    return false;
  }
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
