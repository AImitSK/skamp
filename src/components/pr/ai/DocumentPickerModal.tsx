'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react';
import {
  XMarkIcon,
  DocumentTextIcon,
  MagnifyingGlassIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { documentPickerService } from '@/lib/firebase/document-picker-service';
import type { DocumentContext } from '@/types/ai';

interface DocumentPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (documents: DocumentContext[]) => void;
  organizationId: string;
  dokumenteFolderId: string;
  maxSelection?: number;
}

export default function DocumentPickerModal({
  isOpen,
  onClose,
  onSelect,
  organizationId,
  dokumenteFolderId,
  maxSelection = 3
}: DocumentPickerModalProps) {
  const [documents, setDocuments] = useState<DocumentContext[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Dokumente laden
  useEffect(() => {
    if (isOpen) {
      loadDocuments();
    }
  }, [isOpen, organizationId, dokumenteFolderId]);

  const loadDocuments = async () => {
    setLoading(true);
    setError(null);
    try {
      const docs = await documentPickerService.getProjectDocuments(
        organizationId,
        dokumenteFolderId
      );
      setDocuments(docs);
    } catch (err: any) {
      setError(err.message || 'Fehler beim Laden der Dokumente');
    } finally {
      setLoading(false);
    }
  };

  // Toggle Selektion
  const toggleDocument = (docId: string) => {
    const newSelection = new Set(selectedIds);
    if (newSelection.has(docId)) {
      newSelection.delete(docId);
    } else {
      if (newSelection.size >= maxSelection) {
        alert(`Maximal ${maxSelection} Dokumente erlaubt`);
        return;
      }
      newSelection.add(docId);
    }
    setSelectedIds(newSelection);
  };

  // Dokumente verwenden
  const handleUseDocuments = () => {
    const selected = documents.filter(doc => selectedIds.has(doc.id));

    // Validierung
    const validation = documentPickerService.validateContextSize(selected);
    if (!validation.valid) {
      alert(validation.message);
      return;
    }

    onSelect(selected);
    onClose();
  };

  // Filter Dokumente
  const filteredDocs = documents.filter(doc =>
    doc.fileName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    doc.excerpt.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Ausgewähltes Dokument für Preview
  const previewDoc = documents.find(doc =>
    selectedIds.has(doc.id) && selectedIds.size === 1
  );

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />

      <div className="fixed inset-0 flex items-center justify-center p-4">
        <DialogPanel className="mx-auto max-w-5xl w-full bg-white rounded-lg max-h-[80vh] overflow-hidden flex flex-col">

          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-blue-50 to-white">
            <div>
              <DialogTitle className="text-lg font-semibold text-blue-900">
                Planungsdokumente auswählen
              </DialogTitle>
              <p className="text-sm text-blue-700 mt-1">
                Wähle bis zu {maxSelection} Dokumente als Kontext für die KI-Generierung
              </p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          {/* Search */}
          <div className="p-4 border-b">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Dokumente durchsuchen..."
                className="pl-10"
              />
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-hidden flex">
            {/* Dokumente Liste */}
            <div className="w-1/2 border-r overflow-y-auto p-4">
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#005fab] mx-auto mb-2"></div>
                  <p className="text-gray-600">Dokumente werden geladen...</p>
                </div>
              ) : error ? (
                <div className="text-center py-8 text-red-600">
                  <p>{error}</p>
                  <Button onClick={loadDocuments} className="mt-4">
                    Erneut versuchen
                  </Button>
                </div>
              ) : filteredDocs.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <DocumentTextIcon className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                  <p>Keine Dokumente gefunden</p>
                  {searchTerm && (
                    <p className="text-sm mt-2">Versuche eine andere Suche</p>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredDocs.map((doc) => {
                    const isSelected = selectedIds.has(doc.id);
                    return (
                      <label
                        key={doc.id}
                        className={`
                          block p-4 border rounded-lg cursor-pointer transition-all
                          ${isSelected
                            ? 'border-blue-200 bg-blue-50'
                            : 'border-gray-200 hover:border-blue-100 bg-white'
                          }
                        `}
                      >
                        <div className="flex items-start">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleDocument(doc.id)}
                            className="mt-1 mr-3 accent-[#005fab]"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <h4 className={`font-medium truncate ${isSelected ? 'text-blue-900' : 'text-gray-900'}`}>
                                {doc.fileName.replace('.celero-doc', '')}
                              </h4>
                              {isSelected && (
                                <CheckCircleIcon className="h-5 w-5 text-blue-600 ml-2" />
                              )}
                            </div>
                            <p className={`text-sm mt-1 line-clamp-2 ${isSelected ? 'text-blue-700' : 'text-gray-600'}`}>
                              {doc.excerpt}
                            </p>
                            <div className="flex items-center gap-2 mt-2">
                              <span className={`text-xs px-2 py-0.5 rounded ${isSelected ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                                {doc.wordCount} Wörter
                              </span>
                              <span className={`text-xs ${isSelected ? 'text-blue-600' : 'text-gray-500'}`}>
                                {doc.createdAt.toLocaleDateString('de-DE')}
                              </span>
                            </div>
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Preview Panel */}
            <div className="w-1/2 overflow-y-auto p-4 bg-gray-50">
              {previewDoc ? (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">
                    Vorschau: {previewDoc.fileName.replace('.celero-doc', '')}
                  </h3>
                  <div className="bg-white border rounded-lg p-4 text-sm text-gray-700 whitespace-pre-wrap">
                    {previewDoc.plainText.substring(0, 1000)}
                    {previewDoc.plainText.length > 1000 && '...'}
                  </div>
                  <div className="mt-4 text-sm text-gray-600">
                    <p><strong>Wörter:</strong> {previewDoc.wordCount}</p>
                    <p><strong>Zeichen:</strong> {previewDoc.plainText.length}</p>
                  </div>
                </div>
              ) : selectedIds.size > 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>{selectedIds.size} Dokumente ausgewählt</p>
                  <p className="text-xs mt-2">
                    Wähle ein einzelnes Dokument für die Vorschau
                  </p>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <DocumentTextIcon className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                  <p>Wähle ein Dokument für die Vorschau</p>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="border-t p-4 flex justify-between items-center bg-gradient-to-r from-blue-50 to-white">
            <div className="flex items-center gap-2">
              {selectedIds.size > 0 && (
                <CheckCircleIcon className="h-5 w-5 text-blue-600" />
              )}
              <span className={`text-sm font-medium ${selectedIds.size > 0 ? 'text-blue-900' : 'text-gray-600'}`}>
                {selectedIds.size} von {maxSelection} Dokument{selectedIds.size !== 1 ? 'en' : ''} ausgewählt
              </span>
            </div>
            <div className="flex gap-2">
              <Button plain onClick={onClose}>
                Abbrechen
              </Button>
              <Button
                onClick={handleUseDocuments}
                disabled={selectedIds.size === 0}
                className="bg-[#005fab] hover:bg-[#004a8f] text-white disabled:bg-gray-300"
              >
                Dokumente verwenden
              </Button>
            </div>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  );
}
