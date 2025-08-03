// src/components/email/SignatureList.tsx
"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dropdown, DropdownButton, DropdownMenu, DropdownItem, DropdownDivider } from '@/components/ui/dropdown';
import { EmailSignature } from '@/types/email-enhanced';
import { SignatureEditor } from './SignatureEditor';
import { 
  PlusIcon, 
  PencilIcon, 
  TrashIcon,
  EllipsisVerticalIcon,
  PencilSquareIcon,
  CheckCircleIcon,
  DocumentDuplicateIcon,
  EyeIcon
} from '@heroicons/react/20/solid';

interface SignatureListProps {
  signatures: EmailSignature[];
  emailAddresses: Array<{ id: string; email: string; displayName: string }>;
  onSave: (signature: Partial<EmailSignature>, id?: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onDuplicate: (id: string) => Promise<void>;
  loading?: boolean;
}

export function SignatureList({
  signatures,
  emailAddresses,
  onSave,
  onDelete,
  onDuplicate,
  loading = false
}: SignatureListProps) {
  const [showEditor, setShowEditor] = useState(false);
  const [editingSignature, setEditingSignature] = useState<EmailSignature | null>(null);
  const [showPreview, setShowPreview] = useState<string | null>(null);

  const handleAdd = () => {
    console.log('🔵 handleAdd clicked - opening editor for new signature');
    setEditingSignature(null);
    setShowEditor(true);
  };

  const handleEdit = (signature: EmailSignature) => {
    console.log('🔵 handleEdit clicked - opening editor for:', signature.name);
    setEditingSignature(signature);
    setShowEditor(true);
  };

  const handleSave = async (data: Partial<EmailSignature>) => {
    console.log('💾 handleSave called with data:', data);
    try {
      await onSave(data, editingSignature?.id);
      setShowEditor(false);
      setEditingSignature(null);
    } catch (error) {
      console.error('❌ Error in handleSave:', error);
      // Don't close modal on error
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Möchten Sie diese Signatur wirklich löschen?')) {
      await onDelete(id);
    }
  };

  const getAssignedEmails = (signature: EmailSignature) => {
    return emailAddresses.filter(email => 
      signature.emailAddressIds?.includes(email.id)
    );
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp || !timestamp.toDate) return 'Unbekannt';
    return timestamp.toDate().toLocaleDateString('de-DE', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const getPreviewHtml = (signature: EmailSignature): string => {
    const previewData = {
      userName: signature.variables?.includeUserName ? 'Max Mustermann' : '',
      userTitle: signature.variables?.includeUserTitle ? 'Geschäftsführer' : '',
      companyName: signature.variables?.includeCompanyName ? 'Musterfirma GmbH' : '',
      phone: signature.variables?.includePhone ? '+49 123 456789' : '',
      website: signature.variables?.includeWebsite ? 'www.musterfirma.de' : '',
      socialLinks: signature.variables?.includeSocialLinks ? 'LinkedIn | Twitter | Facebook' : ''
    };

    let previewContent = signature.content || '';
    
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

  // Debug log für showEditor state
  console.log('🔍 SignatureList render - showEditor:', showEditor);

  if (loading) {
    return (
      <div className="bg-white rounded-lg border p-8 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#005fab] mx-auto"></div>
        <p className="mt-4 text-gray-600">Signaturen werden geladen...</p>
      </div>
    );
  }

  if (signatures.length === 0) {
    return (
      <>
        <div className="bg-white rounded-lg border p-8 text-center">
          <PencilSquareIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Keine Signaturen vorhanden</h3>
          <p className="text-gray-500 mb-4">
            Erstellen Sie professionelle Signaturen für Ihre E-Mails
          </p>
          <Button 
            onClick={handleAdd}
            className="bg-[#005fab] hover:bg-[#004a8c] text-white whitespace-nowrap"
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            Erste Signatur erstellen
          </Button>
        </div>

        {/* Editor Modal - WICHTIG: Außerhalb des divs rendern */}
        {showEditor && (
          <SignatureEditor
            signature={editingSignature}
            isOpen={showEditor}
            onClose={() => {
              console.log('🔴 Closing signature editor');
              setShowEditor(false);
              setEditingSignature(null);
            }}
            onSave={handleSave}
            emailAddresses={emailAddresses}
          />
        )}
      </>
    );
  }

  return (
    <>
      {/* Action Button */}
      <div className="flex justify-end mb-4">
        <Button 
          onClick={handleAdd} 
          className="bg-[#005fab] hover:bg-[#004a8c] text-white whitespace-nowrap"
        >
          <PlusIcon className="h-4 w-4 mr-2" />
          Neue Signatur
        </Button>
      </div>

      {/* Signatures Grid */}
      <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-2">
        {signatures.map((signature) => {
          const assignedEmails = getAssignedEmails(signature);
          
          return (
            <div
              key={signature.id}
              className="relative rounded-lg border bg-white p-6 shadow-sm hover:shadow-md transition-shadow"
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {signature.name}
                    </h3>
                    {signature.isDefault && (
                      <Badge color="blue" className="whitespace-nowrap">
                        <CheckCircleIcon className="h-3 w-3 mr-1" />
                        Standard
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    Erstellt am {formatDate(signature.createdAt)}
                  </p>
                </div>
                
                {/* Actions Dropdown */}
                <Dropdown>
                  <DropdownButton plain className="p-1.5 hover:bg-gray-100 rounded-md">
                    <EllipsisVerticalIcon className="h-4 w-4 text-gray-500" />
                  </DropdownButton>
                  <DropdownMenu anchor="bottom end">
                    <DropdownItem onClick={() => setShowPreview(signature.id!)}>
                      <EyeIcon className="h-4 w-4" />
                      Vorschau
                    </DropdownItem>
                    <DropdownItem onClick={() => handleEdit(signature)}>
                      <PencilIcon className="h-4 w-4" />
                      Bearbeiten
                    </DropdownItem>
                    <DropdownItem onClick={() => onDuplicate(signature.id!)}>
                      <DocumentDuplicateIcon className="h-4 w-4" />
                      Duplizieren
                    </DropdownItem>
                    <DropdownDivider />
                    <DropdownItem 
                      onClick={() => handleDelete(signature.id!)}
                      disabled={signature.isDefault}
                    >
                      <TrashIcon className="h-4 w-4" />
                      <span className="text-red-600">Löschen</span>
                    </DropdownItem>
                  </DropdownMenu>
                </Dropdown>
              </div>

              {/* Features */}
              <div className="mb-4">
                <p className="text-xs text-gray-600 mb-2">Enthaltene Felder:</p>
                <div className="flex flex-wrap gap-1">
                  {signature.variables?.includeUserName && (
                    <Badge color="zinc" className="text-xs whitespace-nowrap">Name</Badge>
                  )}
                  {signature.variables?.includeUserTitle && (
                    <Badge color="zinc" className="text-xs whitespace-nowrap">Titel</Badge>
                  )}
                  {signature.variables?.includeCompanyName && (
                    <Badge color="zinc" className="text-xs whitespace-nowrap">Firma</Badge>
                  )}
                  {signature.variables?.includePhone && (
                    <Badge color="zinc" className="text-xs whitespace-nowrap">Telefon</Badge>
                  )}
                  {signature.variables?.includeWebsite && (
                    <Badge color="zinc" className="text-xs whitespace-nowrap">Website</Badge>
                  )}
                  {signature.variables?.includeSocialLinks && (
                    <Badge color="zinc" className="text-xs whitespace-nowrap">Social Media</Badge>
                  )}
                  {!signature.variables?.includeUserName && 
                   !signature.variables?.includeUserTitle && 
                   !signature.variables?.includeCompanyName && 
                   !signature.variables?.includePhone && 
                   !signature.variables?.includeWebsite && 
                   !signature.variables?.includeSocialLinks && (
                    <span className="text-xs text-gray-400">Keine Standard-Felder</span>
                  )}
                </div>
              </div>

              {/* Assigned Emails */}
              <div className="border-t pt-4">
                <p className="text-xs text-gray-600 mb-2">Zugewiesen an:</p>
                {assignedEmails.length > 0 ? (
                  <div className="space-y-1">
                    {assignedEmails.slice(0, 3).map((email) => (
                      <div key={email.id} className="text-sm text-gray-700">
                        {email.email}
                      </div>
                    ))}
                    {assignedEmails.length > 3 && (
                      <p className="text-xs text-gray-500">
                        +{assignedEmails.length - 3} weitere
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400">Keine E-Mail-Adressen zugewiesen</p>
                )}
              </div>

              {/* Preview Modal */}
              {showPreview === signature.id && (
                <div className="fixed inset-0 z-50 overflow-y-auto">
                  <div className="flex min-h-full items-center justify-center p-4">
                    <div className="fixed inset-0 bg-black bg-opacity-25" onClick={() => setShowPreview(null)} />
                    <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full p-6 z-50">
                      <h3 className="text-lg font-medium mb-4">Signatur-Vorschau: {signature.name}</h3>
                      <div className="bg-gray-50 rounded-lg p-6">
                        <div 
                          className="bg-white rounded border p-4"
                          dangerouslySetInnerHTML={{ 
                            __html: getPreviewHtml(signature)
                          }}
                        />
                      </div>
                      <Button 
                        className="mt-4"
                        plain 
                        onClick={() => setShowPreview(null)}
                      >
                        Schließen
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Editor Modal - Am Ende der Komponente */}
      {showEditor && (
        <SignatureEditor
          signature={editingSignature}
          isOpen={showEditor}
          onClose={() => {
            console.log('🔴 Closing signature editor');
            setShowEditor(false);
            setEditingSignature(null);
          }}
          onSave={handleSave}
          emailAddresses={emailAddresses}
        />
      )}
    </>
  );
}