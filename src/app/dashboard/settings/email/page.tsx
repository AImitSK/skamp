// src/app/dashboard/settings/email/page.tsx
"use client";

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/context/AuthContext';
import { useOrganization } from '@/context/OrganizationContext';
import { Heading, Subheading } from '@/components/ui/heading';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogActions, DialogBody, DialogTitle } from '@/components/ui/dialog';
import { Dropdown, DropdownButton, DropdownMenu, DropdownItem, DropdownDivider } from '@/components/ui/dropdown';
import { Field, Label } from '@/components/ui/fieldset';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Checkbox, CheckboxField, CheckboxGroup } from '@/components/ui/checkbox';
import { SimpleSwitch } from '@/components/notifications/SimpleSwitch';
import { SettingsNav } from '@/components/SettingsNav';
import { Text } from '@/components/ui/text';
import { Avatar } from '@/components/ui/avatar';
import { EmailAddress, EmailSignature, EmailDomain, EmailAddressFormData } from '@/types/email-enhanced';
import { emailAddressService } from '@/lib/email/email-address-service';
import { emailSignatureService } from '@/lib/email/email-signature-service';
import { SignatureList } from '@/components/email/SignatureList';
import { toastService } from '@/lib/utils/toast';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  EnvelopeIcon,
  ShieldCheckIcon,
  UserGroupIcon,
  EllipsisVerticalIcon,
  CheckCircleIcon,
  PencilSquareIcon
} from '@heroicons/react/24/outline';
import clsx from 'clsx';
import { domainServiceEnhanced } from '@/lib/firebase/domain-service-enhanced';

// NEU: Import für echte Team-Daten
import { teamMemberService } from '@/lib/firebase/organization-service';
import { TeamMember } from '@/types/international';


type TabType = 'addresses' | 'signatures';

