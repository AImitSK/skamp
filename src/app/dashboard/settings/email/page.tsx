// src/app/dashboard/settings/email/page.tsx
"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Heading, Subheading } from '@/components/heading';
import { Button } from '@/components/button';
import { Badge } from '@/components/badge';
import { Dialog, DialogActions, DialogBody, DialogTitle } from '@/components/dialog';
import { Dropdown, DropdownButton, DropdownMenu, DropdownItem, DropdownDivider } from '@/components/dropdown';
import { Field, Label } from '@/components/fieldset';
import { Input } from '@/components/input';
import { Select } from '@/components/select';
import { Checkbox, CheckboxField, CheckboxGroup } from '@/components/checkbox';
import { SimpleSwitch } from '@/components/notifications/SimpleSwitch';
import { SettingsNav } from '@/components/SettingsNav';
import { Text } from '@/components/text';
import { EmailAddress, EmailSignature, EmailTemplate, EmailDomain, EmailAddressFormData } from '@/types/email-enhanced';
import { emailAddressService } from '@/lib/email/email-address-service';
import { emailSignatureService } from '@/lib/email/email-signature-service';
import { RoutingRuleEditor } from '@/components/email/RoutingRuleEditor';
import { SignatureList } from '@/components/email/SignatureList';
import { 
  PlusIcon, 
  PencilIcon, 
  TrashIcon,
  EnvelopeIcon,
  ShieldCheckIcon,
  SparklesIcon,
  UserGroupIcon,
  ArrowPathIcon,
  EllipsisVerticalIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  FunnelIcon,
  DocumentTextIcon,
  PencilSquareIcon,
  DocumentDuplicateIcon,
  InformationCircleIcon,
  UserPlusIcon,
  XMarkIcon
} from '@heroicons/react/20/solid';
import clsx from 'clsx';
import { domainService } from '@/lib/firebase/domain-service';

// NEU: Import für echte Team-Daten
import { teamMemberService, organizationService } from '@/lib/firebase/organization-service';
import { TeamMember } from '@/types/international';

// Toast notification helper
const showToast = (message: string, type: 'success' | 'error' = 'success') => {
  // Temporäre Lösung ohne react-hot-toast
  if (type === 'error') {
    console.error(message);
    alert(`Fehler: ${message}`);
  } else {
    console.log(message);
    // In Production würde hier eine Toast-Library verwendet
  }
};

type TabType = 'addresses' | 'templates' | 'signatures';

