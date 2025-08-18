// src/context/OrganizationContext.tsx
"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { teamMemberService } from '@/lib/firebase/team-service-enhanced';
import { TeamMember } from '@/types/international';

interface Organization {
  id: string;
  name: string;
  role: string;
}

interface OrganizationContextType {
  currentOrganization: Organization | null;
  organizations: Organization[];
  loading: boolean;
  switchOrganization: (orgId: string) => void;
  isOwner: boolean;
  isAdmin: boolean;
  userRole: string | null;
}

const OrganizationContext = createContext<OrganizationContextType>({
  currentOrganization: null,
  organizations: [],
  loading: true,
  switchOrganization: () => {},
  isOwner: false,
  isAdmin: false,
  userRole: null
});

export function OrganizationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [currentOrganization, setCurrentOrganization] = useState<Organization | null>(null);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setCurrentOrganization(null);
      setOrganizations([]);
      setLoading(false);
      return;
    }

    loadUserOrganizations();
  }, [user]);

  const loadUserOrganizations = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      // Lade alle Team-Mitgliedschaften des Users
      const memberships = await teamMemberService.getUserMemberships(user.uid);
      
      if (memberships.length > 0) {
      }
      
      if (memberships.length === 0) {
        // Prüfe ob der User gerade von einer Einladung kommt
        const urlParams = new URLSearchParams(window.location.search);
        const isFromInvite = urlParams.get('welcome') === 'true';
        
        if (isFromInvite) {
          // Warte kurz, damit Firestore die Daten synchronisieren kann
          console.log('User kommt von Einladung, warte auf Synchronisation...');
          
          // Mehrere Versuche mit steigender Wartezeit
          const retryDelays = [1000, 2000, 3000];
          for (const delay of retryDelays) {
            console.log(`Warte ${delay}ms und versuche erneut...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            
            const retryMemberships = await teamMemberService.getUserMemberships(user.uid);
            console.log(`Gefundene Mitgliedschaften nach ${delay}ms:`, retryMemberships.length);
            
            if (retryMemberships.length > 0) {
              console.log('Mitgliedschaften gefunden! Verwende diese.');
              processMemberships(retryMemberships);
              return;
            }
          }
          
          console.log('Keine Mitgliedschaften nach mehreren Versuchen gefunden.');
        }
        
        // User ist in keinem Team
        console.log('User hat keine Team-Mitgliedschaften - kein Problem für eingeladene User');
        
        // Setze leeren Zustand - keine Organisation erstellen!
        setOrganizations([]);
        setCurrentOrganization(null);
      } else {
        processMemberships(memberships);
      }
    } catch (error) {
      console.error('Error loading organizations:', error);
    } finally {
      setLoading(false);
    }
  };

  const processMemberships = (memberships: TeamMember[]) => {
    // Konvertiere Mitgliedschaften zu Organisationen
    const orgs = memberships
      .filter(m => m.status === 'active')
      .map(m => ({
        id: m.organizationId,
        name: m.organizationId === m.userId ? 'Meine Organisation' : `Team ${m.organizationId}`,
        role: m.role
      }));
    
    setOrganizations(orgs);
    
    // Wähle die erste Organisation oder die aus dem URL-Parameter
    const urlParams = new URLSearchParams(window.location.search);
    const orgFromUrl = urlParams.get('org');
    
    let selectedOrg: Organization;
    
    if (orgFromUrl && orgs.find(o => o.id === orgFromUrl)) {
      selectedOrg = orgs.find(o => o.id === orgFromUrl)!;
    } else if (orgs.length > 0) {
      // Priorisiere die eigene Organisation
      const ownOrg = orgs.find(o => o.id === user?.uid);
      selectedOrg = ownOrg || orgs[0];
    } else {
      return;
    }
    
    setCurrentOrganization(selectedOrg);
    
    // KRITISCH: Speichere die aktuelle organizationId in localStorage
    localStorage.setItem('currentOrganizationId', selectedOrg.id);
  };

  const switchOrganization = (orgId: string) => {
    const org = organizations.find(o => o.id === orgId);
    if (org) {
      setCurrentOrganization(org);
      
      // KRITISCH: Speichere organizationId in localStorage für AuthContext
      localStorage.setItem('currentOrganizationId', orgId);
      
      // Optional: URL aktualisieren
      const url = new URL(window.location.href);
      url.searchParams.set('org', orgId);
      window.history.replaceState({}, '', url.toString());
    }
  };

  const isOwner = currentOrganization?.role === 'owner';
  const isAdmin = currentOrganization?.role === 'admin' || isOwner;
  const userRole = currentOrganization?.role || null;

  return (
    <OrganizationContext.Provider value={{
      currentOrganization,
      organizations,
      loading,
      switchOrganization,
      isOwner,
      isAdmin,
      userRole
    }}>
      {children}
    </OrganizationContext.Provider>
  );
}

export function useOrganization() {
  const context = useContext(OrganizationContext);
  if (!context) {
    throw new Error('useOrganization must be used within OrganizationProvider');
  }
  return context;
}