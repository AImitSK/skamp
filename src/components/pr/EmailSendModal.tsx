// src/components/pr/EmailSendModal.tsx
"use client";

import { Dialog } from '@/components/ui/dialog';
import EmailComposer from '@/components/pr/email/EmailComposer';
import { PRCampaign } from '@/types/pr';
import { MODAL_SIZES } from '@/constants/ui';

interface EmailSendModalProps {
  campaign: PRCampaign;
  onClose: () => void;
  onSent: () => void;
  // ✅ PIPELINE-PROPS HINZUGEFÜGT (Plan 4/9)
  projectMode?: boolean;
  onPipelineComplete?: (campaignId: string) => void;
}

export default function EmailSendModal({ 
  campaign, 
  onClose, 
  onSent, 
  projectMode = false,
  onPipelineComplete 
}: EmailSendModalProps) {
  return (
    <Dialog open={true} onClose={onClose} size="5xl">
      <div className="h-[75vh] flex flex-col overflow-hidden">
        <EmailComposer
          campaign={campaign}
          onClose={onClose}
          onSent={onSent}
          projectMode={projectMode}
          onPipelineComplete={onPipelineComplete}
        />
      </div>
    </Dialog>
  );
}