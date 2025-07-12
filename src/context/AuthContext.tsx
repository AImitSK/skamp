// src/context/AuthContext.tsx
"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { 
    onAuthStateChanged, 
    User, 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    signOut,
    Auth, // Importiere Auth
    // Importiere weitere benötigte Typen, z.B. UserCredential
} from 'firebase/auth';
import { auth } from '@/lib/firebase/client-init';

// Definiere die Typen für die Login- und Registrierungsfunktionen
type RegisterFunction = (email: string, password: string) => Promise<any>; // Passe 'any' an, z.B. UserCredential
type LoginFunction = (email: string, password: string) => Promise<any>; // Passe 'any' an
type LogoutFunction = () => Promise<void>;

// 1. Erweitere den Context-Typ
type AuthContextType = {
    user: User | null;
    loading: boolean;
    register: RegisterFunction;
    login: LoginFunction;
    logout: LogoutFunction;
};

// 2. Erweitere den Default-Wert des Contexts
export const AuthContext = createContext<AuthContextType>({ 
    user: null, 
    loading: true,
    // Füge leere Standard-Funktionen hinzu, um TypeScript-Fehler zu vermeiden
    register: async () => {}, 
    login: async () => {}, 
    logout: async () => {} 
});

export const AuthContextProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    // 3. Definiere die Authentifizierungs-Funktionen
    const register: RegisterFunction = (email, password) => {
        return createUserWithEmailAndPassword(auth, email, password);
    };

    const login: LoginFunction = (email, password) => {
        return signInWithEmailAndPassword(auth, email, password);
    };

    const logout: LogoutFunction = () => {
        return signOut(auth);
    };
    
    // 4. Übergebe die Funktionen an den Provider
    return (
        <AuthContext.Provider value={{ user, loading, register, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);