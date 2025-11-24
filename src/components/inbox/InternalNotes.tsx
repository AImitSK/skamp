// src/components/inbox/InternalNotes.tsx
"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
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
import { notificationsService } from '@/lib/firebase/notifications-service';
import { teamMemberService } from '@/lib/firebase/organization-service';
import { teamChatNotificationsService } from '@/lib/firebase/team-chat-notifications';
import { MentionDropdown } from '@/components/projects/communication/MentionDropdown';
import {
  ChatBubbleLeftIcon,
  PaperAirplaneIcon,
  AtSymbolIcon,
  ChevronUpIcon,
  ChevronDownIcon
} from '@heroicons/react/24/outline';
import clsx from 'clsx';
import format from 'date-fns/format';
import { toastService } from '@/lib/utils/toast';

interface InternalNote {
  id?: string;
  threadId: string;
  emailId?: string;
  content: string;
  userId: string;
  userName: string;
  userEmail: string;
  userPhotoUrl?: string;
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
  const [selectedMentionIndex, setSelectedMentionIndex] = useState(0);
  const [mentionDropdownPosition, setMentionDropdownPosition] = useState({ top: 0, left: 0 });
  const [isExpanded, setIsExpanded] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [allTeamMembers, setAllTeamMembers] = useState<Array<{
    id: string;
    userId: string;
    displayName: string;
    email: string;
  }>>([]);

  // Load all team members from organization
  useEffect(() => {
    const loadTeamMembers = async () => {
      try {
        const members = await teamMemberService.getByOrganization(organizationId);
        setAllTeamMembers(members);
      } catch (error) {
        console.error('Error loading team members:', error);
      }
    };

    if (organizationId) {
      loadTeamMembers();
    }
  }, [organizationId]);

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

  // Handle @mentions - Wie im Team Chat
  const handleNoteChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    const cursorPos = e.target.selectionStart;

    setNewNote(value);

    // Prüfe auf @-Mention
    const beforeCursor = value.substring(0, cursorPos);
    const mentionMatch = beforeCursor.match(/@([\w\s]*)$/);

