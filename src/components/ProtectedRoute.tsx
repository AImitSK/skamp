// src/components/ProtectedRoute.tsx
"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

// Diese Komponente umwickelt geschützte Inhalte.
export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Wenn der Benutzer-Status geladen ist und kein Benutzer vorhanden ist,
    // leite zur Startseite (Login) weiter.
    if (user === null) {
      router.push('/');
    }
  }, [user, router]);

  // Wenn ein Benutzer vorhanden ist, zeige den geschützten Inhalt an.
  // Wenn der Benutzer-Status noch lädt (user ist anfangs null), zeige nichts,
  // um ein kurzes Flackern des Inhalts zu vermeiden.
  return user ? <>{children}</> : null;
}