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
}

export default function EmailSendModal({ campaign, onClose, onSent }: EmailSendModalProps) {
  return (
    <Dialog open={true} onClose={onClose} size="5xl">
      <div className="h-[90vh] flex flex-col overflow-hidden">
        <EmailComposer 
          campaign={campaign}
          onClose={onClose}
          onSent={onSent}
        />
      </div>
    </Dialog>
  );
}