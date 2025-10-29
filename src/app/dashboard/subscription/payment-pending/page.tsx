'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase/client-init';
import { Button } from '@/components/marketing/Button';
import { CreditCardIcon, ExclamationTriangleIcon, ArrowPathIcon } from '@heroicons/react/24/outline';

export default function PaymentPendingPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);

  useEffect(() => {
    // Prüfe ob Zahlung inzwischen abgeschlossen wurde
    const checkPaymentStatus = async () => {
      if (!user) return;

      try {
        const teamMembersRef = collection(db, 'team_members');
        const q = query(
          teamMembersRef,
          where('userId', '==', user.uid),
          where('status', '==', 'active')
        );
        const snapshot = await getDocs(q);

        if (snapshot.empty) return;

        const membership = snapshot.docs[0].data();
        const organizationId = membership.organizationId;

        const orgSnapshot = await getDocs(
          query(collection(db, 'organizations'), where('__name__', '==', organizationId))
        );

        if (orgSnapshot.empty) return;

        const org = orgSnapshot.docs[0].data();

        // Wenn subscriptionStatus jetzt 'active' ist, redirect zum Dashboard
        if (org.subscriptionStatus === 'active') {
          router.push('/dashboard');
        }
      } catch (error) {
        console.error('Error checking payment status:', error);
      }
    };

    // Prüfe alle 5 Sekunden
    const interval = setInterval(checkPaymentStatus, 5000);
    checkPaymentStatus(); // Sofort einmal prüfen

    return () => clearInterval(interval);
  }, [user, router]);

  const handleRetryPayment = async () => {
    setLoading(true);

    try {
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Hole Organization und tier
      const teamMembersRef = collection(db, 'team_members');
      const q = query(
        teamMembersRef,
        where('userId', '==', user.uid),
        where('status', '==', 'active')
      );
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        throw new Error('No organization found');
      }

      const membership = snapshot.docs[0].data();
      const organizationId = membership.organizationId;

      const orgSnapshot = await getDocs(
        query(collection(db, 'organizations'), where('__name__', '==', organizationId))
      );

      if (orgSnapshot.empty) {
        throw new Error('Organization not found');
      }

      const org = orgSnapshot.docs[0].data();

      // Erstelle neue Checkout Session
      const token = await user.getIdToken();
      const response = await fetch('/api/subscription/create-checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          tier: org.tier,
          billingInterval: 'monthly',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create checkout session');
      }

      const { url } = await response.json();
      window.location.href = url;
    } catch (error) {
      console.error('Error retrying payment:', error);
      alert('Fehler beim Erstellen der Checkout-Session. Bitte kontaktiere den Support.');
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-100">
            <ExclamationTriangleIcon className="h-10 w-10 text-amber-600" />
          </div>
          <h1 className="mt-6 text-3xl font-bold tracking-tight text-zinc-900">
            Zahlung ausstehend
          </h1>
          <p className="mt-2 text-sm text-zinc-600">
            Deine Registrierung war erfolgreich, aber die Zahlung wurde noch nicht abgeschlossen.
          </p>
        </div>

        <div className="mt-8 space-y-6 rounded-lg bg-white p-6 shadow-sm ring-1 ring-zinc-900/5">
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                <CreditCardIcon className="h-5 w-5 text-zinc-400" />
              </div>
              <div>
                <h3 className="text-sm font-medium text-zinc-900">
                  Was ist passiert?
                </h3>
                <p className="mt-1 text-sm text-zinc-600">
                  Du hast den Zahlungsprozess bei Stripe abgebrochen oder die Zahlung konnte nicht abgeschlossen werden.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                <ArrowPathIcon className="h-5 w-5 text-zinc-400" />
              </div>
              <div>
                <h3 className="text-sm font-medium text-zinc-900">
                  Wie geht es weiter?
                </h3>
                <p className="mt-1 text-sm text-zinc-600">
                  Klicke auf den Button unten, um den Zahlungsprozess erneut zu starten. Nach erfolgreicher Zahlung erhältst du sofort Zugriff auf CeleroPress.
                </p>
              </div>
            </div>
          </div>

          <div className="pt-4">
            <Button
              onClick={handleRetryPayment}
              disabled={loading}
              className="w-full"
              variant="solid"
              color="blue"
            >
              {loading ? 'Wird geladen...' : 'Zahlung abschließen'}
            </Button>
          </div>
        </div>

        <div className="text-center text-xs text-zinc-500">
          <p>
            Fragen? Kontaktiere uns unter{' '}
            <a href="mailto:support@celeropress.com" className="font-medium text-primary hover:underline">
              support@celeropress.com
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
