// src/components/notifications/NotificationSettings.tsx

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { SimpleSwitch } from './SimpleSwitch';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Divider } from '@/components/ui/divider';
import { useNotificationSettings } from '@/hooks/use-notifications';
import { toastService } from '@/lib/utils/toast';
import {
  CheckCircleIcon,
  ExclamationCircleIcon,
  EnvelopeIcon,
  LinkIcon,
  UserGroupIcon,
  ClipboardDocumentListIcon
} from '@heroicons/react/24/outline';

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
  // Freigaben
  approvalGranted: boolean;
  changesRequested: boolean;
  firstView: boolean;
  overdueApprovals: boolean;
  overdueApprovalDays: number;
  // Schedule Mails
  emailSentSuccess: boolean;
  emailBounced: boolean;
  // Projekt-Tasks
  taskOverdue: boolean;
  // Mediencenter
  mediaFirstAccess: boolean;
  mediaDownloaded: boolean;
  // Team
  teamChatMention: boolean;
}

export function NotificationSettings() {
  const t = useTranslations('settings.notifications');
  const { settings, loading, error, updateSettings } = useNotificationSettings();
  const [localSettings, setLocalSettings] = useState<NotificationSettingsState | null>(null);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Initialize local settings from fetched settings
  useEffect(() => {
    if (settings) {
      setLocalSettings({
        approvalGranted: settings.approvalGranted,
        changesRequested: settings.changesRequested,
        firstView: settings.firstView ?? true,
        overdueApprovals: settings.overdueApprovals,
        overdueApprovalDays: settings.overdueApprovalDays,
        emailSentSuccess: settings.emailSentSuccess,
        emailBounced: settings.emailBounced,
        taskOverdue: settings.taskOverdue ?? true,
        mediaFirstAccess: settings.mediaFirstAccess,
        mediaDownloaded: settings.mediaDownloaded,
        teamChatMention: (settings as any).teamChatMention ?? true,
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
      title: t('groups.approvals.title'),
      icon: CheckCircleIcon,
      settings: [
        {
          key: 'approvalGranted',
          label: t('groups.approvals.approvalGranted'),
          description: t('groups.approvals.approvalGrantedDesc')
        },
        {
          key: 'changesRequested',
          label: t('groups.approvals.changesRequested'),
          description: t('groups.approvals.changesRequestedDesc')
        },
        {
          key: 'firstView',
          label: t('groups.approvals.firstView'),
          description: t('groups.approvals.firstViewDesc')
        },
        {
          key: 'overdueApprovals',
          label: t('groups.approvals.overdueApprovals'),
          description: t('groups.approvals.overdueApprovalsDesc')
        },
        {
          key: 'overdueApprovalDays',
          label: t('groups.approvals.overdueApprovalDays'),
          type: 'number',
          description: t('groups.approvals.overdueApprovalDaysDesc')
        }
      ]
    },
    {
      title: t('groups.email.title'),
      icon: EnvelopeIcon,
      settings: [
        {
          key: 'emailSentSuccess',
          label: t('groups.email.emailSentSuccess'),
          description: t('groups.email.emailSentSuccessDesc')
        },
        {
          key: 'emailBounced',
          label: t('groups.email.emailBounced'),
          description: t('groups.email.emailBouncedDesc')
        }
      ]
    },
    {
      title: t('groups.tasks.title'),
      icon: ClipboardDocumentListIcon,
      settings: [
        {
          key: 'taskOverdue',
          label: t('groups.tasks.taskOverdue'),
          description: t('groups.tasks.taskOverdueDesc')
        }
      ]
    },
    {
      title: t('groups.media.title'),
      icon: LinkIcon,
      settings: [
        {
          key: 'mediaFirstAccess',
          label: t('groups.media.mediaFirstAccess'),
          description: t('groups.media.mediaFirstAccessDesc')
        },
        {
          key: 'mediaDownloaded',
          label: t('groups.media.mediaDownloaded'),
          description: t('groups.media.mediaDownloadedDesc')
        }
      ]
    },
    {
      title: t('groups.team.title'),
      icon: UserGroupIcon,
      settings: [
        {
          key: 'teamChatMention',
          label: t('groups.team.teamChatMention'),
          description: t('groups.team.teamChatMentionDesc')
        }
      ]
    }
  ];

  const handleToggle = (key: keyof NotificationSettingsState, checked: boolean) => {
    if (!localSettings) return;
    
    setLocalSettings(prev => ({
      ...prev!,
      [key]: checked
    }));
  };

  const handleNumberChange = (key: keyof NotificationSettingsState, value: string) => {
    if (!localSettings) return;

    const numValue = parseInt(value) || 0;
    if (numValue >= 0) {
      setLocalSettings(prev => ({
        ...prev!,
        [key]: numValue
      }));
    }
  };

  const handleSave = async () => {
    if (!localSettings || !hasChanges) return;

    setSaving(true);

    try {
      await updateSettings(localSettings);
      setHasChanges(false);
      toastService.success('Einstellungen gespeichert');
    } catch (err) {
      toastService.error('Fehler beim Speichern der Einstellungen');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500">{t('loadingSettings')}</div>
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
              {t('loadError')}
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
            {t('settingsTitle')}
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            {t('settingsDescription')}
          </p>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-4 flex items-center gap-3">
          <Button
            onClick={handleSave}
            disabled={!hasChanges || saving}
            className="whitespace-nowrap"
          >
            {saving ? t('saving') : t('saveSettings')}
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
                        <span className="text-sm text-gray-500">{t('days')}</span>
                      </div>
                    ) : (
                      <SimpleSwitch
                        checked={localSettings[setting.key] as boolean}
                        onChange={(checked) => handleToggle(setting.key, checked)}
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