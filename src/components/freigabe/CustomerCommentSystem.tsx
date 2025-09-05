// src/components/freigabe/CustomerCommentSystem.tsx
"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Text } from "@/components/ui/text";
import { Badge } from "@/components/ui/badge";
import { 
  ChatBubbleLeftRightIcon,
  PlusIcon,
  XMarkIcon,
  CheckIcon
} from "@heroicons/react/24/outline";
import { ApprovalEnhanced } from "@/types/approvals";
import { formatDate } from "@/utils/dateHelpers";

interface InlineComment {
  id: string;
  quote: string;
  text: string;
  position: {
    x: number;
    y: number;
  };
}

interface CustomerCommentSystemProps {
  approval: ApprovalEnhanced;
  onAddInlineComment: (comment: Omit<InlineComment, 'id'>) => void;
  onSubmitFeedback: (generalComment: string, inlineComments: InlineComment[]) => void;
  onApprove: (comment?: string) => void;
  onRequestChanges: (comment: string, inlineComments: InlineComment[]) => void;
  isSubmitting?: boolean;
}

export function CustomerCommentSystem({
  approval,
  onAddInlineComment,
  onSubmitFeedback,
  onApprove,
  onRequestChanges,
  isSubmitting = false
}: CustomerCommentSystemProps) {
  const [inlineComments, setInlineComments] = useState<InlineComment[]>([]);
  const [generalComment, setGeneralComment] = useState("");
  const [isCommentMode, setIsCommentMode] = useState(false);
  const [selectedText, setSelectedText] = useState("");
  const [commentPosition, setCommentPosition] = useState<{x: number, y: number} | null>(null);
  const [newCommentText, setNewCommentText] = useState("");
  const [showCommentBox, setShowCommentBox] = useState(false);
  const commentBoxRef = useRef<HTMLDivElement>(null);

  // Handle text selection for inline comments
  const handleTextSelection = (event: React.MouseEvent) => {
    if (!isCommentMode) return;

    const selection = window.getSelection();
    if (selection && selection.toString().trim()) {
      const selectedText = selection.toString().trim();
      if (selectedText.length > 0) {
        setSelectedText(selectedText);
        setCommentPosition({
          x: event.clientX,
          y: event.clientY
        });
        setShowCommentBox(true);
        setNewCommentText("");
      }
    }
  };

  // Add inline comment
  const handleAddInlineComment = () => {
    if (!selectedText || !commentPosition || !newCommentText.trim()) return;

    const newComment: InlineComment = {
      id: `inline-${Date.now()}`,
      quote: selectedText,
      text: newCommentText.trim(),
      position: commentPosition
    };

    setInlineComments(prev => [...prev, newComment]);
    onAddInlineComment({
      quote: selectedText,
      text: newCommentText.trim(),
      position: commentPosition
    });

    // Reset
    setShowCommentBox(false);
    setSelectedText("");
    setCommentPosition(null);
    setNewCommentText("");
    setIsCommentMode(false);
    
    // Clear selection
    window.getSelection()?.removeAllRanges();
  };

  // Remove inline comment
  const removeInlineComment = (commentId: string) => {
    setInlineComments(prev => prev.filter(c => c.id !== commentId));
  };

  // Handle approval with optional comment
  const handleApprove = () => {
    onApprove(generalComment.trim() || undefined);
  };

  // Handle changes request
  const handleRequestChanges = () => {
    if (!generalComment.trim() && inlineComments.length === 0) {
      alert("Bitte geben Sie einen Kommentar ein oder fügen Sie Inline-Kommentare hinzu.");
      return;
    }
    onRequestChanges(generalComment.trim(), inlineComments);
  };

  // Get previous feedback for context
  const previousFeedback = approval.history?.filter(entry => 
    entry.action === 'commented' || 
    entry.action === 'changes_requested' ||
    entry.details?.comment
  ) || [];

  return (
    <div className="space-y-6">
      {/* Previous Feedback Display */}
      {previousFeedback.length > 0 && (
        <div className="bg-gray-50 rounded-lg p-4">
          <Text className="font-medium mb-3 flex items-center gap-2">
            <ChatBubbleLeftRightIcon className="h-4 w-4" />
            Bisherige Rückmeldungen ({previousFeedback.length})
          </Text>
          <div className="space-y-3">
            {previousFeedback.map((entry, index) => (
              <div key={entry.id || index} className="bg-white rounded p-3 border border-gray-200">
                <div className="flex items-center gap-2 mb-2">
                  <Badge color={entry.actorEmail?.includes('agentur@') ? 'yellow' : 'orange'}>
                    {entry.actorName || 'Unbekannt'}
                  </Badge>
                  <Text className="text-xs text-gray-500">
                    {formatDate(entry.timestamp)}
                  </Text>
                </div>
                {entry.details?.comment && (
                  <Text className="text-sm text-gray-700 italic">
                    &quot;{entry.details.comment}&quot;
                  </Text>
                )}
                {entry.inlineComments && entry.inlineComments.length > 0 && (
                  <div className="mt-2 space-y-1">
                    <Text className="text-xs font-medium text-gray-500">
                      Inline-Kommentare:
                    </Text>
                    {entry.inlineComments.map((comment: any, idx: number) => (
                      <div key={idx} className="text-xs bg-gray-50 p-2 rounded">
                        <Text className="text-gray-600 italic">&quot;{comment.quote}&quot;</Text>
                        <Text className="text-gray-800 mt-1">→ {comment.text}</Text>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Comment Mode Toggle */}
      <div className="flex items-center gap-3">
        <Button
          color={isCommentMode ? "zinc" : "zinc"}
          onClick={() => setIsCommentMode(!isCommentMode)}
          disabled={isSubmitting}
        >
          <PlusIcon className="h-4 w-4" />
          Inline-Kommentar hinzufügen
        </Button>
        {isCommentMode && (
          <Text className="text-sm text-orange-600">
            Markieren Sie Text im PDF um einen Kommentar hinzuzufügen
          </Text>
        )}
      </div>

      {/* Current Inline Comments */}
      {inlineComments.length > 0 && (
        <div className="bg-orange-50 rounded-lg p-4">
          <Text className="font-medium mb-3">
            Ihre Inline-Kommentare ({inlineComments.length})
          </Text>
          <div className="space-y-2">
            {inlineComments.map(comment => (
              <div key={comment.id} className="bg-white rounded p-3 border border-orange-200">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <Text className="text-sm text-gray-600 italic mb-1">
                      &quot;{comment.quote}&quot;
                    </Text>
                    <Text className="text-sm text-gray-800">
                      → {comment.text}
                    </Text>
                  </div>
                  <Button
                    plain
                    onClick={() => removeInlineComment(comment.id)}
                    className="text-red-500 hover:text-red-700"
                    disabled={isSubmitting}
                  >
                    <XMarkIcon className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* General Comment */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Allgemeine Rückmeldung
        </label>
        <Textarea
          value={generalComment}
          onChange={(e) => setGeneralComment(e.target.value)}
          placeholder="Ihre Rückmeldung zu dieser Kampagne..."
          rows={4}
          disabled={isSubmitting}
          className="w-full"
        />
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <Button
          color="primary"
          onClick={handleApprove}
          disabled={isSubmitting}
          className="flex-1"
        >
          <CheckIcon className="h-4 w-4" />
          Freigeben
          {generalComment.trim() && " (mit Kommentar)"}
        </Button>
        
        <Button
          color="zinc"
          onClick={handleRequestChanges}
          disabled={isSubmitting || (!generalComment.trim() && inlineComments.length === 0)}
          className="flex-1"
        >
          <ChatBubbleLeftRightIcon className="h-4 w-4" />
          Änderungen anfordern
        </Button>
      </div>

      {/* Inline Comment Box */}
      {showCommentBox && commentPosition && (
        <div
          ref={commentBoxRef}
          className="fixed bg-white border border-gray-300 rounded-lg p-4 shadow-lg z-50"
          style={{
            left: Math.min(commentPosition.x, window.innerWidth - 300),
            top: commentPosition.y + 10
          }}
        >
          <Text className="font-medium text-sm mb-2">Kommentar hinzufügen</Text>
          <Text className="text-xs text-gray-600 mb-2 italic">
            &quot;{selectedText}&quot;
          </Text>
          <Textarea
            value={newCommentText}
            onChange={(e) => setNewCommentText(e.target.value)}
            placeholder="Ihr Kommentar..."
            rows={3}
            className="w-72 text-sm"
            autoFocus
          />
          <div className="flex gap-2 mt-3">
            <Button
                            color="primary"
              onClick={handleAddInlineComment}
              disabled={!newCommentText.trim()}
            >
              Hinzufügen
            </Button>
            <Button
                            plain
              onClick={() => {
                setShowCommentBox(false);
                setSelectedText("");
                setCommentPosition(null);
                setNewCommentText("");
                setIsCommentMode(false);
                window.getSelection()?.removeAllRanges();
              }}
            >
              Abbrechen
            </Button>
          </div>
        </div>
      )}

      {/* Overlay to capture text selection */}
      {isCommentMode && (
        <div
          className="fixed inset-0 z-40 cursor-crosshair"
          onClick={handleTextSelection}
          style={{ backgroundColor: 'transparent' }}
        />
      )}
    </div>
  );
}