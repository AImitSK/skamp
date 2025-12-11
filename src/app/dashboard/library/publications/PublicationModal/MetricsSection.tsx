// src/app/dashboard/library/publications/PublicationModal/MetricsSection.tsx
"use client";

import { memo } from 'react';
import { useTranslations } from 'next-intl';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { InfoTooltip } from '@/components/InfoTooltip';
import type { PublicationFormData, MetricsState } from './types';
import type { PublicationFrequency } from '@/types/library';

interface MetricsSectionProps {
  formData: PublicationFormData;
  metrics: MetricsState;
  setMetrics: (metrics: MetricsState) => void;
}

export const MetricsSection = memo(function MetricsSection({ formData, metrics, setMetrics }: MetricsSectionProps) {
  const t = useTranslations('publications.modal.metrics');
  const tDetail = useTranslations('publications.detail');

  // Frequency options
  const frequencies: Array<{ value: PublicationFrequency; label: string }> = [
    { value: 'continuous', label: tDetail('frequencies.continuous') },
    { value: 'multiple_daily', label: tDetail('frequencies.multiple_daily') },
    { value: 'daily', label: tDetail('frequencies.daily') },
    { value: 'weekly', label: tDetail('frequencies.weekly') },
    { value: 'biweekly', label: tDetail('frequencies.biweekly') },
    { value: 'monthly', label: tDetail('frequencies.monthly') },
    { value: 'bimonthly', label: tDetail('frequencies.bimonthly') },
    { value: 'quarterly', label: tDetail('frequencies.quarterly') },
    { value: 'biannual', label: tDetail('frequencies.biannual') },
    { value: 'annual', label: tDetail('frequencies.annual') },
    { value: 'irregular', label: tDetail('frequencies.irregular') }
  ];

  // Circulation type options
  const circulationTypes = [
    { value: 'distributed', label: tDetail('circulationTypes.distributed') },
    { value: 'sold', label: tDetail('circulationTypes.sold') },
    { value: 'printed', label: tDetail('circulationTypes.printed') },
    { value: 'subscribers', label: tDetail('circulationTypes.subscribers') },
    { value: 'audited_ivw', label: tDetail('circulationTypes.ivw') }
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1">
            {t('frequencyLabel')}
          </label>
          <Select
            value={metrics.frequency}
            onChange={(e) => setMetrics({ ...metrics, frequency: e.target.value as PublicationFrequency })}
          >
            {frequencies.map(freq => (
              <option key={freq.value} value={freq.value}>
                {freq.label}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1">
            {t('targetAudienceLabel')}
          </label>
          <Input
            type="text"
            value={metrics.targetAudience}
            onChange={(e) => setMetrics({ ...metrics, targetAudience: e.target.value })}
            placeholder={t('targetAudiencePlaceholder')}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1">
            {t('ageGroupLabel')}
          </label>
          <Input
            type="text"
            value={metrics.targetAgeGroup}
            onChange={(e) => setMetrics({ ...metrics, targetAgeGroup: e.target.value })}
            placeholder={t('ageGroupPlaceholder')}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1">
            {t('genderLabel')}
          </label>
          <Select
            value={metrics.targetGender}
            onChange={(e) => setMetrics({ ...metrics, targetGender: e.target.value as any })}
          >
            <option value="all">{t('genders.all')}</option>
            <option value="predominantly_male">{t('genders.predominantly_male')}</option>
            <option value="predominantly_female">{t('genders.predominantly_female')}</option>
          </Select>
        </div>
      </div>

      {/* Print Metriken */}
      {(formData.format === 'print' || formData.format === 'both') && (
        <div className="border rounded-lg p-4 space-y-4">
          <h4 className="font-medium text-zinc-900">{t('print.title')}</h4>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1 flex items-center gap-2">
                {t('print.circulationLabel')}
                <InfoTooltip content="AVE calculation field" />
              </label>
              <Input
                type="number"
                value={metrics.print.circulation}
                onChange={(e) => setMetrics({
                  ...metrics,
                  print: { ...metrics.print, circulation: e.target.value }
                })}
                placeholder={t('print.circulationPlaceholder')}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">
                {t('print.circulationTypeLabel')}
              </label>
              <Select
                value={metrics.print.circulationType}
                onChange={(e) => setMetrics({
                  ...metrics,
                  print: { ...metrics.print, circulationType: e.target.value as any }
                })}
              >
                {circulationTypes.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">
                {t('print.priceLabel')}
              </label>
              <Input
                type="number"
                step="0.01"
                value={metrics.print.pricePerIssue}
                onChange={(e) => setMetrics({
                  ...metrics,
                  print: { ...metrics.print, pricePerIssue: e.target.value }
                })}
                placeholder={t('print.pricePlaceholder')}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">
                {t('print.subscriptionLabel')}
              </label>
              <Input
                type="number"
                step="0.01"
                value={metrics.print.subscriptionPriceMonthly}
                onChange={(e) => setMetrics({
                  ...metrics,
                  print: { ...metrics.print, subscriptionPriceMonthly: e.target.value }
                })}
                placeholder={t('print.subscriptionPlaceholder')}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">
                {t('print.formatLabel')}
              </label>
              <Input
                type="text"
                value={metrics.print.paperFormat}
                onChange={(e) => setMetrics({
                  ...metrics,
                  print: { ...metrics.print, paperFormat: e.target.value }
                })}
                placeholder={t('print.formatPlaceholder')}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">
                {t('print.pageCountLabel')}
              </label>
              <Input
                type="number"
                value={metrics.print.pageCount}
                onChange={(e) => setMetrics({
                  ...metrics,
                  print: { ...metrics.print, pageCount: e.target.value }
                })}
                placeholder={t('print.pageCountPlaceholder')}
              />
            </div>
          </div>
        </div>
      )}

      {/* Online Metriken */}
      {(formData.format === 'online' || formData.format === 'both') && (
        <div className="border rounded-lg p-4 space-y-4">
          <h4 className="font-medium text-zinc-900">{t('online.title')}</h4>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">
                {t('online.visitorsLabel')}
              </label>
              <Input
                type="number"
                value={metrics.online.monthlyUniqueVisitors}
                onChange={(e) => setMetrics({
                  ...metrics,
                  online: { ...metrics.online, monthlyUniqueVisitors: e.target.value }
                })}
                placeholder={t('online.visitorsPlaceholder')}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1 flex items-center gap-2">
                {t('online.pageViewsLabel')}
                <InfoTooltip content="AVE calculation field" />
              </label>
              <Input
                type="number"
                value={metrics.online.monthlyPageViews}
                onChange={(e) => setMetrics({
                  ...metrics,
                  online: { ...metrics.online, monthlyPageViews: e.target.value }
                })}
                placeholder={t('online.pageViewsPlaceholder')}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">
                {t('online.sessionLabel')}
              </label>
              <Input
                type="number"
                step="0.1"
                value={metrics.online.avgSessionDuration}
                onChange={(e) => setMetrics({
                  ...metrics,
                  online: { ...metrics.online, avgSessionDuration: e.target.value }
                })}
                placeholder={t('online.sessionPlaceholder')}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">
                {t('online.bounceLabel')}
              </label>
              <Input
                type="number"
                step="0.1"
                value={metrics.online.bounceRate}
                onChange={(e) => setMetrics({
                  ...metrics,
                  online: { ...metrics.online, bounceRate: e.target.value }
                })}
                placeholder={t('online.bouncePlaceholder')}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">
                {t('online.usersLabel')}
              </label>
              <Input
                type="number"
                value={metrics.online.registeredUsers}
                onChange={(e) => setMetrics({
                  ...metrics,
                  online: { ...metrics.online, registeredUsers: e.target.value }
                })}
                placeholder={t('online.usersPlaceholder')}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">
                {t('online.newsletterLabel')}
              </label>
              <Input
                type="number"
                value={metrics.online.newsletterSubscribers}
                onChange={(e) => setMetrics({
                  ...metrics,
                  online: { ...metrics.online, newsletterSubscribers: e.target.value }
                })}
                placeholder={t('online.newsletterPlaceholder')}
              />
            </div>
          </div>
          <div className="flex items-center space-x-6 pt-2">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={metrics.online.hasPaywall}
                onChange={(e) => setMetrics({
                  ...metrics,
                  online: { ...metrics.online, hasPaywall: e.target.checked }
                })}
                className="h-4 w-4 text-primary focus:ring-primary border-zinc-300 rounded"
              />
              <span className="ml-2 text-sm">{t('online.paywall')}</span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={metrics.online.hasMobileApp}
                onChange={(e) => setMetrics({
                  ...metrics,
                  online: { ...metrics.online, hasMobileApp: e.target.checked }
                })}
                className="h-4 w-4 text-primary focus:ring-primary border-zinc-300 rounded"
              />
              <span className="ml-2 text-sm">{t('online.mobileApp')}</span>
            </label>
          </div>
        </div>
      )}

      {/* Broadcast Metriken (TV/Radio) */}
      {formData.format === 'broadcast' && (
        <div className="border rounded-lg p-4 space-y-4">
          <h4 className="font-medium text-zinc-900">{t('broadcast.title')}</h4>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1 flex items-center gap-2">
                {t('broadcast.viewershipLabel')}
                <InfoTooltip content="AVE calculation field" />
              </label>
              <Input
                type="number"
                value={metrics.broadcast.viewership}
                onChange={(e) => setMetrics({
                  ...metrics,
                  broadcast: { ...metrics.broadcast, viewership: e.target.value }
                })}
                placeholder={t('broadcast.viewershipPlaceholder')}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">
                {t('broadcast.marketShareLabel')}
              </label>
              <Input
                type="number"
                step="0.1"
                value={metrics.broadcast.marketShare}
                onChange={(e) => setMetrics({
                  ...metrics,
                  broadcast: { ...metrics.broadcast, marketShare: e.target.value }
                })}
                placeholder={t('broadcast.marketSharePlaceholder')}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-zinc-700 mb-1">
                {t('broadcast.areaLabel')}
              </label>
              <Input
                type="text"
                value={metrics.broadcast.broadcastArea}
                onChange={(e) => setMetrics({
                  ...metrics,
                  broadcast: { ...metrics.broadcast, broadcastArea: e.target.value }
                })}
                placeholder={t('broadcast.areaPlaceholder')}
              />
            </div>
          </div>
        </div>
      )}

      {/* Audio Metriken (Podcast) */}
      {formData.format === 'audio' && (
        <div className="border rounded-lg p-4 space-y-4">
          <h4 className="font-medium text-zinc-900">{t('audio.title')}</h4>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1 flex items-center gap-2">
                {t('audio.downloadsLabel')}
                <InfoTooltip content="AVE calculation field" />
              </label>
              <Input
                type="number"
                value={metrics.audio.monthlyDownloads}
                onChange={(e) => setMetrics({
                  ...metrics,
                  audio: { ...metrics.audio, monthlyDownloads: e.target.value }
                })}
                placeholder={t('audio.downloadsPlaceholder')}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">
                {t('audio.listenersLabel')}
              </label>
              <Input
                type="number"
                value={metrics.audio.monthlyListeners}
                onChange={(e) => setMetrics({
                  ...metrics,
                  audio: { ...metrics.audio, monthlyListeners: e.target.value }
                })}
                placeholder={t('audio.listenersPlaceholder')}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">
                {t('audio.episodesLabel')}
              </label>
              <Input
                type="number"
                value={metrics.audio.episodeCount}
                onChange={(e) => setMetrics({
                  ...metrics,
                  audio: { ...metrics.audio, episodeCount: e.target.value }
                })}
                placeholder={t('audio.episodesPlaceholder')}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">
                {t('audio.durationLabel')}
              </label>
              <Input
                type="number"
                step="0.1"
                value={metrics.audio.avgEpisodeDuration}
                onChange={(e) => setMetrics({
                  ...metrics,
                  audio: { ...metrics.audio, avgEpisodeDuration: e.target.value }
                })}
                placeholder={t('audio.durationPlaceholder')}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
});
