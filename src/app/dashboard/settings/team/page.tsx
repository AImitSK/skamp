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
import { SUBSCRIPTION_LIMITS } from '@/config/subscription-limits';
import Link from 'next/link';
import { Popover, Transition } from '@headlessui/react';
import { Fragment } from 'react';
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
import { toastService } from '@/lib/utils/toast';

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

  // Confirmation dialog state
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<TeamMember | null>(null);

  // Owner transfer dialog state
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [memberToTransfer, setMemberToTransfer] = useState<TeamMember | null>(null);
  
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
          toastService.success('Einladung wurde erfolgreich versendet!');
        } else {
          
          toastService.error('Einladung erstellt, aber E-Mail konnte nicht versendet werden');
        }
      } catch (emailError) {
        
        toastService.error('Einladung erstellt, aber E-Mail konnte nicht versendet werden');
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
    // 1. Prüfe ob aktueller User Owner ist
    const currentMember = teamMembers.find(m => m.userId === user?.uid);
    if (currentMember?.role !== 'owner') {
      toastService.error('Nur der Owner kann Rollen ändern');
      return;
    }

    // 2. Owner-Transfer (Member → Owner)
    if (newRole === 'owner') {
      setMemberToTransfer(member);
      setShowTransferModal(true);
      return;
    }

    // 3. Normale Rollenänderung (sollte nicht vorkommen, da nur member wählbar)
    try {
      const context = { organizationId, userId: user?.uid || '' };
      await teamMemberService.update(member.id!, { role: newRole }, context);
      await loadTeamMembers();
      toastService.success(`Rolle wurde auf ${roleConfig[newRole].label} geändert`);
    } catch (error) {

      toastService.error('Fehler beim Ändern der Rolle');
    }
  };
  
  const handleRemoveMember = async (member: TeamMember) => {
    // 1. Prüfe ob aktueller User Owner ist
    const currentMember = teamMembers.find(m => m.userId === user?.uid);
    if (currentMember?.role !== 'owner') {
      toastService.error('Nur der Owner kann Mitglieder entfernen');
      return;
    }

    // 2. Owner kann nicht entfernt werden
    if (member.role === 'owner') {
      toastService.error('Der Owner kann nicht entfernt werden');
      return;
    }

    // 3. Zeige Confirmation Dialog
    setMemberToRemove(member);
    setShowConfirmModal(true);
  };

  const confirmRemoveMember = async () => {
    if (!memberToRemove) return;

    try {
      const context = { organizationId, userId: user?.uid || '' };
      await teamMemberService.remove(memberToRemove.id!, context);
      await loadTeamMembers();
      toastService.success('Mitglied wurde entfernt');
    } catch (error) {
      toastService.error('Fehler beim Entfernen des Mitglieds');
    } finally {
      setShowConfirmModal(false);
      setMemberToRemove(null);
    }
  };
  
  const confirmOwnerTransfer = async () => {
    if (!memberToTransfer || !user) return;

    try {
      const context = { organizationId, userId: user.uid };

      // 1. Finde aktuellen Owner
      const currentOwner = teamMembers.find(m => m.role === 'owner');
      if (!currentOwner || currentOwner.userId !== user.uid) {
        toastService.error('Nur der Owner kann die Rolle übertragen');
        return;
      }

      // 2. Mache neues Mitglied zum Owner
      await teamMemberService.update(memberToTransfer.id!, { role: 'owner' }, context);

      // 3. Mache aktuellen Owner zum Member
      await teamMemberService.update(currentOwner.id!, { role: 'member' }, context);

      // 4. Reload und Erfolg
      await loadTeamMembers();
      toastService.success(`${memberToTransfer.displayName} ist jetzt der neue Owner`);

      setShowTransferModal(false);
      setMemberToTransfer(null);
    } catch (error) {
      console.error('Error transferring ownership:', error);
      toastService.error('Fehler beim Übertragen der Owner-Rolle');
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
        toastService.success('Einladung wurde erneut versendet');
      } else {
        throw new Error('E-Mail-Versand fehlgeschlagen');
      }
    } catch (error) {
      
      toastService.error('Fehler beim erneuten Versenden der Einladung');
    }
  };
  
  // Role configuration (nur Owner + Member)
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
      description: 'Vollzugriff auf alle Funktionen und Team-Verwaltung'
    },
    member: {
      label: 'Mitglied',
      icon: UserIcon,
      color: 'green',
      description: 'Kann alle Features nutzen (CRM, Kampagnen, Bibliothek, etc.)'
    },
    // Legacy-Rollen für bestehende Daten (nicht mehr verwendbar)
    admin: {
      label: 'Admin (Legacy)',
      icon: UserGroupIcon,
      color: 'blue',
      description: 'Alte Rolle - wird zu Member konvertiert'
    },
    client: {
      label: 'Kunde (Legacy)',
      icon: BuildingOfficeIcon,
      color: 'gray',
      description: 'Alte Rolle - wird zu Member konvertiert'
    },
    guest: {
      label: 'Gast (Legacy)',
      icon: UserIcon,
      color: 'gray',
      description: 'Alte Rolle - wird zu Member konvertiert'
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

  // Team Member Limit aus Subscription Tier
  const teamLimit = currentOrganization?.tier
    ? SUBSCRIPTION_LIMITS[currentOrganization.tier]?.users || -1
    : -1;
  const isLimitReached = teamLimit !== -1 && activeMembers.length >= teamLimit;
  
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
              onClick={() => setShowInviteModal(true)}
              disabled={isLimitReached}
              className="bg-primary hover:bg-primary-hover text-white disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary h-10 px-6"
              title={isLimitReached ? `Limit erreicht: Ihr Plan erlaubt max. ${teamLimit} Mitglieder` : 'Neues Mitglied einladen'}
            >
              <UserPlusIcon className="h-4 w-4 mr-2" />
              Mitglied einladen
            </Button>

            {/* Actions Menu */}
            <Popover className="relative">
              <Popover.Button className="inline-flex items-center justify-center rounded-lg border border-zinc-300 bg-white p-2.5 text-zinc-700 hover:bg-zinc-50 transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700 h-10 w-10">
                <EllipsisVerticalIcon className="h-5 w-5 stroke-[2.5]" />
              </Popover.Button>

              <Transition
                as={Fragment}
                enter="transition ease-out duration-200"
                enterFrom="opacity-0 translate-y-1"
                enterTo="opacity-100 translate-y-0"
                leave="transition ease-in duration-150"
                leaveFrom="opacity-100 translate-y-0"
                leaveTo="opacity-0 translate-y-1"
              >
                <Popover.Panel className="absolute right-0 z-10 mt-2 w-56 origin-top-right rounded-lg bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none dark:bg-zinc-800 dark:ring-zinc-700">
                  <div className="py-1">
                    <button
                      onClick={handleRefresh}
                      disabled={refreshing}
                      className="flex w-full items-center gap-3 px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-700 disabled:opacity-50"
                    >
                      <ArrowPathIcon className={clsx("h-4 w-4", refreshing && "animate-spin")} />
                      Aktualisieren
                    </button>
                  </div>
                </Popover.Panel>
              </Transition>
            </Popover>
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

        {/* Stats */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Link href="/dashboard/admin/billing" className="block">
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 hover:border-[#005fab] transition-colors cursor-pointer">
              <div className="flex items-center gap-2 mb-2">
                <UserGroupIcon className="h-5 w-5 text-gray-600" />
                <Text className="text-sm text-gray-600">Aktive Mitglieder</Text>
              </div>
              <div className="text-2xl font-semibold text-gray-900 whitespace-nowrap">
                {teamLimit === -1 ? (
                  <span>{activeMembersOnly.length} <span className="text-base font-normal text-[#005fab]">(Unlimited)</span></span>
                ) : (
                  <span className={isLimitReached ? 'text-red-600' : ''}>{activeMembersOnly.length} / {teamLimit}</span>
                )}
              </div>
            </div>
          </Link>

          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <div className="flex items-center gap-2 mb-2">
              <ClockIcon className="h-5 w-5 text-gray-600" />
              <Text className="text-sm text-gray-600">Ausstehende Einladungen</Text>
            </div>
            <div className="text-2xl font-semibold text-gray-900">
              {pendingMembers.length}
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <div className="flex items-center gap-2 mb-2">
              <ShieldCheckIcon className="h-5 w-5 text-gray-600" />
              <Text className="text-sm text-gray-600">Rollen-Verteilung</Text>
            </div>
            <div className="flex items-center gap-2 flex-wrap mt-2">
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

        {/* Team Members Table */}
        <div className="bg-white rounded-lg overflow-hidden">
          {/* Table Header */}
          <div className="px-6 py-3 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50">
            <div className="flex items-center">
              <div className="w-[40%] text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                Mitglied
              </div>
              <div className="w-[20%] text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                Rolle
              </div>
              <div className="w-[25%] text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                Zuletzt aktiv
              </div>
              <div className="w-[15%]"></div>
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
                      <div className="w-[40%] min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium text-gray-900">
                            {member.displayName}
                          </span>
                          <Badge color={status.color as any} className="whitespace-nowrap">
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {status.label}
                          </Badge>
                        </div>
                        <div className="text-sm text-gray-500">
                          {member.email}
                        </div>
                      </div>
                      <div className="w-[20%]">
                        {member.role === 'owner' ? (
                          <Badge color={role.color as any} className="whitespace-nowrap">
                            {role.label}
                          </Badge>
                        ) : activeMembersOnly.find(m => m.userId === user?.uid)?.role === 'owner' ? (
                          <Select
                            value={member.role}
                            onChange={(e) => handleRoleChange(member, e.target.value as UserRole)}
                            className="text-sm max-w-[160px]"
                          >
                            <option value="member">
                              {roleConfig.member.label}
                            </option>
                            <option value="owner">
                              → Zum Owner machen
                            </option>
                          </Select>
                        ) : (
                          <Badge color={role.color as any} className="whitespace-nowrap">
                            {role.label}
                          </Badge>
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
                      <div className="w-[15%] flex justify-end">
                        {member.role !== 'owner' && (
                          <Dropdown>
                            <DropdownButton plain className="p-1.5 hover:bg-zinc-200 rounded-md dark:hover:bg-zinc-700 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2">
                              <EllipsisVerticalIcon className="h-4 w-4 text-zinc-700 dark:text-zinc-400 stroke-[2.5]" />
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
                <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex items-center gap-2">
                    <UserIcon className="h-5 w-5 text-gray-600" />
                    <div>
                      <Text className="font-medium text-gray-900">Mitglied</Text>
                      <Text className="text-sm text-gray-600">
                        Kann alle Features nutzen (CRM, Kampagnen, Bibliothek, etc.)
                      </Text>
                    </div>
                  </div>
                </div>
                <Text className="text-xs text-gray-500 mt-2">
                  Alle neuen Mitglieder werden als "Mitglied" eingeladen. Der Owner kann später die Rolle übertragen.
                </Text>
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

        {/* Confirmation Dialog für Mitglied entfernen */}
        <Dialog
          open={showConfirmModal}
          onClose={() => setShowConfirmModal(false)}
          className="sm:max-w-md"
        >
          <DialogTitle className="px-6 py-4">
            Mitglied entfernen
          </DialogTitle>

          <DialogBody className="p-6">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-gray-900 mb-2">
                  Möchten Sie <strong>{memberToRemove?.displayName}</strong> wirklich aus dem Team entfernen?
                </p>
                <p className="text-sm text-gray-500">
                  Diese Aktion kann nicht rückgängig gemacht werden.
                </p>
              </div>
            </div>
          </DialogBody>

          <DialogActions className="px-6 py-4">
            <Button plain onClick={() => setShowConfirmModal(false)}>
              Abbrechen
            </Button>
            <Button
              onClick={confirmRemoveMember}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {memberToRemove?.status === 'invited' ? 'Einladung löschen' : 'Mitglied entfernen'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Owner Transfer Dialog */}
        <Dialog
          open={showTransferModal}
          onClose={() => setShowTransferModal(false)}
          className="sm:max-w-lg"
        >
          <DialogTitle className="px-6 py-4">
            ⚠️ Owner-Rolle übertragen
          </DialogTitle>

          <DialogBody className="p-6">
            <div className="space-y-4">
              <div className="flex items-start gap-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="flex-shrink-0">
                  <ExclamationTriangleIcon className="h-6 w-6 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900 mb-2">
                    Möchtest du <strong>{memberToTransfer?.displayName}</strong> zum neuen Owner machen?
                  </p>
                  <div className="text-sm text-gray-700 space-y-1">
                    <p>• Du wirst automatisch zum <strong>Mitglied</strong></p>
                    <p>• Du verlierst alle Admin-Rechte (Team-Verwaltung, Abrechnung)</p>
                    <p>• Diese Aktion kann nur der neue Owner rückgängig machen</p>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                <Text className="text-sm font-medium text-gray-900 mb-2">Was ändert sich?</Text>
                <div className="space-y-2 text-sm text-gray-700">
                  <div className="flex items-center gap-2">
                    <ShieldCheckIcon className="h-4 w-4 text-purple-600" />
                    <span><strong>{memberToTransfer?.displayName}</strong> wird Owner</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <UserIcon className="h-4 w-4 text-green-600" />
                    <span><strong>Du</strong> wirst Mitglied</span>
                  </div>
                </div>
              </div>
            </div>
          </DialogBody>

          <DialogActions className="px-6 py-4">
            <Button plain onClick={() => setShowTransferModal(false)}>
              Abbrechen
            </Button>
            <Button
              onClick={confirmOwnerTransfer}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              Ja, Owner-Rolle übertragen
            </Button>
          </DialogActions>
        </Dialog>
      </div>
    </div>
  );
}