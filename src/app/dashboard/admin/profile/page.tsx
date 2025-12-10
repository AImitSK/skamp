// src/app/dashboard/admin/profile/page.tsx
"use client";

import { useAuth } from "@/context/AuthContext";
import { Heading, Subheading } from "@/components/ui/heading";
import { Text } from "@/components/ui/text";
import { Field, Label, FieldGroup } from "@/components/ui/fieldset";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Divider } from "@/components/ui/divider";
import { Avatar } from "@/components/ui/avatar";
import { ImageCropper } from "@/components/ui/image-cropper";
import { EmailVerification } from "@/components/profile/EmailVerification";
import { PasswordChange } from "@/components/profile/PasswordChange";
import { TwoFactorSettings } from "@/components/profile/TwoFactorSettings";
import { SocialProviders } from "@/components/profile/SocialProviders";
import { DeleteAccount } from "@/components/profile/DeleteAccount";
import { useState, useRef, useEffect } from "react";
import { PhotoIcon, TrashIcon } from "@heroicons/react/24/outline";
import { useOrganization } from "@/context/OrganizationContext";
import { useTranslations } from 'next-intl';

export default function ProfilePage() {
  const t = useTranslations('admin.profile');
  const { user, uploadProfileImage, deleteProfileImage, getAvatarUrl, getInitials, updateUserProfile } = useAuth();
  const { currentOrganization } = useOrganization();
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [showCropper, setShowCropper] = useState(false);
  const [selectedImageSrc, setSelectedImageSrc] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  
  // Form states
  const [formData, setFormData] = useState({
    displayName: user?.displayName || '',
    phoneNumber: ''
  });

  // Lade Benutzerprofil aus Firestore
  useEffect(() => {
    const loadUserProfile = async () => {
      if (user) {
        const { userService } = await import('@/lib/firebase/user-service');
        const profile = await userService.getProfile(user.uid);
        if (profile) {
          setUserProfile(profile);
          setFormData({
            displayName: profile.displayName || user.displayName || '',
            phoneNumber: profile.phoneNumber || ''
          });
        }
      }
    };
    loadUserProfile();
  }, [user]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validierung
    if (!file.type.startsWith('image/')) {
      setMessage({ type: 'error', text: t('avatar.errors.invalidType') });
      return;
    }

    const maxSize = 10 * 1024 * 1024; // 10MB für Original (wird dann zugeschnitten)
    if (file.size > maxSize) {
      setMessage({ type: 'error', text: t('avatar.errors.tooLarge') });
      return;
    }

    // Bild als Data URL laden für Cropper
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        setSelectedImageSrc(e.target.result as string);
        setShowCropper(true);
        setMessage(null);
      }
    };
    reader.readAsDataURL(file);

    // Input zurücksetzen
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleCropComplete = async (croppedFile: File) => {
    setUploading(true);

    try {
      const result = await uploadProfileImage(croppedFile);

      if (result.success) {
        setMessage({ type: 'success', text: t('avatar.uploadSuccess') });
        setShowCropper(false);
      } else {
        setMessage({ type: 'error', text: result.error || t('avatar.errors.uploadFailed') });
      }
    } catch (error) {
      setMessage({ type: 'error', text: t('avatar.errors.uploadUnexpected') });
    } finally {
      setUploading(false);
    }
  };

  const handleCropCancel = () => {
    setShowCropper(false);
    setSelectedImageSrc('');
  };

  const handleDeleteImage = async () => {
    if (!user?.photoURL) return;

    setDeleting(true);
    setMessage(null);

    try {
      const result = await deleteProfileImage();

      if (result.success) {
        setMessage({ type: 'success', text: t('avatar.deleteSuccess') });
      } else {
        setMessage({ type: 'error', text: result.error || t('avatar.errors.deleteFailed') });
      }
    } catch (error) {
      setMessage({ type: 'error', text: t('avatar.errors.deleteUnexpected') });
    } finally {
      setDeleting(false);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    setMessage(null);

    try {
      await updateUserProfile({
        displayName: formData.displayName,
        phoneNumber: formData.phoneNumber
      });

      setMessage({ type: 'success', text: t('personalInfo.saveSuccess') });
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : t('personalInfo.errors.saveFailed')
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      displayName: user?.displayName || '',
      phoneNumber: ''
    });
    setMessage(null);
  };

  return (
    <div>
      <Heading>{t('title')}</Heading>
      <Text className="mt-2">
        {t('description')}
      </Text>

      <Divider className="my-8" />

      {/* Avatar InfoCard */}
      <div className="rounded-lg border bg-white overflow-hidden mb-8">
        <div className="px-4 py-3 bg-gray-50">
          <Subheading level={3} className="text-gray-900">{t('avatar.title')}</Subheading>
        </div>
        <div className="p-6">
          <div className="flex items-center gap-6">
            <Avatar
              className="size-20"
              src={getAvatarUrl()}
              initials={getInitials()}
            />
            <div className="flex-1">
              <Text className="text-zinc-500 dark:text-zinc-400">
                {t('avatar.hint')}
              </Text>
              
              {/* Upload & Delete Buttons */}
              <div className="flex gap-3 mt-4">
                <Button
                  className="bg-[#005fab] hover:bg-[#004a8c] px-6 py-2"
                  onClick={triggerFileInput}
                  disabled={uploading}
                >
                  <PhotoIcon className="h-4 w-4 mr-2" />
                  {uploading ? t('avatar.uploading') : user?.photoURL ? t('avatar.change') : t('avatar.upload')}
                </Button>

                {user?.photoURL && (
                  <Button
                    className="!bg-white !border !border-gray-300 !text-gray-700 hover:!bg-gray-100 px-4 py-2"
                    onClick={handleDeleteImage}
                    disabled={deleting}
                  >
                    <TrashIcon className="h-4 w-4 mr-2" />
                    {deleting ? t('avatar.deleting') : t('avatar.remove')}
                  </Button>
                )}
              </div>

              {/* Hidden File Input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleFileSelect}
                className="hidden"
              />

              {/* Success/Error Message */}
              {message && (
                <div className={`mt-3 text-sm ${
                  message.type === 'success' 
                    ? 'text-green-600 dark:text-green-400' 
                    : 'text-red-600 dark:text-red-400'
                }`}>
                  {message.text}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Profil-Daten InfoCard */}
      <div className="rounded-lg border bg-white overflow-hidden mb-8">
        <div className="px-4 py-3 bg-gray-50">
          <Subheading level={3} className="text-gray-900">{t('personalInfo.title')}</Subheading>
        </div>
        <div className="p-6">
          <FieldGroup>
            <Field>
              <Label>{t('personalInfo.email')}</Label>
              <Input type="email" value={user?.email || ""} disabled autoComplete="email" />
              <Text className="mt-2">
                {t('personalInfo.emailHint')}
              </Text>
            </Field>

            <Field>
              <Label>{t('personalInfo.displayName')}</Label>
              <Input
                type="text"
                value={formData.displayName}
                onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                placeholder={t('personalInfo.displayNamePlaceholder')}
                autoComplete="name"
              />
            </Field>

            <Field>
              <Label>{t('personalInfo.phoneNumber')}</Label>
              <Input
                type="tel"
                value={formData.phoneNumber}
                onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                placeholder={t('personalInfo.phoneNumberPlaceholder')}
                autoComplete="tel"
              />
            </Field>
          </FieldGroup>

          <div className="mt-8 flex gap-3">
            <Button
              className="bg-[#005fab] hover:bg-[#004a8c] px-6 py-2"
              onClick={handleSaveProfile}
              disabled={saving}
            >
              {saving ? t('personalInfo.saving') : t('personalInfo.save')}
            </Button>
            <Button
              className="!bg-white !border !border-gray-300 !text-gray-700 hover:!bg-gray-100 px-4 py-2"
              onClick={handleCancel}
              disabled={saving}
            >
              {t('personalInfo.cancel')}
            </Button>
          </div>
        </div>
      </div>

      <Divider className="my-8" />

      {/* E-Mail-Verifizierung */}
      <EmailVerification />

      <Divider className="my-8" />

      {/* Passwort ändern */}
      <PasswordChange />

      <Divider className="my-8" />

      {/* 2FA Einstellungen */}
      <TwoFactorSettings />

      <Divider className="my-8" />

      {/* Social Login Provider */}
      <SocialProviders />

      <Divider className="my-8" />

      {/* Account-Informationen InfoCard */}
      <div className="rounded-lg border bg-white overflow-hidden">
        <div className="px-4 py-3 bg-gray-50">
          <Subheading level={3} className="text-gray-900">{t('accountInfo.title')}</Subheading>
        </div>
        <div className="p-6">
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-zinc-500 dark:text-zinc-400">{t('accountInfo.userId')}</span>
              <span className="font-mono text-xs">{user?.uid}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500 dark:text-zinc-400">{t('accountInfo.role')}</span>
              <span className="font-medium">
                {currentOrganization?.role === 'owner' && t('accountInfo.roles.owner')}
                {currentOrganization?.role === 'admin' && t('accountInfo.roles.admin')}
                {currentOrganization?.role === 'member' && t('accountInfo.roles.member')}
                {!currentOrganization?.role && t('accountInfo.roles.notAssigned')}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500 dark:text-zinc-400">{t('accountInfo.organization')}</span>
              <span className="font-medium">{currentOrganization?.name || t('accountInfo.organizationNone')}</span>
            </div>
          </div>
        </div>
      </div>

      <Divider className="my-8" />

      {/* Account löschen */}
      <DeleteAccount />

      {/* Image Cropper Modal */}
      {showCropper && (
        <ImageCropper
          src={selectedImageSrc}
          onCropComplete={handleCropComplete}
          onCancel={handleCropCancel}
          isProcessing={uploading}
        />
      )}
    </div>
  );
}