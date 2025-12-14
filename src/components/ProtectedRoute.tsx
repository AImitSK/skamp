// src/components/ProtectedRoute.tsx
"use client";

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase/client-init';
import { useTranslations } from 'next-intl';

// Diese Komponente umwickelt geschützte Inhalte.
export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const t = useTranslations('auth.protectedRoute');
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [checkingSubscription, setCheckingSubscription] = useState(true);

  useEffect(() => {
    // Nur weiterleiten, wenn der Ladezustand abgeschlossen ist und kein Benutzer vorhanden ist
    if (!loading && user === null) {
      router.push('/');
      return;
    }

    // Prüfe subscriptionStatus für regular accounts
    if (!loading && user) {
      checkSubscriptionStatus();
    }
  }, [user, loading, router]);

  const checkSubscriptionStatus = async () => {
    if (!user) return;

    try {
      // Finde Organization des Users über team_members
      const teamMembersRef = collection(db, 'team_members');
      const q = query(
        teamMembersRef,
        where('userId', '==', user.uid),
        where('status', '==', 'active')
      );
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        console.warn('[ProtectedRoute] No organization found for user');
        setCheckingSubscription(false);
        return;
      }

      const membership = snapshot.docs[0].data();
      const organizationId = membership.organizationId;

      // Lade Organization
      const orgSnapshot = await getDocs(
        query(collection(db, 'organizations'), where('__name__', '==', organizationId))
      );

      if (orgSnapshot.empty) {
        console.warn('[ProtectedRoute] Organization not found');
        setCheckingSubscription(false);
        return;
      }

      const org = orgSnapshot.docs[0].data();

      // PAYMENT-BEFORE-ACCESS FLOW:
      // User + Organization werden erst NACH erfolgreicher Zahlung erstellt
      // subscriptionStatus ist IMMER 'active' bei Erstellung
      // Keine subscriptionStatus-Prüfung mehr nötig

      setCheckingSubscription(false);
    } catch (error) {
      console.error('[ProtectedRoute] Error checking subscription:', error);
      setCheckingSubscription(false);
    }
  };

  // Während des Ladens einen Ladeindikator anzeigen
  if (loading || checkingSubscription) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-zinc-500">{t('loading')}</div>
      </div>
    );
  }

  // Wenn kein Benutzer vorhanden ist, nichts anzeigen (Weiterleitung erfolgt im useEffect)
  if (!user) {
    return null;
  }

  // Wenn ein Benutzer vorhanden ist, zeige den geschützten Inhalt an
  return <>{children}</>;
}