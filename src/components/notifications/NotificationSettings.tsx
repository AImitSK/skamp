// src/components/notifications/NotificationSettings.tsx

import { useState, useEffect } from 'react';
import { Switch } from '@/components/switch';
import { Input } from '@/components/input';
import { Button } from '@/components/button';
import { Divider } from '@/components/divider';
import { useNotificationSettings } from '@/hooks/use-notifications';
import { 
  BellIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  EnvelopeIcon,
  CalendarDaysIcon,
  LinkIcon,
  ArrowDownTrayIcon,
  ClockIcon
} from '@heroicons/react/20/solid';

interface SettingGroup {
  title: string;
  icon: React.ElementType;
  settings: Array<{
    key: keyof NotificationSettingsState;
    label: string;
    description?: string;
    type?: 'toggle' | 'number';
  }>;
}

interface NotificationSettingsState {
  approvalGranted: boolean;
  changesRequested: boolean;
  overdueApprovals: boolean;
  overdueApprovalDays: number;
  emailSentSuccess: boolean;
  emailBounced: boolean;
  taskOverdue: boolean;
  mediaFirstAccess: boolean;
  mediaDownloaded: boolean;
  mediaLinkExpired: boolean;
}

export function NotificationSettings() {
  const { settings, loading, error, updateSettings } = useNotificationSettings();
  const [localSettings, setLocalSettings] = useState<NotificationSettingsState | null>(null);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Initialize local settings from fetched settings
  useEffect(() => {
    if (settings) {
      setLocalSettings({
        approvalGranted: settings.approvalGranted,
        changesRequested: settings.changesRequested,
        overdueApprovals: settings.overdueApprovals,
        overdueApprovalDays: settings.overdueApprovalDays,
        emailSentSuccess: settings.emailSentSuccess,
        emailBounced: settings.emailBounced,
        taskOverdue: settings.taskOverdue,
        mediaFirstAccess: settings.mediaFirstAccess,
        mediaDownloaded: settings.mediaDownloaded,
        mediaLinkExpired: settings.mediaLinkExpired,
      });
    }
  }, [settings]);

  // Track changes
  useEffect(() => {
    if (settings && localSettings) {
      const changed = Object.keys(localSettings).some(
        key => (localSettings as any)[key] !== (settings as any)[key]
      );
      setHasChanges(changed);
    }
  }, [localSettings, settings]);

  const settingGroups: SettingGroup[] = [
    {
      title: 'Freigaben',
      icon: CheckCircleIcon,
      settings: [
        {
          key: 'approvalGranted',
          label: 'Korrekturstatus: Freigabe erteilt',
          description: 'Benachrichtigung wenn eine Freigabe erteilt wurde'
        },
        {
          key: 'changesRequested',
          label: 'Korrekturstatus: Änderungen erbeten',
          description: 'Benachrichtigung wenn Änderungen angefordert wurden'
        },
        {
          key: 'overdueApprovals',
          label: 'Überfällige Freigabe-Anfragen',
          description: 'Benachrichtigung über ausstehende Freigaben'
        },
        {
          key: 'overdueApprovalDays',
          label: 'Tage bis zur Überfälligkeit',
          type: 'number',
          description: 'Nach wie vielen Tagen eine Freigabe als überfällig gilt'
        }
      ]
    },
    {
      title: 'Schedule Mails',
      icon: EnvelopeIcon,
      settings: [
        {
          key: 'emailSentSuccess',
          label: 'Erfolgsmeldung nach Versand',
          description: 'Benachrichtigung nach erfolgreichem E-Mail-Versand'
        },
        {
          key: 'emailBounced',
          label: 'Bounce-Benachrichtigung',
          description: 'Benachrichtigung bei E-Mail-Bounces'
        }
      ]
    },
    {
      title: 'Tasks',
      icon: CalendarDaysIcon,
      settings: [
        {
          key: 'taskOverdue',
          label: 'Überfällige Kalender-Tasks',
          description: 'Benachrichtigung über überfällige Tasks'
        }
      ]
    },
    {
      title: 'Mediencenter',
      icon: LinkIcon,
      settings: [
        {
          key: 'mediaFirstAccess',
          label: 'Erstmaliger Zugriff auf einen geteilten Link',
          description: 'Benachrichtigung beim ersten Zugriff auf geteilte Medien'
        },
        {
          key: 'mediaDownloaded',
          label: 'Download eines geteilten Mediums',
          description: 'Benachrichtigung wenn geteilte Medien heruntergeladen werden'
        },
        {
          key: 'mediaLinkExpired',
          label: 'Ablaufdatum eines Links überschritten',
          description: 'Benachrichtigung wenn ein geteilter Link abläuft'
        }
      ]
    }
  ];

  const handleToggle = (key: keyof NotificationSettingsState) => {
    if (!localSettings) return;
    
    setLocalSettings(prev => ({
      ...prev!,
      [key]: !prev![key]
    }));
    setSaveSuccess(false);
  };

  const handleNumberChange = (key: keyof NotificationSettingsState, value: string) => {
    if (!localSettings) return;
    
    const numValue = parseInt(value) || 0;
    if (numValue >= 0) {
      setLocalSettings(prev => ({
        ...prev!,
        [key]: numValue
      }));
      setSaveSuccess(false);
    }
  };

  const handleSave = async () => {
    if (!localSettings || !hasChanges) return;

    setSaving(true);
    setSaveSuccess(false);
    
    try {
      await updateSettings(localSettings);
      setSaveSuccess(true);
      setHasChanges(false);
      
      // Hide success message after 3 seconds
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Error saving settings:', err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500">Einstellungen werden geladen...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg bg-red-50 p-4">
        <div className="flex">
          <ExclamationCircleIcon className="h-5 w-5 text-red-400" />
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">
              Fehler beim Laden der Einstellungen
            </h3>
            <div className="mt-2 text-sm text-red-700">{error}</div>
          </div>
        </div>
      </div>
    );
  }

  if (!localSettings) return null;

  return (
    <div className="space-y-6">
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold leading-6 text-gray-900">
            Benachrichtigungseinstellungen
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Wählen Sie aus, über welche Ereignisse Sie benachrichtigt werden möchten.
          </p>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-4 flex items-center gap-3">
          {saveSuccess && (
            <span className="text-sm text-green-600 flex items-center gap-1">
              <CheckCircleIcon className="h-4 w-4" />
              Gespeichert
            </span>
          )}
          <Button
            onClick={handleSave}
            disabled={!hasChanges || saving}
            className="whitespace-nowrap"
          >
            {saving ? 'Speichern...' : 'Einstellungen speichern'}
          </Button>
        </div>
      </div>

      <div className="space-y-6">
        {settingGroups.map((group, groupIndex) => (
          <div key={group.title}>
            {groupIndex > 0 && <Divider className="my-6" />}
            
            <div className="flex items-center gap-2 mb-4">
              <group.icon className="h-5 w-5 text-gray-400" />
              <h3 className="text-base font-medium text-gray-900">{group.title}</h3>
            </div>

            <div className="space-y-4">
              {group.settings.map((setting) => (
                <div key={setting.key} className="flex items-start">
                  <div className="flex-1">
                    <label className="text-sm font-medium text-gray-700">
                      {setting.label}
                    </label>
                    {setting.description && (
                      <p className="text-sm text-gray-500 mt-1">
                        {setting.description}
                      </p>
                    )}
                  </div>
                  <div className="ml-4 flex items-center">
                    {setting.type === 'number' ? (
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min="1"
                          max="30"
                          value={localSettings[setting.key] as number}
                          onChange={(e) => handleNumberChange(setting.key, e.target.value)}
                          className="w-20"
                          disabled={!localSettings.overdueApprovals && setting.key === 'overdueApprovalDays'}
                        />
                        <span className="text-sm text-gray-500">Tage</span>
                      </div>
                    ) : (
                      <Switch
                        checked={localSettings[setting.key] as boolean}
                        onChange={() => handleToggle(setting.key)}
                      />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}