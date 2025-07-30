// src/app/dashboard/settings/team/page.tsx
"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Heading } from '@/components/heading';
import { Button } from '@/components/button';
import { Badge } from '@/components/badge';
import { Dialog } from '@/components/dialog';
import { Input } from '@/components/input';
import { Field, Label } from '@/components/fieldset';
import { Select } from '@/components/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/table';
import { teamMemberService, organizationService } from '@/lib/firebase/organization-service';
import { TeamMember, UserRole } from '@/types/international';
import { 
  UserPlusIcon,
  UserGroupIcon,
  TrashIcon,
  PencilIcon,
  ArrowPathIcon,
  EnvelopeIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  ShieldCheckIcon,
  UserIcon,
  BuildingOfficeIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/20/solid';
import clsx from 'clsx';
import { Timestamp } from 'firebase/firestore';

export default function TeamSettingsPage() {
  const { user } = useAuth();
  const organizationId = user?.uid || '';
  
  // State
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
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
      
      await teamMemberService.invite({
        email: inviteEmail,
        organizationId,
        role: inviteRole,
        invitedBy: user.uid
      });
      
      alert('Einladung wurde versendet!');
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
      alert('Die Rolle des Owners kann nicht geändert werden');
      return;
    }
    
    try {
      await teamMemberService.update(member.id!, { role: newRole }, user?.uid || '');
      await loadTeamMembers();
    } catch (error) {
      console.error('Error updating member role:', error);
      alert('Fehler beim Ändern der Rolle');
    }
  };
  
  const handleRemoveMember = async (member: TeamMember) => {
    if (member.role === 'owner') {
      alert('Der Owner kann nicht entfernt werden');
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
      alert('Fehler beim Entfernen des Mitglieds');
    }
  };
  
  const handleResendInvite = async (member: TeamMember) => {
    alert('Einladung erneut senden - Feature noch nicht implementiert');
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
    <div className="space-y-6">
      {/* Header */}
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <Heading level={1}>Team-Verwaltung</Heading>
          <p className="mt-1 text-sm text-gray-600">
            Verwalten Sie Ihr Team und laden Sie neue Mitglieder ein
          </p>
        </div>
        <div className="mt-4 sm:ml-16 sm:mt-0 flex gap-3">
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
      <div className="mt-8 flow-root">
        <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableHeader>Mitglied</TableHeader>
                    <TableHeader>Rolle</TableHeader>
                    <TableHeader>Status</TableHeader>
                    <TableHeader>Beigetreten</TableHeader>
                    <TableHeader>Zuletzt aktiv</TableHeader>
                    <TableHeader className="relative">
                      <span className="sr-only">Aktionen</span>
                    </TableHeader>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8">
                        <div className="flex justify-center">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#005fab]"></div>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : teamMembers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                        Keine Team-Mitglieder gefunden
                      </TableCell>
                    </TableRow>
                  ) : (
                    teamMembers.map((member) => {
                      const role = roleConfig[member.role];
                      const status = statusConfig[member.status];
                      const StatusIcon = status.icon;
                      
                      return (
                        <TableRow key={member.id}>
                          <TableCell className="font-medium">
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {member.displayName}
                              </div>
                              <div className="text-sm text-gray-500">
                                {member.email}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
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
                          </TableCell>
                          <TableCell>
                            <Badge color={status.color as any} className="whitespace-nowrap">
                              <StatusIcon className="h-3 w-3 mr-1" />
                              {status.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-gray-500">
                            {member.status === 'invited' ? (
                              <span className="text-yellow-600">
                                Eingeladen am {formatDate(member.invitedAt)}
                              </span>
                            ) : (
                              formatDate(member.joinedAt)
                            )}
                          </TableCell>
                          <TableCell className="text-sm text-gray-500">
                            {formatLastActive(member.lastActiveAt)}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
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
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
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
        <div className="px-6 py-4">
          <h3 className="text-lg font-medium text-gray-900">
            Neues Team-Mitglied einladen
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            Senden Sie eine Einladung per E-Mail
          </p>
        </div>
        
        <div className="px-6 py-4 space-y-4">
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
        
        <div className="flex justify-end gap-3 px-6 py-4 bg-gray-50">
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
        </div>
      </Dialog>
    </div>
  );
}