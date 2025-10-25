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
  XMarkIcon,
  ArrowsPointingOutIcon,
  ArrowsPointingInIcon
} from '@heroicons/react/24/outline';

interface DocumentEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  document?: InternalDocument | null;
  folderId: string;
  organizationId: string;
  projectId: string;
  useStrategyService?: boolean;
  initialContent?: string;
  templateInfo?: {
    type: string;
    name: string;
  };
}

export default function DocumentEditorModal({
  isOpen,
  onClose,
  onSave,
  document,
  folderId,
  organizationId,
  projectId,
  useStrategyService = false,
  initialContent,
  templateInfo
}: DocumentEditorModalProps) {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState<'saved' | 'saving' | 'error'>('saved');
  const [documentContent, setDocumentContent] = useState<DocumentContent | null>(null);
  const [isLocked, setIsLocked] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

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
        class: 'prose prose-lg max-w-none focus:outline-none min-h-[400px] px-4 py-3 text-gray-900 leading-relaxed'
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

  // Lade existierendes Dokument oder Template
  useEffect(() => {
    if (document?.contentRef && isOpen && editor) {
      loadDocument();
    } else if (isOpen && !document && editor) {
      // Neues Dokument - Template oder leer
      if (initialContent && templateInfo) {
        // Template verwenden
        const templateTitle = `${templateInfo.name} - ${new Date().toLocaleDateString()}`;
        setTitle(templateTitle);
        editor.commands.setContent(initialContent);
      } else {
        // Leeres Dokument
        setTitle('');
        editor.commands.setContent('<p>Beginnen Sie hier mit Ihrem Dokument...</p>');
      }
    }
  }, [document, isOpen, editor, initialContent, templateInfo]);

  const loadDocument = async () => {
    if (!document?.contentRef || !user?.uid) return;
    
    console.log('loadDocument started with:', { 
      contentRef: document?.contentRef, 
      userId: user?.uid,
      document: document 
    });
    
    setLoading(true);
    try {
      // Lade Content zuerst
      const content = await documentContentService.loadDocument(document.contentRef);
      console.log('documentContentService.loadDocument result:', content);
      
      if (content) {
        setDocumentContent(content);
        setTitle(document.fileName.replace('.celero-doc', ''));
        
        // Stelle sicher, dass Editor bereit ist und setze Content
        if (editor) {
          console.log('Setting editor content:', content.content);
          editor.commands.setContent(content.content);
          // Double-check: Warten und erneut setzen falls nötig
          setTimeout(() => {
            if (editor && editor.isEmpty) {
              console.log('Editor still empty, retrying setContent...');
              editor.commands.setContent(content.content);
            }
          }, 100);
        } else {
          console.warn('Editor not ready when trying to set content');
        }
        
        console.log('Document loaded successfully, content length:', content.content.length);
        
        // Versuche Dokument zu sperren (optional)
        const locked = await documentContentService.lockDocument(
          document.contentRef,
          user.uid
        );
        setIsLocked(locked);
      } else {
        console.warn('Dokument Content nicht gefunden, erstelle neues Dokument für contentRef:', document.contentRef);
        // Setze Default-Content für existierende "Dateien" ohne Content
        setTitle(document.fileName.replace('.celero-doc', ''));
        editor?.commands.setContent('<p>Beginnen Sie hier mit Ihrem Dokument...</p>');
        setIsLocked(true); // Kann bearbeitet werden
      }
    } catch (error) {
      console.error('Fehler beim Laden des Dokuments:', error);
      console.error('Versuchte contentRef:', document.contentRef);
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

      if (useStrategyService) {
        // Strategie-Service verwenden
        const { strategyDocumentService } = await import('@/lib/firebase/strategy-document-service');

        if (document?.id) {
          // Update existierendes Strategiedokument
          await strategyDocumentService.update(document.id, {
            title: title.trim(),
            content: content,
            updatedAt: new Date()
          });
        } else {
          // Neues Strategiedokument erstellen
          await strategyDocumentService.create({
            projectId,
            title: title.trim(),
            type: 'strategy',
            content: content,
            status: 'draft',
            author: user.uid,
            authorName: user.displayName || user.email || 'Unbekannt',
            templateId: templateInfo?.type,
            templateName: templateInfo?.name
          }, {
            organizationId,
            userId: user.uid
          });
        }
      } else {
        // Standard Document-Content-Service verwenden
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
        }
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
    <Dialog open={isOpen} onClose={handleClose} size={isFullscreen ? "5xl" : "5xl"}>
      {/* Fullscreen Button neben dem Close X */}
      <div className="absolute top-0 right-0 pt-4 pr-14 z-10">
        <button
          type="button"
          onClick={() => setIsFullscreen(!isFullscreen)}
          className="rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
          title={isFullscreen ? 'Vollbild verlassen' : 'Vollbild'}
        >
          <span className="sr-only">{isFullscreen ? 'Vollbild verlassen' : 'Vollbild'}</span>
          {isFullscreen ? (
            <ArrowsPointingInIcon className="h-6 w-6" aria-hidden="true" />
          ) : (
            <ArrowsPointingOutIcon className="h-6 w-6" aria-hidden="true" />
          )}
        </button>
      </div>

      <DialogTitle>
        <div className="flex items-center space-x-3 mb-3">
          <DocumentTextIcon className="w-5 h-5 text-primary" />
          <span className="text-sm font-medium text-zinc-700">
            {document ? 'Dokument bearbeiten' : 'Neues Dokument'}
          </span>
        </div>

        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Dokumenttitel eingeben..."
          className="text-xl font-semibold w-full border-none outline-none bg-transparent"
        />
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
            <div className="prose-custom">
              <EditorContent editor={editor} />
              <style jsx>{`
                .prose-custom :global(.ProseMirror) {
                  font-size: 16px !important;
                  line-height: 1.7 !important;
                  color: #111827 !important;
                }
                .prose-custom :global(.ProseMirror p) {
                  margin-bottom: 1.2em !important;
                  color: #111827 !important;
                }
                .prose-custom :global(.ProseMirror h1) {
                  font-size: 2em !important;
                  font-weight: 700 !important;
                  color: #111827 !important;
                  margin-top: 1.5em !important;
                  margin-bottom: 0.75em !important;
                  line-height: 1.2 !important;
                }
                .prose-custom :global(.ProseMirror h2) {
                  font-size: 1.5em !important;
                  font-weight: 600 !important;
                  color: #111827 !important;
                  margin-top: 1.25em !important;
                  margin-bottom: 0.5em !important;
                  line-height: 1.3 !important;
                }
                .prose-custom :global(.ProseMirror h3) {
                  font-size: 1.25em !important;
                  font-weight: 600 !important;
                  color: #374151 !important;
                  margin-top: 1em !important;
                  margin-bottom: 0.5em !important;
                  line-height: 1.4 !important;
                }
                .prose-custom :global(.ProseMirror ul),
                .prose-custom :global(.ProseMirror ol) {
                  color: #111827 !important;
                  padding-left: 1.5em !important;
                  margin-top: 0.75em !important;
                  margin-bottom: 0.75em !important;
                }
                .prose-custom :global(.ProseMirror ul) {
                  list-style-type: disc !important;
                  list-style-position: outside !important;
                }
                .prose-custom :global(.ProseMirror ol) {
                  list-style-type: decimal !important;
                  list-style-position: outside !important;
                }
                .prose-custom :global(.ProseMirror li) {
                  color: #111827 !important;
                  margin-bottom: 0.25em !important;
                  padding-left: 0.25em !important;
                }
                .prose-custom :global(.ProseMirror ul ul),
                .prose-custom :global(.ProseMirror ol ul) {
                  list-style-type: circle !important;
                  margin-top: 0.25em !important;
                  margin-bottom: 0.25em !important;
                }
                .prose-custom :global(.ProseMirror ul ul ul),
                .prose-custom :global(.ProseMirror ol ul ul) {
                  list-style-type: square !important;
                }
              `}</style>
            </div>
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