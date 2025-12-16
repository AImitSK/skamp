"use client";

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Heading } from "@/components/ui/heading";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogTitle, DialogBody, DialogActions } from "@/components/ui/dialog";
import { Field, Label } from "@/components/ui/fieldset";
import { SimpleSwitch } from "@/components/notifications/SimpleSwitch";
import { SettingsNav } from '@/components/SettingsNav';
import { useAuth } from '@/context/AuthContext';
import { useOrganization } from '@/context/OrganizationContext';
import { spamPatternService } from '@/lib/firebase/spam-pattern-service';
import { SpamPattern } from '@/types/monitoring';
import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import { toastService } from '@/lib/utils/toast';

export default function SpamBlocklistPage() {
  const t = useTranslations('settings.spam');
  const tToast = useTranslations('toasts');
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();
  const [patterns, setPatterns] = useState<SpamPattern[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const [formData, setFormData] = useState({
    type: 'url_domain' as SpamPattern['type'],
    pattern: '',
    isRegex: false,
    description: ''
  });

  useEffect(() => {
    loadPatterns();
  }, [currentOrganization?.id]);

  const loadPatterns = async () => {
    if (!currentOrganization?.id) return;

    try {
      setLoading(true);
      const data = await spamPatternService.getAllByOrganization(
        currentOrganization.id,
        'global'
      );
      setPatterns(data);
    } catch {
      toastService.error(tToast('loadError'));
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!user?.uid || !currentOrganization?.id) return;

    if (!formData.pattern.trim()) {
      toastService.error(tToast('spam.patternRequired'));
      return;
    }

    try {
      await spamPatternService.create({
        organizationId: currentOrganization.id,
        type: formData.type,
        pattern: formData.pattern.trim(),
        isRegex: formData.isRegex,
        scope: 'global',
        isActive: true,
        description: formData.description.trim() || undefined
      }, { userId: user.uid });

      toastService.success(tToast('spam.patternAdded'));
      setIsDialogOpen(false);
      setFormData({
        type: 'url_domain',
        pattern: '',
        isRegex: false,
        description: ''
      });
      loadPatterns();
    } catch {
      toastService.error(tToast('spam.patternAddError'));
    }
  };

  const handleDelete = async (patternId: string) => {
    if (!confirm(t('deleteConfirm'))) return;

    try {
      await spamPatternService.delete(patternId);
      toastService.success(tToast('spam.patternDeleted'));
      loadPatterns();
    } catch {
      toastService.error(tToast('spam.patternDeleteError'));
    }
  };

  const handleToggle = async (pattern: SpamPattern) => {
    if (!pattern.id) return;

    try {
      if (pattern.isActive) {
        await spamPatternService.deactivate(pattern.id);
        toastService.success(tToast('spam.patternDeactivated'));
      } else {
        await spamPatternService.update(pattern.id, { isActive: true }, { userId: user?.uid || '' });
        toastService.success(tToast('spam.patternActivated'));
      }
      loadPatterns();
    } catch {
      toastService.error(tToast('spam.patternToggleError'));
    }
  };

  const getTypeLabel = (type: SpamPattern['type']) => {
    switch (type) {
      case 'url_domain': return t('types.urlDomain');
      case 'keyword_title': return t('types.keywordTitle');
      case 'outlet_name': return t('types.outletName');
      default: return type;
    }
  };

  return (
    <>
      <div className="flex flex-col gap-10 lg:flex-row">
        {/* Linke Spalte: Navigation */}
        <aside className="w-full lg:w-64 lg:flex-shrink-0">
          <SettingsNav />
        </aside>

        {/* Rechte Spalte: Hauptinhalt */}
        <div className="flex-1">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#005fab] mx-auto"></div>
                <Text className="mt-4">{t('loading')}</Text>
              </div>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="md:flex md:items-center md:justify-between mb-8">
                <div className="min-w-0 flex-1">
                  <Heading level={1}>{t('title')}</Heading>
                  <Text className="mt-2 text-gray-600">
                    {t('description')}
                  </Text>
                </div>
                <div className="mt-4 md:mt-0">
                  <Button
                    onClick={() => setIsDialogOpen(true)}
                    className="bg-primary hover:bg-primary-hover text-white whitespace-nowrap"
                  >
                    <PlusIcon className="w-4 h-4 mr-2" />
                    {t('addPattern')}
                  </Button>
                </div>
              </div>

              {/* Patterns Table */}
              <div className="bg-white rounded-lg ring-1 ring-gray-900/5 overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t('table.type')}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t('table.pattern')}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t('table.matches')}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t('table.status')}
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t('table.actions')}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {patterns.map((pattern) => (
                      <tr key={pattern.id} className={`hover:bg-gray-50 ${!pattern.isActive ? 'opacity-50' : ''}`}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge color="zinc">
                            {getTypeLabel(pattern.type)}
                          </Badge>
                        </td>
                        <td className="px-6 py-4">
                          <div>
                            <code className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">
                              {pattern.pattern}
                            </code>
                            {pattern.isRegex && (
                              <Badge color="indigo" className="ml-2">{t('badges.regex')}</Badge>
                            )}
                            {!pattern.isActive && (
                              <Badge color="zinc" className="ml-2">{t('badges.inactive')}</Badge>
                            )}
                            {pattern.description && (
                              <p className="text-xs text-gray-500 mt-2">{pattern.description}</p>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-gray-900">{pattern.timesMatched || 0}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <SimpleSwitch
                            checked={pattern.isActive}
                            onChange={() => handleToggle(pattern)}
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <Button
                            color="secondary"
                            onClick={() => pattern.id && handleDelete(pattern.id)}
                          >
                            <TrashIcon className="size-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {patterns.length === 0 && (
                  <div className="text-center py-12">
                    <p className="text-gray-500">{t('empty.title')}</p>
                    <p className="text-sm text-gray-400 mt-2">
                      {t('empty.description')}
                    </p>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Add Pattern Dialog */}
      <Dialog open={isDialogOpen} onClose={() => setIsDialogOpen(false)}>
        <DialogTitle>{t('dialog.title')}</DialogTitle>
        <DialogBody>
          <div className="space-y-4">
            <Field>
              <Label>{t('dialog.type.label')}</Label>
              <Select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as SpamPattern['type'] })}
              >
                <option value="url_domain">{t('types.urlDomain')}</option>
                <option value="keyword_title">{t('types.keywordTitle')}</option>
                <option value="outlet_name">{t('types.outletName')}</option>
              </Select>
              <Text className="text-xs text-gray-500 mt-1">
                {t('dialog.type.hint')}
              </Text>
            </Field>

            <Field>
              <Label>{t('dialog.pattern.label')}</Label>
              <Input
                type="text"
                value={formData.pattern}
                onChange={(e) => setFormData({ ...formData, pattern: e.target.value })}
                placeholder={t('dialog.pattern.placeholder')}
              />
              <Text className="text-xs text-gray-500 mt-1">
                {t('dialog.pattern.hint')}
              </Text>
            </Field>

            <div className="flex items-center gap-3">
              <SimpleSwitch
                checked={formData.isRegex}
                onChange={(checked) => setFormData({ ...formData, isRegex: checked })}
              />
              <div>
                <div className="font-medium text-sm text-gray-900">{t('dialog.regex.label')}</div>
                <Text className="text-xs text-gray-500">
                  {t('dialog.regex.hint')}
                </Text>
              </div>
            </div>

            <Field>
              <Label>{t('dialog.description.label')}</Label>
              <Input
                type="text"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder={t('dialog.description.placeholder')}
              />
              <Text className="text-xs text-gray-500 mt-1">
                {t('dialog.description.hint')}
              </Text>
            </Field>
          </div>
        </DialogBody>
        <DialogActions>
          <Button plain onClick={() => setIsDialogOpen(false)}>
            {t('dialog.cancel')}
          </Button>
          <Button onClick={handleAdd} disabled={!formData.pattern.trim()}>
            {t('dialog.add')}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
