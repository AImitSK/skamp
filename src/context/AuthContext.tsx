// src/context/AuthContext.tsx
"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '@/lib/firebase/client-init'; 

// Typ hier anpassen
type AuthContextType = {
  user: User | null;
  loading: boolean; // Neuer Ladezustand
};

// Context hier anpassen
export const AuthContext = createContext<AuthContextType>({ user: null, loading: true });

export const AuthContextProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true); // Standardmäßig auf true

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false); // Ladezustand auf false setzen, wenn der Benutzerstatus bekannt ist
    });
    return () => unsubscribe();
  }, []);

  return (
    // Neuen Wert an den Provider übergeben
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);