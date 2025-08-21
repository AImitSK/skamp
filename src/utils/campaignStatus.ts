// src/utils/campaignStatus.ts
import {
  PencilSquareIcon,
  ClockIcon,
  ExclamationCircleIcon,
  ShieldCheckIcon,
  PaperAirplaneIcon,
  CheckCircleIcon,
  ArchiveBoxIcon,
} from "@heroicons/react/20/solid";
import { PRCampaignStatus } from "@/types/pr";

export const statusConfig: Record<PRCampaignStatus, { 
  label: string; 
  color: "zinc" | "yellow" | "orange" | "teal" | "blue" | "indigo" | "green"; 
  icon: React.ElementType;
  description?: string;
}> = {
  draft: {
    label: 'Entwurf',
    color: 'zinc',
    icon: PencilSquareIcon,
    description: 'Die Kampagne ist noch in Bearbeitung'
  },
  generating_preview: {
    label: 'Generiere Vorschau',
    color: 'orange',
    icon: ClockIcon,
    description: 'PDF-Vorschau wird generiert (temporär)'
  },
  in_review: {
    label: 'In Prüfung',
    color: 'yellow',
    icon: ClockIcon,
    description: 'Die Kampagne wird vom Kunden geprüft'
  },
  changes_requested: {
    label: 'Änderung erbeten',
    color: 'orange',
    icon: ExclamationCircleIcon,
    description: 'Der Kunde hat Änderungen angefordert'
  },
  approved: {
    label: 'Freigegeben',
    color: 'teal',
    icon: ShieldCheckIcon,
    description: 'Die Kampagne wurde vom Kunden freigegeben'
  },
  scheduled: {
    label: 'Geplant',
    color: 'blue',
    icon: ClockIcon,
    description: 'Die Kampagne ist für den Versand geplant'
  },
  sending: {
    label: 'Wird gesendet',
    color: 'indigo',
    icon: PaperAirplaneIcon,
    description: 'Die Kampagne wird gerade versendet'
  },
  sent: {
    label: 'Gesendet',
    color: 'green',
    icon: CheckCircleIcon,
    description: 'Die Kampagne wurde erfolgreich versendet'
  },
  archived: {
    label: 'Archiviert',
    color: 'zinc',
    icon: ArchiveBoxIcon,
    description: 'Die Kampagne wurde archiviert'
  },
};