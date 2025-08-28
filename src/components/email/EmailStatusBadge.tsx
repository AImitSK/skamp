// src/components/email/EmailStatusBadge.tsx
import { Badge } from "@/components/ui/badge";
import { EMAIL_STATUS_CONFIG, EmailSendStatus, COMPOSER_STATUS_CONFIG, EmailComposerStatus } from "@/constants/email";
import { ICON_SIZES } from "@/constants/ui";

interface EmailStatusBadgeProps {
  status: EmailSendStatus | EmailComposerStatus;
  showDescription?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function EmailStatusBadge({ status, showDescription = false, size = 'md' }: EmailStatusBadgeProps) {
  // Bestimme welche Konfiguration verwendet werden soll
  const isComposerStatus = status in COMPOSER_STATUS_CONFIG;
  const config = isComposerStatus 
    ? COMPOSER_STATUS_CONFIG[status as EmailComposerStatus]
    : EMAIL_STATUS_CONFIG[status as EmailSendStatus];

  if (!config) {
    return (
      <Badge color="zinc">
        Unbekannt
      </Badge>
    );
  }

  const { label, color, icon: Icon, description } = config as any;
  
  const iconSize = size === 'sm' ? ICON_SIZES.xs : size === 'lg' ? ICON_SIZES.md : ICON_SIZES.sm;

  return (
    <div className="inline-flex items-center gap-2">
      <Badge color={color} className="inline-flex items-center gap-1.5">
        <Icon className={iconSize} />
        <span>{label}</span>
      </Badge>
      {showDescription && description && (
        <span className="text-xs text-gray-500">
          {description}
        </span>
      )}
    </div>
  );
}