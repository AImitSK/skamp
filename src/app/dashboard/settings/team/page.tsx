// src/app/dashboard/settings/team/page.tsx
"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useOrganization } from '@/context/OrganizationContext';
import { Heading } from '@/components/ui/heading';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogActions, DialogBody, DialogTitle } from '@/components/ui/dialog';
import { Dropdown, DropdownButton, DropdownItem, DropdownMenu } from '@/components/ui/dropdown';
import { Input } from '@/components/ui/input';
import { Field, Label } from '@/components/ui/fieldset';
import { Select } from '@/components/ui/select';
import { SettingsNav } from '@/components/SettingsNav';
import { Text } from '@/components/ui/text';
import { teamMemberService } from '@/lib/firebase/team-service-enhanced';
import { orgService } from '@/lib/firebase/organization-service';
import { TeamMember, UserRole } from '@/types/international';
import { Timestamp } from 'firebase/firestore';
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
} from '@heroicons/react/24/outline';
import clsx from 'clsx';

// Toast notification helper
const showToast = (message: string, type: 'success' | 'error' = 'success') => {
  if (type === 'error') {
    
    alert(`Fehler: ${message}`);
  } else {
    
    alert(message); // Temporär - später durch echte Toast-Komponente ersetzen
  }
};

export default function TeamSettingsPage() {
  const { user, loading: authLoading } = useAuth();
  const { currentOrganization, loading: orgLoading } = useOrganization();
  const organizationId = currentOrganization?.id || '';
  
  // State
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Invite form state
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<UserRole>('member');
  const [inviteLoading, setInviteLoading] = useState(false);
  
  // Load team members on mount
  useEffect(() => {
    // Only load when auth and organization are fully loaded
    if (!authLoading && !orgLoading && user && organizationId) {
      loadTeamMembers();
      // Entfernt: ensureOwnerExists() - erstellt falsche Owner-Einträge für eingeladene User
    }
  }, [authLoading, orgLoading, user, organizationId]);
  
  const ensureOwnerExists = async () => {
    if (!user) return;
    
    try {
      // Prüfe ob Owner bereits existiert
      const existingOwner = await teamMemberService.getByUserAndOrg(user.uid, user.uid);
      
      if (!existingOwner) {
        console.log('🔧 Creating owner entry for first-time user');
        
        // Erstelle Owner-Daten ohne undefined
        const ownerData: any = {
          userId: user.uid,
          organizationId: organizationId,
          email: user.email || '',
          displayName: user.displayName || user.email || ''
        };
        
        // Füge photoUrl nur hinzu, wenn vorhanden
        if (user.photoURL) {
          ownerData.photoUrl = user.photoURL;
        }
        
        await teamMemberService.createOwner(ownerData);
        
        
      }
    } catch (error) {
      
      // Don't block the UI
    }
  };
  
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
      
      const members = await teamMemberService.getByOrganization(organizationId);
      
      // Stelle sicher, dass Owner immer als aktiv angezeigt wird
      // und synchronisiere displayName für den aktuellen User
      const processedMembers = await Promise.all(members.map(async (member) => {
        let updatedMember = {
          ...member,
          status: member.role === 'owner' ? 'active' : member.status
        };
        
        // Synchronisiere displayName für den aktuellen User
        if (user && member.userId === user.uid && member.displayName !== user.displayName) {
          console.log('📝 Synchronizing displayName for current user');
          try {
            // Update team_member document mit aktuellem displayName
            await teamMemberService.update(
              member.id!,
              { displayName: user.displayName || user.email || '' },
              { organizationId, userId: user.uid }
            );
            updatedMember.displayName = user.displayName || user.email || '';
          } catch (syncError) {
            console.error('Error syncing displayName:', syncError);
          }
        }
        
        return updatedMember;
      }));
      
      setTeamMembers(processedMembers);
    } catch (error) {
      
      setError('Fehler beim Laden der Team-Mitglieder');
    } finally {
      setLoading(false);
    }
  };
  
  const handleInvite = async () => {
    if (!inviteEmail || !user) return;
    
    try {
      setInviteLoading(true);
      setError(null);
      
      // Context für Service
      const context = { organizationId, userId: user.uid };
      
      // Erstelle Einladung direkt über Service
      const { memberId, invitationToken } = await teamMemberService.invite(
        {
          email: inviteEmail,
          role: inviteRole,
          displayName: inviteEmail.split('@')[0] // Vorläufiger Name
        },
        context
      );
      
      
      
      // Generiere Einladungs-URL
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || window.location.origin;
      const invitationUrl = `${baseUrl}/invite/${invitationToken}?id=${memberId}`;
      
      // Sende E-Mail über API (wie in Inbox)
      try {
        const response = await fetch('/api/email/send', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            to: [{
              email: inviteEmail,
              name: inviteEmail.split('@')[0]
            }],
            from: {
              email: user.email || 'noreply@celeropress.com',
              name: user.displayName || 'CeleroPress Team'
            },
            subject: `Einladung zum Team von ${user.displayName || 'CeleroPress'}`,
            htmlContent: `
              <h2>Sie wurden eingeladen!</h2>
              <p>${user.displayName || user.email} hat Sie zum Team eingeladen.</p>
              <p>Rolle: ${roleConfig[inviteRole].label}</p>
              <p>Klicken Sie auf den folgenden Link, um die Einladung anzunehmen:</p>
              <a href="${invitationUrl}" style="display: inline-block; padding: 12px 24px; background: #005fab; color: white; text-decoration: none; border-radius: 4px;">
                Einladung annehmen
              </a>
              <p><small>Dieser Link ist 7 Tage gültig.</small></p>
            `,
            textContent: `Sie wurden zum Team eingeladen. Klicken Sie hier: ${invitationUrl}`,
            replyTo: 'noreply@celeropress.com'
          })
        });
        
        if (response.ok) {
          showToast('Einladung wurde erfolgreich versendet!');
        } else {
          
          showToast('Einladung erstellt, aber E-Mail konnte nicht versendet werden', 'error');
        }
      } catch (emailError) {
        
        showToast('Einladung erstellt, aber E-Mail konnte nicht versendet werden', 'error');
      }
      
      // Modal schließen und Liste neu laden
      setShowInviteModal(false);
      setInviteEmail('');
      setInviteRole('member');
      await loadTeamMembers();
      
    } catch (error: any) {
      
      setError(error.message || 'Fehler beim Einladen des Team-Mitglieds');
    } finally {
      setInviteLoading(false);
    }
  };
  
  const handleRoleChange = async (member: TeamMember, newRole: UserRole) => {
    if (member.role === 'owner') {
      showToast('Die Rolle des Owners kann nicht geändert werden', 'error');
      return;
    }
    
    try {
      const context = { organizationId, userId: user?.uid || '' };
      await teamMemberService.update(member.id!, { role: newRole }, context);
      await loadTeamMembers();
      showToast(`Rolle wurde auf ${roleConfig[newRole].label} geändert`);
    } catch (error) {
      
      showToast('Fehler beim Ändern der Rolle', 'error');
    }
  };
  
  const handleRemoveMember = async (member: TeamMember) => {
    if (member.role === 'owner') {
      showToast('Der Owner kann nicht entfernt werden', 'error');
      return;
    }
    
    if (!confirm(`Möchten Sie ${member.displayName} wirklich aus dem Team entfernen?`)) {
      return;
    }
    
    try {
      const context = { organizationId, userId: user?.uid || '' };
      await teamMemberService.remove(member.id!, context);
      await loadTeamMembers();
      showToast('Mitglied wurde entfernt');
    } catch (error) {
      
      showToast('Fehler beim Entfernen des Mitglieds', 'error');
    }
  };
  
  const handleResendInvite = async (member: TeamMember) => {
    if (!user) return;
    
    try {
      // Generiere neuen Token
      const context = { organizationId, userId: user.uid };
      const { invitationToken } = await teamMemberService.invite(
        {
          email: member.email,
          role: member.role,
          displayName: member.displayName
        },
        context
      );
      
      // Sende E-Mail erneut
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || window.location.origin;
      const invitationUrl = `${baseUrl}/invite/${invitationToken}?id=${member.id}`;
      
      const response = await fetch('/api/email/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          to: [{
            email: member.email,
            name: member.displayName
          }],
          from: {
            email: user.email || 'noreply@celeropress.com',
            name: user.displayName || 'CeleroPress Team'
          },
          subject: `Erinnerung: Einladung zum Team`,
          htmlContent: `
            <h2>Erinnerung: Sie wurden eingeladen!</h2>
            <p>Dies ist eine Erinnerung an Ihre Team-Einladung.</p>
            <p>Rolle: ${roleConfig[member.role].label}</p>
            <a href="${invitationUrl}" style="display: inline-block; padding: 12px 24px; background: #005fab; color: white; text-decoration: none; border-radius: 4px;">
              Einladung annehmen
            </a>
          `,
          textContent: `Erinnerung: Sie wurden zum Team eingeladen. Klicken Sie hier: ${invitationUrl}`,
          replyTo: 'noreply@celeropress.com'
        })
      });
      
      if (response.ok) {
        showToast('Einladung wurde erneut versendet');
      } else {
        throw new Error('E-Mail-Versand fehlgeschlagen');
      }
    } catch (error) {
      
      showToast('Fehler beim erneuten Versenden der Einladung', 'error');
    }
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
              className="bg-primary hover:bg-primary-hover text-white"
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
        <div className="bg-white rounded-lg overflow-hidden">
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
            {(authLoading || orgLoading || loading) ? (
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
                        {member.role === 'owner' ? (
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
          <div className="bg-gray-50 rounded-lg p-4" style={{backgroundColor: '#f1f0e2'}}>
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0">
                <UserGroupIcon className="h-5 w-5 text-gray-500" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-lg font-semibold text-gray-900 flex items-baseline gap-2">
                  {activeMembersOnly.length}
                </div>
                <div className="text-sm text-gray-500 truncate">
                  Aktive Mitglieder
                </div>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 rounded-lg p-4" style={{backgroundColor: '#f1f0e2'}}>
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0">
                <ClockIcon className="h-5 w-5 text-gray-500" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-lg font-semibold text-gray-900 flex items-baseline gap-2">
                  {pendingMembers.length}
                </div>
                <div className="text-sm text-gray-500 truncate">
                  Ausstehende Einladungen
                </div>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 rounded-lg p-4" style={{backgroundColor: '#f1f0e2'}}>
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0">
                <ShieldCheckIcon className="h-5 w-5 text-gray-500" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm text-gray-500 truncate">
                  Rollen-Verteilung
                </div>
                <div className="mt-1 flex items-center gap-2 flex-wrap">
                  {Object.entries(roleConfig).map(([role, config]) => {
                    const count = activeMembers.filter(m => m.role === role).length;
                    if (count === 0) return null;
                    
                    return (
                      <Badge key={role} color={config.color as any} className="whitespace-nowrap">
                        {count} {config.label}
                      </Badge>
                    );
                  })}
                </div>
              </div>
            </div>
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
              className="bg-primary hover:bg-primary-hover text-white"
            >
              {inviteLoading ? 'Wird gesendet...' : 'Einladung senden'}
            </Button>
          </DialogActions>
        </Dialog>
      </div>
    </div>
  );
}