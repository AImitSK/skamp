// src/components/campaigns/ApprovalHistoryModal.tsx
"use client";

import { Dialog, DialogTitle, DialogBody, DialogActions } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { Badge } from "@/components/ui/badge";
import { 
  ChatBubbleLeftRightIcon,
  FolderIcon,
  DocumentIcon
} from "@heroicons/react/24/outline";
import { ApprovalEnhanced, APPROVAL_STATUS_CONFIG } from "@/types/approvals";
import { formatDate as formatDateLong } from "@/utils/dateHelpers";

interface ApprovalHistoryModalProps {
  approval: ApprovalEnhanced;
  isOpen: boolean;
  onClose: () => void;
}

export function ApprovalHistoryModal({ 
  approval, 
  isOpen,
  onClose 
}: ApprovalHistoryModalProps) {
  const getActionLabel = (action: string) => {
    const labels: Record<string, string> = {
      created: 'Erstellt',
      sent_for_approval: 'Zur Freigabe gesendet',
      viewed: 'Angesehen',
      approved: 'Freigegeben',
      rejected: 'Abgelehnt',
      commented: 'Kommentiert',
      changes_requested: 'Änderungen angefordert',
      reminder_sent: 'Erinnerung gesendet',
      resubmitted: 'Erneut eingereicht'
    };
    return labels[action] || action;
  };

  const getActionBadgeColor = (action: string, actorEmail?: string): 'blue' | 'green' | 'red' | 'orange' | 'zinc' => {
    // System-Meldungen immer blau
    if (actorEmail?.includes('system@') || actorEmail?.includes('noreply@') || !actorEmail) {
      return 'blue';
    }
    
    // Status-basierte Farben für Kunden-Aktionen
    switch (action) {
      case 'approved':
        return 'green';
      case 'rejected':
        return 'red';
      case 'changes_requested':
      case 'commented':
        return 'orange';
      case 'viewed':
        return 'zinc';
      default:
        return 'zinc';
    }
  };

  const isSystemMessage = (actorEmail?: string) => {
    return actorEmail?.includes('system@') || 
           actorEmail?.includes('noreply@') || 
           actorEmail?.includes('public-access@') ||
           !actorEmail;
  };

  const isAgencyMessage = (actorEmail?: string) => {
    return actorEmail?.includes('agentur@') || 
           actorEmail?.includes('@celeropress.com');
  };

  return (
    <Dialog open={isOpen} onClose={onClose} size="2xl">
      <div className="p-6">
        <DialogTitle>Freigabe-Historie</DialogTitle>
        <DialogBody className="mt-4">
          <div className="mb-4">
            <Text className="font-medium">{approval.title}</Text>
            <Text className="text-sm text-gray-500">{approval.clientName}</Text>
          </div>

          {approval.history && approval.history.length > 0 ? (
            <div className="space-y-3">
              {approval.history.map((entry, index) => {
                const isSystem = isSystemMessage(entry.actorEmail);
                const isAgency = isAgencyMessage(entry.actorEmail);
                const badgeColor = getActionBadgeColor(entry.action, entry.actorEmail);
                
                return (
                  <div key={entry.id} className={`
                    rounded-lg p-3 transition-colors
                    ${isSystem || isAgency ? 'bg-white border border-gray-200' : 'bg-gray-50 border border-gray-100'}
                  `}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge color={badgeColor}>
                            {getActionLabel(entry.action)}
                          </Badge>
                          <Text className="text-xs text-gray-500">
                            {formatDateLong(entry.timestamp)}
                          </Text>
                        </div>
                        
                        {/* Kein Name/E-Mail für anonyme Ansichten - kompakter */}
                        {entry.details.comment && (
                          <Text className="text-sm italic text-gray-700 mt-2">
                            &ldquo;{entry.details.comment}&rdquo;
                          </Text>
                        )}
                        
                        {entry.inlineComments && entry.inlineComments.length > 0 && (
                          <div className="mt-2 space-y-1">
                            <Text className="text-xs font-medium text-gray-500">Inline-Kommentare:</Text>
                            {entry.inlineComments.map((comment, idx) => (
                              <div key={comment.id} className="text-sm bg-gray-50 p-2 rounded">
                                <Text className="text-gray-600 italic">&ldquo;{comment.quote}&rdquo;</Text>
                                <Text className="text-gray-800 mt-1">→ {comment.text}</Text>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <ChatBubbleLeftRightIcon className="h-12 w-12 mx-auto text-gray-300" />
              <Text className="mt-2 text-gray-500">Noch keine Historie vorhanden</Text>
            </div>
          )}

          {approval.attachedAssets && approval.attachedAssets.length > 0 && (
            <div className="mt-6 pt-6 border-t">
              <Text className="font-medium mb-3">Angehängte Medien ({approval.attachedAssets.length})</Text>
              <div className="space-y-2">
                {approval.attachedAssets.map((asset, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-2 bg-gray-50 rounded overflow-hidden">
                    <div className="flex-shrink-0">
                      {asset.type === 'folder' ? (
                        <FolderIcon className="h-5 w-5 text-gray-400" />
                      ) : (
                        <DocumentIcon className="h-5 w-5 text-gray-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-sm text-gray-900 truncate block">{asset.name}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </DialogBody>
        <DialogActions>
          <Button plain onClick={onClose}>Schließen</Button>
        </DialogActions>
      </div>
    </Dialog>
  );
}