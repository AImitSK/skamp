// src/components/freigabe/PDFStatusIndicator.tsx - PDF-Status für vereinfachten 1-stufigen Customer-Workflow
"use client";

import {
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  EyeIcon,
  DocumentTextIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';
import { Badge } from '@/components/ui/badge';
import clsx from 'clsx';
import { useTranslations } from 'next-intl';

interface PDFStatusIndicatorProps {
  status: 'pending_customer' | 'approved' | 'rejected';
  version?: number;
  approvedAt?: any;
  rejectedAt?: any;
  customerComment?: string;
  showDetails?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

// Status-Konfiguration für vereinfachten 1-stufigen Workflow
const getStatusConfig = (t: ReturnType<typeof useTranslations>) => ({
  pending_customer: {
    label: t('pendingCustomer.label'),
    color: 'yellow' as const,
    icon: ClockIcon,
    description: t('pendingCustomer.description'),
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200',
    textColor: 'text-yellow-800',
    iconColor: 'text-yellow-500'
  },
  approved: {
    label: t('approved.label'),
    color: 'green' as const,
    icon: CheckCircleIcon,
    description: t('approved.description'),
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    textColor: 'text-green-800',
    iconColor: 'text-green-500'
  },
  rejected: {
    label: t('rejected.label'),
    color: 'red' as const,
    icon: XCircleIcon,
    description: t('rejected.description'),
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    textColor: 'text-red-800',
    iconColor: 'text-red-500'
  }
});

const formatDate = (timestamp: any) => {
  if (!timestamp) return '';
  
  let date: Date;
  if (timestamp.toDate) {
    date = timestamp.toDate();
  } else if (timestamp instanceof Date) {
    date = timestamp;
  } else {
    return '';
  }
  
  return date.toLocaleString('de-DE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

export default function PDFStatusIndicator({
  status,
  version,
  approvedAt,
  rejectedAt,
  customerComment,
  showDetails = false,
  size = 'md',
  className = ""
}: PDFStatusIndicatorProps) {
  const t = useTranslations('freigabe.status');

  const STATUS_CONFIG = getStatusConfig(t);
  const config = STATUS_CONFIG[status];
  const StatusIcon = config.icon;
  
  const sizeClasses = {
    sm: {
      container: "p-3",
      icon: "h-4 w-4",
      title: "text-sm font-medium",
      subtitle: "text-xs",
      badge: "text-xs"
    },
    md: {
      container: "p-4", 
      icon: "h-5 w-5",
      title: "text-base font-medium",
      subtitle: "text-sm",
      badge: "text-sm"
    },
    lg: {
      container: "p-6",
      icon: "h-6 w-6",
      title: "text-lg font-semibold",
      subtitle: "text-base",
      badge: "text-base"
    }
  };
  
  const classes = sizeClasses[size];
  
  if (!showDetails) {
    // Kompakte Badge-Darstellung
    return (
      <Badge color={config.color} className={clsx(classes.badge, "inline-flex items-center gap-1", className)}>
        <StatusIcon className={clsx(classes.icon, "flex-shrink-0")} />
        {config.label}
        {version && ` ${t('version', { version })}`}
      </Badge>
    );
  }
  
  // Detaillierte Darstellung
  return (
    <div className={clsx(
      "rounded-lg border",
      config.bgColor,
      config.borderColor,
      classes.container,
      className
    )}>
      <div className="flex items-start gap-3">
        <div className={clsx(
          "flex-shrink-0 rounded-full p-2",
          status === 'approved' && "bg-green-100",
          status === 'pending_customer' && "bg-yellow-100",
          status === 'rejected' && "bg-red-100"
        )}>
          <StatusIcon className={clsx(classes.icon, config.iconColor)} />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className={clsx(classes.title, config.textColor)}>
              {config.label}
            </h4>
            {version && (
              <Badge color={config.color} className="text-xs">
                {t('version', { version })}
              </Badge>
            )}
          </div>
          
          <p className={clsx(classes.subtitle, config.textColor, "opacity-80 mb-2")}>
            {config.description}
          </p>
          
          {/* Zeitstempel */}
          {(approvedAt || rejectedAt) && (
            <div className={clsx(classes.subtitle, config.textColor, "opacity-60 mb-2")}>
              {status === 'approved' && approvedAt && (
                <span>{t('approvedAt', { date: formatDate(approvedAt) })}</span>
              )}
              {status === 'rejected' && rejectedAt && (
                <span>{t('rejectedAt', { date: formatDate(rejectedAt) })}</span>
              )}
            </div>
          )}
          
          {/* Kunden-Kommentar */}
          {status === 'rejected' && customerComment && (
            <div className={clsx(
              "mt-3 p-3 rounded-md bg-white bg-opacity-60 border border-current border-opacity-20"
            )}>
              <div className="flex items-start gap-2">
                <InformationCircleIcon className={clsx("h-4 w-4 flex-shrink-0 mt-0.5", config.iconColor)} />
                <div>
                  <div className={clsx("text-xs font-medium", config.textColor, "mb-1")}>
                    {t('changeRequest')}
                  </div>
                  <div className={clsx("text-xs", config.textColor, "opacity-90")}>
                    "{customerComment}"
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Workflow-Hinweis für 1-stufigen Prozess */}
      {status === 'pending_customer' && (
        <div className="mt-3 pt-3 border-t border-current border-opacity-20">
          <div className="flex items-center gap-2 text-xs text-yellow-600">
            <DocumentTextIcon className="h-3 w-3" />
            <span>{t('workflowHint.pending')}</span>
          </div>
        </div>
      )}

      {status === 'approved' && (
        <div className="mt-3 pt-3 border-t border-current border-opacity-20">
          <div className="flex items-center gap-2 text-xs text-green-600">
            <CheckCircleIcon className="h-3 w-3" />
            <span>{t('workflowHint.approved')}</span>
          </div>
        </div>
      )}

      {status === 'rejected' && (
        <div className="mt-3 pt-3 border-t border-current border-opacity-20">
          <div className="flex items-center gap-2 text-xs text-red-600">
            <XCircleIcon className="h-3 w-3" />
            <span>{t('workflowHint.rejected')}</span>
          </div>
        </div>
      )}
    </div>
  );
}

// Export zusätzlicher Utility-Komponenten
export function PDFStatusBadge({ status, version }: { status: PDFStatusIndicatorProps['status'], version?: number }) {
  return (
    <PDFStatusIndicator 
      status={status} 
      version={version}
      showDetails={false}
      size="sm"
    />
  );
}

export function PDFStatusCard({ status, version, approvedAt, rejectedAt, customerComment }: Omit<PDFStatusIndicatorProps, 'showDetails'>) {
  return (
    <PDFStatusIndicator
      status={status}
      version={version}
      approvedAt={approvedAt}
      rejectedAt={rejectedAt}
      customerComment={customerComment}
      showDetails={true}
      size="md"
    />
  );
}