    if (mentionMatch) {
      const searchTerm = mentionMatch[1];
      setMentionSearch(searchTerm);
      setSelectedMentionIndex(0);

      // Berechne Position des Dropdowns
      if (textareaRef.current) {
        const rect = textareaRef.current.getBoundingClientRect();
        const lines = beforeCursor.split('\n');
        const currentLine = lines[lines.length - 1];
        const charWidth = 8; // Geschätzte Zeichen-Breite

        setMentionDropdownPosition({
          top: rect.top - 200, // Über der Textarea
          left: rect.left + (currentLine.length * charWidth)
        });
      }

      setShowMentions(true);
    } else {
      setShowMentions(false);
    }
  }, []);

  // Filtered team members for mentions (use allTeamMembers)
  const membersForMentions = allTeamMembers.length > 0 ? allTeamMembers : teamMembers;

  // Keyboard-Navigation für Mention-Dropdown
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (showMentions) {
      const filteredMembers = membersForMentions.filter(member =>
        member.displayName.toLowerCase().includes(mentionSearch.toLowerCase()) ||
        member.email.toLowerCase().includes(mentionSearch.toLowerCase())
      );

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedMentionIndex(prev =>
          prev < filteredMembers.length - 1 ? prev + 1 : 0
        );
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedMentionIndex(prev =>
          prev > 0 ? prev - 1 : filteredMembers.length - 1
        );
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredMembers[selectedMentionIndex]) {
          insertMention(filteredMembers[selectedMentionIndex]);
        }
        return;
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setShowMentions(false);
        return;
      }
    }

    // Normale Enter-Behandlung (Shift+Enter für neue Zeile)
    if (e.key === 'Enter' && !e.shiftKey && !showMentions) {
      e.preventDefault();
      handleSubmit();
    }
  }, [showMentions, mentionSearch, selectedMentionIndex, membersForMentions]);

  // Insert mention
  const insertMention = (member: any) => {
    const lastAtIndex = newNote.lastIndexOf('@');
    const beforeAt = newNote.substring(0, lastAtIndex);
    const afterAt = newNote.substring(lastAtIndex + 1);
    const spaceIndex = afterAt.indexOf(' ');
    const afterMention = spaceIndex !== -1 ? afterAt.substring(spaceIndex) : '';

    setNewNote(`${beforeAt}@${member.displayName} ${afterMention}`);
    setShowMentions(false);

    // Focus textarea wieder
    textareaRef.current?.focus();
  };

  // Extract mentions from text - Verwende den gleichen Service wie Team Chat
  const extractMentions = (text: string): string[] => {
    const membersToSearch = allTeamMembers.length > 0 ? allTeamMembers : teamMembers;
    return teamChatNotificationsService.extractMentionedUserIds(text, membersToSearch);
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
        userPhotoUrl: user.photoURL || undefined,
        mentions,
        createdAt: serverTimestamp() as Timestamp,
        organizationId
      };

      await addDoc(collection(db, 'email_notes'), noteData);
      
      // Send notifications for mentions
      if (mentions.length > 0) {
        const userName = user.displayName || user.email || 'Unbekannt';
        console.log('📤 Sending mention notifications to users:', mentions);

        // Use the correct notifications service (not enhanced!)
        for (const mentionedUserId of mentions) {
          try {
            const notificationId = await notificationsService.create({
              userId: mentionedUserId,
              organizationId,
              type: 'TEAM_CHAT_MENTION', // Reuse existing type
              title: `${userName} hat Sie erwähnt`,
              message: `In einer Email-Notiz: "${newNote.substring(0, 100)}${newNote.length > 100 ? '...' : ''}"`,
              linkUrl: `/dashboard/communication/inbox?threadId=${threadId}`,
              linkType: 'email' as any,
              linkId: threadId,
              metadata: {
                threadId,
                emailId,
                mentionedBy: user.uid,
                mentionedByName: userName,
                content: newNote.substring(0, 200)
              }
            });
            console.log('✅ Notification created:', notificationId);
          } catch (error) {
            console.error('❌ Error creating notification for user:', mentionedUserId, error);
          }
        }
      }
      
      setNewNote('');
      toastService.success('Notiz gespeichert');
    } catch (error) {
      console.error('Error adding note:', error);
      toastService.error('Fehler beim Speichern der Notiz');
    }
  };

  // Format note content with highlighted mentions
  const formatNoteContent = (content: string) => {
    // Pattern stoppt bei Satzzeichen, Leerzeichen oder Zeilenende
    // Unterstützt Namen mit Umlauten (ä, ö, ü, ß, etc.)
    const mentionRegex = /@([^\s@]+(?:\s+[^\s@,.!?]+)*)(?=\s|[,.!?]|$)/g;

    // Debug: Zeige alle Matches
    const matches = Array.from(content.matchAll(mentionRegex));
    console.log('🔍 [Mention-Highlighting] Content:', content);
    console.log('🔍 [Mention-Highlighting] Regex Matches:', matches.map(m => ({
      fullMatch: m[0],
      capturedName: m[1],
      index: m.index
    })));

    const parts = content.split(mentionRegex);
    console.log('🔍 [Mention-Highlighting] Split Parts:', parts);

    // Get current user's display name for comparison
    const currentUserDisplayName = user?.displayName || user?.email || '';

    return parts.map((part, index) => {
      if (index % 2 === 1) {
        // This is a mention - check if it's the current user
        console.log('🔍 [Mention-Highlighting] Processing mention part:', {
          part,
          index,
          currentUser: currentUserDisplayName
        });
        const isOwnMention = part.toLowerCase().trim() === currentUserDisplayName.toLowerCase().trim();

        return (
          <span
            key={index}
            className={clsx(
              "font-medium px-1.5 py-0.5 rounded",
              isOwnMention
                ? "bg-yellow-100 text-yellow-800" // Eigene Mentions - gelb
                : "bg-blue-100 text-blue-800"      // Andere Mentions - blau
            )}
          >
            @{part}
          </span>
        );
      }
      return part;
    });
  };

  const noteCount = notes.length;

  return (
    <div className="border-t border-gray-200 bg-white shadow-lg z-10">
      {/* Expandable Content */}
      <div
        className={clsx(
          "overflow-hidden transition-all duration-300 ease-in-out",
          isExpanded ? "max-h-[50vh]" : "max-h-0"
        )}
      >
        <div className="px-6 py-4 h-[50vh] flex flex-col">
          {/* New Note Input */}
          <div className="mb-4 relative">
            <textarea
              ref={textareaRef}
              value={newNote}
              onChange={handleNoteChange}
              onKeyDown={handleKeyDown}
              placeholder="Interne Notiz hinzufügen... (@Name für Erwähnung)"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#005fab] focus:border-transparent resize-none"
              rows={3}
            />

            {/* Professional Mention Dropdown - 1:1 wie im Team Chat */}
            <MentionDropdown
              isVisible={showMentions}
              position={mentionDropdownPosition}
              searchTerm={mentionSearch}
              teamMembers={membersForMentions}
              selectedIndex={selectedMentionIndex}
              onSelect={insertMention}
              onClose={() => setShowMentions(false)}
            />
            
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

          {/* Notes List - Scrollable */}
          <div className="flex-1 overflow-y-auto">
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
                    className="bg-gray-50 p-3 rounded-lg border border-gray-200"
                  >
                    <div className="flex items-start justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <Avatar
                          className="w-8 h-8"
                          src={note.userPhotoUrl || undefined}
                          initials={note.userName.charAt(0).toUpperCase()}
                          title={note.userName}
                        />
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
                            const member = membersForMentions.find(m => m.userId === userId);
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
        </div>
      </div>

      {/* Sticky Header - Always Visible at Bottom */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-6 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors border-t border-gray-200"
      >
        <div className="flex items-center gap-2">
          <ChatBubbleLeftIcon className="h-5 w-5 text-gray-600" />
          <span className="font-medium text-sm text-gray-900">
            Interne Notizen
          </span>
          {noteCount > 0 && (
            <Badge color="zinc" className="text-xs whitespace-nowrap">
              {noteCount}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          {notes.length > 0 && (
            <span className="text-xs text-gray-500">
              {notes[0].userName} • {notes[0].createdAt?.toDate?.()
                ? format(notes[0].createdAt.toDate(), 'HH:mm')
                : 'neu'}
            </span>
          )}
          {isExpanded ? (
            <ChevronDownIcon className="h-5 w-5 text-gray-600" />
          ) : (
            <ChevronUpIcon className="h-5 w-5 text-gray-600" />
          )}
        </div>
      </button>
    </div>
  );
}