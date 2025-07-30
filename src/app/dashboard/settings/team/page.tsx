// src/app/dashboard/settings/team/page.tsx
"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Heading } from '@/components/heading';
import { Button } from '@/components/button';
import { Badge } from '@/components/badge';
import { Dialog, DialogActions, DialogBody, DialogTitle } from '@/components/dialog';
import { Input } from '@/components/input';
import { Field, Label } from '@/components/fieldset';
import { Select } from '@/components/select';
import { SettingsNav } from '@/components/SettingsNav';
import { Text } from '@/components/text';
import { teamMemberService } from '@/lib/firebase/organization-service';
import { TeamMember, UserRole } from '@/types/international';
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
  ExclamationTriangleIcon
} from '@heroicons/react/20/solid';
import clsx from 'clsx';
import { Timestamp } from 'firebase/firestore';

// Toast notification helper
const showToast = (message: string, type: 'success' | 'error' = 'success') => {
  if (type === 'error') {
    console.error(message);
    alert(`Fehler: ${message}`);
  } else {
    console.log(message);
  }
};

export default function TeamSettingsPage() {
  const { user } = useAuth();
  const organizationId = user?.uid || '';
  
  // State
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Invite form state
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<UserRole>('member');
  const [inviteLoading, setInviteLoading] = useState(false);
  
  // Load team members
  useEffect(() => {
    loadTeamMembers();
  }, [organizationId]);
  
  const loadTeamMembers = async () => {
    if (!organizationId) return;
    
    try {
      setLoading(true);
      console.log('👥 Loading team members for organization:', organizationId);
      const members = await teamMemberService.getByOrganization(organizationId);
      
      if (members.length === 0) {
        // Create default member for current user
        const defaultMember: TeamMember = {
          id: '1',
          userId: user?.uid || '',
          organizationId,
          email: user?.email || '',
          displayName: user?.displayName || user?.email || 'Admin',
          role: 'owner',
          status: 'active',
          invitedAt: Timestamp.now(),
          invitedBy: user?.uid || '',
          joinedAt: Timestamp.now(),
          lastActiveAt: Timestamp.now()
        };
        setTeamMembers([defaultMember]);
      } else {
        setTeamMembers(members);
      }
    } catch (error) {
      console.error('Error loading team members:', error);
      setError('Fehler beim Laden der Team-Mitglieder');
      
      // Fallback
      const fallbackMember: TeamMember = {
        id: '1',
        userId: user?.uid || '',
        organizationId,
        email: user?.email || '',
        displayName: user?.displayName || user?.email || 'Admin',
        role: 'owner',
        status: 'active',
        invitedAt: Timestamp.now(),
        invitedBy: user?.uid || '',
        joinedAt: Timestamp.now(),
        lastActiveAt: Timestamp.now()
      };
      setTeamMembers([fallbackMember]);
    } finally {
      setLoading(false);
    }
  };
  
  const handleRefresh = async () => {
    setRefreshing(true);
    await loadTeamMembers();
    setTimeout(() => setRefreshing(false), 500);
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
      
      showToast('Einladung wurde versendet!');
      setShowInviteModal(false);
      setInviteEmail('');
      setInviteRole('member');
      
      // Reload members
      await loadTeamMembers();
    } catch (error: any) {
      console.error('Error inviting team member:', error);
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
      await teamMemberService.update(member.id!, { role: newRole }, user?.uid || '');
      await loadTeamMembers();
    } catch (error) {
      console.error('Error updating member role:', error);
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
      await teamMemberService.remove(member.id!, user?.uid || '');
      await loadTeamMembers();
    } catch (error) {
      console.error('Error removing member:', error);
      showToast('Fehler beim Entfernen des Mitglieds', 'error');
    }
  };
  
  const handleResendInvite = async (member: TeamMember) => {
    showToast('Einladung erneut senden - Feature noch nicht implementiert');
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
              <div className="w-[25%] text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                Mitglied
              </div>
              <div className="w-[15%] text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                Rolle
              </div>
              <div className="w-[15%] text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                Status
              </div>
              <div className="w-[15%] text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                Beigetreten
              </div>
              <div className="w-[15%] text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
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
            ) : teamMembers.length === 0 ? (
              <div className="px-6 py-8 text-center text-gray-500">
                Keine Team-Mitglieder gefunden
              </div>
            ) : (
              teamMembers.map((member) => {
                const role = roleConfig[member.role];
                const status = statusConfig[member.status];
                const StatusIcon = status.icon;
                
                return (
                  <div key={member.id} className="px-6 py-4 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                    <div className="flex items-center">
                      <div className="w-[25%] min-w-0">
                        <div className="text-sm font-medium text-gray-900">
                          {member.displayName}
                        </div>
                        <div className="text-sm text-gray-500">
                          {member.email}
                        </div>
                      </div>
                      <div className="w-[15%]">
                        <Select
                          value={member.role}
                          onChange={(e) => handleRoleChange(member, e.target.value as UserRole)}
                          disabled={member.role === 'owner'}
                          className="text-sm"
                        >
                          {Object.entries(roleConfig).map(([value, config]) => (
                            <option key={value} value={value}>
                              {config.label}
                            </option>
                          ))}
                        </Select>
                      </div>
                      <div className="w-[15%]">
                        <Badge color={status.color as any} className="whitespace-nowrap">
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {status.label}
                        </Badge>
                      </div>
                      <div className="w-[15%] text-sm text-gray-500">
                        {member.status === 'invited' ? (
                          <span className="text-yellow-600">
                            Eingeladen am {formatDate(member.invitedAt)}
                          </span>
                        ) : (
                          formatDate(member.joinedAt)
                        )}
                      </div>
                      <div className="w-[15%] text-sm text-gray-500">
                        {formatLastActive(member.lastActiveAt)}
                      </div>
                      <div className="flex-1 flex justify-end gap-2">
                        {member.status === 'invited' && (
                          <Button
                            plain
                            onClick={() => handleResendInvite(member)}
                            className="text-xs"
                          >
                            <ArrowPathIcon className="h-4 w-4" />
                          </Button>
                        )}
                        {member.role !== 'owner' && (
                          <Button
                            plain
                            onClick={() => handleRemoveMember(member)}
                            className="text-xs text-red-600 hover:text-red-700"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </Button>
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
              {teamMembers.filter(m => m.status === 'active').length}
            </dd>
          </div>
          <div className="overflow-hidden rounded-lg bg-white px-4 py-5 shadow sm:p-6">
            <dt className="truncate text-sm font-medium text-gray-500">
              Ausstehende Einladungen
            </dt>
            <dd className="mt-1 text-3xl font-semibold tracking-tight text-gray-900">
              {teamMembers.filter(m => m.status === 'invited').length}
            </dd>
          </div>
          <div className="overflow-hidden rounded-lg bg-white px-4 py-5 shadow sm:p-6">
            <dt className="truncate text-sm font-medium text-gray-500">
              Rollen-Verteilung
            </dt>
            <dd className="mt-1 flex items-center gap-2">
              {Object.entries(roleConfig).map(([role, config]) => {
                const count = teamMembers.filter(m => m.role === role).length;
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