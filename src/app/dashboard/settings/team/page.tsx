// src/app/dashboard/settings/team/page.tsx
"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Heading } from '@/components/heading';
import { Button } from '@/components/button';
import { Badge } from '@/components/badge';
import { Dialog, DialogActions, DialogBody, DialogTitle } from '@/components/dialog';
import { Dropdown, DropdownButton, DropdownItem, DropdownMenu } from '@/components/dropdown';
import { Input } from '@/components/input';
import { Field, Label } from '@/components/fieldset';
import { Select } from '@/components/select';
import { SettingsNav } from '@/components/SettingsNav';
import { Text } from '@/components/text';
import { teamMemberService } from '@/lib/firebase/organization-service';
import { TeamMember, UserRole } from '@/types/international';
import { Timestamp, collection, query, where, onSnapshot, orderBy, getDocs, doc, updateDoc, setDoc, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase/client-init';
import { 
  UserPlusIcon,
  UserGroupIcon,
  TrashIcon,
  ArrowPathIcon,
  EnvelopeIcon,
  CheckCircleIcon,
  XCircleIcon,
  ShieldCheckIcon,
  UserIcon,
  BuildingOfficeIcon,
  ExclamationTriangleIcon,
  EllipsisVerticalIcon,
  PaperAirplaneIcon,
  ClockIcon
} from '@heroicons/react/20/solid';
import clsx from 'clsx';

// Extended TeamMember type for UI
type TeamMemberUI = TeamMember & {
  _fromNotification?: boolean;
};

// Toast notification helper
const showToast = (message: string, type: 'success' | 'error' = 'success') => {
  if (type === 'error') {
    console.error(message);
    alert(`Fehler: ${message}`);
  } else {
    console.log(message);
    alert(message); // Temporär - später durch echte Toast-Komponente ersetzen
  }
};

export default function TeamSettingsPage() {
  const { user } = useAuth();
  const organizationId = user?.uid || '';
  
  // State
  const [teamMembers, setTeamMembers] = useState<TeamMemberUI[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [processingInvitations, setProcessingInvitations] = useState(false);
  const [pendingInvitations, setPendingInvitations] = useState(0);
  
  // Invite form state
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<UserRole>('member');
  const [inviteLoading, setInviteLoading] = useState(false);
  
  // Load team members - nur beim ersten Mount
  useEffect(() => {
    if (teamMembers.length === 0) {
      loadTeamMembers();
    }
  }, [organizationId]);
  
  // Listen for invitation notifications
  useEffect(() => {
    if (!organizationId) return;
    
    console.log('📬 Setting up invitation notifications listener');
    
    const notificationsQuery = query(
      collection(db, 'notifications'),
      where('userId', '==', organizationId),
      where('category', '==', 'team_invitation'),
      orderBy('createdAt', 'desc')
    );
    
    const unsubscribe = onSnapshot(notificationsQuery, (snapshot) => {
      console.log('📬 Invitation notifications received:', snapshot.size);
      
      snapshot.forEach((doc) => {
        const notification = doc.data();
        if (notification.data?.memberData && !notification.isProcessed) {
          // Konvertiere Notification zu TeamMember für Anzeige
          const invitedMember: TeamMemberUI = {
            id: doc.id,
            ...notification.data.memberData,
            status: 'invited',
            _fromNotification: true
          };
          
          // Füge zur Liste hinzu, wenn noch nicht vorhanden
          setTeamMembers(prev => {
            const exists = prev.some(m => 
              m.email === invitedMember.email && 
              m.organizationId === invitedMember.organizationId
            );
            if (!exists) {
              console.log('📥 Adding notification-based member:', invitedMember.email);
              return [...prev, invitedMember];
            }
            return prev;
          });
        }
      });
      
      // Update pending count - nur unverarbeitete zählen
      const unprocessed = snapshot.docs.filter(doc => {
        const data = doc.data();
        return !data.isProcessed && data.data?.memberData;
      });
      setPendingInvitations(unprocessed.length);
    }, (error) => {
      console.error('Error listening to invitation notifications:', error);
    });
    
    return () => unsubscribe();
  }, [organizationId]);
  
  const handleRefresh = async () => {
    setRefreshing(true);
    await loadTeamMembers();
    setTimeout(() => setRefreshing(false), 500);
  };
  
  const loadTeamMembers = async () => {
    if (!organizationId) return;
    
    try {
      setLoading(true);
      console.log('👥 Loading team members for organization:', organizationId);
      
      // WICHTIG: Behalte Notifications-basierte Einträge während des Ladens
      const notificationMembers = teamMembers.filter(m => m._fromNotification);
      console.log('📌 Preserving notification members:', notificationMembers.length);
      
      const members = await teamMemberService.getByOrganization(organizationId);
      
      // Check for owner in notifications if no members found
      if (members.length === 0) {
        console.log('⚠️ No team members found, checking notifications for owner init');
        
        // Prüfe ob Owner-Init in Notifications existiert
        const ownerNotificationQuery = query(
          collection(db, 'notifications'),
          where('userId', '==', organizationId),
          where('category', '==', 'team_owner_init'),
          orderBy('createdAt', 'desc')
        );
        
        try {
          const snapshot = await getDocs(ownerNotificationQuery);
          if (!snapshot.empty) {
            const ownerNotification = snapshot.docs[0].data();
            if (ownerNotification.data?.ownerData) {
              const ownerMember: TeamMemberUI = {
                id: 'owner_' + organizationId,
                ...ownerNotification.data.ownerData,
                status: 'active', // WICHTIG: Owner ist immer aktiv!
                _fromNotification: true
              };
              // Kombiniere mit bestehenden Notification-Members
              setTeamMembers([ownerMember, ...notificationMembers.filter(m => m.id !== ownerMember.id)]);
              return;
            }
          }
        } catch (e) {
          console.error('Could not check owner notifications:', e);
        }
        
        // Fallback nur wenn wirklich keine Daten vorhanden sind
        if (notificationMembers.length === 0) {
          const defaultMember: TeamMemberUI = {
            id: '1',
            userId: user?.uid || '',
            organizationId,
            email: user?.email || '',
            displayName: user?.displayName || user?.email || 'Admin',
            role: 'owner',
            status: 'active', // WICHTIG: Owner ist immer aktiv!
            invitedAt: Timestamp.now(),
            invitedBy: user?.uid || '',
            joinedAt: Timestamp.now(),
            lastActiveAt: Timestamp.now()
          };
          setTeamMembers([defaultMember]);
        } else {
          // Behalte die Notification-Members
          setTeamMembers(notificationMembers);
        }
      } else {
        // Kombiniere echte Members mit Notification-Members
        const combinedMembers = [...members];
        
        // Füge Notification-Members hinzu, die noch nicht in den echten Members sind
        notificationMembers.forEach(nm => {
          const alreadyExists = members.some(m => 
            m.email === nm.email && m.organizationId === nm.organizationId
          );
          if (!alreadyExists) {
            console.log('📌 Keeping notification member:', nm.email);
            combinedMembers.push(nm);
          }
        });
        
        // Stelle sicher, dass Owner immer als aktiv angezeigt wird
        const processedMembers = combinedMembers.map(member => ({
          ...member,
          status: member.role === 'owner' ? 'active' : member.status
        }));
        
        setTeamMembers(processedMembers);
      }
    } catch (error) {
      console.error('Error loading team members:', error);
      setError('Fehler beim Laden der Team-Mitglieder');
      
      // Behalte Notifications-basierte Einträge auch bei Fehler
      const notificationMembers = teamMembers.filter(m => m._fromNotification);
      
      if (notificationMembers.length === 0) {
        // Fallback nur wenn keine Notifications vorhanden
        const fallbackMember: TeamMemberUI = {
          id: '1',
          userId: user?.uid || '',
          organizationId,
          email: user?.email || '',
          displayName: user?.displayName || user?.email || 'Admin',
          role: 'owner',
          status: 'active', // WICHTIG: Owner ist immer aktiv!
          invitedAt: Timestamp.now(),
          invitedBy: user?.uid || '',
          joinedAt: Timestamp.now(),
          lastActiveAt: Timestamp.now()
        };
        setTeamMembers([fallbackMember]);
      } else {
        setTeamMembers(notificationMembers);
      }
    } finally {
      setLoading(false);
    }
  };
  
  const handleInvite = async () => {
    if (!inviteEmail || !user) return;
    
    try {
      setInviteLoading(true);
      setError(null);
      
      // Verwende die API-Route für Team-Einladungen
      const response = await fetch('/api/team/invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await user.getIdToken()}`
        },
        body: JSON.stringify({
          email: inviteEmail,
          role: inviteRole,
          organizationId
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Fehler beim Einladen des Team-Mitglieds');
      }
      
      // AUTOMATISCH E-MAILS VERSENDEN
      if (data.requiresProcessing) {
        console.log('📧 Automatisches Versenden der Einladung...');
        
        // Client-seitige Verarbeitung der Notifications
        setTimeout(async () => {
          try {
            // Query mit Index für unverarbeitete Notifications
            const notificationsQuery = query(
              collection(db, 'notifications'),
              where('userId', '==', organizationId),
              where('category', '==', 'team_invitation'),
              where('isProcessed', '!=', true),
              orderBy('createdAt', 'desc'),
              limit(10)
            );
            
            const snapshot = await getDocs(notificationsQuery);
            console.log('📬 Found unprocessed team invitation notifications:', snapshot.size);
            
            // Debug: Zeige alle unverarbeiteten Notifications
            snapshot.docs.forEach((doc, index) => {
              const data = doc.data();
              console.log(`Unprocessed notification ${index}:`, {
                id: doc.id,
                email: data.data?.memberData?.email,
                isProcessed: data.isProcessed,
                createdAt: data.createdAt?.toDate()
              });
            });
            
            // Finde die Notification für die aktuelle E-Mail
            const targetNotification = snapshot.docs.find(doc => {
              const data = doc.data();
              return data.data?.memberData?.email === inviteEmail;
            });
            
            if (!targetNotification) {
              console.log('⚠️ No unprocessed notification found for', inviteEmail);
              // Retry nach kurzer Zeit
              setTimeout(async () => {
                console.log('🔄 Retrying to find notification...');
                const retrySnapshot = await getDocs(notificationsQuery);
                const retryNotification = retrySnapshot.docs.find(doc => {
                  const data = doc.data();
                  return data.data?.memberData?.email === inviteEmail;
                });
                
                if (retryNotification) {
                  console.log('✅ Found notification on retry, reloading page...');
                  window.location.reload();
                } else {
                  showToast('Einladung wurde erstellt, bitte Seite neu laden');
                }
              }, 3000);
              return;
            }
            
            // Verarbeite die gefundene Notification
            const notification = targetNotification.data();
            const memberData = notification.data?.memberData;
            const invitationToken = notification.data?.invitationToken;
            const invitationTokenExpiry = notification.data?.invitationTokenExpiry;
              
              console.log('📨 Processing notification:', {
                notificationId: targetNotification.id,
                email: memberData?.email,
                hasToken: !!invitationToken
              });
              
              if (!memberData || !invitationToken) {
                console.error('⚠️ Notification missing required data');
                showToast('Fehler: Einladungsdaten unvollständig', 'error');
                return;
              }
              
              try {
                // 1. Erstelle team_member Eintrag
                const memberId = `invite_${Date.now()}_${memberData.email.replace('@', '_at_')}`;
                
                console.log('📝 Creating team member with ID:', memberId);
                
                const teamMemberData = {
                  ...memberData,
                  id: memberId,
                  invitationToken,
                  invitationTokenExpiry,
                  createdAt: Timestamp.now(),
                  updatedAt: Timestamp.now()
                };
                
                console.log('Team member data:', teamMemberData);
                
                await setDoc(doc(db, 'team_members', memberId), teamMemberData);
                
                console.log('✅ Created team member:', memberId);
                
                // 2. Markiere Notification als verarbeitet SOFORT
                await updateDoc(doc(db, 'notifications', targetNotification.id), {
                  isProcessed: true,
                  processedAt: Timestamp.now(),
                  processedMemberId: memberId
                });
                
                console.log('✅ Marked notification as processed');
                
                // 3. Rufe process-invitations für E-Mail-Versand auf
                const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || window.location.origin;
                const invitationUrl = `${baseUrl}/invite/${invitationToken}?id=${memberId}`;
                
                const processResponse = await fetch('/api/team/process-invitations', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json'
                  },
                  body: JSON.stringify({
                    specificMemberId: memberId,
                    memberData: teamMemberData,
                    invitationUrl,
                    invitationToken,
                    organizationId
                  })
                });
                
                if (processResponse.ok) {
                  const result = await processResponse.json();
                  console.log('📧 Email send result:', result);
                  showToast('Einladung wurde erfolgreich versendet!');
                } else {
                  const errorText = await processResponse.text();
                  console.error('Failed to send email:', errorText);
                  showToast('Einladung erstellt, E-Mail konnte nicht versendet werden', 'error');
                }
                
                // Reload sofort nach Erstellung
                await loadTeamMembers();
                
              } catch (processingError: any) {
                console.error('Error processing notification:', processingError);
                showToast(`Fehler: ${processingError.message}`, 'error');
              }
            
          } catch (error: any) {
            console.error('Error in client-side processing:', error);
            console.error('Error details:', error.message, error.stack);
            showToast('Fehler beim Verarbeiten der Einladung', 'error');
          }
        }, 3000); // 3 Sekunden warten damit Notification sicher geschrieben ist
        
        showToast('Einladung wird vorbereitet...');
      } else {
        showToast('Einladung wurde erfolgreich versendet!');
        // Bei direktem Versand neu laden
        await loadTeamMembers();
      }
      
      setShowInviteModal(false);
      setInviteEmail('');
      setInviteRole('member');
      
    } catch (error: any) {
      console.error('Error inviting team member:', error);
      setError(error.message || 'Fehler beim Einladen des Team-Mitglieds');
    } finally {
      setInviteLoading(false);
    }
  };
  
  const handleRoleChange = async (member: TeamMemberUI, newRole: UserRole) => {
    if (member.role === 'owner') {
      showToast('Die Rolle des Owners kann nicht geändert werden', 'error');
      return;
    }
    
    // Skip für Notifications-basierte Einträge
    if (member._fromNotification) {
      showToast('Diese Einladung muss erst angenommen werden', 'error');
      return;
    }
    
    try {
      await teamMemberService.update(member.id!, { role: newRole }, user?.uid || '');
      await loadTeamMembers();
      showToast(`Rolle wurde auf ${roleConfig[newRole].label} geändert`);
    } catch (error) {
      console.error('Error updating member role:', error);
      showToast('Fehler beim Ändern der Rolle', 'error');
    }
  };
  
  const handleRemoveMember = async (member: TeamMemberUI) => {
    if (member.role === 'owner') {
      showToast('Der Owner kann nicht entfernt werden', 'error');
      return;
    }
    
    if (!confirm(`Möchten Sie ${member.displayName} wirklich aus dem Team entfernen?`)) {
      return;
    }
    
    // Für Notifications-basierte Einträge - lösche die Notification
    if (member._fromNotification) {
      try {
        // Lösche die Notification aus Firestore
        const notificationRef = doc(db, 'notifications', member.id!);
        await updateDoc(notificationRef, {
          isProcessed: true,
          deletedAt: Timestamp.now(),
          deletedBy: user?.uid
        });
        
        // Entferne aus der lokalen Liste
        setTeamMembers(prev => prev.filter(m => m.id !== member.id));
        showToast('Einladung wurde gelöscht');
      } catch (error) {
        console.error('Error deleting invitation:', error);
        showToast('Fehler beim Löschen der Einladung', 'error');
      }
      return;
    }
    
    try {
      await teamMemberService.remove(member.id!, user?.uid || '');
      await loadTeamMembers();
      showToast('Mitglied wurde entfernt');
    } catch (error) {
      console.error('Error removing member:', error);
      showToast('Fehler beim Entfernen des Mitglieds', 'error');
    }
  };
  
  const handleResendInvite = async (member: TeamMember) => {
    // Für Notifications-basierte Einträge - verarbeite einzeln
    if ((member as TeamMemberUI)._fromNotification) {
      setProcessingInvitations(true);
      try {
        const response = await fetch('/api/team/process-invitations', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${await user?.getIdToken()}`
          }
        });
        
        if (response.ok) {
          showToast('Einladung wurde erneut versendet');
        } else {
          throw new Error('Fehler beim erneuten Versenden');
        }
      } catch (error) {
        console.error('Error resending invitation:', error);
        showToast('Fehler beim erneuten Versenden der Einladung', 'error');
      } finally {
        setProcessingInvitations(false);
      }
      return;
    }
    
    showToast('Diese Funktion ist noch nicht implementiert');
  };
  
  // Role configuration
  const roleConfig: Record<UserRole, {
    label: string;
    icon: any;
    color: string;
    description: string;
  }> = {
    owner: {
      label: 'Owner',
      icon: ShieldCheckIcon,
      color: 'purple',
      description: 'Vollzugriff auf alle Funktionen'
    },
    admin: {
      label: 'Admin',
      icon: UserGroupIcon,
      color: 'blue',
      description: 'Kann Team und Einstellungen verwalten'
    },
    member: {
      label: 'Mitglied',
      icon: UserIcon,
      color: 'green',
      description: 'Kann PR-Kampagnen erstellen und versenden'
    },
    client: {
      label: 'Kunde',
      icon: BuildingOfficeIcon,
      color: 'gray',
      description: 'Nur Lesezugriff auf eigene Kampagnen'
    },
    guest: {
      label: 'Gast',
      icon: UserIcon,
      color: 'gray',
      description: 'Eingeschränkter Lesezugriff'
    }
  };
  
  // Status configuration
  const statusConfig: Record<TeamMember['status'], {
    label: string;
    icon: any;
    color: string;
  }> = {
    active: {
      label: 'Aktiv',
      icon: CheckCircleIcon,
      color: 'green'
    },
    invited: {
      label: 'Eingeladen',
      icon: EnvelopeIcon,
      color: 'yellow'
    },
    inactive: {
      label: 'Inaktiv',
      icon: XCircleIcon,
      color: 'red'
    },
    suspended: {
      label: 'Gesperrt',
      icon: ExclamationTriangleIcon,
      color: 'red'
    }
  };
  
  const formatDate = (timestamp: Timestamp | undefined) => {
    if (!timestamp) return '-';
    try {
      return timestamp.toDate().toLocaleDateString('de-DE');
    } catch {
      return '-';
    }
  };
  
  const formatLastActive = (timestamp: Timestamp | undefined) => {
    if (!timestamp) return 'Nie';
    try {
      const date = timestamp.toDate();
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      
      if (diffDays === 0) return 'Heute';
      if (diffDays === 1) return 'Gestern';
      if (diffDays < 7) return `vor ${diffDays} Tagen`;
      if (diffDays < 30) return `vor ${Math.floor(diffDays / 7)} Wochen`;
      
      return date.toLocaleDateString('de-DE');
    } catch {
      return 'Nie';
    }
  };
  
  // Filtere inaktive Mitglieder aus der Anzeige
  const activeMembers = teamMembers.filter(m => m.status !== 'inactive');
  const pendingMembers = activeMembers.filter(m => m.status === 'invited');
  const activeMembersOnly = activeMembers.filter(m => m.status === 'active');
  
  return (
    <div className="flex flex-col gap-10 lg:flex-row">
      {/* Linke Spalte: Navigation */}
      <aside className="w-full lg:w-64 lg:flex-shrink-0">
        <SettingsNav />
      </aside>

      {/* Rechte Spalte: Hauptinhalt */}
      <div className="flex-1 space-y-8">
        {/* Header */}
        <div className="md:flex md:items-center md:justify-between">
          <div className="min-w-0 flex-1">
            <Heading>Team-Verwaltung</Heading>
            <Text className="mt-2 text-zinc-500">
              Verwalten Sie Ihr Team und laden Sie neue Mitglieder ein
            </Text>
          </div>
          <div className="mt-4 md:mt-0 flex gap-3">
            <Button 
              plain
              onClick={handleRefresh}
              disabled={refreshing}
            >
              <ArrowPathIcon className={clsx(
                "h-4 w-4",
                refreshing && "animate-spin"
              )} />
            </Button>
            <Button 
              onClick={() => setShowInviteModal(true)}
              className="bg-[#005fab] hover:bg-[#004a8c] text-white"
            >
              <UserPlusIcon className="h-4 w-4 mr-2" />
              <span className="whitespace-nowrap">Mitglied einladen</span>
            </Button>
          </div>
        </div>
        
        {/* Error Message */}
        {error && (
          <div className="rounded-lg bg-red-50 p-4">
            <div className="flex">
              <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
              <div className="ml-3">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            </div>
          </div>
        )}
        
        {/* Team Members Table */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          {/* Table Header */}
          <div className="px-6 py-3 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50">
            <div className="flex items-center">
              <div className="w-[35%] text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                Mitglied
              </div>
              <div className="w-[20%] text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                Rolle
              </div>
              <div className="w-[25%] text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                Zuletzt aktiv
              </div>
              <div className="flex-1 text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider text-right">
                Aktionen
              </div>
            </div>
          </div>

          {/* Table Body */}
          <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {loading ? (
              <div className="px-6 py-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#005fab] mx-auto"></div>
              </div>
            ) : activeMembers.length === 0 ? (
              <div className="px-6 py-8 text-center text-gray-500">
                Keine Team-Mitglieder gefunden
              </div>
            ) : (
              activeMembers.map((member) => {
                const role = roleConfig[member.role];
                const status = statusConfig[member.status];
                const StatusIcon = status.icon;
                
                return (
                  <div key={member.id} className="px-6 py-4 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                    <div className="flex items-center">
                      <div className="w-[35%] min-w-0">
                        <div className="text-sm font-medium text-gray-900">
                          {member.displayName}
                        </div>
                        <div className="text-sm text-gray-500">
                          {member.email}
                        </div>
                        <div className="mt-1">
                          <Badge color={status.color as any} className="whitespace-nowrap">
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {status.label}
                          </Badge>
                        </div>
                      </div>
                      <div className="w-[20%]">
                        {member._fromNotification && member.status === 'invited' ? (
                          <Badge color="yellow" className="whitespace-nowrap">
                            {role.label} (Ausstehend)
                          </Badge>
                        ) : member.role === 'owner' ? (
                          <Badge color={role.color as any} className="whitespace-nowrap">
                            {role.label}
                          </Badge>
                        ) : (
                          <Select
                            value={member.role}
                            onChange={(e) => handleRoleChange(member, e.target.value as UserRole)}
                            className="text-sm"
                          >
                            {Object.entries(roleConfig)
                              .filter(([roleKey]) => roleKey !== 'owner')
                              .map(([value, config]) => (
                                <option key={value} value={value}>
                                  {config.label}
                                </option>
                              ))}
                          </Select>
                        )}
                      </div>
                      <div className="w-[25%] text-sm text-gray-500">
                        {member.status === 'invited' ? (
                          <div className="flex items-center text-yellow-600">
                            <ClockIcon className="h-4 w-4 mr-1" />
                            <span>Eingeladen am {formatDate(member.invitedAt)}</span>
                          </div>
                        ) : (
                          formatLastActive(member.lastActiveAt)
                        )}
                      </div>
                      <div className="flex-1 flex justify-end">
                        {member.role === 'owner' ? (
                          <span className="text-xs text-gray-400">-</span>
                        ) : (
                          <Dropdown>
                            <DropdownButton plain>
                              <EllipsisVerticalIcon className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                            </DropdownButton>
                            <DropdownMenu anchor="bottom end">
                              {member.status === 'invited' && (
                                <DropdownItem onClick={() => handleResendInvite(member)}>
                                  <PaperAirplaneIcon className="h-4 w-4 mr-2" />
                                  Einladung erneut senden
                                </DropdownItem>
                              )}
                              <DropdownItem 
                                onClick={() => handleRemoveMember(member)}
                                className="text-red-600"
                              >
                                <TrashIcon className="h-4 w-4 mr-2" />
                                {member.status === 'invited' ? 'Einladung löschen' : 'Mitglied entfernen'}
                              </DropdownItem>
                            </DropdownMenu>
                          </Dropdown>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
        
        {/* Stats */}
        <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-3">
          <div className="overflow-hidden rounded-lg bg-white px-4 py-5 shadow sm:p-6">
            <dt className="truncate text-sm font-medium text-gray-500">
              Aktive Mitglieder
            </dt>
            <dd className="mt-1 text-3xl font-semibold tracking-tight text-gray-900">
              {activeMembersOnly.length}
            </dd>
          </div>
          <div className="overflow-hidden rounded-lg bg-white px-4 py-5 shadow sm:p-6">
            <dt className="truncate text-sm font-medium text-gray-500">
              Ausstehende Einladungen
            </dt>
            <dd className="mt-1 text-3xl font-semibold tracking-tight text-gray-900">
              {pendingMembers.length}
            </dd>
          </div>
          <div className="overflow-hidden rounded-lg bg-white px-4 py-5 shadow sm:p-6">
            <dt className="truncate text-sm font-medium text-gray-500">
              Rollen-Verteilung
            </dt>
            <dd className="mt-1 flex items-center gap-2 flex-wrap">
              {Object.entries(roleConfig).map(([role, config]) => {
                const count = activeMembers.filter(m => m.role === role).length;
                if (count === 0) return null;
                
                return (
                  <Badge key={role} color={config.color as any} className="whitespace-nowrap">
                    {count} {config.label}
                  </Badge>
                );
              })}
            </dd>
          </div>
        </div>
        
        {/* Invite Modal */}
        <Dialog
          open={showInviteModal}
          onClose={() => setShowInviteModal(false)}
          className="sm:max-w-md"
        >
          <DialogTitle className="px-6 py-4">
            Neues Team-Mitglied einladen
          </DialogTitle>
          
          <DialogBody className="p-6">
            <p className="text-sm text-gray-500 mb-4">
              Senden Sie eine Einladung per E-Mail
            </p>
            
            <div className="space-y-4">
              <Field>
                <Label>E-Mail-Adresse</Label>
                <Input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="kollege@firma.de"
                  required
                />
              </Field>
              
              <Field>
                <Label>Rolle</Label>
                <Select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as UserRole)}
                >
                  {Object.entries(roleConfig)
                    .filter(([role]) => role !== 'owner')
                    .map(([value, config]) => (
                      <option key={value} value={value}>
                        {config.label} - {config.description}
                      </option>
                    ))}
                </Select>
              </Field>
            </div>
          </DialogBody>
          
          <DialogActions className="px-6 py-4">
            <Button plain onClick={() => setShowInviteModal(false)}>
              Abbrechen
            </Button>
            <Button
              onClick={handleInvite}
              disabled={!inviteEmail || inviteLoading}
              className="bg-[#005fab] hover:bg-[#004a8c] text-white"
            >
              {inviteLoading ? 'Wird gesendet...' : 'Einladung senden'}
            </Button>
          </DialogActions>
        </Dialog>
      </div>
    </div>
  );
}