export default function EmailSettingsPage() {
  const { user } = useAuth();
  const organizationId = user?.uid || '';
  
  const [activeTab, setActiveTab] = useState<TabType>('addresses');
  const [emailAddresses, setEmailAddresses] = useState<EmailAddress[]>([]);
  const [signatures, setSignatures] = useState<EmailSignature[]>([]);
  const [domains, setDomains] = useState<EmailDomain[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingDomains, setLoadingDomains] = useState(true);
  const [loadingSignatures, setLoadingSignatures] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showRoutingModal, setShowRoutingModal] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState<EmailAddress | null>(null);
  const [showDebugInfo, setShowDebugInfo] = useState(false);
  
  // NEU: State für echte Team-Mitglieder
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loadingTeam, setLoadingTeam] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'member'>('member');
  const [inviting, setInviting] = useState(false);
  
  // Form state mit EmailAddressFormData type
  const [formData, setFormData] = useState<EmailAddressFormData>({
    localPart: '',
    domainId: '',
    displayName: '',
    aliasType: 'specific' as 'specific' | 'catch-all' | 'pattern',
    isActive: true,
    inboxEnabled: true,
    assignedUserIds: [] as string[],
    clientName: '',
    aiEnabled: false,
    autoSuggest: false,
    autoCategorize: false,
    preferredTone: 'formal' as 'formal' | 'modern' | 'technical' | 'startup'
  });

  // Load all data
  useEffect(() => {
    if (organizationId) {
      console.log('📊 EmailSettingsPage - useEffect triggered');
      console.log('- organizationId:', organizationId);
      console.log('- user?.uid:', user?.uid);
      console.log('- user object:', user);
      loadEmailAddresses();
      loadDomains();
      loadSignatures();
      loadTeamMembers(); // NEU: Lade echte Team-Mitglieder
    }
  }, [organizationId]);

  // NEU: Lade Team-Mitglieder aus Firestore
  const loadTeamMembers = async () => {
    try {
      setLoadingTeam(true);
      console.log('👥 Loading team members for organization:', organizationId);
      
      const members = await teamMemberService.getByOrganization(organizationId);
      console.log('✅ Team members loaded:', members);
      
      // Filtere nur aktive Mitglieder
      const activeMembers = members.filter(m => m.status === 'active');
      setTeamMembers(activeMembers);
    } catch (error) {
      console.error('Error loading team members:', error);
      showToast('Fehler beim Laden der Team-Mitglieder', 'error');
      
      // Fallback: Erstelle das erste Team-Mitglied (Owner) wenn keines existiert
      if (user) {
        try {
          console.log('🔧 Creating initial team member for owner');
          const ownerMember: TeamMember = {
            id: 'temp-owner',
            userId: user.uid,
            organizationId,
            email: user.email || '',
            displayName: user.displayName || user.email || 'Admin',
            role: 'owner',
            status: 'active',
            invitedAt: new Date() as any,
            invitedBy: user.uid,
            joinedAt: new Date() as any,
          };
          setTeamMembers([ownerMember]);
        } catch (err) {
          console.error('Error creating fallback team member:', err);
        }
      }
    } finally {
      setLoadingTeam(false);
    }
  };

  // NEU: Team-Mitglied einladen
  const handleInviteTeamMember = async () => {
    if (!inviteEmail) {
      showToast('Bitte geben Sie eine E-Mail-Adresse ein', 'error');
      return;
    }

    try {
      setInviting(true);
      
      await teamMemberService.invite({
        email: inviteEmail,
        organizationId,
        role: inviteRole,
        invitedBy: user?.uid || ''
      });
      
      showToast(`Einladung an ${inviteEmail} gesendet`);
      setShowInviteModal(false);
      setInviteEmail('');
      setInviteRole('member');
      
      // Reload team members
      await loadTeamMembers();
    } catch (error) {
      console.error('Error inviting team member:', error);
      showToast(
        error instanceof Error ? error.message : 'Fehler beim Einladen des Team-Mitglieds',
        'error'
      );
    } finally {
      setInviting(false);
    }
  };

  const loadDomains = async () => {
    try {
      setLoadingDomains(true);
      const allDomains = await domainService.getAll(organizationId);
      const verifiedDomains = allDomains.filter(d => d.status === 'verified' || d.status === 'pending');
      
      const emailDomains: EmailDomain[] = verifiedDomains.map(d => ({
        id: d.id!,
        name: d.domain,
        verified: d.status === 'verified',
        verifiedAt: d.verifiedAt,
        domain: d.domain,
        status: d.status
      } as EmailDomain));
      
      setDomains(emailDomains);
    } catch (error) {
      console.error('Fehler beim Laden der Domains:', error);
      showToast('Fehler beim Laden der Domains', 'error');
    } finally {
      setLoadingDomains(false);
    }
  };

  const loadEmailAddresses = async () => {
    try {
      setLoading(true);
      const addresses = await emailAddressService.getByOrganization(
        organizationId,
        user?.uid || ''
      );
      setEmailAddresses(addresses);
    } catch (error) {
      console.error('Fehler beim Laden der E-Mail-Adressen:', error);
      showToast('Fehler beim Laden der E-Mail-Adressen', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadSignatures = async () => {
    try {
      setLoadingSignatures(true);
      console.log('🔍 Loading signatures - Debug Info:');
      console.log('- organizationId being used:', organizationId);
      console.log('- current user.uid:', user?.uid);
      console.log('- user.email:', user?.email);
      console.log('- Full user object:', user);
      
      // Prüfe ob organizationId und user.uid übereinstimmen
      if (organizationId !== user?.uid) {
        console.warn('⚠️ WARNUNG: organizationId stimmt nicht mit user.uid überein!');
        console.warn('- organizationId:', organizationId);
        console.warn('- user.uid:', user?.uid);
      }
      
      const sigs = await emailSignatureService.getByOrganization(organizationId);
      console.log('✅ Signatures loaded successfully:', sigs);
      setSignatures(sigs);
    } catch (error) {
      console.error('❌ Fehler beim Laden der Signaturen:', error);
      console.error('Error details:', {
        message: (error as any)?.message,
        code: (error as any)?.code,
        stack: (error as any)?.stack
      });
      showToast('Fehler beim Laden der Signaturen', 'error');
    } finally {
      setLoadingSignatures(false);
    }
  };

  const handleAdd = () => {
    setFormData({
      localPart: '',
      domainId: '',
      displayName: '',
      aliasType: 'specific',
      isActive: true,
      inboxEnabled: true,
      assignedUserIds: [],
      clientName: '',
      aiEnabled: false,
      autoSuggest: false,
      autoCategorize: false,
      preferredTone: 'formal'
    });
    setShowAddModal(true);
  };

  const handleEdit = (address: EmailAddress) => {
    setSelectedAddress(address);
    setFormData({
      localPart: address.localPart,
      domainId: address.domainId,
      displayName: address.displayName,
      aliasType: address.aliasType || 'specific',
      isActive: address.isActive,
      inboxEnabled: address.inboxEnabled,
      assignedUserIds: address.assignedUserIds,
      clientName: address.clientName || '',
      aiEnabled: address.aiSettings?.enabled || false,
      autoSuggest: address.aiSettings?.autoSuggest || false,
      autoCategorize: address.aiSettings?.autoCategorize || false,
      preferredTone: address.aiSettings?.preferredTone || 'formal'
    });
    setShowEditModal(true);
  };

  const handleDelete = (address: EmailAddress) => {
    setSelectedAddress(address);
    setShowDeleteModal(true);
  };

  const handleRouting = (address: EmailAddress) => {
    setSelectedAddress(address);
    setShowRoutingModal(true);
  };

  const handleRoutingUpdate = () => {
    // Reload email addresses after routing rules update
    loadEmailAddresses();
  };

  const handleDuplicate = async (address: EmailAddress) => {
    try {
      const duplicateData: EmailAddressFormData = {
        localPart: `${address.localPart}-kopie`,
        domainId: address.domainId,
        displayName: `${address.displayName} (Kopie)`,
        aliasType: address.aliasType || 'specific',
        isActive: false, // Kopie ist standardmäßig inaktiv
        inboxEnabled: address.inboxEnabled,
        assignedUserIds: address.assignedUserIds,
        clientName: address.clientName || '',
        aiEnabled: address.aiSettings?.enabled || false,
        autoSuggest: address.aiSettings?.autoSuggest || false,
        autoCategorize: address.aiSettings?.autoCategorize || false,
        preferredTone: address.aiSettings?.preferredTone || 'formal'
      };
      
      await emailAddressService.create(duplicateData, organizationId, user?.uid || '');
      showToast('E-Mail-Adresse erfolgreich dupliziert');
      await loadEmailAddresses();
    } catch (error) {
      showToast('Fehler beim Duplizieren der E-Mail-Adresse', 'error');
    }
  };

  const handleSaveEmailAddress = async () => {
    try {
      setSaving(true);
      
      if (showAddModal) {
        await emailAddressService.create(formData, organizationId, user?.uid || '');
        showToast('E-Mail-Adresse erfolgreich erstellt');
      } else if (showEditModal && selectedAddress?.id) {
        await emailAddressService.update(selectedAddress.id, formData, user?.uid || '');
        showToast('E-Mail-Adresse erfolgreich aktualisiert');
      }
      
      await loadEmailAddresses();
      setShowAddModal(false);
      setShowEditModal(false);
      setSelectedAddress(null);
    } catch (error) {
      console.error('Fehler beim Speichern:', error);
      if (error instanceof Error) {
        showToast(error.message, 'error');
      } else {
        showToast('Fehler beim Speichern der E-Mail-Adresse', 'error');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!selectedAddress?.id) return;
    
    try {
      setSaving(true);
      await emailAddressService.delete(selectedAddress.id, user?.uid || '');
      showToast('E-Mail-Adresse erfolgreich gelöscht');
      await loadEmailAddresses();
      setShowDeleteModal(false);
      setSelectedAddress(null);
    } catch (error) {
      console.error('Fehler beim Löschen:', error);
      if (error instanceof Error) {
        showToast(error.message, 'error');
      } else {
        showToast('Fehler beim Löschen der E-Mail-Adresse', 'error');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleSetAsDefault = async (address: EmailAddress) => {
    if (!address.id) return;
    
    try {
      await emailAddressService.setAsDefault(address.id, organizationId);
      showToast('E-Mail-Adresse als Standard gesetzt');
      await loadEmailAddresses();
    } catch (error) {
      console.error('Fehler beim Setzen als Standard:', error);
      showToast('Fehler beim Setzen als Standard', 'error');
    }
  };

  // Signature handlers
  const handleSaveSignature = async (signature: Partial<EmailSignature>, id?: string) => {
    try {
      console.log('💾 Saving signature with data:', {
        signature,
        id,
        organizationId,
        userId: user?.uid
      });
      
      if (id) {
        await emailSignatureService.update(id, signature, user?.uid || '');
        showToast('Signatur erfolgreich aktualisiert');
      } else {
        await emailSignatureService.create(signature, organizationId, user?.uid || '');
        showToast('Signatur erfolgreich erstellt');
      }
      await loadSignatures();
    } catch (error) {
      console.error('❌ Fehler beim Speichern der Signatur:', error);
      throw error;
    }
  };

  const handleDeleteSignature = async (id: string) => {
    try {
      await emailSignatureService.delete(id);
      showToast('Signatur erfolgreich gelöscht');
      await loadSignatures();
    } catch (error) {
      console.error('Fehler beim Löschen der Signatur:', error);
      if (error instanceof Error) {
        showToast(error.message, 'error');
      } else {
        showToast('Fehler beim Löschen der Signatur', 'error');
      }
    }
  };

  const handleDuplicateSignature = async (id: string) => {
    try {
      await emailSignatureService.duplicate(id, user?.uid || '');
      showToast('Signatur erfolgreich dupliziert');
      await loadSignatures();
    } catch (error) {
      console.error('Fehler beim Duplizieren der Signatur:', error);
      showToast('Fehler beim Duplizieren der Signatur', 'error');
    }
  };

  const getStatusIcon = (address: EmailAddress) => {
    if (!address.isActive) {
      return <ExclamationTriangleIcon className="h-5 w-5 text-gray-400" />;
    }
    if (address.lastUsedAt && new Date(address.lastUsedAt as any) > new Date(Date.now() - 24 * 60 * 60 * 1000)) {
      return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
    }
    return <ClockIcon className="h-5 w-5 text-yellow-500" />;
  };

  const tabs = [
    { id: 'addresses' as TabType, name: 'E-Mail-Adressen', icon: EnvelopeIcon },
    { id: 'templates' as TabType, name: 'Vorlagen', icon: DocumentTextIcon },
    { id: 'signatures' as TabType, name: 'Signaturen', icon: PencilSquareIcon }
  ];

  // Prepare email addresses for signature component
  const emailAddressesForSignatures = emailAddresses.map(addr => ({
    id: addr.id!,
    email: addr.email,
    displayName: addr.displayName
  }));

  // NEU: Konvertiere TeamMember zu Format für RoutingRuleEditor
  const teamMembersForRouting = teamMembers.map(member => ({
    id: member.userId, // Verwende userId statt id
    name: member.displayName,
    email: member.email
  }));

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
            <Heading>E-Mail Einstellungen</Heading>
            <Text className="mt-2 text-zinc-500">
              Verwalten Sie E-Mail-Adressen, Vorlagen und Signaturen für Ihre Organisation
            </Text>
          </div>
          <div className="mt-4 md:mt-0">
            <Button 
              plain 
              onClick={() => setShowDebugInfo(!showDebugInfo)}
              className="text-sm"
            >
              <InformationCircleIcon className="h-4 w-4 mr-1" />
              Debug Info {showDebugInfo ? 'ausblenden' : 'anzeigen'}
            </Button>
          </div>
        </div>

        {/* Debug Info Panel */}
        {showDebugInfo && (
          <div className="bg-gray-100 rounded-lg p-4 text-xs font-mono">
            <h3 className="font-bold text-sm mb-2">Debug Information:</h3>
            <div className="space-y-1">
              <div><strong>organizationId:</strong> {organizationId}</div>
              <div><strong>user.uid:</strong> {user?.uid}</div>
              <div><strong>user.email:</strong> {user?.email}</div>
              <div><strong>Match:</strong> {organizationId === user?.uid ? '✅ IDs stimmen überein' : '❌ IDs stimmen NICHT überein!'}</div>
              <div><strong>Active Tab:</strong> {activeTab}</div>
              <div><strong>Email Addresses Count:</strong> {emailAddresses.length}</div>
              <div><strong>Signatures Count:</strong> {signatures.length}</div>
              <div><strong>Domains Count:</strong> {domains.length}</div>
              <div><strong>Team Members Count:</strong> {teamMembers.length}</div>
              <div className="mt-2 pt-2 border-t">
                <strong>Team Members:</strong>
                <pre className="mt-1 text-xs overflow-auto bg-white p-2 rounded">
                  {JSON.stringify(teamMembers.map(m => ({
                    id: m.id,
                    userId: m.userId,
                    email: m.email,
                    name: m.displayName,
                    role: m.role,
                    status: m.status
                  })), null, 2)}
                </pre>
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={clsx(
                    'flex items-center gap-2 py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap',
                    activeTab === tab.id
                      ? 'border-[#005fab] text-[#005fab]'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  )}
                >
                  <Icon className="h-5 w-5" />
                  {tab.name}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'addresses' && (
          <>
            {/* Statistics Cards */}
            <div className="grid grid-cols-4 gap-4 mb-6">
              <div className="bg-white p-4 rounded-lg border">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Aktive Adressen</p>
                    <p className="text-2xl font-semibold mt-1">
                      {emailAddresses.filter(a => a.isActive).length}
                    </p>
                  </div>
                  <EnvelopeIcon className="h-8 w-8 text-gray-400" />
                </div>
              </div>
              <div className="bg-white p-4 rounded-lg border">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Mit KI</p>
                    <p className="text-2xl font-semibold mt-1">
                      {emailAddresses.filter(a => a.aiSettings?.enabled).length}
                    </p>
                  </div>
                  <SparklesIcon className="h-8 w-8 text-gray-400" />
                </div>
              </div>
              <div className="bg-white p-4 rounded-lg border">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Routing-Regeln</p>
                    <p className="text-2xl font-semibold mt-1">
                      {emailAddresses.reduce((sum, a) => sum + (a.routingRules?.length || 0), 0)}
                    </p>
                  </div>
                  <ArrowPathIcon className="h-8 w-8 text-gray-400" />
                </div>
              </div>
              <div className="bg-white p-4 rounded-lg border">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Team-Mitglieder</p>
                    <p className="text-2xl font-semibold mt-1">
                      {loadingTeam ? '...' : teamMembers.length}
                    </p>
                  </div>
                  <UserGroupIcon className="h-8 w-8 text-gray-400" />
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end mb-4 gap-3">
              <Button 
                onClick={() => setShowInviteModal(true)} 
                plain
                className="whitespace-nowrap"
              >
                <UserPlusIcon className="h-4 w-4 mr-2" />
                Team-Mitglied einladen
              </Button>
              <Button onClick={handleAdd} className="bg-[#005fab] hover:bg-[#004a8c] text-white whitespace-nowrap">
                <PlusIcon className="h-4 w-4 mr-2" />
                Neue E-Mail-Adresse
              </Button>
            </div>

            {/* Email Addresses Table */}
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              {/* Header */}
              <div className="px-6 py-3 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50">
                <div className="flex items-center">
                  <div className="w-[25%] text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                    E-Mail-Adresse
                  </div>
                  <div className="w-[15%] text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                    Status
                  </div>
                  <div className="w-[20%] text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                    Team
                  </div>
                  <div className="w-[15%] text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                    Client
                  </div>
                  <div className="w-[15%] text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                    Features
                  </div>
                  <div className="flex-1 text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider text-right">
                    Aktionen
                  </div>
                </div>
              </div>

              {/* Body */}
              <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {loading ? (
                  <div className="px-6 py-8 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#005fab] mx-auto"></div>
                  </div>
                ) : emailAddresses.length === 0 ? (
                  <div className="px-6 py-8 text-center text-gray-500">
                    Keine E-Mail-Adressen vorhanden
                  </div>
                ) : (
                  emailAddresses.map((address) => (
                    <div key={address.id} className="px-6 py-4 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                      <div className="flex items-center">
                        {/* Email Address */}
                        <div className="w-[25%] min-w-0">
                          <div>
                            <p className="font-medium text-sm text-zinc-900 dark:text-white truncate">{address.email}</p>
                            <p className="text-xs text-gray-500 truncate">{address.displayName}</p>
                            {address.aliasType && address.aliasType !== 'specific' && (
                              <p className="text-xs text-gray-500">
                                {address.aliasType === 'catch-all' ? 'Catch-All' : `Pattern: ${address.aliasPattern}`}
                              </p>
                            )}
                            {address.domain && !address.domain.verified && (
                              <p className="text-xs text-yellow-600">Domain wird verifiziert</p>
                            )}
                          </div>
                        </div>

                        {/* Status */}
                        <div className="w-[15%]">
                          <div className="flex items-center gap-2">
                            {getStatusIcon(address)}
                            {address.isDefault && (
                              <Badge color="blue" className="whitespace-nowrap">
                                Standard
                              </Badge>
                            )}
                          </div>
                        </div>

                        {/* Team */}
                        <div className="w-[20%]">
                          <div className="flex -space-x-2">
                            {address.assignedUserIds.slice(0, 3).map((userId: string) => {
                              const member = teamMembers.find(m => m.userId === userId);
                              return member ? (
                                <div
                                  key={userId}
                                  className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-white text-xs font-medium ring-2 ring-white"
                                  title={member.displayName}
                                >
                                  {member.displayName.split(' ').map(n => n[0]).join('')}
                                </div>
                              ) : null;
                            })}
                            {address.assignedUserIds.length > 3 && (
                              <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 text-xs font-medium ring-2 ring-white">
                                +{address.assignedUserIds.length - 3}
                              </div>
                            )}
                            {address.assignedUserIds.length === 0 && (
                              <span className="text-gray-400 text-sm">Nicht zugewiesen</span>
                            )}
                          </div>
                        </div>

                        {/* Client */}
                        <div className="w-[15%]">
                          {address.clientName ? (
                            <Badge color="purple" className="whitespace-nowrap">
                              {address.clientName}
                            </Badge>
                          ) : (
                            <span className="text-gray-400 text-sm">-</span>
                          )}
                        </div>

                        {/* Features */}
                        <div className="w-[15%]">
                          <div className="flex gap-1">
                            {address.inboxEnabled && (
                              <Badge color="zinc" className="whitespace-nowrap">
                                <EnvelopeIcon className="h-3 w-3 mr-1" />
                                Inbox
                              </Badge>
                            )}
                            {address.aiSettings?.enabled && (
                              <Badge color="zinc" className="whitespace-nowrap">
                                <SparklesIcon className="h-3 w-3 mr-1" />
                                KI
                              </Badge>
                            )}
                            {address.routingRules && address.routingRules.length > 0 && (
                              <Badge color="zinc" className="whitespace-nowrap">
                                <ArrowPathIcon className="h-3 w-3 mr-1" />
                                {address.routingRules.length}
                              </Badge>
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex-1 flex justify-end">
                          <Dropdown>
                            <DropdownButton plain className="p-1.5 hover:bg-zinc-100 rounded-md dark:hover:bg-zinc-700">
                              <EllipsisVerticalIcon className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
                            </DropdownButton>
                            <DropdownMenu anchor="bottom end">
                              {!address.isDefault && (
                                <DropdownItem onClick={() => handleSetAsDefault(address)}>
                                  <ShieldCheckIcon className="h-4 w-4" />
                                  Als Standard setzen
                                </DropdownItem>
                              )}
                              <DropdownItem onClick={() => handleRouting(address)}>
                                <FunnelIcon className="h-4 w-4" />
                                Routing-Regeln
                              </DropdownItem>
                              <DropdownItem onClick={() => handleEdit(address)}>
                                <PencilIcon className="h-4 w-4" />
                                Bearbeiten
                              </DropdownItem>
                              <DropdownItem onClick={() => handleDuplicate(address)}>
                                <DocumentDuplicateIcon className="h-4 w-4" />
                                Duplizieren
                              </DropdownItem>
                              <DropdownDivider />
                              <DropdownItem 
                                onClick={() => handleDelete(address)} 
                                disabled={address.isDefault}
                              >
                                <TrashIcon className="h-4 w-4" />
                                <span className="text-red-600">Löschen</span>
                              </DropdownItem>
                            </DropdownMenu>
                          </Dropdown>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </>
        )}

        {activeTab === 'templates' && (
          <div className="bg-white rounded-lg border p-8 text-center">
            <DocumentTextIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">E-Mail-Vorlagen</h3>
            <p className="text-gray-500 mb-4">
              Erstellen und verwalten Sie wiederverwendbare E-Mail-Vorlagen
            </p>
            <Button className="bg-[#005fab] hover:bg-[#004a8c] text-white whitespace-nowrap">
              <PlusIcon className="h-4 w-4 mr-2" />
              Erste Vorlage erstellen
            </Button>
          </div>
        )}

        {activeTab === 'signatures' && (
          <SignatureList
            signatures={signatures}
            emailAddresses={emailAddressesForSignatures}
            onSave={handleSaveSignature}
            onDelete={handleDeleteSignature}
            onDuplicate={handleDuplicateSignature}
            loading={loadingSignatures}
          />
        )}
      </div>

      {/* Add/Edit Modal */}
      <Dialog open={showAddModal || showEditModal} onClose={() => {
        setShowAddModal(false);
        setShowEditModal(false);
      }}>
        <DialogTitle className="px-6 py-4">
          {showAddModal ? 'Neue E-Mail-Adresse hinzufügen' : 'E-Mail-Adresse bearbeiten'}
        </DialogTitle>
        <DialogBody className="p-6">
          <p className="text-sm text-gray-500">
            Konfigurieren Sie die E-Mail-Adresse und deren Einstellungen.
          </p>
          <div className="mt-6 space-y-6">
            {/* Basic Settings */}
            <div>
              <Subheading>Grundeinstellungen</Subheading>
              <div className="grid grid-cols-2 gap-4 mt-4">
                <Field>
                  <Label>Local Part</Label>
                  <Input
                    value={formData.localPart}
                    onChange={(e) => setFormData({ ...formData, localPart: e.target.value })}
                    placeholder="z.B. presse, info, pr-*"
                    disabled={showEditModal}
                  />
                </Field>
                <Field>
                  <Label>Domain</Label>
                  <Select
                    value={formData.domainId}
                    onChange={(e) => setFormData({ ...formData, domainId: e.target.value })}
                    disabled={showEditModal || loadingDomains}
                  >
                    <option value="">Domain wählen...</option>
                    {domains.map(domain => (
                      <option key={domain.id} value={domain.id}>
                        @{domain.name}
                      </option>
                    ))}
                  </Select>
                  {domains.length === 0 && !loadingDomains && (
                    <p className="text-sm text-gray-500 mt-1">
                      Keine verifizierten Domains vorhanden. 
                      <a href="/dashboard/settings/domain" className="text-[#005fab] hover:underline ml-1">
                        Domain hinzufügen
                      </a>
                    </p>
                  )}
                </Field>
              </div>
              <Field className="mt-4">
                <Label>Anzeigename</Label>
                <Input
                  value={formData.displayName}
                  onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                  placeholder="z.B. Pressestelle ABC GmbH"
                />
              </Field>
              <Field className="mt-4">
                <Label>Client (optional)</Label>
                <Input
                  value={formData.clientName}
                  onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                  placeholder="z.B. ABC GmbH"
                />
              </Field>
            </div>

            {/* Alias Configuration - nur bei neuen Adressen */}
            {showAddModal && (
              <div>
                <Subheading>Alias-Typ</Subheading>
                <div className="space-y-2 mt-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="specific"
                      checked={formData.aliasType === 'specific'}
                      onChange={(e) => setFormData({ ...formData, aliasType: 'specific' })}
                      className="mr-2"
                    />
                    <span className="text-sm font-medium text-gray-700">Spezifische Adresse</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="catch-all"
                      checked={formData.aliasType === 'catch-all'}
                      onChange={(e) => setFormData({ ...formData, aliasType: 'catch-all' })}
                      className="mr-2"
                    />
                    <span className="text-sm font-medium text-gray-700">Catch-All (alle E-Mails an diese Domain)</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="pattern"
                      checked={formData.aliasType === 'pattern'}
                      onChange={(e) => setFormData({ ...formData, aliasType: 'pattern' })}
                      className="mr-2"
                    />
                    <span className="text-sm font-medium text-gray-700">Pattern (z.B. pr-* für pr-2024@, pr-sommer@)</span>
                  </label>
                </div>
              </div>
            )}

            {/* Team Assignment */}
            <div>
              <Subheading>Team-Zuweisungen</Subheading>
              {loadingTeam ? (
                <div className="mt-4 text-center">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#005fab] mx-auto"></div>
                </div>
              ) : teamMembers.length === 0 ? (
                <div className="mt-4 text-sm text-gray-500">
                  Keine Team-Mitglieder vorhanden. 
                  <button
                    type="button"
                    onClick={() => setShowInviteModal(true)}
                    className="text-[#005fab] hover:underline ml-1"
                  >
                    Jetzt einladen
                  </button>
                </div>
              ) : (
                <CheckboxGroup className="mt-4 space-y-2">
                  {teamMembers.map(member => (
                    <CheckboxField key={member.userId}>
                      <Checkbox
                        checked={formData.assignedUserIds.includes(member.userId)}
                        onChange={(checked) => {
                          if (checked) {
                            setFormData({
                              ...formData,
                              assignedUserIds: [...formData.assignedUserIds, member.userId]
                            });
                          } else {
                            setFormData({
                              ...formData,
                              assignedUserIds: formData.assignedUserIds.filter(id => id !== member.userId)
                            });
                          }
                        }}
                      />
                      <Label>
                        {member.displayName} ({member.email})
                        {member.role === 'owner' && (
                          <Badge color="blue" className="ml-2">Owner</Badge>
                        )}
                      </Label>
                    </CheckboxField>
                  ))}
                </CheckboxGroup>
              )}
            </div>

            {/* Features */}
            <div>
              <Subheading>Features</Subheading>
              <div className="space-y-3 mt-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">Aktiv</span>
                  <SimpleSwitch
                    checked={formData.isActive}
                    onChange={(checked) => setFormData({ ...formData, isActive: checked })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">Inbox aktiviert</span>
                  <SimpleSwitch
                    checked={formData.inboxEnabled}
                    onChange={(checked) => setFormData({ ...formData, inboxEnabled: checked })}
                  />
                </div>
              </div>
            </div>

            {/* AI Settings */}
            <div>
              <Subheading>KI-Einstellungen (Gemini)</Subheading>
              <div className="space-y-3 mt-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">KI-Unterstützung aktivieren</span>
                  <SimpleSwitch
                    checked={formData.aiEnabled}
                    onChange={(checked) => setFormData({ ...formData, aiEnabled: checked })}
                  />
                </div>
                {formData.aiEnabled && (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">Automatische Antwort-Vorschläge</span>
                      <SimpleSwitch
                        checked={formData.autoSuggest}
                        onChange={(checked) => setFormData({ ...formData, autoSuggest: checked })}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">Automatische Kategorisierung</span>
                      <SimpleSwitch
                        checked={formData.autoCategorize}
                        onChange={(checked) => setFormData({ ...formData, autoCategorize: checked })}
                      />
                    </div>
                    <Field>
                      <Label>Bevorzugter Ton</Label>
                      <Select
                        value={formData.preferredTone}
                        onChange={(e) => setFormData({ ...formData, preferredTone: e.target.value as any })}
                      >
                        <option value="formal">Förmlich</option>
                        <option value="modern">Modern</option>
                        <option value="technical">Technisch</option>
                        <option value="startup">Startup</option>
                      </Select>
                    </Field>
                  </>
                )}
              </div>
            </div>
          </div>
        </DialogBody>
        <DialogActions className="px-6 py-4">
          <Button plain onClick={() => {
            setShowAddModal(false);
            setShowEditModal(false);
          }}>
            Abbrechen
          </Button>
          <Button 
            className="bg-[#005fab] hover:bg-[#004a8c] text-white whitespace-nowrap"
            onClick={handleSaveEmailAddress}
            disabled={saving}
          >
            {saving ? 'Speichern...' : (showAddModal ? 'Hinzufügen' : 'Speichern')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* NEU: Team Member Invite Modal */}
      <Dialog open={showInviteModal} onClose={() => setShowInviteModal(false)}>
        <DialogTitle className="px-6 py-4">Team-Mitglied einladen</DialogTitle>
        <DialogBody className="p-6">
          <p className="text-sm text-gray-500 mb-4">
            Laden Sie ein neues Team-Mitglied per E-Mail ein. Sie erhalten eine Einladung zum Beitritt.
          </p>
          <div className="space-y-4">
            <Field>
              <Label>E-Mail-Adresse</Label>
              <Input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="kollege@beispiel.de"
              />
            </Field>
            <Field>
              <Label>Rolle</Label>
              <Select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as 'admin' | 'member')}
              >
                <option value="member">Mitglied</option>
                <option value="admin">Administrator</option>
              </Select>
              <p className="text-xs text-gray-500 mt-1">
                Administratoren können alle Einstellungen verwalten
              </p>
            </Field>
          </div>
        </DialogBody>
        <DialogActions className="px-6 py-4">
          <Button plain onClick={() => {
            setShowInviteModal(false);
            setInviteEmail('');
            setInviteRole('member');
          }}>
            Abbrechen
          </Button>
          <Button 
            className="bg-[#005fab] hover:bg-[#004a8c] text-white whitespace-nowrap"
            onClick={handleInviteTeamMember}
            disabled={inviting || !inviteEmail}
          >
            {inviting ? 'Einladung wird gesendet...' : 'Einladung senden'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={showDeleteModal} onClose={() => setShowDeleteModal(false)}>
        <DialogTitle className="px-6 py-4">E-Mail-Adresse löschen</DialogTitle>
        <DialogBody className="p-6">
          <p className="text-sm text-gray-500">
            Sind Sie sicher, dass Sie die E-Mail-Adresse <strong>{selectedAddress?.email}</strong> löschen möchten?
            Diese Aktion kann nicht rückgängig gemacht werden.
          </p>
        </DialogBody>
        <DialogActions className="px-6 py-4">
          <Button plain onClick={() => setShowDeleteModal(false)}>
            Abbrechen
          </Button>
          <Button 
            className="bg-red-600 hover:bg-red-700 text-white whitespace-nowrap"
            onClick={handleDeleteConfirm}
            disabled={saving}
          >
            {saving ? 'Löschen...' : 'Löschen'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Routing Rules Modal - Using new RoutingRuleEditor */}
      {showRoutingModal && selectedAddress && (
        <RoutingRuleEditor
          emailAddress={selectedAddress}
          isOpen={showRoutingModal}
          onClose={() => setShowRoutingModal(false)}
          onUpdate={handleRoutingUpdate}
          teamMembers={teamMembersForRouting}
        />
      )}
    </div>
  );
}