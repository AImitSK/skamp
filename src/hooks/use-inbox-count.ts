// src/hooks/use-inbox-count.ts
import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useOrganization } from '@/context/OrganizationContext';
import { 
  collection, 
  query, 
  where, 
  onSnapshot,
  Unsubscribe
} from 'firebase/firestore';
import { db } from '@/lib/firebase/client-init';

interface InboxCountResult {
  totalUnread: number;          // Gesamtzahl ungelesener E-Mails
  assignedUnread: number;        // Mir zugewiesene ungelesene E-Mails
  generalUnread: number;         // Allgemeine ungelesene E-Mails
  loading: boolean;
  error: string | null;
}

export function useInboxCount(): InboxCountResult {
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();
  
  const [totalUnread, setTotalUnread] = useState(0);
  const [assignedUnread, setAssignedUnread] = useState(0);
  const [generalUnread, setGeneralUnread] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.uid || !currentOrganization?.id) {
      setLoading(false);
      return;
    }

    let unsubscribeAssigned: Unsubscribe | null = null;
    let unsubscribeGeneral: Unsubscribe | null = null;

    const setupListeners = async () => {
      try {
        setLoading(true);
        setError(null);

        // Query für mir zugewiesene ungelesene E-Mails
        const assignedQuery = query(
          collection(db, 'email_messages'),
          where('organizationId', '==', currentOrganization.id),
          where('assignedTo', '==', user.uid),
          where('isRead', '==', false),
          where('folder', '==', 'inbox')
        );

        // Query für allgemeine ungelesene E-Mails (nicht zugewiesen oder mir zugewiesen)
        const generalQuery = query(
          collection(db, 'email_messages'),
          where('organizationId', '==', currentOrganization.id),
          where('isRead', '==', false),
          where('folder', '==', 'inbox')
        );

        // Listener für zugewiesene E-Mails
        unsubscribeAssigned = onSnapshot(
          assignedQuery,
          (snapshot) => {
            const count = snapshot.size;
            setAssignedUnread(count);
          },
          (err) => {
            console.error('Fehler beim Laden zugewiesener E-Mails:', err);
            setError('Fehler beim Laden der zugewiesenen E-Mails');
          }
        );

        // Listener für alle ungelesenen E-Mails
        unsubscribeGeneral = onSnapshot(
          generalQuery,
          (snapshot) => {
            // Zähle alle ungelesenen E-Mails
            const allUnread = snapshot.size;
            
            // Zähle die mir zugewiesenen
            const myAssigned = snapshot.docs.filter(doc => {
              const data = doc.data();
              return data.assignedTo === user.uid;
            }).length;
            
            // Berechne allgemeine (nicht zugewiesene)
            const generalCount = allUnread - myAssigned;
            
            setGeneralUnread(generalCount);
            setTotalUnread(allUnread);
            
            // Aktualisiere auch assignedUnread falls es Diskrepanzen gibt
            if (myAssigned !== assignedUnread) {
              setAssignedUnread(myAssigned);
            }
          },
          (err) => {
            console.error('Fehler beim Laden allgemeiner E-Mails:', err);
            setError('Fehler beim Laden der E-Mails');
          }
        );

        setLoading(false);
      } catch (err) {
        console.error('Fehler beim Setup der Inbox-Listener:', err);
        setError('Fehler beim Laden der Inbox-Daten');
        setLoading(false);
      }
    };

    setupListeners();

    // Cleanup
    return () => {
      if (unsubscribeAssigned) unsubscribeAssigned();
      if (unsubscribeGeneral) unsubscribeGeneral();
    };
  }, [user?.uid, currentOrganization?.id, assignedUnread]);

  return {
    totalUnread,
    assignedUnread,
    generalUnread,
    loading,
    error
  };
}