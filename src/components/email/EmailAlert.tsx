// src/components/email/EmailAlert.tsx
import { 
  CheckCircleIcon, 
  ExclamationCircleIcon, 
  InformationCircleIcon, 
  XCircleIcon,
  XMarkIcon
} from "@heroicons/react/20/solid";
import { ICON_SIZES } from "@/constants/ui";

interface EmailAlertProps {
  type: 'success' | 'error' | 'warning' | 'info';
  title?: string;
  message: string;
  onClose?: () => void;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function EmailAlert({ type, title, message, onClose, action }: EmailAlertProps) {
  const config = {
    success: {
      bgColor: 'bg-green-50 border-green-200',
      textColor: 'text-green-700',
      iconColor: 'text-green-400',
      Icon: CheckCircleIcon
    },
    error: {
      bgColor: 'bg-red-50 border-red-200',
      textColor: 'text-red-700', 
      iconColor: 'text-red-400',
      Icon: XCircleIcon
    },
    warning: {
      bgColor: 'bg-yellow-50 border-yellow-200',
      textColor: 'text-yellow-700',
      iconColor: 'text-yellow-400',
      Icon: ExclamationCircleIcon
    },
    info: {
      bgColor: 'bg-blue-50 border-blue-200',
      textColor: 'text-blue-700',
      iconColor: 'text-blue-400', 
      Icon: InformationCircleIcon
    }
  };

  const { bgColor, textColor, iconColor, Icon } = config[type];

  return (
    <div className={`rounded-lg border p-4 ${bgColor}`}>
      <div className="flex items-start">
        <div className="shrink-0">
          <Icon className={`${ICON_SIZES.md} ${iconColor}`} aria-hidden="true" />
        </div>
        <div className="ml-3 flex-1">
          {title && (
            <h3 className={`text-sm font-medium ${textColor}`}>
              {title}
            </h3>
          )}
          <div className={`text-sm ${title ? 'mt-1' : ''} ${textColor}`}>
            {message}
          </div>
          {action && (
            <div className="mt-3">
              <button
                type="button"
                onClick={action.onClick}
                className={`inline-flex items-center rounded-md px-3 py-2 text-sm font-medium ${
                  type === 'success' 
                    ? 'bg-green-100 text-green-800 hover:bg-green-200' 
                    : type === 'error'
                    ? 'bg-red-100 text-red-800 hover:bg-red-200'
                    : type === 'warning'
                    ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                    : 'bg-blue-100 text-blue-800 hover:bg-blue-200'
                }`}
              >
                {action.label}
              </button>
            </div>
          )}
        </div>
        {onClose && (
          <div className="ml-auto shrink-0">
            <button
              type="button"
              onClick={onClose}
              className={`inline-flex rounded-md p-1.5 ${textColor} hover:bg-opacity-20 hover:bg-current`}
            >
              <span className="sr-only">Schließen</span>
              <XMarkIcon className={ICON_SIZES.md} aria-hidden="true" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}