export default function EmailSettingsPage() {
  const t = useTranslations('settings.email');
  const tCommon = useTranslations('common');
  const tToast = useTranslations('toasts');
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();
  const organizationId = currentOrganization?.id || '';
  
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
  const [selectedAddress, setSelectedAddress] = useState<EmailAddress | null>(null);
  
  // NEU: State für echte Team-Mitglieder
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loadingTeam, setLoadingTeam] = useState(true);
  
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
      loadEmailAddresses();
      loadDomains();
      loadSignatures();
      loadTeamMembers();
    }
  }, [organizationId]);

  // NEU: Lade Team-Mitglieder aus Firestore
  const loadTeamMembers = async () => {
    try {
      setLoadingTeam(true);
      
      const members = await teamMemberService.getByOrganization(organizationId);
      
      // Filtere nur aktive Mitglieder
      const activeMembers = members.filter(m => m.status === 'active');
      setTeamMembers(activeMembers);
    } catch (error) {
      toastService.error(tToast('teamMembersLoadError'));

      // Fallback: Erstelle das erste Team-Mitglied (Owner) wenn keines existiert
      if (user) {
        try {
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
        }
      }
    } finally {
      setLoadingTeam(false);
    }
  };

  const loadDomains = async () => {
    try {
      setLoadingDomains(true);

      if (!organizationId) return;

      const allDomains = await domainServiceEnhanced.getAll(organizationId);

      const emailDomains: EmailDomain[] = allDomains.map(d => ({
        id: d.id!,
        name: d.domain,
        verified: d.status === 'verified',
        verifiedAt: d.verifiedAt,
        domain: d.domain,
        status: d.status
      } as EmailDomain));

      setDomains(emailDomains);
    } catch (error) {
      toastService.error(tToast('domainsLoadError'));
    } finally {
      setLoadingDomains(false);
    }
  };

  const loadEmailAddresses = async () => {
    try {
      setLoading(true);
      const addresses = await emailAddressService.getByOrganization(
        organizationId,
        user?.uid || '',
        currentOrganization?.role
      );
      setEmailAddresses(addresses);
    } catch (error) {
      toastService.error(tToast('emailAddressesLoadError'));
    } finally {
      setLoading(false);
    }
  };

  const loadSignatures = async () => {
    try {
      setLoadingSignatures(true);
      
      const sigs = await emailSignatureService.getByOrganization(organizationId);
      setSignatures(sigs);
    } catch (error) {
      toastService.error(tToast('signaturesLoadError'));
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

  const handleSaveEmailAddress = async () => {
    try {
      setSaving(true);
      
      if (showAddModal) {
        await emailAddressService.create(formData, organizationId, user?.uid || '');
        toastService.success(tToast('emailAddressCreated'));
      } else if (showEditModal && selectedAddress?.id) {
        await emailAddressService.update(selectedAddress.id, formData, user?.uid || '');
        toastService.success(tToast('emailAddressUpdated'));
      }
      
      await loadEmailAddresses();
      setShowAddModal(false);
      setShowEditModal(false);
      setSelectedAddress(null);
    } catch (error) {
      if (error instanceof Error) {
        toastService.error(error.message);
      } else {
        toastService.error(tToast('emailAddressSaveError'));
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
      toastService.success(tToast('emailAddressDeleted'));
      await loadEmailAddresses();
      setShowDeleteModal(false);
      setSelectedAddress(null);
    } catch (error) {
      if (error instanceof Error) {
        toastService.error(error.message);
      } else {
        toastService.error(tToast('emailAddressDeleteError'));
      }
    } finally {
      setSaving(false);
    }
  };

  const handleSetAsDefault = async (address: EmailAddress) => {
    if (!address.id) return;

    try {
      await emailAddressService.setAsDefault(address.id, organizationId);
      toastService.success(tToast('emailAddressSetAsDefault'));
      await loadEmailAddresses();
    } catch (error) {
      toastService.error(tToast('emailAddressSetAsDefaultError'));
    }
  };

  // Signature handlers
  const handleSaveSignature = async (signature: Partial<EmailSignature>, id?: string) => {
    try {
      if (id) {
        await emailSignatureService.update(id, signature, user?.uid || '');
        toastService.success(tToast('signatureUpdated'));
      } else {
        await emailSignatureService.create(signature, organizationId, user?.uid || '');
        toastService.success(tToast('signatureCreated'));
      }
      await loadSignatures();
    } catch (error) {
      throw error;
    }
  };

  const handleDeleteSignature = async (id: string) => {
    try {
      await emailSignatureService.delete(id);
      toastService.success(tToast('signatureDeleted'));
      await loadSignatures();
    } catch (error) {
      if (error instanceof Error) {
        toastService.error(error.message);
      } else {
        toastService.error(tToast('signatureDeleteError'));
      }
    }
  };

  const handleDuplicateSignature = async (id: string) => {
    try {
      await emailSignatureService.duplicate(id, user?.uid || '');
      toastService.success(tToast('signatureDuplicated'));
      await loadSignatures();
    } catch (error) {
      toastService.error(tToast('signatureDuplicateError'));
    }
  };

  const getStatusIcon = (address: EmailAddress) => {
    // Zeige grünes Icon wenn aktiv, sonst grau
    if (address.isActive) {
      return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
    }
    return <CheckCircleIcon className="h-5 w-5 text-gray-400" />;
  };

  const tabs = [
    { id: 'addresses' as TabType, name: t('tabs.addresses'), icon: EnvelopeIcon },
    { id: 'signatures' as TabType, name: t('tabs.signatures'), icon: PencilSquareIcon }
  ];

  // Prepare email addresses for signature component
  const emailAddressesForSignatures = emailAddresses.map(addr => ({
    id: addr.id!,
    email: addr.email,
    displayName: addr.displayName
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
            <Heading>{t('title')}</Heading>
            <Text className="mt-2 text-zinc-500">
              {t('description')}
            </Text>
          </div>
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
            {/* Action Button */}
            <div className="flex justify-end mb-4">
              <Button onClick={handleAdd} className="bg-primary hover:bg-primary-hover text-white whitespace-nowrap">
                <PlusIcon className="h-4 w-4 mr-2" />
                {t('newAddress')}
              </Button>
            </div>

            {/* Email Addresses Table */}
            <div className="bg-white rounded-lg overflow-hidden">
              {/* Header */}
              <div className="px-6 py-3 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50">
                <div className="flex items-center">
                  <div className="w-[40%] text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                    {t('table.emailAddress')}
                  </div>
                  <div className="w-[15%] text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                    {t('table.status')}
                  </div>
                  <div className="w-[35%] text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                    {t('table.team')}
                  </div>
                  <div className="w-[10%] text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider text-right">
                    {tCommon('actions')}
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
                    {t('empty')}
                  </div>
                ) : (
                  emailAddresses.map((address) => (
                    <div key={address.id} className="px-6 py-4 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                      <div className="flex items-center">
                        {/* Email Address */}
                        <div className="w-[40%] min-w-0">
                          <div>
                            <p className="font-medium text-sm text-zinc-900 dark:text-white truncate">{address.email}</p>
                            <p className="text-xs text-gray-500 truncate">{address.displayName}</p>
                            {address.aliasType && address.aliasType !== 'specific' && (
                              <p className="text-xs text-gray-500">
                                {address.aliasType === 'catch-all'
                                  ? t('aliasTypes.catchAll')
                                  : t('aliasTypes.pattern', { pattern: address.aliasPattern || '' })}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Status */}
                        <div className="w-[15%]">
                          <div className="flex items-center gap-2">
                            {getStatusIcon(address)}
                            {address.isDefault && (
                              <Badge color="blue" className="whitespace-nowrap">
                                {t('badge.default')}
                              </Badge>
                            )}
                          </div>
                        </div>

                        {/* Team */}
                        <div className="w-[35%]">
                          <div className="flex -space-x-2">
                            {address.availableToAll ? (
                              <Badge color="sky" className="whitespace-nowrap">
                                <UserGroupIcon className="size-4 mr-1" />
                                {t('availableToAll')}
                              </Badge>
                            ) : (
                              <>
                                {(address.assignedUserIds || []).slice(0, 3).map((userId: string) => {
                                  const member = teamMembers.find(m => m.userId === userId);
                                  if (!member) return null;

                                  // Generiere Initialen als Fallback
                                  const initials = member.displayName
                                    .split(' ')
                                    .map(n => n[0])
                                    .join('')
                                    .toUpperCase()
                                    .slice(0, 2);

                                  return (
                                    <Avatar
                                      key={userId}
                                      className="size-8 ring-2 ring-white"
                                      src={member.photoUrl}
                                      initials={initials}
                                      title={member.displayName}
                                    />
                                  );
                                })}
                                {(address.assignedUserIds || []).length > 3 && (
                                  <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 text-xs font-medium ring-2 ring-white">
                                    +{(address.assignedUserIds || []).length - 3}
                                  </div>
                                )}
                                {(address.assignedUserIds || []).length === 0 && (
                                  <span className="text-gray-400 text-sm">{t('notAssigned')}</span>
                                )}
                              </>
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="w-[10%] flex justify-end">
                          <Dropdown>
                            <DropdownButton plain className="p-1.5 hover:bg-zinc-100 rounded-md dark:hover:bg-zinc-700">
                              <EllipsisVerticalIcon className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
                            </DropdownButton>
                            <DropdownMenu anchor="bottom end">
                              {!address.isDefault && (
                                <DropdownItem onClick={() => handleSetAsDefault(address)}>
                                  <ShieldCheckIcon className="h-4 w-4" />
                                  {t('actions.setAsDefault')}
                                </DropdownItem>
                              )}
                              <DropdownItem onClick={() => handleEdit(address)}>
                                <PencilIcon className="h-4 w-4" />
                                {tCommon('edit')}
                              </DropdownItem>
                              <DropdownDivider />
                              <DropdownItem
                                onClick={() => handleDelete(address)}
                                disabled={address.isDefault}
                              >
                                <TrashIcon className="h-4 w-4" />
                                <span className="text-red-600">{tCommon('delete')}</span>
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
          {showAddModal ? t('modal.titleAdd') : t('modal.titleEdit')}
        </DialogTitle>
        <DialogBody className="p-6">
          <p className="text-sm text-gray-500">
            {t('modal.description')}
          </p>
          <div className="mt-6 space-y-6">
            {/* Basic Settings */}
            <div>
              <Subheading>{t('modal.basicSettings')}</Subheading>
              <div className="grid grid-cols-2 gap-4 mt-4">
                <Field>
                  <Label>{t('modal.localPart')}</Label>
                  <Input
                    value={formData.localPart}
                    onChange={(e) => setFormData({ ...formData, localPart: e.target.value })}
                    placeholder={t('modal.localPartPlaceholder')}
                    disabled={showEditModal}
                  />
                </Field>
                <Field>
                  <Label>{t('modal.domain')}</Label>
                  <Select
                    value={formData.domainId}
                    onChange={(e) => setFormData({ ...formData, domainId: e.target.value })}
                    disabled={showEditModal || loadingDomains}
                  >
                    <option value="">{t('modal.selectDomain')}</option>
                    {domains.map(domain => (
                      <option key={domain.id} value={domain.id}>
                        @{domain.name} ({domain.verified ? t('modal.domainVerified') : t('modal.domainPending')})
                      </option>
                    ))}
                  </Select>
                  {domains.length === 0 && !loadingDomains && (
                    <p className="text-sm text-gray-500 mt-1">
                      {t('modal.noDomains')}{' '}
                      <a href="/dashboard/settings/domain" className="text-[#005fab] hover:underline">
                        {t('modal.addDomain')}
                      </a>
                    </p>
                  )}
                </Field>
              </div>
              <Field className="mt-4">
                <Label>{t('modal.displayName')}</Label>
                <Input
                  value={formData.displayName}
                  onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                  placeholder={t('modal.displayNamePlaceholder')}
                />
              </Field>
            </div>

            {/* Team Assignment */}
            <div>
              <Subheading>{t('modal.teamAssignment')}</Subheading>

              {/* availableToAll Checkbox */}
              <div className="mt-4">
                <CheckboxField>
                  <Checkbox
                    checked={formData.availableToAll || false}
                    onChange={(checked) => {
                      setFormData({
                        ...formData,
                        availableToAll: checked,
                        assignedUserIds: checked ? [] : formData.assignedUserIds
                      });
                    }}
                  />
                  <Label>
                    <UserGroupIcon className="size-4 inline mr-1" />
                    {t('modal.availableToAllLabel')}
                  </Label>
                </CheckboxField>
                <Text className="mt-1 text-sm text-gray-500">
                  {t('modal.availableToAllDescription')}
                </Text>
              </div>

              {/* Individuelle Zuweisungen (nur wenn NOT availableToAll) */}
              {!formData.availableToAll && (
                <>
                  {loadingTeam ? (
                    <div className="mt-4 text-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#005fab] mx-auto"></div>
                    </div>
                  ) : teamMembers.length === 0 ? (
                    <div className="mt-4 text-sm text-gray-500">
                      {t('modal.noTeamMembers')}{' '}
                      <a
                        href="/dashboard/settings/team"
                        className="text-[#005fab] hover:underline"
                      >
                        {t('modal.manageTeam')}
                      </a>
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
                          <Badge color="blue" className="ml-2">{t('modal.ownerBadge')}</Badge>
                        )}
                      </Label>
                    </CheckboxField>
                  ))}
                </CheckboxGroup>
                  )}
                </>
              )}
            </div>

            {/* Features */}
            <div>
              <Subheading>{t('modal.settings')}</Subheading>
              <div className="space-y-3 mt-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">{t('modal.active')}</span>
                  <SimpleSwitch
                    checked={formData.isActive}
                    onChange={(checked) => setFormData({ ...formData, isActive: checked })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">{t('modal.inboxEnabled')}</span>
                  <SimpleSwitch
                    checked={formData.inboxEnabled}
                    onChange={(checked) => setFormData({ ...formData, inboxEnabled: checked })}
                  />
                </div>
              </div>
            </div>
          </div>
        </DialogBody>
        <DialogActions className="px-6 py-4">
          <Button plain onClick={() => {
            setShowAddModal(false);
            setShowEditModal(false);
          }}>
            {tCommon('cancel')}
          </Button>
          <Button
            className="bg-primary hover:bg-primary-hover text-white whitespace-nowrap"
            onClick={handleSaveEmailAddress}
            disabled={saving}
          >
            {saving ? t('modal.saving') : (showAddModal ? tCommon('add') : tCommon('save'))}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={showDeleteModal} onClose={() => setShowDeleteModal(false)}>
        <DialogTitle className="px-6 py-4">{t('deleteModal.title')}</DialogTitle>
        <DialogBody className="p-6">
          <p className="text-sm text-gray-500">
            {t('deleteModal.message', { email: selectedAddress?.email || '' })}
          </p>
        </DialogBody>
        <DialogActions className="px-6 py-4">
          <Button plain onClick={() => setShowDeleteModal(false)}>
            {tCommon('cancel')}
          </Button>
          <Button
            className="bg-red-600 hover:bg-red-700 text-white whitespace-nowrap"
            onClick={handleDeleteConfirm}
            disabled={saving}
          >
            {saving ? t('deleteModal.deleting') : tCommon('delete')}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}