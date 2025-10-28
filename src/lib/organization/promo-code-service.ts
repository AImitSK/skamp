/**
 * Promo Code Service
 * Server-Side Service für Promo-Code Management
 */

import { adminDb } from '@/lib/firebase/admin-init';
import { PromoCode } from '@/types/promo-code';
import { SubscriptionTier } from '@/types/organization';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';

export class PromoCodeService {
  /**
   * Validate and apply promo code
   */
  async applyPromoCode(
    organizationId: string,
    code: string
  ): Promise<{ valid: boolean; tier?: string; error?: string }> {
    try {
      // Get promo code
      const promoCodeQuery = await adminDb
        .collection('promoCodes')
        .where('code', '==', code.toUpperCase())
        .where('active', '==', true)
        .limit(1)
        .get();

      if (promoCodeQuery.empty) {
        return { valid: false, error: 'Ungültiger Promo-Code' };
      }

      const promoDoc = promoCodeQuery.docs[0];
      const promoData = promoDoc.data() as PromoCode;

      // Check expiry
      if (promoData.expiresAt && new Date() > promoData.expiresAt.toDate()) {
        return { valid: false, error: 'Promo-Code abgelaufen' };
      }

      // Check max uses
      if (promoData.maxUses !== -1 && promoData.currentUses >= promoData.maxUses) {
        return { valid: false, error: 'Promo-Code bereits vollständig eingelöst' };
      }

      // Calculate expiry for account
      let accountExpiry = null;
      if (promoData.validityMonths !== null) {
        accountExpiry = new Date();
        accountExpiry.setMonth(accountExpiry.getMonth() + promoData.validityMonths);
      }

      // Apply to organization
      await adminDb.collection('organizations').doc(organizationId).update({
        accountType: 'promo',
        tier: promoData.tier,
        promoDetails: {
          code: code.toUpperCase(),
          grantedBy: 'promo-code',
          grantedAt: Timestamp.now(),
          expiresAt: accountExpiry ? Timestamp.fromDate(accountExpiry) : null,
          reason: `Promo Code: ${code}`,
          originalTier: promoData.tier,
        },
        updatedAt: Timestamp.now(),
      });

      // Increment usage count
      await adminDb.collection('promoCodes').doc(promoDoc.id).update({
        currentUses: FieldValue.increment(1),
      });

      console.log(`✅ Applied promo code ${code} to ${organizationId}`);

      return { valid: true, tier: promoData.tier };
    } catch (error: any) {
      console.error('Error applying promo code:', error);
      return { valid: false, error: error.message || 'Fehler beim Einlösen des Promo-Codes' };
    }
  }

  /**
   * Create promo code (Super-Admin only)
   */
  async createPromoCode(
    code: string,
    tier: 'BUSINESS' | 'AGENTUR',
    maxUses: number,
    validityMonths: number | null,
    expiresAt: Date | null,
    createdBy: string
  ): Promise<string> {
    try {
      // Check if code already exists
      const existing = await adminDb
        .collection('promoCodes')
        .where('code', '==', code.toUpperCase())
        .get();

      if (!existing.empty) {
        throw new Error('Promo-Code existiert bereits');
      }

      const promoDoc = await adminDb.collection('promoCodes').add({
        code: code.toUpperCase(),
        tier,
        maxUses,
        currentUses: 0,
        expiresAt: expiresAt ? Timestamp.fromDate(expiresAt) : null,
        validityMonths,
        active: true,
        createdBy,
        createdAt: Timestamp.now(),
      });

      console.log(`✅ Created promo code: ${code}`);

      return promoDoc.id;
    } catch (error: any) {
      console.error('Error creating promo code:', error);
      throw error;
    }
  }

  /**
   * Deactivate promo code
   */
  async deactivatePromoCode(code: string): Promise<void> {
    try {
      const promoCodeQuery = await adminDb
        .collection('promoCodes')
        .where('code', '==', code.toUpperCase())
        .limit(1)
        .get();

      if (promoCodeQuery.empty) {
        throw new Error('Promo-Code nicht gefunden');
      }

      await adminDb.collection('promoCodes').doc(promoCodeQuery.docs[0].id).update({
        active: false,
      });

      console.log(`✅ Deactivated promo code: ${code}`);
    } catch (error: any) {
      console.error('Error deactivating promo code:', error);
      throw error;
    }
  }

  /**
   * Reactivate promo code
   */
  async reactivatePromoCode(code: string): Promise<void> {
    try {
      const promoCodeQuery = await adminDb
        .collection('promoCodes')
        .where('code', '==', code.toUpperCase())
        .limit(1)
        .get();

      if (promoCodeQuery.empty) {
        throw new Error('Promo-Code nicht gefunden');
      }

      await adminDb.collection('promoCodes').doc(promoCodeQuery.docs[0].id).update({
        active: true,
      });

      console.log(`✅ Reactivated promo code: ${code}`);
    } catch (error: any) {
      console.error('Error reactivating promo code:', error);
      throw error;
    }
  }

  /**
   * List all promo codes (Super-Admin)
   */
  async listPromoCodes(): Promise<PromoCode[]> {
    try {
      const snapshot = await adminDb
        .collection('promoCodes')
        .orderBy('createdAt', 'desc')
        .get();

      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as PromoCode[];
    } catch (error: any) {
      console.error('Error listing promo codes:', error);
      return [];
    }
  }

  /**
   * Get promo code by code string
   */
  async getPromoCodeByCode(code: string): Promise<PromoCode | null> {
    try {
      const promoCodeQuery = await adminDb
        .collection('promoCodes')
        .where('code', '==', code.toUpperCase())
        .limit(1)
        .get();

      if (promoCodeQuery.empty) {
        return null;
      }

      return {
        id: promoCodeQuery.docs[0].id,
        ...promoCodeQuery.docs[0].data(),
      } as PromoCode;
    } catch (error: any) {
      console.error('Error fetching promo code:', error);
      return null;
    }
  }

  /**
   * Update promo code
   */
  async updatePromoCode(
    code: string,
    updates: Partial<Omit<PromoCode, 'id' | 'code' | 'createdBy' | 'createdAt'>>
  ): Promise<void> {
    try {
      const promoCodeQuery = await adminDb
        .collection('promoCodes')
        .where('code', '==', code.toUpperCase())
        .limit(1)
        .get();

      if (promoCodeQuery.empty) {
        throw new Error('Promo-Code nicht gefunden');
      }

      await adminDb.collection('promoCodes').doc(promoCodeQuery.docs[0].id).update(updates);

      console.log(`✅ Updated promo code: ${code}`);
    } catch (error: any) {
      console.error('Error updating promo code:', error);
      throw error;
    }
  }

  /**
   * Get promo code statistics
   */
  async getPromoCodeStats(code: string): Promise<{
    totalUses: number;
    remainingUses: number | null;
    active: boolean;
    expired: boolean;
  } | null> {
    try {
      const promoCode = await this.getPromoCodeByCode(code);

      if (!promoCode) {
        return null;
      }

      const remainingUses =
        promoCode.maxUses === -1 ? null : promoCode.maxUses - promoCode.currentUses;

      const expired =
        promoCode.expiresAt !== null && new Date() > promoCode.expiresAt.toDate();

      return {
        totalUses: promoCode.currentUses,
        remainingUses,
        active: promoCode.active,
        expired,
      };
    } catch (error: any) {
      console.error('Error fetching promo code stats:', error);
      return null;
    }
  }
}

export const promoCodeService = new PromoCodeService();
