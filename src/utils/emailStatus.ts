// src/utils/emailStatus.ts
import { 
  EnvelopeIcon, 
  CheckCircleIcon, 
  ExclamationTriangleIcon,
  XCircleIcon,
  ClockIcon,
  PaperAirplaneIcon
} from "@heroicons/react/20/solid";

export type EmailStatus = 'draft' | 'scheduled' | 'sending' | 'sent' | 'failed' | 'bounced';

export const emailStatusConfig: Record<EmailStatus, {
  label: string;
  color: "zinc" | "yellow" | "blue" | "green" | "red" | "orange";
  icon: React.ElementType;
  description?: string;
}> = {
  draft: {
    label: 'Entwurf',
    color: 'zinc',
    icon: EnvelopeIcon,
    description: 'E-Mail wird vorbereitet'
  },
  scheduled: {
    label: 'Geplant', 
    color: 'blue',
    icon: ClockIcon,
    description: 'E-Mail ist für späteren Versand geplant'
  },
  sending: {
    label: 'Wird versendet',
    color: 'yellow',
    icon: PaperAirplaneIcon,
    description: 'E-Mail wird gerade versendet'
  },
  sent: {
    label: 'Versendet',
    color: 'green', 
    icon: CheckCircleIcon,
    description: 'E-Mail wurde erfolgreich versendet'
  },
  failed: {
    label: 'Fehlgeschlagen',
    color: 'red',
    icon: XCircleIcon,
    description: 'E-Mail-Versand ist fehlgeschlagen'
  },
  bounced: {
    label: 'Abgewiesen',
    color: 'orange',
    icon: ExclamationTriangleIcon,
    description: 'E-Mail wurde vom Empfänger abgewiesen'
  }
};