// src/components/inbox/InternalNotes.tsx
"use client";

import { useState, useEffect } from 'react';
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
  const [isExpanded, setIsExpanded] = useState(false);
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
        console.log('📋 Loaded team members for mentions:', members.length);
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
    // Pattern unterstützt jetzt auch Umlaute und Sonderzeichen (ä, ö, ü, ß, etc.)
    const mentionRegex = /@([^\s@]+(?:\s+[^\s@]+)*)/g;
    const mentions = [];
    let match;

    // Use allTeamMembers instead of teamMembers prop
    const membersToSearch = allTeamMembers.length > 0 ? allTeamMembers : teamMembers;

    console.log('🔍 Extracting mentions from text:', text);
    console.log('📋 Available members:', membersToSearch.map(m => m.displayName).join(', '));

    while ((match = mentionRegex.exec(text)) !== null) {
      const mentionName = match[1].trim();
      console.log('🎯 Found mention:', mentionName);

      const member = membersToSearch.find(m =>
        m.displayName.toLowerCase().trim() === mentionName.toLowerCase()
      );

      if (member) {
        console.log('✅ Matched member:', member.displayName, '(userId:', member.userId + ')');
        mentions.push(member.userId);
      } else {
        console.warn('❌ No member found for mention:', mentionName);
      }
    }

    console.log('📤 Final mentions array:', mentions);
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
        userPhotoUrl: user.photoURL || undefined,
        mentions,
        createdAt: serverTimestamp() as Timestamp,
        organizationId
      };

      console.log('💾 Saving note with user photo:', {
        userName: noteData.userName,
        userPhotoUrl: noteData.userPhotoUrl,
        hasPhoto: !!noteData.userPhotoUrl
      });

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
    // Pattern unterstützt jetzt auch Umlaute und Sonderzeichen (ä, ö, ü, ß, etc.)
    const mentionRegex = /@([^\s@]+(?:\s+[^\s@]+)*)/g;
    const parts = content.split(mentionRegex);

    // Get current user's display name for comparison
    const currentUserDisplayName = user?.displayName || user?.email || '';

    return parts.map((part, index) => {
      if (index % 2 === 1) {
        // This is a mention - check if it's the current user
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

  // Filtered team members for mentions (use allTeamMembers)
  const membersForMentions = allTeamMembers.length > 0 ? allTeamMembers : teamMembers;
  const filteredMembers = membersForMentions.filter(member =>
    member.displayName.toLowerCase().includes(mentionSearch)
  );

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
                {notes.map((note) => {
                  // Debug: Log avatar info for EVERY note
                  console.log('🖼️ Rendering Note Avatar:', {
                    userName: note.userName,
                    photoUrl: note.userPhotoUrl,
                    hasPhotoUrl: !!note.userPhotoUrl,
                    photoUrlType: typeof note.userPhotoUrl,
                    noteId: note.id
                  });

                  return (
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
                  );
                })}
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