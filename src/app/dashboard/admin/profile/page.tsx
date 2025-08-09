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
import { useState, useRef } from "react";
import { PhotoIcon, TrashIcon } from "@heroicons/react/24/outline";

export default function ProfilePage() {
  const { user, uploadProfileImage, deleteProfileImage, getAvatarUrl, getInitials } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [showCropper, setShowCropper] = useState(false);
  const [selectedImageSrc, setSelectedImageSrc] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validierung
    if (!file.type.startsWith('image/')) {
      setMessage({ type: 'error', text: 'Bitte wähle eine Bilddatei aus.' });
      return;
    }

    const maxSize = 10 * 1024 * 1024; // 10MB für Original (wird dann zugeschnitten)
    if (file.size > maxSize) {
      setMessage({ type: 'error', text: 'Datei ist zu groß. Maximum 10MB erlaubt.' });
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
        setMessage({ type: 'success', text: 'Profilbild erfolgreich aktualisiert!' });
        setShowCropper(false);
      } else {
        setMessage({ type: 'error', text: result.error || 'Fehler beim Upload' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Unerwarteter Fehler beim Upload' });
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
        setMessage({ type: 'success', text: 'Profilbild erfolgreich entfernt!' });
      } else {
        setMessage({ type: 'error', text: result.error || 'Fehler beim Löschen' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Unerwarteter Fehler beim Löschen' });
    } finally {
      setDeleting(false);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <div>
      <Heading>Profil</Heading>
      <Text className="mt-2">
        Verwalte deine persönlichen Informationen und Einstellungen
      </Text>

      <Divider className="my-8" />

      {/* Avatar Bereich */}
      <div className="flex items-center gap-6 mb-8">
        <Avatar
          className="size-20"
          src={getAvatarUrl()}
          initials={getInitials()}
        />
        <div className="flex-1">
          <Subheading level={3}>Profilbild</Subheading>
          <Text className="mt-1 text-zinc-500 dark:text-zinc-400">
            JPG, PNG oder WebP. Maximal 10MB. Wird automatisch quadratisch zugeschnitten.
          </Text>
          
          {/* Upload & Delete Buttons */}
          <div className="flex gap-3 mt-4">
            <Button 
              className="bg-[#005fab] hover:bg-[#004a8c] px-6 py-2"
              onClick={triggerFileInput}
              disabled={uploading}
            >
              <PhotoIcon className="h-4 w-4 mr-2" />
              {uploading ? 'Lädt hoch...' : user?.photoURL ? 'Ändern' : 'Hochladen'}
            </Button>
            
            {user?.photoURL && (
              <Button 
                className="!bg-white !border !border-gray-300 !text-gray-700 hover:!bg-gray-100 px-4 py-2"
                onClick={handleDeleteImage}
                disabled={deleting}
              >
                <TrashIcon className="h-4 w-4 mr-2" />
                {deleting ? 'Löscht...' : 'Entfernen'}
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

      {/* Formular */}
      <FieldGroup>
        <Field>
          <Label>E-Mail-Adresse</Label>
          <Input type="email" value={user?.email || ""} disabled />
          <Text className="mt-2">
            Deine E-Mail-Adresse kann nicht geändert werden
          </Text>
        </Field>

        <Field>
          <Label>Anzeigename</Label>
          <Input
            type="text"
            defaultValue={user?.displayName || ""}
            placeholder="Dein Name"
          />
        </Field>

        <Field>
          <Label>Telefonnummer</Label>
          <Input type="tel" placeholder="+49 123 456789" />
        </Field>
      </FieldGroup>

      <div className="mt-8 flex gap-3">
        <Button className="bg-[#005fab] hover:bg-[#004a8c] px-6 py-2">Änderungen speichern</Button>
        <Button className="!bg-white !border !border-gray-300 !text-gray-700 hover:!bg-gray-100 px-4 py-2">Abbrechen</Button>
      </div>

      <Divider className="my-8" />

      {/* Account-Informationen */}
      <div>
        <Subheading level={3}>Account-Informationen</Subheading>
        <div className="mt-4 space-y-2 text-sm">
          <div>
            <span className="text-zinc-500 dark:text-zinc-400">User ID:</span>{" "}
            <span className="font-mono text-xs">{user?.uid}</span>
          </div>
          <div>
            <span className="text-zinc-500 dark:text-zinc-400">
              E-Mail verifiziert:
            </span>{" "}
            {user?.emailVerified ? "✓ Ja" : "✗ Nein"}
          </div>
        </div>
      </div>

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