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
import ProfileImageService from '@/lib/services/profile-image-service';
// OrganizationContext wird separat geholt

// Definiere die Typen für die Login- und Registrierungsfunktionen
type RegisterFunction = (email: string, password: string) => Promise<any>; // Passe 'any' an, z.B. UserCredential
type LoginFunction = (email: string, password: string) => Promise<any>; // Passe 'any' an
type LogoutFunction = () => Promise<void>;
type UploadProfileImageFunction = (file: File) => Promise<{ success: boolean; url?: string; error?: string }>;
type DeleteProfileImageFunction = () => Promise<{ success: boolean; error?: string }>;

// 1. Erweitere den Context-Typ
type AuthContextType = {
    user: User | null;
    loading: boolean;
    register: RegisterFunction;
    login: LoginFunction;
    logout: LogoutFunction;
    uploadProfileImage: UploadProfileImageFunction;
    deleteProfileImage: DeleteProfileImageFunction;
    getAvatarUrl: () => string | null;
    getInitials: () => string;
};

// 2. Erweitere den Default-Wert des Contexts
export const AuthContext = createContext<AuthContextType>({ 
    user: null, 
    loading: true,
    // Füge leere Standard-Funktionen hinzu, um TypeScript-Fehler zu vermeiden
    register: async () => {}, 
    login: async () => {}, 
    logout: async () => {},
    uploadProfileImage: async () => ({ success: false, error: 'Not initialized' }),
    deleteProfileImage: async () => ({ success: false, error: 'Not initialized' }),
    getAvatarUrl: () => null,
    getInitials: () => '?'
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

    // 4. Profilbild-Funktionen
    const uploadProfileImage: UploadProfileImageFunction = async (file: File) => {
        if (!user) {
            return { success: false, error: 'Kein User angemeldet' };
        }

        // organizationId aus localStorage oder einem anderen Context holen
        const organizationId = localStorage.getItem('currentOrganizationId') || 'default';
        
        const result = await ProfileImageService.uploadProfileImage(file, user, organizationId);
        
        if (result.success) {
            // User-State wird automatisch durch onAuthStateChanged aktualisiert
        }
        
        return result;
    };

    const deleteProfileImage: DeleteProfileImageFunction = async () => {
        if (!user) {
            return { success: false, error: 'Kein User angemeldet' };
        }

        const organizationId = localStorage.getItem('currentOrganizationId') || 'default';
        
        const result = await ProfileImageService.deleteProfileImage(user, organizationId);
        return result;
    };

    const getAvatarUrl = () => {
        if (!user) return null;
        return user.photoURL || ProfileImageService.generateFallbackAvatarUrl(user);
    };

    const getInitials = () => {
        if (!user) return '?';
        return ProfileImageService.generateInitials(user);
    };
    
    // 5. Übergebe die Funktionen an den Provider
    return (
        <AuthContext.Provider value={{ 
            user, 
            loading, 
            register, 
            login, 
            logout,
            uploadProfileImage,
            deleteProfileImage,
            getAvatarUrl,
            getInitials
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);