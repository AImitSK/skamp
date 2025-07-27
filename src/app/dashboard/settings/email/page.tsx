// src/app/dashboard/settings/email/page.tsx
"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Heading, Subheading } from '@/components/heading';
import { Button } from '@/components/button';
import { Badge } from '@/components/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/table';
import { Dialog, DialogActions, DialogBody, DialogTitle } from '@/components/dialog';
import { Field, Label } from '@/components/fieldset';
import { Input } from '@/components/input';
import { Select } from '@/components/select';
import { Textarea } from '@/components/textarea';
import { Switch, SwitchField } from '@/components/switch';
import { Checkbox, CheckboxField, CheckboxGroup } from '@/components/checkbox';
import { EmailAddress, EmailSignature, EmailTemplate, EmailDomain, EmailAddressFormData } from '@/types/email-enhanced';
import { 
  PlusIcon, 
  PencilIcon, 
  TrashIcon,
  EnvelopeIcon,
  ShieldCheckIcon,
  SparklesIcon,
  UserGroupIcon,
  ArrowPathIcon,
  Cog6ToothIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  FunnelIcon,
  DocumentTextIcon,
  PencilSquareIcon
} from '@heroicons/react/20/solid';
import clsx from 'clsx';
import { Timestamp } from 'firebase/firestore';

// Tab Components werden später implementiert
// import { EmailAddressesTab } from './EmailAddressesTab';
// import { EmailTemplatesTab } from './EmailTemplatesTab';  
// import { EmailSignaturesTab } from './EmailSignaturesTab';

// Mock Data Generation
function generateMockEmailAddresses(organizationId: string): EmailAddress[] {
  return [
    {
      id: '1',
      email: 'presse@kunde1.de',
      localPart: 'presse',
      domainId: 'domain-1',
      domain: { id: 'domain-1', name: 'kunde1.de', verified: true },
      displayName: 'Pressestelle ABC GmbH',
      isActive: true,
      isDefault: true,
      inboxEnabled: true,
      assignedUserIds: ['user-1', 'user-2'],
      clientName: 'ABC GmbH',
      permissions: {
        read: ['user-1', 'user-2', 'user-3'],
        write: ['user-1', 'user-2'],
        manage: ['user-1']
      },
      emailsSent: 142,
      emailsReceived: 387,
      lastUsedAt: Timestamp.now(),
      aiSettings: {
        enabled: true,
        autoSuggest: true,
        autoCategorize: true,
        preferredTone: 'formal'
      },
      routingRules: [
        {
          id: 'rule-1',
          name: 'VIP Journalisten',
          conditions: {
            from: '@spiegel.de,@faz.net',
            keywords: ['urgent', 'deadline']
          },
          actions: {
            assignTo: ['user-1'],
            setPriority: 'high',
            addTags: ['vip-presse']
          }
        }
      ],
      organizationId,
      userId: 'user-1',
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    },
    {
      id: '2',
      email: 'pr-*@kunde2.de',
      localPart: 'pr-*',
      domainId: 'domain-2',
      domain: { id: 'domain-2', name: 'kunde2.de', verified: true },
      displayName: 'PR Team Kunde 2',
      isActive: true,
      isDefault: false,
      aliasType: 'pattern',
      aliasPattern: 'pr-*',
      inboxEnabled: true,
      assignedUserIds: ['user-3', 'user-4'],
      clientName: 'XYZ Solutions',
      permissions: {
        read: ['user-3', 'user-4'],
        write: ['user-3', 'user-4'],
        manage: ['user-3']
      },
      emailsSent: 89,
      emailsReceived: 156,
      lastUsedAt: Timestamp.now(),
      aiSettings: {
        enabled: false,
        autoSuggest: false,
        autoCategorize: false
      },
      organizationId,
      userId: 'user-3',
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    },
    {
      id: '3',
      email: 'info@agentur.de',
      localPart: 'info',
      domainId: 'domain-3',
      domain: { id: 'domain-3', name: 'agentur.de', verified: true },
      displayName: 'Allgemeine Anfragen',
      isActive: false,
      isDefault: false,
      inboxEnabled: true,
      assignedUserIds: ['user-1'],
      permissions: {
        read: ['user-1', 'user-2', 'user-3', 'user-4'],
        write: ['user-1'],
        manage: ['user-1']
      },
      emailsSent: 12,
      emailsReceived: 43,
      organizationId,
      userId: 'user-1',
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    }
  ];
}

