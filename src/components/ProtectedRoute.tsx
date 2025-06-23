// src/components/ProtectedRoute.tsx
"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

// Diese Komponente umwickelt geschützte Inhalte.
export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Nur weiterleiten, wenn der Ladezustand abgeschlossen ist und kein Benutzer vorhanden ist
    if (!loading && user === null) {
      router.push('/');
    }
  }, [user, loading, router]);

  // Während des Ladens einen Ladeindikator anzeigen
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-zinc-500">Lade...</div>
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