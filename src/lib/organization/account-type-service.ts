/**
 * Account Type Service
 * Server-Side Service für Special Accounts (Promo, Beta, Internal)
 */

import { adminDb } from '@/lib/firebase/admin-init';
import { Organization, AccountType } from '@/types/organization';
import { Timestamp } from 'firebase-admin/firestore';

export class AccountTypeService {
  /**
   * Check if organization is a special account (no limits)
   */
  async isSpecialAccount(organizationId: string): Promise<boolean> {
    const org = await this.getOrganization(organizationId);

    if (!org) {
      return false;
    }

    return ['promo', 'beta', 'internal'].includes(org.accountType);
  }

  /**
   * Check if account has access to feature
   */
  async hasFeatureAccess(
    organizationId: string,
    feature: string
  ): Promise<boolean> {
    const org = await this.getOrganization(organizationId);

    if (!org) {
      return false;
    }

    // Special accounts = full access
    if (['beta', 'internal'].includes(org.accountType)) {
      return true;
    }

    // Promo accounts: Check expiry
    if (org.accountType === 'promo') {
      return this.isPromoValid(org);
    }

    // Regular accounts: Use tier limits (will be implemented in Phase 2)
    return this.checkRegularAccountAccess(org, feature);
  }

  /**
   * Check if promo is still valid
   */
  private isPromoValid(org: Organization): boolean {
    if (!org.promoDetails?.expiresAt) {
      return true; // No expiry = always valid
    }

    const now = new Date();
    const expiryDate = org.promoDetails.expiresAt.toDate();

    return now < expiryDate;
  }

  /**
   * Check regular account access (placeholder for Phase 2)
   */
  private checkRegularAccountAccess(org: Organization, feature: string): boolean {
    // TODO: Implement in Phase 2 with subscription limits
    // For now, return true to not break existing functionality
    return true;
  }

  /**
   * Get organization data
   */
  async getOrganization(organizationId: string): Promise<Organization | null> {
    try {
      const doc = await adminDb.collection('organizations').doc(organizationId).get();

      if (!doc.exists) {
        console.error(`Organization ${organizationId} not found`);
        return null;
      }

      return { id: doc.id, ...doc.data() } as Organization;
    } catch (error) {
      console.error('Error fetching organization:', error);
      return null;
    }
  }

  /**
   * Convert promo to regular account
   */
  async convertToRegular(
    organizationId: string,
    stripeCustomerId: string,
    stripeSubscriptionId: string
  ): Promise<void> {
    await adminDb.collection('organizations').doc(organizationId).update({
      accountType: 'regular',
      stripeCustomerId,
      stripeSubscriptionId,
      promoDetails: null,
      updatedAt: Timestamp.now(),
    });

    console.log(`✅ Converted ${organizationId} to regular account`);
  }

  /**
   * Extend promo expiry
   */
  async extendPromo(
    organizationId: string,
    additionalMonths: number
  ): Promise<void> {
    const org = await this.getOrganization(organizationId);

    if (!org) {
      throw new Error('Organization not found');
    }

    if (org.accountType !== 'promo') {
      throw new Error('Organization is not a promo account');
    }

    const currentExpiry = org.promoDetails?.expiresAt?.toDate() || new Date();
    const newExpiry = new Date(currentExpiry);
    newExpiry.setMonth(newExpiry.getMonth() + additionalMonths);

    await adminDb.collection('organizations').doc(organizationId).update({
      'promoDetails.expiresAt': Timestamp.fromDate(newExpiry),
      updatedAt: Timestamp.now(),
    });

    console.log(`✅ Extended promo for ${organizationId} until ${newExpiry.toISOString()}`);
  }

  /**
   * Update organization account type (Super-Admin only)
   */
  async updateAccountType(
    organizationId: string,
    accountType: AccountType,
    promoDetails?: Organization['promoDetails']
  ): Promise<void> {
    const updateData: any = {
      accountType,
      updatedAt: Timestamp.now(),
    };

    if (accountType === 'promo' && promoDetails) {
      updateData.promoDetails = {
        ...promoDetails,
        grantedAt: Timestamp.now(),
        expiresAt: promoDetails.expiresAt
          ? Timestamp.fromDate(promoDetails.expiresAt as any)
          : null,
      };
    } else if (accountType !== 'promo') {
      // Clear promo details for non-promo accounts
      updateData.promoDetails = null;
    }

    await adminDb.collection('organizations').doc(organizationId).update(updateData);

    console.log(`✅ Updated ${organizationId} to ${accountType} account`);
  }
}

export const accountTypeService = new AccountTypeService();