// Mock verified domains
const mockDomains: EmailDomain[] = [
  { id: 'domain-1', name: 'kunde1.de', verified: true, verifiedAt: Timestamp.now() },
  { id: 'domain-2', name: 'kunde2.de', verified: true, verifiedAt: Timestamp.now() },
  { id: 'domain-3', name: 'agentur.de', verified: true, verifiedAt: Timestamp.now() },
  { id: 'domain-4', name: 'neue-domain.de', verified: false }
];

// Mock team members
const mockTeamMembers = [
  { id: 'user-1', name: 'Anna Meyer', email: 'anna@agentur.de' },
  { id: 'user-2', name: 'Ben Klein', email: 'ben@agentur.de' },
  { id: 'user-3', name: 'Clara Schmidt', email: 'clara@agentur.de' },
  { id: 'user-4', name: 'David Weber', email: 'david@agentur.de' }
];

type TabType = 'addresses' | 'templates' | 'signatures';

export default function EmailSettingsPage() {
  const { user } = useAuth();
  const organizationId = user?.uid || '';
  
  const [activeTab, setActiveTab] = useState<TabType>('addresses');
  const [emailAddresses, setEmailAddresses] = useState<EmailAddress[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showRoutingModal, setShowRoutingModal] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState<EmailAddress | null>(null);
  
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

  // Load mock data
  useEffect(() => {
    if (organizationId) {
      setLoading(true);
      // Simulate API call
      setTimeout(() => {
        setEmailAddresses(generateMockEmailAddresses(organizationId));
        setLoading(false);
      }, 500);
    }
  }, [organizationId]);

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

  const getStatusIcon = (address: EmailAddress) => {
    if (!address.isActive) {
      return <ExclamationTriangleIcon className="h-5 w-5 text-gray-400" />;
    }
    if (address.lastUsedAt && address.lastUsedAt.toDate() > new Date(Date.now() - 24 * 60 * 60 * 1000)) {
      return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
    }
    return <ClockIcon className="h-5 w-5 text-yellow-500" />;
  };

  const tabs = [
    { id: 'addresses' as TabType, name: 'E-Mail-Adressen', icon: EnvelopeIcon },
    { id: 'templates' as TabType, name: 'Vorlagen', icon: DocumentTextIcon },
    { id: 'signatures' as TabType, name: 'Signaturen', icon: PencilSquareIcon }
  ];

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <Heading>E-Mail Einstellungen</Heading>
        <p className="text-zinc-500 mt-1">
          Verwalten Sie E-Mail-Adressen, Vorlagen und Signaturen für Ihre Organisation
        </p>
      </div>

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
                <EnvelopeIcon className="h-8 w-8 text-[#005fab]" />
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
                <SparklesIcon className="h-8 w-8 text-purple-500" />
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
                <ArrowPathIcon className="h-8 w-8 text-green-500" />
              </div>
            </div>
            <div className="bg-white p-4 rounded-lg border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Team-Mitglieder</p>
                  <p className="text-2xl font-semibold mt-1">
                    {mockTeamMembers.length}
                  </p>
                </div>
                <UserGroupIcon className="h-8 w-8 text-orange-500" />
              </div>
            </div>
          </div>

          {/* Action Button */}
          <div className="flex justify-end mb-4">
            <Button onClick={handleAdd} className="bg-[#005fab] hover:bg-[#004a8c] text-white whitespace-nowrap">
              <PlusIcon className="h-4 w-4 mr-2" />
              Neue E-Mail-Adresse
            </Button>
          </div>

          {/* Email Addresses Table */}
          <div className="bg-white rounded-lg border">
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeader>Status</TableHeader>
                  <TableHeader>E-Mail-Adresse</TableHeader>
                  <TableHeader>Anzeigename</TableHeader>
                  <TableHeader>Team</TableHeader>
                  <TableHeader>Client</TableHeader>
                  <TableHeader>Features</TableHeader>
                  <TableHeader>Statistik</TableHeader>
                  <TableHeader className="text-right">Aktionen</TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#005fab] mx-auto"></div>
                    </TableCell>
                  </TableRow>
                ) : emailAddresses.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                      Keine E-Mail-Adressen vorhanden
                    </TableCell>
                  </TableRow>
                ) : (
                  emailAddresses.map((address) => (
                    <TableRow key={address.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(address)}
                          {address.isDefault && (
                            <Badge color="blue" className="whitespace-nowrap">
                              Standard
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{address.email}</p>
                          {address.aliasType && address.aliasType !== 'specific' && (
                            <p className="text-xs text-gray-500">
                              {address.aliasType === 'catch-all' ? 'Catch-All' : `Pattern: ${address.aliasPattern}`}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{address.displayName}</TableCell>
                      <TableCell>
                        <div className="flex -space-x-2">
                          {address.assignedUserIds.slice(0, 3).map((userId: string) => {
                            const member = mockTeamMembers.find(m => m.id === userId);
                            return member ? (
                              <div
                                key={userId}
                                className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-white text-xs font-medium ring-2 ring-white"
                                title={member.name}
                              >
                                {member.name.split(' ').map(n => n[0]).join('')}
                              </div>
                            ) : null;
                          })}
                          {address.assignedUserIds.length > 3 && (
                            <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 text-xs font-medium ring-2 ring-white">
                              +{address.assignedUserIds.length - 3}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {address.clientName ? (
                          <Badge color="purple" className="whitespace-nowrap">
                            {address.clientName}
                          </Badge>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {address.inboxEnabled && (
                            <Badge color="green" className="whitespace-nowrap">
                              <EnvelopeIcon className="h-3 w-3 mr-1" />
                              Inbox
                            </Badge>
                          )}
                          {address.aiSettings?.enabled && (
                            <Badge color="purple" className="whitespace-nowrap">
                              <SparklesIcon className="h-3 w-3 mr-1" />
                              KI
                            </Badge>
                          )}
                          {address.routingRules && address.routingRules.length > 0 && (
                            <Badge color="orange" className="whitespace-nowrap">
                              <ArrowPathIcon className="h-3 w-3 mr-1" />
                              {address.routingRules.length}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <p className="text-gray-600">
                            ↓ {address.emailsReceived || 0} | ↑ {address.emailsSent || 0}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            plain
                            onClick={() => handleRouting(address)}
                            className="p-1"
                          >
                            <FunnelIcon className="h-4 w-4" />
                          </Button>
                          <Button
                            plain
                            onClick={() => handleEdit(address)}
                            className="p-1"
                          >
                            <PencilIcon className="h-4 w-4" />
                          </Button>
                          <Button
                            plain
                            onClick={() => handleDelete(address)}
                            className="p-1 text-red-600 hover:text-red-700"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
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
          <Button className="bg-[#005fab] hover:bg-[#004a8c] text-white">
            <PlusIcon className="h-4 w-4 mr-2" />
            Erste Vorlage erstellen
          </Button>
        </div>
      )}

      {activeTab === 'signatures' && (
        <div className="bg-white rounded-lg border p-8 text-center">
          <PencilSquareIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">E-Mail-Signaturen</h3>
          <p className="text-gray-500 mb-4">
            Erstellen Sie professionelle Signaturen für Ihre E-Mails
          </p>
          <Button className="bg-[#005fab] hover:bg-[#004a8c] text-white">
            <PlusIcon className="h-4 w-4 mr-2" />
            Erste Signatur erstellen
          </Button>
        </div>
      )}

      {/* Add/Edit Modal */}
      <Dialog open={showAddModal || showEditModal} onClose={() => {
        setShowAddModal(false);
        setShowEditModal(false);
      }}>
        <DialogTitle>
          {showAddModal ? 'Neue E-Mail-Adresse hinzufügen' : 'E-Mail-Adresse bearbeiten'}
        </DialogTitle>
        <DialogBody className="mt-2">
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
                  />
                </Field>
                <Field>
                  <Label>Domain</Label>
                  <Select
                    value={formData.domainId}
                    onChange={(e) => setFormData({ ...formData, domainId: e.target.value })}
                  >
                    <option value="">Domain wählen...</option>
                    {mockDomains.filter(d => d.verified).map(domain => (
                      <option key={domain.id} value={domain.id}>
                        @{domain.name}
                      </option>
                    ))}
                  </Select>
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

            {/* Alias Configuration */}
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
                  <span>Spezifische Adresse</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="catch-all"
                    checked={formData.aliasType === 'catch-all'}
                    onChange={(e) => setFormData({ ...formData, aliasType: 'catch-all' })}
                    className="mr-2"
                  />
                  <span>Catch-All (alle E-Mails an diese Domain)</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="pattern"
                    checked={formData.aliasType === 'pattern'}
                    onChange={(e) => setFormData({ ...formData, aliasType: 'pattern' })}
                    className="mr-2"
                  />
                  <span>Pattern (z.B. pr-* für pr-2024@, pr-sommer@)</span>
                </label>
              </div>
            </div>

            {/* Team Assignment */}
            <div>
              <Subheading>Team-Zuweisungen</Subheading>
              <CheckboxGroup className="mt-4 space-y-2">
                {mockTeamMembers.map(member => (
                  <CheckboxField key={member.id}>
                    <Checkbox
                      checked={formData.assignedUserIds.includes(member.id)}
                      onChange={(checked) => {
                        if (checked) {
                          setFormData({
                            ...formData,
                            assignedUserIds: [...formData.assignedUserIds, member.id]
                          });
                        } else {
                          setFormData({
                            ...formData,
                            assignedUserIds: formData.assignedUserIds.filter(id => id !== member.id)
                          });
                        }
                      }}
                    />
                    <Label>{member.name} ({member.email})</Label>
                  </CheckboxField>
                ))}
              </CheckboxGroup>
            </div>

            {/* Features */}
            <div>
              <Subheading>Features</Subheading>
              <div className="space-y-3 mt-4">
                <SwitchField>
                  <Label>Aktiv</Label>
                  <Switch
                    checked={formData.isActive}
                    onChange={(checked) => setFormData({ ...formData, isActive: checked })}
                  />
                </SwitchField>
                <SwitchField>
                  <Label>Inbox aktiviert</Label>
                  <Switch
                    checked={formData.inboxEnabled}
                    onChange={(checked) => setFormData({ ...formData, inboxEnabled: checked })}
                  />
                </SwitchField>
              </div>
            </div>

            {/* AI Settings */}
            <div>
              <Subheading>KI-Einstellungen (Gemini)</Subheading>
              <div className="space-y-3 mt-4">
                <SwitchField>
                  <Label>KI-Unterstützung aktivieren</Label>
                  <Switch
                    checked={formData.aiEnabled}
                    onChange={(checked) => setFormData({ ...formData, aiEnabled: checked })}
                  />
                </SwitchField>
                {formData.aiEnabled && (
                  <>
                    <SwitchField>
                      <Label>Automatische Antwort-Vorschläge</Label>
                      <Switch
                        checked={formData.autoSuggest}
                        onChange={(checked) => setFormData({ ...formData, autoSuggest: checked })}
                      />
                    </SwitchField>
                    <SwitchField>
                      <Label>Automatische Kategorisierung</Label>
                      <Switch
                        checked={formData.autoCategorize}
                        onChange={(checked) => setFormData({ ...formData, autoCategorize: checked })}
                      />
                    </SwitchField>
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
        <DialogActions>
          <Button plain onClick={() => {
            setShowAddModal(false);
            setShowEditModal(false);
          }}>
            Abbrechen
          </Button>
          <Button className="bg-[#005fab] hover:bg-[#004a8c] text-white">
            {showAddModal ? 'Hinzufügen' : 'Speichern'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={showDeleteModal} onClose={() => setShowDeleteModal(false)}>
        <DialogTitle>E-Mail-Adresse löschen</DialogTitle>
        <DialogBody className="mt-2">
          <p className="text-sm text-gray-500">
            Sind Sie sicher, dass Sie die E-Mail-Adresse <strong>{selectedAddress?.email}</strong> löschen möchten?
            Diese Aktion kann nicht rückgängig gemacht werden.
          </p>
        </DialogBody>
        <DialogActions>
          <Button plain onClick={() => setShowDeleteModal(false)}>
            Abbrechen
          </Button>
          <Button className="bg-red-600 hover:bg-red-700 text-white">
            Löschen
          </Button>
        </DialogActions>
      </Dialog>

      {/* Routing Rules Modal */}
      <Dialog open={showRoutingModal} onClose={() => setShowRoutingModal(false)} className="sm:max-w-3xl">
        <DialogTitle>Routing-Regeln für {selectedAddress?.email}</DialogTitle>
        <DialogBody className="mt-2">
          <p className="text-sm text-gray-500 mb-4">
            Definieren Sie automatische Weiterleitungs- und Zuweisungsregeln basierend auf E-Mail-Eigenschaften.
          </p>
          {selectedAddress?.routingRules && selectedAddress.routingRules.length > 0 ? (
            <div className="space-y-4">
              {selectedAddress.routingRules.map((rule: any) => (
                <div key={rule.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium">{rule.name}</h4>
                    <div className="flex gap-2">
                      <Button plain className="text-sm">Bearbeiten</Button>
                      <Button plain className="text-sm text-red-600">Löschen</Button>
                    </div>
                  </div>
                  <div className="text-sm text-gray-600">
                    <p className="mb-1"><strong>Wenn:</strong></p>
                    <ul className="list-disc list-inside ml-2">
                      {rule.conditions.from && <li>Absender enthält: {rule.conditions.from}</li>}
                      {rule.conditions.subject && <li>Betreff enthält: {rule.conditions.subject}</li>}
                      {rule.conditions.keywords && <li>Schlüsselwörter: {rule.conditions.keywords.join(', ')}</li>}
                    </ul>
                    <p className="mt-2 mb-1"><strong>Dann:</strong></p>
                    <ul className="list-disc list-inside ml-2">
                      {rule.actions.assignTo && (
                        <li>Zuweisen an: {rule.actions.assignTo.map((id: string) => 
                          mockTeamMembers.find(m => m.id === id)?.name
                        ).join(', ')}</li>
                      )}
                      {rule.actions.setPriority && <li>Priorität: {rule.actions.setPriority}</li>}
                      {rule.actions.addTags && <li>Tags: {rule.actions.addTags.join(', ')}</li>}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <FunnelIcon className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p>Keine Routing-Regeln definiert</p>
              <p className="text-sm mt-1">Erstellen Sie Regeln, um E-Mails automatisch zu verarbeiten</p>
            </div>
          )}
          <div className="mt-6">
            <Button className="w-full bg-[#005fab] hover:bg-[#004a8c] text-white">
              <PlusIcon className="h-4 w-4 mr-2" />
              Neue Regel hinzufügen
            </Button>
          </div>
        </DialogBody>
        <DialogActions>
          <Button plain onClick={() => setShowRoutingModal(false)}>
            Schließen
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}