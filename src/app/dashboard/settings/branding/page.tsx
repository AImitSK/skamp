// src/app/dashboard/settings/branding/page.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { useOrganization } from "@/context/OrganizationContext";
import { Heading } from "@/components/ui/heading";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, Label, FieldGroup } from "@/components/ui/fieldset";
import { brandingService } from "@/lib/firebase/branding-service";
import { mediaService } from "@/lib/firebase/media-service";
import { BrandingSettings } from "@/types/branding";
import { teamMemberService } from "@/lib/firebase/organization-service";
import { SettingsNav } from '@/components/SettingsNav';
import { createEmailLogo } from "@/utils/imageHelpers";
import { toastService } from "@/lib/utils/toast";
import {
  BuildingOfficeIcon,
  PhotoIcon,
  TrashIcon,
  ArrowUpTrayIcon
} from "@heroicons/react/24/outline";

export default function BrandingPage() {
  const { user, loading: authLoading } = useAuth();
  const { currentOrganization, loading: orgLoading } = useOrganization();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const organizationId = currentOrganization?.id || '';

  const [formData, setFormData] = useState<Partial<BrandingSettings>>({
    companyName: '',
    address: {
      street: '',
      postalCode: '',
      city: '',
      country: 'Deutschland'
    },
    phone: '',
    email: '',
    website: '',
    showCopyright: true
  });

  // Lade Branding Settings wenn organizationId verfügbar ist
  useEffect(() => {
    // Only load when auth and organization are fully loaded
    if (!authLoading && !orgLoading && user && organizationId) {
      loadBrandingSettings();
    }
  }, [authLoading, orgLoading, user, organizationId]);

  const loadBrandingSettings = async () => {
    if (!user || !organizationId) return;

    try {
      setLoading(true);


      // Versuche Migration wenn nötig
      await brandingService.migrateFromUserToOrg(user.uid, organizationId);

      // Lade Settings mit organizationId
      const settings = await brandingService.getBrandingSettings(organizationId);

      if (settings) {
        setFormData({
          ...settings,
          address: settings.address || {
            street: '',
            postalCode: '',
            city: '',
            country: 'Deutschland'
          }
        });
      }
    } catch (error) {
      toastService.error('Fehler beim Laden der Einstellungen');
    } finally {
      setLoading(false);
    }
  };

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    // Validiere Dateityp
    if (!file.type.startsWith('image/')) {
      toastService.error('Bitte wählen Sie eine Bilddatei aus');
      return;
    }

    // Validiere Dateigröße (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toastService.error('Die Datei darf maximal 5MB groß sein');
      return;
    }

    try {
      setUploadingLogo(true);

      // 1. Lösche altes Logo falls vorhanden (verhindert Datenmüll)
      if (formData.logoAssetId) {
        try {
          await brandingService.removeLogo({
            organizationId,
            userId: user.uid
          });
        } catch (deleteError) {
          console.warn('Altes Logo konnte nicht gelöscht werden:', deleteError);
          // Fahre trotzdem fort mit dem Upload
        }
      }

      // 2. Stelle sicher dass "Branding" Ordner existiert
      const brandingFolderId = await brandingService.ensureBrandingFolder(
        organizationId,
        user.uid
      );

      // 3. Upload Original-Logo in den Branding-Ordner
      const asset = await mediaService.uploadMedia(
        file,
        organizationId,
        brandingFolderId,
        (progress) => {
          // Optional: Progress-Tracking
        }
      );

      // 4. Update das Asset mit einer speziellen Markierung
      await mediaService.updateAsset(asset.id!, {
        tags: ['__branding__'],
        description: 'Firmenlogo für Branding'
      });

      // 5. Erstelle Email-optimierte Version (max 250x100px)
      let emailAsset = null;
      try {
        const emailLogoFile = await createEmailLogo(file);

        // Erstelle neuen File mit eindeutigem Namen für Email-Version
        const originalName = file.name;
        const nameParts = originalName.split('.');
        const extension = nameParts.pop() || 'jpg';
        const baseName = nameParts.join('.');
        const emailFileName = `${baseName}_email.${extension}`;

        // Neues File-Objekt mit eindeutigem Namen
        const emailFileWithNewName = new File([emailLogoFile], emailFileName, {
          type: emailLogoFile.type,
          lastModified: Date.now()
        });

        // Upload Email-Version mit eindeutigem Namen
        emailAsset = await mediaService.uploadMedia(
          emailFileWithNewName,
          organizationId,
          brandingFolderId,
          (progress) => {
            // Optional: Progress-Tracking
          }
        );

        // Markiere Email-Version
        await mediaService.updateAsset(emailAsset.id!, {
          tags: ['__branding__', '__email__'],
          description: 'Firmenlogo für E-Mails (optimiert)'
        });
      } catch (emailError) {
        console.error('Fehler beim Erstellen der Email-Logo-Version:', emailError);
        // Fahre fort auch wenn Email-Version fehlschlägt
      }

      // 6. Speichere beide Logos direkt in Firestore
      await brandingService.updateBrandingSettings(
        {
          logoUrl: asset.downloadUrl,
          logoAssetId: asset.id,
          emailLogoUrl: emailAsset?.downloadUrl || asset.downloadUrl, // Fallback auf Original
          emailLogoAssetId: emailAsset?.id || asset.id
        },
        { organizationId, userId: user.uid }
      );

      // 7. Update lokalen State
      setFormData(prev => ({
        ...prev,
        logoUrl: asset.downloadUrl,
        logoAssetId: asset.id,
        emailLogoUrl: emailAsset?.downloadUrl || asset.downloadUrl,
        emailLogoAssetId: emailAsset?.id || asset.id
      }));

      toastService.success('Logo erfolgreich hochgeladen und gespeichert');
    } catch (error) {
      toastService.error('Fehler beim Hochladen des Logos');
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleRemoveLogo = async () => {

    if (!user || !organizationId) {
      toastService.error('Bitte warten Sie, bis die Daten geladen sind');
      return;
    }

    try {
      // Entferne Logo (löscht Asset + Updated Firestore)
      await brandingService.removeLogo({ organizationId, userId: user.uid });

      // Update lokalen State
      setFormData(prev => ({
        ...prev,
        logoUrl: undefined,
        logoAssetId: undefined,
        emailLogoUrl: undefined,
        emailLogoAssetId: undefined
      }));

      toastService.success('Logo erfolgreich entfernt und gespeichert');
    } catch (error) {
      toastService.error('Fehler beim Entfernen des Logos');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user || !organizationId) {
      toastService.error('Bitte warten Sie, bis die Daten geladen sind');
      return;
    }

    // Validierung
    const validation = brandingService.validateBrandingSettings(formData);
    if (!validation.isValid) {
      setValidationErrors(validation.errors);
      return;
    }

    setValidationErrors({});
    setSaving(true);

    try {
      await brandingService.updateBrandingSettings(
        formData,
        { organizationId: organizationId, userId: user.uid }
      );

      toastService.success('Branding-Einstellungen erfolgreich gespeichert');
    } catch (error) {
      toastService.error('Fehler beim Speichern der Einstellungen');
    } finally {
      setSaving(false);
    }
  };

  // ✨ Umschließendes Layout hinzugefügt
  return (
    <div className="flex flex-col gap-10 lg:flex-row">
      <aside className="w-full lg:w-64 lg:flex-shrink-0">
        <SettingsNav />
      </aside>

      <div className="flex-1">
        {(authLoading || orgLoading || loading) ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#005fab] mx-auto"></div>
              <Text className="mt-4">Lade Einstellungen...</Text>
            </div>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="md:flex md:items-center md:justify-between mb-8">
              <div className="min-w-0 flex-1">
                <Heading level={1}>Branding</Heading>
                <Text className="mt-2 text-gray-600">
                  Hinterlegen Sie Ihre Markeninformationen für geteilte Seiten und Dokumente
                </Text>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="max-w-4xl">
              <div className="bg-white rounded-lg border border-gray-200">
                <div className="p-6 space-y-6">
                  {/* Logo */}
                  <Field>
                    <Label>Firmenlogo</Label>
                    <div className="flex items-start gap-6 mt-2">
                      {formData.logoUrl ? (
                        <div className="relative">
                          <img
                            src={formData.logoUrl}
                            alt="Firmenlogo"
                            className="h-24 w-auto rounded-lg border border-gray-200"
                          />
                          <Button
                            type="button"
                            plain
                            onClick={handleRemoveLogo}
                            className="absolute -top-2 -right-2 p-1 bg-white rounded-full border border-gray-200 hover:bg-gray-50"
                          >
                            <TrashIcon className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      ) : (
                        <div className="h-24 w-24 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center bg-gray-50">
                          <PhotoIcon className="h-8 w-8 text-gray-400" />
                        </div>
                      )}

                      <div className="flex-1">
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleLogoUpload}
                          className="hidden"
                        />
                        <Button
                          type="button"
                          color="secondary"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={uploadingLogo}
                        >
                          <ArrowUpTrayIcon className="h-4 w-4 mr-2" />
                          {uploadingLogo ? 'Wird hochgeladen...' : 'Logo hochladen'}
                        </Button>
                        <Text className="text-xs text-gray-500 mt-1">
                          JPG, PNG oder GIF. Max. 5MB.
                        </Text>
                      </div>
                    </div>
                  </Field>

                  <FieldGroup>
                    {/* Firmenname */}
                    <Field>
                      <Label>Firmenname *</Label>
                      <Input
                        type="text"
                        value={formData.companyName || ''}
                        onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                        placeholder="Ihre Firma GmbH"
                        required
                        className={validationErrors.companyName ? 'border-red-500' : ''}
                      />
                      {validationErrors.companyName && (
                        <Text className="text-sm text-red-600 mt-1">{validationErrors.companyName}</Text>
                      )}
                    </Field>

                    {/* Adresse */}
                    <div className="grid grid-cols-1 gap-4">
                      <Field>
                        <Label>Anschrift</Label>
                        <Input
                          type="text"
                          value={formData.address?.street || ''}
                          onChange={(e) => setFormData({
                            ...formData,
                            address: { ...formData.address!, street: e.target.value }
                          })}
                          placeholder="Musterstraße 123"
                        />
                      </Field>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Field>
                          <Label>PLZ</Label>
                          <Input
                            type="text"
                            value={formData.address?.postalCode || ''}
                            onChange={(e) => setFormData({
                              ...formData,
                              address: { ...formData.address!, postalCode: e.target.value }
                            })}
                            placeholder="12345"
                          />
                        </Field>

                        <Field className="md:col-span-2">
                          <Label>Ort</Label>
                          <Input
                            type="text"
                            value={formData.address?.city || ''}
                            onChange={(e) => setFormData({
                              ...formData,
                              address: { ...formData.address!, city: e.target.value }
                            })}
                            placeholder="Musterstadt"
                          />
                        </Field>
                      </div>
                    </div>

                    {/* Kontaktdaten */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Field>
                        <Label>Allgemeine Telefonnummer</Label>
                        <Input
                          type="tel"
                          value={formData.phone || ''}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          placeholder="+49 123 456789"
                          className={validationErrors.phone ? 'border-red-500' : ''}
                        />
                        {validationErrors.phone && (
                          <Text className="text-sm text-red-600 mt-1">{validationErrors.phone}</Text>
                        )}
                      </Field>

                      <Field>
                        <Label>Allgemeine E-Mail</Label>
                        <Input
                          type="email"
                          value={formData.email || ''}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          placeholder="info@firma.de"
                          className={validationErrors.email ? 'border-red-500' : ''}
                        />
                        {validationErrors.email && (
                          <Text className="text-sm text-red-600 mt-1">{validationErrors.email}</Text>
                        )}
                      </Field>
                    </div>

                    <Field>
                      <Label>Website</Label>
                      <Input
                        type="url"
                        value={formData.website || ''}
                        onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                        placeholder="https://www.ihre-firma.de"
                        className={validationErrors.website ? 'border-red-500' : ''}
                      />
                      {validationErrors.website && (
                        <Text className="text-sm text-red-600 mt-1">{validationErrors.website}</Text>
                      )}
                    </Field>
                  </FieldGroup>

                  {/* Copyright Option */}
                  <div className="border-t pt-6">
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={formData.showCopyright ?? true}
                        onChange={(checked) => setFormData({ ...formData, showCopyright: checked })}
                      />
                      <div>
                        <div className="font-medium text-sm text-gray-900">Copyright-Zeile anzeigen</div>
                        <Text className="text-sm text-gray-600 mt-1">
                          Zeigt "Copyright © {new Date().getFullYear()} {formData.companyName || 'Ihr Firmenname'}. Alle Rechte vorbehalten." in der Fußzeile
                        </Text>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="bg-gray-50 px-6 py-4 rounded-b-lg flex justify-end gap-3">
                  <Button
                    type="button"
                    plain
                    onClick={() => loadBrandingSettings()}
                    disabled={saving}
                  >
                    Zurücksetzen
                  </Button>
                  <Button
                    type="submit"
                    disabled={saving || !organizationId}
                    className="bg-primary hover:bg-primary-hover text-white whitespace-nowrap"
                  >
                    {saving ? 'Wird gespeichert...' : 'Speichern'}
                  </Button>
                </div>
              </div>
            </form>

            {/* Vorschau-Info */}
            <div className="mt-8 max-w-4xl">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex">
                  <BuildingOfficeIcon className="h-5 w-5 text-blue-400 mr-2 flex-shrink-0" />
                  <div className="text-sm text-blue-800">
                    <p className="font-medium mb-1">Verwendung Ihrer Branding-Informationen</p>
                    <p>
                      Diese Informationen werden auf geteilten Seiten (Freigabe-Links, Media-Shares)
                      und in generierten PDFs verwendet, um Ihre Marke zu präsentieren.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}