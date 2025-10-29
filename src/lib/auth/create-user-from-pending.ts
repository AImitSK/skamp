/**
 * Create User and Organization from Pending Signup
 *
 * Wird vom Stripe Webhook nach erfolgreicher Zahlung aufgerufen.
 * Erstellt Firebase Auth User + Organization + Team Member.
 */

import { adminAuth, adminDb } from '@/lib/firebase/admin-init';
import { FieldValue } from 'firebase-admin/firestore';
import { PendingSignup } from '@/types/pending-signup';

export async function createUserAndOrgFromPendingSignup(
  pendingSignup: PendingSignup,
  stripeCustomerId: string,
  stripeSubscriptionId: string
): Promise<{ userId: string; organizationId: string }> {

  let userId: string;

  // 1. Erstelle Firebase Auth User (nur für Email/Password)
  if (pendingSignup.provider === 'email') {
    if (!pendingSignup.password) {
      throw new Error('Password missing for email signup');
    }

    try {
      const userRecord = await adminAuth.createUser({
        email: pendingSignup.email,
        password: pendingSignup.password,
        emailVerified: false,
        disabled: false,
      });

      userId = userRecord.uid;
      console.log(`[Pending Signup] Created Firebase Auth user: ${userId}`);

      // Erstelle User-Dokument in Firestore
      await adminDb.collection('users').doc(userId).set({
        userId: userId,
        email: pendingSignup.email,
        displayName: pendingSignup.companyName,
        createdAt: FieldValue.serverTimestamp(),
        lastLoginAt: FieldValue.serverTimestamp(),
        provider: 'email'
      });

    } catch (error: any) {
      console.error('[Pending Signup] Error creating Firebase user:', error);

      // Falls User bereits existiert (z.B. von früherem Signup)
      if (error.code === 'auth/email-already-exists') {
        const existingUser = await adminAuth.getUserByEmail(pendingSignup.email);
        userId = existingUser.uid;
        console.log(`[Pending Signup] User already exists, using: ${userId}`);
      } else {
        throw error;
      }
    }

  } else if (pendingSignup.provider === 'google') {
    // Für Google: Verwende die Google UID falls vorhanden
    if (!pendingSignup.googleUserInfo?.uid) {
      throw new Error('Google UID missing for google signup');
    }

    userId = pendingSignup.googleUserInfo.uid;

    // Erstelle User-Dokument (Firebase Auth User wird beim Login erstellt)
    await adminDb.collection('users').doc(userId).set({
      userId: userId,
      email: pendingSignup.email,
      displayName: pendingSignup.googleUserInfo.displayName || pendingSignup.companyName,
      photoURL: pendingSignup.googleUserInfo.photoURL || null,
      createdAt: FieldValue.serverTimestamp(),
      lastLoginAt: FieldValue.serverTimestamp(),
      provider: 'google'
    }, { merge: true });

    console.log(`[Pending Signup] Created user document for Google user: ${userId}`);
  } else {
    throw new Error(`Unknown provider: ${pendingSignup.provider}`);
  }

  // 2. Erstelle Organization
  const orgData: any = {
    name: pendingSignup.companyName,
    adminEmail: pendingSignup.email,
    accountType: 'regular',
    tier: pendingSignup.tier,
    subscriptionStatus: 'active', // Zahlung war erfolgreich
    stripeCustomerId: stripeCustomerId,
    stripeSubscriptionId: stripeSubscriptionId,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp()
  };

  const orgRef = await adminDb.collection('organizations').add(orgData);
  const organizationId = orgRef.id;

  console.log(`[Pending Signup] Created organization: ${organizationId}`);

  // 3. Erstelle Team Member (Owner)
  const ownerId = `${userId}_${organizationId}`;
  const ownerData: any = {
    id: ownerId,
    userId: userId,
    organizationId: organizationId,
    email: pendingSignup.email,
    displayName: pendingSignup.googleUserInfo?.displayName || pendingSignup.companyName,
    role: 'owner',
    status: 'active',
    invitedAt: FieldValue.serverTimestamp(),
    invitedBy: userId,
    joinedAt: FieldValue.serverTimestamp(),
    lastActiveAt: FieldValue.serverTimestamp(),
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp()
  };

  if (pendingSignup.googleUserInfo?.photoURL) {
    ownerData.photoUrl = pendingSignup.googleUserInfo.photoURL;
  }

  await adminDb.collection('team_members').doc(ownerId).set(ownerData);

  console.log(`[Pending Signup] Created team member: ${ownerId}`);

  // 4. Update Stripe Subscription Metadata mit organizationId
  // (für zukünftige webhook events)
  try {
    const stripe = await import('@/lib/stripe/stripe-service');
    await stripe.stripe.subscriptions.update(stripeSubscriptionId, {
      metadata: {
        organizationId: organizationId,
        tier: pendingSignup.tier,
        userId: userId
      }
    });
    console.log(`[Pending Signup] Updated Stripe subscription metadata`);
  } catch (error) {
    console.error('[Pending Signup] Failed to update subscription metadata:', error);
    // Nicht kritisch, weitermachen
  }

  return {
    userId,
    organizationId
  };
}
