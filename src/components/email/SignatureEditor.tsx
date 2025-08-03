// src/components/email/SignatureEditor.tsx
"use client";

import { useState, useEffect } from 'react';
import { Dialog, DialogTitle, DialogBody, DialogActions } from '@/components/ui/dialog';
import { Field, Label, Description } from '@/components/ui/fieldset';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SimpleSwitch } from '@/components/notifications/SimpleSwitch';
import { RichTextEditor } from '@/components/RichTextEditor';
import { EmailSignature } from '@/types/email-enhanced';
import { 
  PencilSquareIcon,
  CheckCircleIcon,
  EyeIcon
} from '@heroicons/react/20/solid';

interface SignatureEditorProps {
  signature: EmailSignature | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Partial<EmailSignature>) => Promise<void>;
  emailAddresses: Array<{ id: string; email: string; displayName: string }>;
}

export function SignatureEditor({
  signature,
  isOpen,
  onClose,
  onSave,
  emailAddresses
}: SignatureEditorProps) {
  const [formData, setFormData] = useState({
    name: '',
    content: '',
    isDefault: false,
    emailAddressIds: [] as string[],
    variables: {
      includeUserName: true,
      includeUserTitle: true,
      includeCompanyName: true,
      includePhone: true,
      includeWebsite: false,
      includeSocialLinks: false
    }
  });
  
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (signature) {
      setFormData({
        name: signature.name,
        content: signature.content,
        isDefault: signature.isDefault,
        emailAddressIds: signature.emailAddressIds || [],
        variables: {
          includeUserName: signature.variables?.includeUserName ?? true,
          includeUserTitle: signature.variables?.includeUserTitle ?? true,
          includeCompanyName: signature.variables?.includeCompanyName ?? true,
          includePhone: signature.variables?.includePhone ?? true,
          includeWebsite: signature.variables?.includeWebsite ?? false,
          includeSocialLinks: signature.variables?.includeSocialLinks ?? false
        }
      });
    } else {
      // Reset für neue Signatur
      setFormData({
        name: '',
        content: '',
        isDefault: false,
        emailAddressIds: [],
        variables: {
          includeUserName: true,
          includeUserTitle: true,
          includeCompanyName: true,
          includePhone: true,
          includeWebsite: false,
          includeSocialLinks: false
        }
      });
    }
  }, [signature]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Name ist erforderlich';
    }
    
    if (!formData.content.trim()) {
      newErrors.content = 'Signatur-Inhalt ist erforderlich';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    
    setSaving(true);
    try {
      await onSave(formData);
      onClose();
    } catch (error) {
      console.error('Fehler beim Speichern der Signatur:', error);
      setErrors({ submit: 'Fehler beim Speichern. Bitte versuchen Sie es erneut.' });
    } finally {
      setSaving(false);
    }
  };

  const toggleEmailAddress = (emailId: string) => {
    setFormData(prev => ({
      ...prev,
      emailAddressIds: prev.emailAddressIds.includes(emailId)
        ? prev.emailAddressIds.filter(id => id !== emailId)
        : [...prev.emailAddressIds, emailId]
    }));
  };

  const getPreviewHtml = () => {
    // Beispiel-Daten für Vorschau
    const previewData = {
      userName: formData.variables.includeUserName ? 'Max Mustermann' : '',
      userTitle: formData.variables.includeUserTitle ? 'Geschäftsführer' : '',
      companyName: formData.variables.includeCompanyName ? 'Musterfirma GmbH' : '',
      phone: formData.variables.includePhone ? '+49 123 456789' : '',
      website: formData.variables.includeWebsite ? 'www.musterfirma.de' : '',
      socialLinks: formData.variables.includeSocialLinks ? 'LinkedIn | Twitter | Facebook' : ''
    };

    let previewContent = formData.content;
    
    // Füge Standard-Felder hinzu wenn aktiviert
    const fields = [];
    if (previewData.userName) fields.push(`<strong>${previewData.userName}</strong>`);
    if (previewData.userTitle) fields.push(previewData.userTitle);
    if (previewData.companyName) fields.push(previewData.companyName);
    if (previewData.phone) fields.push(`Tel: ${previewData.phone}`);
    if (previewData.website) fields.push(`<a href="https://${previewData.website}">${previewData.website}</a>`);
    if (previewData.socialLinks) fields.push(previewData.socialLinks);
    
    if (fields.length > 0) {
      previewContent = `
        <div style="margin-top: 20px; border-top: 2px solid #e5e7eb; padding-top: 20px;">
          ${fields.join('<br>')}
          ${previewContent ? '<br><br>' + previewContent : ''}
        </div>
      `;
    }
    
    return previewContent;
  };

  return (
    <>
      <Dialog open={isOpen} onClose={onClose} className="sm:max-w-4xl">
        <DialogTitle className="px-6 py-4">
          {signature ? 'Signatur bearbeiten' : 'Neue Signatur erstellen'}
        </DialogTitle>
        <DialogBody className="p-6">
          {errors.submit && (
            <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md text-sm">
              {errors.submit}
            </div>
          )}
          
          <div className="space-y-6">
            {/* Name */}
            <Field>
              <Label>Name der Signatur *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="z.B. Standard Signatur"
                className={errors.name ? 'border-red-500' : ''}
              />
              {errors.name && <p className="text-sm text-red-600 mt-1">{errors.name}</p>}
            </Field>

            {/* Standard-Felder */}
            <div className="space-y-4 rounded-lg border p-4 bg-gray-50">
              <h3 className="text-sm font-medium text-gray-900">Standard-Felder</h3>
              <p className="text-xs text-gray-500">
                Wählen Sie aus, welche Informationen automatisch in die Signatur eingefügt werden sollen.
              </p>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">Name des Benutzers</span>
                  <SimpleSwitch
                    checked={formData.variables.includeUserName}
                    onChange={(checked) => setFormData({
                      ...formData,
                      variables: { ...formData.variables, includeUserName: checked }
                    })}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">Titel/Position</span>
                  <SimpleSwitch
                    checked={formData.variables.includeUserTitle}
                    onChange={(checked) => setFormData({
                      ...formData,
                      variables: { ...formData.variables, includeUserTitle: checked }
                    })}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">Firmenname</span>
                  <SimpleSwitch
                    checked={formData.variables.includeCompanyName}
                    onChange={(checked) => setFormData({
                      ...formData,
                      variables: { ...formData.variables, includeCompanyName: checked }
                    })}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">Telefonnummer</span>
                  <SimpleSwitch
                    checked={formData.variables.includePhone}
                    onChange={(checked) => setFormData({
                      ...formData,
                      variables: { ...formData.variables, includePhone: checked }
                    })}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">Website</span>
                  <SimpleSwitch
                    checked={formData.variables.includeWebsite}
                    onChange={(checked) => setFormData({
                      ...formData,
                      variables: { ...formData.variables, includeWebsite: checked }
                    })}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">Social Media Links</span>
                  <SimpleSwitch
                    checked={formData.variables.includeSocialLinks}
                    onChange={(checked) => setFormData({
                      ...formData,
                      variables: { ...formData.variables, includeSocialLinks: checked }
                    })}
                  />
                </div>
              </div>
            </div>

            {/* Signatur Content */}
            <Field>
              <div className="flex items-center justify-between mb-2">
                <Label>Zusätzlicher Inhalt</Label>
                <Button
                  type="button"
                  plain
                  onClick={() => setShowPreview(true)}
                  className="text-sm"
                >
                  <EyeIcon className="h-4 w-4 mr-1" />
                  Vorschau
                </Button>
              </div>
              <RichTextEditor
                content={formData.content}
                onChange={(content) => setFormData({ ...formData, content })}
              />
              <Description className="mt-2">
                Fügen Sie zusätzliche Informationen wie Disclaimer, Auszeichnungen oder Marketing-Texte hinzu.
              </Description>
              {errors.content && <p className="text-sm text-red-600 mt-1">{errors.content}</p>}
            </Field>

            {/* E-Mail-Adressen Zuordnung */}
            {emailAddresses.length > 0 && (
              <div className="space-y-3">
                <span className="text-sm font-medium text-gray-700">Diese Signatur verwenden für</span>
                <div className="max-h-48 overflow-y-auto border rounded-lg p-3 space-y-2">
                  {emailAddresses.map((email) => (
                    <label
                      key={email.id}
                      className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={formData.emailAddressIds.includes(email.id)}
                        onChange={() => toggleEmailAddress(email.id)}
                        className="h-4 w-4 text-[#005fab] rounded"
                      />
                      <div className="flex-1">
                        <p className="text-sm font-medium">{email.email}</p>
                        {email.displayName && (
                          <p className="text-xs text-gray-500">{email.displayName}</p>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
                <Description>
                  Wählen Sie die E-Mail-Adressen aus, die diese Signatur verwenden sollen.
                </Description>
              </div>
            )}

            {/* Standard-Signatur */}
            <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
              <div>
                <span className="text-sm font-medium text-gray-900">Als Standard-Signatur festlegen</span>
                <p className="text-xs text-gray-600 mt-1">
                  Diese Signatur wird automatisch für neue E-Mail-Adressen verwendet
                </p>
              </div>
              <SimpleSwitch
                checked={formData.isDefault}
                onChange={(checked) => setFormData({ ...formData, isDefault: checked })}
              />
            </div>
          </div>
        </DialogBody>
        <DialogActions className="px-6 py-4">
          <Button plain onClick={onClose} disabled={saving}>
            Abbrechen
          </Button>
          <Button
            className="bg-[#005fab] hover:bg-[#004a8c] text-white whitespace-nowrap"
            onClick={handleSubmit}
            disabled={saving}
          >
            {saving ? 'Speichern...' : (signature ? 'Speichern' : 'Signatur erstellen')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Preview Modal */}
      <Dialog open={showPreview} onClose={() => setShowPreview(false)} className="sm:max-w-2xl">
        <DialogTitle className="px-6 py-4">Signatur-Vorschau</DialogTitle>
        <DialogBody className="p-6">
          <div className="bg-gray-50 rounded-lg p-6">
            <p className="text-sm text-gray-600 mb-4">So wird Ihre Signatur in E-Mails aussehen:</p>
            <div 
              className="bg-white rounded border p-4"
              dangerouslySetInnerHTML={{ __html: getPreviewHtml() }}
            />
          </div>
        </DialogBody>
        <DialogActions className="px-6 py-4">
          <Button plain onClick={() => setShowPreview(false)}>
            Schließen
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}