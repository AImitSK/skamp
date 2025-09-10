// src/components/projects/DocumentEditorModal.tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import TextAlign from '@tiptap/extension-text-align';
import Underline from '@tiptap/extension-underline';
import { debounce } from 'lodash';

import { Dialog, DialogTitle, DialogBody, DialogActions } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/context/AuthContext';
import { documentContentService } from '@/lib/firebase/document-content-service';
import type { DocumentContent, InternalDocument } from '@/types/document-content';

import {
  BoldIcon,
  ItalicIcon,
  UnderlineIcon,
  StrikethroughIcon,
  ListBulletIcon,
  QueueListIcon as ListOrderedIcon,
  CodeBracketIcon,
  ArrowUturnLeftIcon,
  ArrowUturnRightIcon,
  DocumentTextIcon,
  CheckIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

interface DocumentEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  document?: InternalDocument | null;
  folderId: string;
  organizationId: string;
  projectId: string;
}

export default function DocumentEditorModal({
  isOpen,
  onClose,
  onSave,
  document,
  folderId,
  organizationId,
  projectId
}: DocumentEditorModalProps) {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState<'saved' | 'saving' | 'error'>('saved');
  const [documentContent, setDocumentContent] = useState<DocumentContent | null>(null);
  const [isLocked, setIsLocked] = useState(false);

  // Tiptap Editor Setup
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3]
        }
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-blue-600 underline'
        }
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph']
      })
    ],
    content: '<p>Beginnen Sie hier mit Ihrem Dokument...</p>',
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none min-h-[400px] px-4 py-3'
      }
    },
    onUpdate: ({ editor }) => {
      // Auto-Save nur wenn Dokument existiert
      if (document?.contentRef && !loading) {
        debouncedAutoSave(editor.getHTML());
      }
    }
  });

  // Auto-Save Funktion (alle 2 Sekunden)
  const debouncedAutoSave = useCallback(
    debounce(async (content: string) => {
      if (!document?.contentRef || !user?.uid) return;
      
      setAutoSaveStatus('saving');
      try {
        await documentContentService.updateDocument(
          document.contentRef,
          content,
          user.uid,
          false // Keine neue Version bei Auto-Save
        );
        setAutoSaveStatus('saved');
      } catch (error) {
        console.error('Auto-Save fehlgeschlagen:', error);
        setAutoSaveStatus('error');
      }
    }, 2000),
    [document?.contentRef, user?.uid]
  );

  // Lade existierendes Dokument
  useEffect(() => {
    if (document?.contentRef && isOpen) {
      loadDocument();
    } else if (isOpen && !document) {
      // Neues Dokument
      setTitle('Neues Dokument');
      editor?.commands.setContent('<p>Beginnen Sie hier mit Ihrem Dokument...</p>');
    }
  }, [document, isOpen]);

  const loadDocument = async () => {
    if (!document?.contentRef || !user?.uid) return;
    
    setLoading(true);
    try {
      // Lade Content zuerst
      const content = await documentContentService.loadDocument(document.contentRef);
      if (content) {
        setDocumentContent(content);
        setTitle(document.fileName.replace('.celero-doc', ''));
        editor?.commands.setContent(content.content);
        
        // Versuche Dokument zu sperren (optional)
        const locked = await documentContentService.lockDocument(
          document.contentRef,
          user.uid
        );
        setIsLocked(locked);
      } else {
        console.warn('Dokument Content nicht gefunden, erstelle neues Dokument');
        // Setze Default-Content für existierende "Dateien" ohne Content
        setTitle(document.fileName.replace('.celero-doc', ''));
        editor?.commands.setContent('<p>Beginnen Sie hier mit Ihrem Dokument...</p>');
        setIsLocked(true); // Kann bearbeitet werden
      }
    } catch (error) {
      console.error('Fehler beim Laden des Dokuments:', error);
      // Fallback: Leeres Dokument anzeigen
      setTitle(document.fileName.replace('.celero-doc', ''));
      editor?.commands.setContent('<p>Fehler beim Laden. Beginnen Sie hier...</p>');
      setIsLocked(true);
    } finally {
      setLoading(false);
    }
  };

  // Speichern Handler
  const handleSave = async () => {
    if (!editor || !title.trim() || !user?.uid) return;
    
    setSaving(true);
    try {
      const content = editor.getHTML();
      
      if (document?.contentRef) {
        // Update existierendes Dokument
        await documentContentService.updateDocument(
          document.contentRef,
          content,
          user.uid,
          true // Neue Version erstellen
        );
      } else {
        // Neues Dokument erstellen
        const { documentId, assetId } = await documentContentService.createDocument(
          content,
          {
            fileName: title,
            folderId,
            organizationId,
            projectId,
            userId: user.uid,
            fileType: 'celero-doc'
          }
        );
        console.log('Dokument erstellt:', { documentId, assetId });
      }
      
      onSave();
      handleClose();
    } catch (error) {
      console.error('Fehler beim Speichern:', error);
      alert('Fehler beim Speichern des Dokuments');
    } finally {
      setSaving(false);
    }
  };

  // Close Handler mit Cleanup
  const handleClose = async () => {
    if (document?.contentRef && user?.uid && isLocked) {
      // Dokument entsperren (nur wenn es wirklich gesperrt war)
      try {
        await documentContentService.unlockDocument(document.contentRef, user.uid);
      } catch (error) {
        console.warn('Fehler beim Entsperren beim Schließen:', error);
        // Continue with closing - don't block the UI
      }
    }
    
    // Reset States
    setTitle('');
    setDocumentContent(null);
    setIsLocked(false);
    editor?.commands.clearContent();
    
    onClose();
  };

  // Toolbar Button Component
  const ToolbarButton = ({ onClick, active = false, disabled = false, children, title }: any) => (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`p-1.5 rounded hover:bg-gray-100 transition-colors ${
        active ? 'bg-gray-200 text-blue-600' : 'text-gray-700'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      {children}
    </button>
  );

  if (!editor) return null;

  return (
    <Dialog open={isOpen} onClose={handleClose} size="5xl">
      <DialogTitle>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <DocumentTextIcon className="w-5 h-5 text-blue-600" />
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Dokumenttitel eingeben..."
              className="text-xl font-semibold border-none outline-none bg-transparent"
            />
          </div>
          
          <div className="flex items-center space-x-2">
            {/* Auto-Save Status */}
            {document && (
              <Badge color={
                autoSaveStatus === 'saved' ? 'green' : 
                autoSaveStatus === 'saving' ? 'yellow' : 'red'
              }>
                {autoSaveStatus === 'saved' && <CheckIcon className="w-3 h-3 mr-1" />}
                {autoSaveStatus === 'saved' ? 'Gespeichert' : 
                 autoSaveStatus === 'saving' ? 'Speichert...' : 'Fehler'}
              </Badge>
            )}
            
            {/* Version Info */}
            {documentContent && (
              <Badge color="gray">
                Version {documentContent.version}
              </Badge>
            )}
          </div>
        </div>
      </DialogTitle>
      
      <DialogBody className="p-0">
        {/* Toolbar */}
        <div className="border-b px-4 py-2 flex items-center space-x-1 flex-wrap">
          {/* Text Formatierung */}
          <div className="flex items-center space-x-1 pr-2 border-r">
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleBold().run()}
              active={editor.isActive('bold')}
              title="Fett (Strg+B)"
            >
              <BoldIcon className="w-4 h-4" />
            </ToolbarButton>
            
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleItalic().run()}
              active={editor.isActive('italic')}
              title="Kursiv (Strg+I)"
            >
              <ItalicIcon className="w-4 h-4" />
            </ToolbarButton>
            
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleUnderline().run()}
              active={editor.isActive('underline')}
              title="Unterstrichen (Strg+U)"
            >
              <UnderlineIcon className="w-4 h-4" />
            </ToolbarButton>
            
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleStrike().run()}
              active={editor.isActive('strike')}
              title="Durchgestrichen"
            >
              <StrikethroughIcon className="w-4 h-4" />
            </ToolbarButton>
          </div>
          
          {/* Überschriften */}
          <div className="flex items-center space-x-1 px-2 border-r">
            <select
              onChange={(e) => {
                const level = parseInt(e.target.value);
                if (level === 0) {
                  editor.chain().focus().setParagraph().run();
                } else {
                  editor.chain().focus().toggleHeading({ level: level as 1 | 2 | 3 }).run();
                }
              }}
              className="text-sm border rounded px-2 py-1"
              value={
                editor.isActive('heading', { level: 1 }) ? 1 :
                editor.isActive('heading', { level: 2 }) ? 2 :
                editor.isActive('heading', { level: 3 }) ? 3 : 0
              }
            >
              <option value={0}>Normal</option>
              <option value={1}>Überschrift 1</option>
              <option value={2}>Überschrift 2</option>
              <option value={3}>Überschrift 3</option>
            </select>
          </div>
          
          {/* Listen */}
          <div className="flex items-center space-x-1 px-2 border-r">
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              active={editor.isActive('bulletList')}
              title="Aufzählungsliste"
            >
              <ListBulletIcon className="w-4 h-4" />
            </ToolbarButton>
            
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              active={editor.isActive('orderedList')}
              title="Nummerierte Liste"
            >
              <ListOrderedIcon className="w-4 h-4" />
            </ToolbarButton>
          </div>
          
          {/* Code */}
          <div className="flex items-center space-x-1 px-2 border-r">
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleCodeBlock().run()}
              active={editor.isActive('codeBlock')}
              title="Code-Block"
            >
              <CodeBracketIcon className="w-4 h-4" />
            </ToolbarButton>
          </div>
          
          {/* Undo/Redo */}
          <div className="flex items-center space-x-1 px-2">
            <ToolbarButton
              onClick={() => editor.chain().focus().undo().run()}
              disabled={!editor.can().undo()}
              title="Rückgängig (Strg+Z)"
            >
              <ArrowUturnLeftIcon className="w-4 h-4" />
            </ToolbarButton>
            
            <ToolbarButton
              onClick={() => editor.chain().focus().redo().run()}
              disabled={!editor.can().redo()}
              title="Wiederholen (Strg+Y)"
            >
              <ArrowUturnRightIcon className="w-4 h-4" />
            </ToolbarButton>
          </div>
        </div>
        
        {/* Editor Content */}
        <div className="min-h-[500px] max-h-[600px] overflow-y-auto bg-white">
          {loading ? (
            <div className="flex items-center justify-center h-96">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <EditorContent editor={editor} />
          )}
        </div>
        
        {/* Warnhinweis wenn nicht gesperrt */}
        {document && !isLocked && (
          <div className="bg-yellow-50 border-t border-yellow-200 px-4 py-2">
            <Text className="text-sm text-yellow-800">
              ⚠️ Dokument wird möglicherweise von einem anderen Benutzer bearbeitet
            </Text>
          </div>
        )}
      </DialogBody>
      
      <DialogActions>
        <Button plain onClick={handleClose}>
          Abbrechen
        </Button>
        <Button
          onClick={handleSave}
          disabled={saving || !title.trim() || loading}
        >
          {saving ? 'Speichert...' : (document ? 'Speichern' : 'Erstellen')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}