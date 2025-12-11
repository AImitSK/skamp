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

/**
 * Campaign status configuration for colors and icons.
 * Labels and descriptions are managed via i18n translations in campaigns.status namespace.
 *
 * @example
 * // Usage with translations
 * const t = useTranslations('campaigns.status');
 * const config = statusConfig[status];
 * return (
 *   <Badge color={config.color}>
 *     <config.icon className="h-3 w-3" />
 *     {t(`labels.${status}`)}
 *   </Badge>
 * );
 */
export const statusConfig: Record<PRCampaignStatus, {
  color: "zinc" | "yellow" | "orange" | "teal" | "blue" | "indigo" | "green";
  icon: React.ElementType;
}> = {
  draft: {
    color: 'zinc',
    icon: PencilSquareIcon,
  },
  generating_preview: {
    color: 'orange',
    icon: ClockIcon,
  },
  in_review: {
    color: 'yellow',
    icon: ClockIcon,
  },
  changes_requested: {
    color: 'orange',
    icon: ExclamationCircleIcon,
  },
  approved: {
    color: 'teal',
    icon: ShieldCheckIcon,
  },
  scheduled: {
    color: 'blue',
    icon: ClockIcon,
  },
  sending: {
    color: 'indigo',
    icon: PaperAirplaneIcon,
  },
  sent: {
    color: 'green',
    icon: CheckCircleIcon,
  },
  archived: {
    color: 'zinc',
    icon: ArchiveBoxIcon,
  },
};