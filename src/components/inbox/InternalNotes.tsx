// src/components/inbox/InternalNotes.tsx
"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/button';
import { Badge } from '@/components/badge';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot,
  addDoc,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { db } from '@/lib/firebase/client-init';
import { useAuth } from '@/context/AuthContext';
import { notificationService } from '@/lib/email/notification-service-enhanced';
import { 
  ChatBubbleLeftIcon,
  PaperAirplaneIcon,
  AtSymbolIcon
} from '@heroicons/react/20/solid';
import clsx from 'clsx';
import format from 'date-fns/format';

interface InternalNote {
  id?: string;
  threadId: string;
  emailId?: string;
  content: string;
  userId: string;
  userName: string;
  userEmail: string;
  mentions: string[]; // User IDs die erwähnt wurden
  createdAt: Timestamp;
  organizationId: string;
}

interface InternalNotesProps {
  threadId: string;
  emailId?: string;
  organizationId: string;
  teamMembers?: Array<{
    id: string;
    userId: string;
    displayName: string;
    email: string;
  }>;
}

export function InternalNotes({
  threadId,
  emailId,
  organizationId,
  teamMembers = []
}: InternalNotesProps) {
  const { user } = useAuth();
  const [notes, setNotes] = useState<InternalNote[]>([]);
  const [newNote, setNewNote] = useState('');
  const [loading, setLoading] = useState(true);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionSearch, setMentionSearch] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);

  // Load notes in real-time
  useEffect(() => {
    if (!threadId) return;

    const notesQuery = query(
      collection(db, 'email_notes'),
      where('threadId', '==', threadId),
      where('organizationId', '==', organizationId),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(
      notesQuery,
      (snapshot) => {
        const notesData: InternalNote[] = [];
        snapshot.forEach((doc) => {
          notesData.push({ id: doc.id, ...doc.data() } as InternalNote);
        });
        setNotes(notesData);
        setLoading(false);
      },
      (error) => {
        console.error('Error loading notes:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [threadId, organizationId]);

  // Handle @mentions
  const handleNoteChange = (value: string) => {
    setNewNote(value);
    
    // Check for @ symbol
    const lastAtIndex = value.lastIndexOf('@');
    if (lastAtIndex !== -1) {
      const textAfterAt = value.substring(lastAtIndex + 1);
      const spaceIndex = textAfterAt.indexOf(' ');
      
      if (spaceIndex === -1) {
        // Still typing the mention
        setMentionSearch(textAfterAt.toLowerCase());
        setShowMentions(true);
      } else {
        setShowMentions(false);
      }
    } else {
      setShowMentions(false);
    }
  };

  // Insert mention
  const insertMention = (member: any) => {
    const lastAtIndex = newNote.lastIndexOf('@');
    const beforeAt = newNote.substring(0, lastAtIndex);
    const afterAt = newNote.substring(lastAtIndex + 1);
    const spaceIndex = afterAt.indexOf(' ');
    const afterMention = spaceIndex !== -1 ? afterAt.substring(spaceIndex) : '';
    
    setNewNote(`${beforeAt}@${member.displayName} ${afterMention}`);
    setShowMentions(false);
  };

  // Extract mentions from text
  const extractMentions = (text: string): string[] => {
    const mentionRegex = /@(\w+(?:\s\w+)?)/g;
    const mentions = [];
    let match;
    
    while ((match = mentionRegex.exec(text)) !== null) {
      const mentionName = match[1];
      const member = teamMembers.find(m => 
        m.displayName.toLowerCase() === mentionName.toLowerCase()
      );
      if (member) {
        mentions.push(member.userId);
      }
    }
    
    return mentions;
  };

  // Submit note
  const handleSubmit = async () => {
    if (!newNote.trim() || !user) return;

    try {
      const mentions = extractMentions(newNote);
      
      const noteData: Omit<InternalNote, 'id'> = {
        threadId,
        emailId,
        content: newNote,
        userId: user.uid,
        userName: user.displayName || user.email || 'Unbekannt',
        userEmail: user.email || '',
        mentions,
        createdAt: serverTimestamp() as Timestamp,
        organizationId
      };

      await addDoc(collection(db, 'email_notes'), noteData);
      
      // Send notifications for mentions
      if (mentions.length > 0) {
        const userName = user.displayName || user.email || 'Unbekannt';
        await notificationService.sendMentionNotification(
          threadId,
          emailId,
          mentions,
          user.uid,
          userName,
          organizationId,
          newNote
        );
      }
      
      setNewNote('');
    } catch (error) {
      console.error('Error adding note:', error);
      alert('Fehler beim Speichern der Notiz');
    }
  };

  // Format note content with highlighted mentions
  const formatNoteContent = (content: string) => {
    const mentionRegex = /@(\w+(?:\s\w+)?)/g;
    const parts = content.split(mentionRegex);
    
    return parts.map((part, index) => {
      if (index % 2 === 1) {
        // This is a mention
        return (
          <span key={index} className="text-[#005fab] font-medium">
            @{part}
          </span>
        );
      }
      return part;
    });
  };

  // Filtered team members for mentions
  const filteredMembers = teamMembers.filter(member =>
    member.displayName.toLowerCase().includes(mentionSearch)
  );

  const noteCount = notes.length;

  return (
    <div className="border-t border-gray-200 bg-gray-50">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-6 py-3 flex items-center justify-between hover:bg-gray-100 transition-colors"
      >
        <div className="flex items-center gap-2">
          <ChatBubbleLeftIcon className="h-5 w-5 text-gray-400" />
          <span className="font-medium text-sm text-gray-700">
            Interne Notizen
          </span>
          {noteCount > 0 && (
            <Badge color="zinc" className="text-xs whitespace-nowrap">
              {noteCount}
            </Badge>
          )}
        </div>
        <span className="text-xs text-gray-500">
          {isExpanded ? 'Einklappen' : 'Ausklappen'}
        </span>
      </button>

      {/* Content */}
      {isExpanded && (
        <div className="px-6 pb-4">
          {/* New Note Input */}
          <div className="mb-4 relative">
            <textarea
              value={newNote}
              onChange={(e) => handleNoteChange(e.target.value)}
              placeholder="Interne Notiz hinzufügen... (@Name für Erwähnung)"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#005fab] focus:border-transparent resize-none"
              rows={3}
            />
            
            {/* Mention Dropdown */}
            {showMentions && filteredMembers.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
                {filteredMembers.map((member) => (
                  <button
                    key={member.userId}
                    onClick={() => insertMention(member)}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                  >
                    <AtSymbolIcon className="h-4 w-4 text-gray-400" />
                    <div>
                      <div className="font-medium text-gray-900">
                        {member.displayName}
                      </div>
                      <div className="text-xs text-gray-500">
                        {member.email}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
            
            {/* Submit Button */}
            <div className="flex justify-end mt-2">
              <Button
                onClick={handleSubmit}
                disabled={!newNote.trim()}
                className="bg-[#005fab] hover:bg-[#004a8c] text-white text-sm"
              >
                <PaperAirplaneIcon className="h-4 w-4 mr-1.5" />
                Notiz speichern
              </Button>
            </div>
          </div>

          {/* Notes List */}
          {loading ? (
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#005fab] mx-auto"></div>
            </div>
          ) : notes.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">
              Noch keine internen Notizen vorhanden
            </p>
          ) : (
            <div className="space-y-3">
              {notes.map((note) => (
                <div
                  key={note.id}
                  className="bg-white p-3 rounded-lg border border-gray-200"
                >
                  <div className="flex items-start justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-gray-300 flex items-center justify-center text-xs font-medium text-white">
                        {note.userName.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-sm font-medium text-gray-900">
                        {note.userName}
                      </span>
                    </div>
                    <span className="text-xs text-gray-500">
                      {note.createdAt?.toDate?.() 
                        ? format(note.createdAt.toDate(), 'dd.MM.yyyy HH:mm')
                        : 'Gerade eben'
                      }
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 ml-8">
                    {formatNoteContent(note.content)}
                  </p>
                  {note.mentions.length > 0 && (
                    <div className="mt-2 ml-8">
                      <span className="text-xs text-gray-500">
                        Erwähnt: {note.mentions.map((userId) => {
                          const member = teamMembers.find(m => m.userId === userId);
                          return member?.displayName || 'Unbekannt';
                        }).join(', ')}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}