// src/context/AuthContext.tsx
"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { 
    onAuthStateChanged, 
    User, 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    signOut,
    sendEmailVerification,
    Auth, // Importiere Auth
    // Importiere weitere benötigte Typen, z.B. UserCredential
} from 'firebase/auth';
import { auth } from '@/lib/firebase/client-init';
import ProfileImageService from '@/lib/services/profile-image-service';

// Definiere die Typen für die Login- und Registrierungsfunktionen
type RegisterFunction = (email: string, password: string) => Promise<any>; // Passe 'any' an, z.B. UserCredential
type LoginFunction = (email: string, password: string) => Promise<any>; // Passe 'any' an
type LogoutFunction = () => Promise<void>;
type UploadProfileImageFunction = (file: File) => Promise<{ success: boolean; url?: string; error?: string }>;
type DeleteProfileImageFunction = () => Promise<{ success: boolean; error?: string }>;
type UpdateUserProfileFunction = (updateData: { displayName?: string; phoneNumber?: string }) => Promise<void>;
type SendEmailVerificationFunction = () => Promise<void>;

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
    updateUserProfile: UpdateUserProfileFunction;
    sendVerificationEmail: SendEmailVerificationFunction;
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
    getInitials: () => '?',
    updateUserProfile: async () => {},
    sendVerificationEmail: async () => {}
});

interface AuthContextProviderProps {
    children: ReactNode;
    getOrganizationId?: () => string | null;
}

export const AuthContextProvider = ({ children, getOrganizationId }: AuthContextProviderProps) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    // Hilfsfunktion zur organizationId-Ermittlung
    const getCurrentOrganizationId = (): string => {
        console.log('🔍 getCurrentOrganizationId gestartet...');
        
        // 1. Versuche über callback (falls OrganizationContext verfügbar)
        if (getOrganizationId) {
            const orgId = getOrganizationId();
            if (orgId && orgId !== 'default') {
                console.log('🎯 OrganizationId von Callback:', orgId);
                return orgId;
            }
        }
        
        // 2. Prüfe verschiedene localStorage Keys (PRIORISIERT currentOrganizationId)
        const possibleKeys = ['currentOrganizationId', 'organizationId', 'org_id'];
        for (const key of possibleKeys) {
            const storedOrgId = localStorage.getItem(key);
            console.log(`📍 localStorage ${key}:`, storedOrgId);
            if (storedOrgId && storedOrgId !== 'default' && storedOrgId !== 'null' && storedOrgId !== 'undefined') {
                console.log(`🎯 OrganizationId von localStorage ${key}:`, storedOrgId);
                return storedOrgId;
            }
        }
        
        // 3. Prüfe URL Parameter
        try {
            const urlParams = new URLSearchParams(window.location.search);
            const orgFromUrl = urlParams.get('org');
            if (orgFromUrl && orgFromUrl !== 'default') {
                console.log('🎯 OrganizationId von URL:', orgFromUrl);
                return orgFromUrl;
            }
        } catch (error) {
            console.warn('Fehler beim URL-Parsing:', error);
        }
        
        // 4. Fallback zu userId (eigene Organisation)
        if (user?.uid) {
            console.log('⚠️ OrganizationId Fallback zu userId:', user.uid);
            return user.uid;
        }
        
        // 5. Letzter Fallback - SOLLTE NICHT PASSIEREN
        console.error('❌ OrganizationId Fallback zu "default" - KRITISCHES PROBLEM!');
        console.log('📊 Debug Info:', {
            user: user?.uid || 'nicht verfügbar',
            localStorage: Object.keys(localStorage),
            url: window?.location?.href || 'nicht verfügbar'
        });
        return 'default';
    };

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

        const organizationId = getCurrentOrganizationId();
        
        console.log('🔍 AVATAR-UPLOAD OrganizationId:', organizationId);
        console.log('🔍 AVATAR-UPLOAD LocalStorage keys:', Object.keys(localStorage));
        console.log('🔍 AVATAR-UPLOAD LocalStorage values:', {
            currentOrganizationId: localStorage.getItem('currentOrganizationId'),
            organizationId: localStorage.getItem('organizationId'),
            org_id: localStorage.getItem('org_id')
        });
        
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

        const organizationId = getCurrentOrganizationId();
        
        console.log('🔍 AVATAR-DELETE OrganizationId:', organizationId);
        console.log('🔍 AVATAR-DELETE LocalStorage keys:', Object.keys(localStorage));
        
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

    const updateUserProfile: UpdateUserProfileFunction = async (updateData) => {
        if (!user) throw new Error('Nicht angemeldet');
        
        const { userService } = await import('@/lib/firebase/user-service');
        await userService.updateProfile(user, updateData);
        
        // Auth Context wird automatisch durch onAuthStateChanged aktualisiert
    };

    const sendVerificationEmail: SendEmailVerificationFunction = async () => {
        if (!user) throw new Error('Nicht angemeldet');
        if (user.emailVerified) throw new Error('E-Mail bereits verifiziert');
        
        // Konfiguriere deutsche E-Mail-Verifizierung mit CeleroPress Branding
        const actionCodeSettings = {
            url: `${window.location.origin}/dashboard/admin/profile?verified=true`,
            handleCodeInApp: true,
            iOS: {
                bundleId: 'com.celeropress.app'
            },
            android: {
                packageName: 'com.celeropress.app',
                installApp: false,
                minimumVersion: '1'
            },
            dynamicLinkDomain: 'celeropress.page.link' // Falls vorhanden
        };
        
        await sendEmailVerification(user, actionCodeSettings);
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
            getInitials,
            updateUserProfile,
            sendVerificationEmail
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);